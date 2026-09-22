const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...values] = trimmed.split('=');
    env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Could not find Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const USDA_API_KEY = 'tjenmFwf9cSKoD0Kyslv4UhLgDtsot8tgucKydrT';

// Direct FDC IDs for 100% precision on tricky items
const EXACT_FDC_MAP = {
  'orange': 169097,
  'sweet potato (raw)': 168482,
  'cheddar cheese (sharp)': 170899,
  'brown rice (uncooked)': 169703,
  'clams (canned/cooked)': 171976,
  'freshwater eel': 174193,
  'raw whole milk': 171265,
  'cottage cheese (whole milk)': 172179,
  'spinach (raw)': 168462,
  'cabbage (green, raw)': 169975,
  'beetroot (raw)': 169145,
  'oats (rolled, dry)': 173904,
  'soybeans (dry)': 174270,
  'kidney beans (dry)': 173744,
  'oysters (eastern, wild)': 171978,
  'potato (white, with skin, raw)': 170028,
  'carrot (raw)': 170393,
  'avocado': 171705,
  'banana': 173944,
  'olive oil (extra virgin)': 171413,
  'pork liver': 167862,
};

function categorizeNutrient(name) {
  const n = (name || '').toLowerCase();
  if (['energy', 'protein', 'total lipid', 'carbohydrate'].some((m) => n.includes(m))) return 'macro';
  if (['vitamin a', 'vitamin d', 'vitamin e', 'vitamin k'].some((m) => n.includes(m))) return 'fat_soluble_vitamin';
  if (['thiamin', 'riboflavin', 'niacin', 'pantothenic', 'vitamin b', 'folate', 'choline', 'vitamin c', 'biotin'].some((m) => n.includes(m))) return 'water_soluble_vitamin';
  if (['calcium', 'magnesium', 'phosphorus', 'potassium', 'sodium'].some((m) => n.includes(m))) return 'macro_mineral';
  return 'trace_mineral';
}

async function fetchFromUSDA(foodName) {
  const lower = foodName.toLowerCase().trim();

  // 1. Direct FDC lookup if mapped
  if (EXACT_FDC_MAP[lower]) {
    const directUrl =
      'https://api.nal.usda.gov/fdc/v1/food/' +
      EXACT_FDC_MAP[lower] +
      '?api_key=' +
      USDA_API_KEY;

    const res = await fetch(directUrl);
    if (res.ok) {
      return await res.json();
    }
  }

  // 2. Keyword fallback for all other foods
  let cleanName = foodName
    .replace(/\(.*?\)/g, '')
    .replace(/[\/\,]/g, ' ')
    .trim();

  if (lower.includes('pork') && lower.includes('heart')) cleanName = 'Pork heart raw';
  else if (lower.includes('beef') && lower.includes('liver')) cleanName = 'Beef liver raw';
  else if (lower.includes('chicken') && lower.includes('liver')) cleanName = 'Chicken liver raw';
  else if (lower.includes('beef') && lower.includes('kidney')) cleanName = 'Beef kidney raw';
  else if (lower.includes('beef') && lower.includes('heart')) cleanName = 'Beef heart raw';
  else if (lower.includes('beef') && lower.includes('tongue')) cleanName = 'Beef tongue raw';
  else if (lower.includes('sardine')) cleanName = 'Fish sardine Atlantic';
  else if (lower.includes('egg yolk')) cleanName = 'Egg yolk raw';

  const query = encodeURIComponent(cleanName);
  const url =
    'https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' +
    USDA_API_KEY +
    '&query=' +
    query +
    '&dataType=SR%20Legacy&pageSize=1';

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('  ⚠️ API Error (' + res.status + '): ' + errorText);
    return null;
  }

  const data = await res.json();
  return data.foods && data.foods.length > 0 ? data.foods[0] : null;
}

async function run() {
  console.log('Connecting to Supabase...');
  const { data: foods, error } = await supabase.from('foods').select('id, name');
  if (error || !foods) {
    console.error('Database error:', error?.message);
    return;
  }

  console.log('Auditing ' + foods.length + ' database items against USDA SR Legacy...\n');

  for (const food of foods) {
    const lower = food.name.toLowerCase();
    if (
      lower.includes('powder') ||
      lower.includes('elemental') ||
      lower.includes('picolinate') ||
      lower.includes('malate')
    ) {
      console.log('- Skipping chemical supplement: ' + food.name);
      continue;
    }

    try {
      const match = await fetchFromUSDA(food.name);
      if (!match) {
        console.log('✕ No SR Legacy record found for "' + food.name + '"');
        continue;
      }

      const desc = match.description || match.foodDescription || food.name;
      const fdcId = match.fdcId || 'Direct';
      console.log('✓ "' + food.name + '" -> "' + desc + '" (FDC: ' + fdcId + ')');

      const insertsByName = new Map();
      let kcal = 0,
        prot = 0,
        fat = 0,
        carbs = 0;

      const nutrientsList = match.foodNutrients || [];

      for (const n of nutrientsList) {
        // Normalizes both the search endpoint schema and the single food endpoint schema
        const nName = n.nutrientName || (n.nutrient && n.nutrient.name);
        const val = parseFloat(n.value !== undefined ? n.value : n.amount);
        const unit = (n.unitName || (n.nutrient && n.nutrient.unitName) || 'mg').toLowerCase();

        if (!nName || isNaN(val)) continue;

        const nNameLower = nName.toLowerCase();
        if (nNameLower.includes('energy') && unit === 'kcal') kcal = val;
        if (nNameLower === 'protein') prot = val;
        if (nNameLower.includes('total lipid')) fat = val;
        if (nNameLower.includes('carbohydrate, by difference')) carbs = val;

        if (!insertsByName.has(nName)) {
          insertsByName.set(nName, {
            food_id: food.id,
            nutrient_name: nName,
            chemical_form: 'USDA SR Legacy API',
            nutrient_category: categorizeNutrient(nName),
            amount_per_100g: val,
            unit: unit,
          });
        }
      }

      if (kcal > 0 || prot > 0 || fat > 0) {
        await supabase
          .from('foods')
          .update({
            calories_per_100g: kcal,
            protein_per_100g: prot,
            fat_per_100g: fat,
            carbs_per_100g: carbs,
          })
          .eq('id', food.id);
      }

      const insertPayload = Array.from(insertsByName.values());
      if (insertPayload.length > 0) {
        await supabase.from('food_micronutrients').delete().eq('food_id', food.id);
        const { error: insErr } = await supabase.from('food_micronutrients').insert(insertPayload);
        if (insErr) {
          console.log('  ⚠️ Write error: ' + insErr.message);
        } else {
          console.log('  ✨ Saved ' + insertPayload.length + ' nutrients');
        }
      }

      await new Promise((r) => setTimeout(r, 600));
    } catch (e) {
      console.error('Error processing ' + food.name + ':', e.message);
    }
  }

  console.log('\nSync finished! Refresh your dashboard.');
}

run();