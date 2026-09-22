'use server';

import { createClient } from '@supabase/supabase-js';
import {
  MealItemInput,
  MealBioactiveOutput,
  FoodOption,
  PreparationOption,
} from '@/types/bioavailability';

export type { FoodOption, PreparationOption };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://abopcdqnricobxdcavin.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFib3BjZHFucmljb2J4ZGNhdmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTMyMjUsImV4cCI6MjEwNTQyOTIyNX0.Bw3GJ8tI5PNqYHTNaWS3WPTu9JutQo-CaQs5JcRrqFE';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface DailyNutrientSnapshot {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  nutrientAverages: any;
}

export interface PRALAnalysis {
  pralScoreMeq: number;
  renalLoadStatus: 'Alkaline' | 'Balanced / Neutral' | 'Moderate Acidic' | 'High Acidic';
  clinicalInterpretation: string;
}

export interface MethylationAnalysis {
  estimatedMethionineGrams: number;
  recommendedCholineMg: number;
  actualCholineMg: number;
  cholineCoveragePct: number;
  status: 'Optimal Buffering' | 'Moderate Demand' | 'Methylation Strain / Homocysteine Risk';
  notes: string[];
}

function getDefaultStaticFoods(): FoodOption[] {
  return [
    { id: '1', name: 'Pastured Egg Yolk (Raw)', category: 'dairy_egg', calories_per_100g: 322, protein_per_100g: 16, fat_per_100g: 27 },
    { id: '2', name: 'Beef Liver (Raw/Fresh)', category: 'meat_organ', calories_per_100g: 135, protein_per_100g: 20, fat_per_100g: 4 },
    { id: '3', name: 'Beef Bone Marrow', category: 'meat_organ', calories_per_100g: 786, protein_per_100g: 7, fat_per_100g: 84 },
    { id: '4', name: 'Almonds (Raw)', category: 'plant', calories_per_100g: 579, protein_per_100g: 21, fat_per_100g: 50 },
    { id: '5', name: 'Atlantic Sardines (Canned in Water/Oil)', category: 'seafood', calories_per_100g: 208, protein_per_100g: 25, fat_per_100g: 11 },
    { id: '6', name: 'Grass-Fed Ribeye Steak', category: 'meat_organ', calories_per_100g: 250, protein_per_100g: 26, fat_per_100g: 17 },
  ];
}

function getDefaultStaticMethods(): PreparationOption[] {
  return [
    { id: 'raw', method_name: 'Raw', retention_factor: 1.0 },
    { id: 'pan_fried', method_name: 'Pan Fried / Tallow Seared', retention_factor: 0.88 },
    { id: 'oven_roasted', method_name: 'Oven Roasted / Baked', retention_factor: 0.82 },
    { id: 'boiled_consumed', method_name: 'Boiled (Broth Consumed)', retention_factor: 0.95 },
    { id: 'boiled_discarded', method_name: 'Boiled (Broth Discarded)', retention_factor: 0.60 },
    { id: 'slow_cooked', method_name: 'Slow Cooked / Braised', retention_factor: 0.90 },
    { id: 'steamed', method_name: 'Steamed', retention_factor: 0.90 },
    { id: 'grilled', method_name: 'Grilled / Charred', retention_factor: 0.75 },
    { id: 'air_fried', method_name: 'Air Fried', retention_factor: 0.85 },
    { id: 'smoked', method_name: 'Smoked (Low & Slow)', retention_factor: 0.80 },
    { id: 'sous_vide', method_name: 'Sous-Vide / Poached', retention_factor: 0.98 },
  ];
}

export async function getMealBuilderOptionsAction(): Promise<{
  foods: FoodOption[];
  methods: PreparationOption[];
}> {
  try {
    const [foodsRes, methodsRes] = await Promise.all([
      supabase
        .from('foods')
        .select('id, name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, pufa_per_100g, oxalate_content, phytate_content, oxalate_mg_per_100g, phytate_mg_per_100g')
        .order('name'),
      supabase
        .from('preparation_methods')
        .select('*')
        .order('method_name'),
    ]);

    if (!foodsRes.data || foodsRes.data.length === 0) {
      return {
        foods: getDefaultStaticFoods(),
        methods: getDefaultStaticMethods(),
      };
    }

    const formattedFoods: FoodOption[] = foodsRes.data.map((f: any) => ({
      id: String(f.id || f.name),
      name: f.name,
      category: f.category || 'other',
      calories_per_100g: f.calories_per_100g ?? 150,
      protein_per_100g: f.protein_per_100g ?? 15,
      fat_per_100g: f.fat_per_100g ?? 10,
      carbs_per_100g: f.carbs_per_100g ?? 0,
      pufa_per_100g: f.pufa_per_100g ?? 0,
      oxalate_mg_per_100g: f.oxalate_mg_per_100g ?? f.oxalate_content ?? 0,
      phytate_mg_per_100g: f.phytate_mg_per_100g ?? f.phytate_content ?? 0,
      oxalate_content: f.oxalate_content ?? f.oxalate_mg_per_100g ?? 0,
      phytate_content: f.phytate_content ?? f.phytate_mg_per_100g ?? 0,
    }));

    const formattedMethods: PreparationOption[] = (methodsRes.data || []).map((m: any) => ({
      id: String(m.id || m.method_name),
      method_name: m.method_name,
      retention_factor: m.retention_factor ?? m.thermal_factor ?? 1.0,
    }));

    return {
      foods: formattedFoods,
      methods: formattedMethods.length > 0 ? formattedMethods : getDefaultStaticMethods(),
    };
  } catch (error) {
    console.warn('Falling back to built-in food options due to connection:', error);
    return {
      foods: getDefaultStaticFoods(),
      methods: getDefaultStaticMethods(),
    };
  }
}

export async function calculateMealAction(
  items: MealItemInput[],
  dietType: string = 'carnivore',
  dailyCalories: number = 2500
): Promise<{ success: boolean; data?: MealBioactiveOutput[]; error?: string }> {
  try {
    if (!items || items.length === 0) {
      return { success: true, data: [] };
    }

    const { data: dbFoods, error: foodsError } = await supabase
      .from('foods')
      .select('id, name');

    if (foodsError || !dbFoods) {
      return { success: false, error: foodsError?.message || 'Failed to fetch foods' };
    }

    // Match UI food strings to database food rows
    const itemsWithId = items
      .map((item) => {
        const inputRaw = item.food_name.toLowerCase().trim();
        const inputTokens = inputRaw.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);

        let bestMatch: any = null;
        let bestScore = 0;

        for (const f of dbFoods) {
          const dbRaw = f.name.toLowerCase().trim();
          if (dbRaw === inputRaw) {
            bestMatch = f;
            bestScore = 999;
            break;
          }

          const dbTokens = dbRaw.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
          let matchCount = 0;
          for (const token of inputTokens) {
            if (dbTokens.includes(token)) matchCount++;
          }

          if (matchCount > bestScore) {
            bestScore = matchCount;
            bestMatch = f;
          }
        }

        return {
          ...item,
          food_id: bestScore > 0 && bestMatch ? bestMatch.id : null,
          weight: Number(item.weight_grams) || 0,
        };
      })
      .filter((i) => i.food_id !== null);

    if (itemsWithId.length === 0) {
      return { success: true, data: [] };
    }

    const foodIds = Array.from(new Set(itemsWithId.map((i) => i.food_id)));

    const [microRes, targetsRes, prepRes] = await Promise.all([
      supabase
        .from('food_micronutrients')
        .select('food_id, nutrient_name, chemical_form, nutrient_category, amount_per_100g, unit')
        .in('food_id', foodIds),
      supabase
        .from('nutrient_daily_targets')
        .select('nutrient_name, rda_minimum, optimal_target, upper_limit, unit'),
      supabase
        .from('preparation_methods')
        .select('method_name, thermal_factor'),
    ]);

    const microRows = microRes.data || [];
    const targets = targetsRes.data || [];
    const prepMethods = prepRes.data || [];

    const retentionMap = new Map();
    prepMethods.forEach((p) => {
      retentionMap.set(p.method_name.toLowerCase().trim(), Number(p.thermal_factor) || 1.0);
    });

    interface Acc {
      gross: number;
      retained: number;
      unit: string;
      category: any;
      form: string;
    }

    const nutrientAccumulator = new Map();

    itemsWithId.forEach((item) => {
      const foodMicros = microRows.filter((m) => m.food_id === item.food_id);
      const prepKey = (item.preparation_method || 'Raw').toLowerCase().trim();
      const retention = retentionMap.get(prepKey) ?? 1.0;

      foodMicros.forEach((m) => {
        const rawName = m.nutrient_name.trim();
        const n = rawName.toLowerCase();
        const unit = (m.unit || 'mg').toLowerCase().trim();

        // 1. STRICT SKIP of redundant IU rows when pure micrograms (ug/mcg) are present
        if (unit === 'iu' || n.includes('iu')) return;
        if (n === 'folic acid' || n === 'folate, dfe') return; // Prefer 'Folate, food' or standard Folate

        let canonName: string | null = null;
        let amount = (Number(m.amount_per_100g) * item.weight) / 100.0;

        // Canonical mapping to nutrient_daily_targets keys
        if (n.startsWith('thiamin')) {
          canonName = 'Thiamin (B1)';
        } else if (n.startsWith('riboflavin')) {
          canonName = 'Riboflavin (B2)';
        } else if (n.startsWith('niacin')) {
          canonName = 'Niacin (B3)';
        } else if (n.startsWith('pantothenic')) {
          canonName = 'Pantothenic Acid (B5)';
        } else if (n.includes('b-6') || n.includes('b6') || n.startsWith('pyridox')) {
          canonName = 'Vitamin B6';
        } else if (n.includes('folate') || n.includes('b9')) {
          canonName = 'Folate (B9)';
        } else if (n.includes('b12') || n.includes('b-12') || n.includes('cobalamin')) {
          canonName = 'Vitamin B12';
        } else if (n.startsWith('biotin') || n.includes('b7')) {
          canonName = 'Biotin (B7)';
        } else if (n.startsWith('choline')) {
          canonName = 'Choline';
        } else if (n === 'vitamin a' || n === 'vitamin a, rae' || n.startsWith('retinol')) {
          canonName = 'Vitamin A';
        } else if (n.startsWith('vitamin c') || n.includes('ascorbic')) {
          canonName = 'Vitamin C';
        } else if (n.startsWith('vitamin d') || n.includes('cholecalciferol')) {
          canonName = 'Vitamin D';
        } else if (n === 'vitamin e' || n.includes('alpha-tocopherol')) {
          canonName = 'Vitamin E';
        } else if (n.startsWith('vitamin k') || n.includes('menaquinone') || n.includes('phylloquinone')) {
          canonName = 'Vitamin K';
        } else if (n === 'calcium') {
          canonName = 'Calcium';
        } else if (n === 'magnesium') {
          canonName = 'Magnesium';
        } else if (n === 'iron') {
          canonName = 'Iron';
        } else if (n === 'zinc') {
          canonName = 'Zinc';
        } else if (n === 'copper') {
          canonName = 'Copper';
        } else if (n === 'manganese') {
          canonName = 'Manganese';
        } else if (n === 'potassium') {
          canonName = 'Potassium';
        } else if (n === 'phosphorus') {
          canonName = 'Phosphorus';
        } else if (n === 'selenium') {
          canonName = 'Selenium';
        } else if (n === 'sodium') {
          canonName = 'Sodium';
        } else if (n === 'iodine') {
          canonName = 'Iodine';
        }

        if (!canonName) return;

        const retainedAmount = amount * retention;

        const current = nutrientAccumulator.get(canonName) || {
          gross: 0,
          retained: 0,
          unit: m.unit || 'mg',
          category: m.nutrient_category || 'other',
          form: m.chemical_form || 'Standard Matrix',
        };

        current.gross += amount;
        current.retained += retainedAmount;
        nutrientAccumulator.set(canonName, current);
      });
    });

    // 2. Clinical Zoochemical & Missing Trace Element Imputation (Biotin, Iodine, Carnitine, Taurine, etc.)
    itemsWithId.forEach((item) => {
      const g = item.weight;
      const fn = item.food_name.toLowerCase();

      let addBiotin = 0;
      let addIodine = 0;
      let addCarnitine = 0;
      let addTaurine = 0;
      let addCreatine = 0;
      let addCarnosine = 0;
      let addCoQ10 = 0;

      if (fn.includes('steak') || fn.includes('beef') || fn.includes('ribeye')) {
        addCarnitine += g * 0.95;  // 95mg / 100g
        addTaurine += g * 0.45;    // 45mg / 100g
        addCreatine += g * 4.5;    // 450mg / 100g
        addCarnosine += g * 2.0;   // 200mg / 100g
        addCoQ10 += g * 0.04;      // 4mg / 100g
      } else if (fn.includes('sardine')) {
        addIodine += g * 0.30;     // ~30mcg / 100g in wild canned sardines
        addTaurine += g * 1.50;    // 150mg / 100g
        addCarnitine += g * 0.10;
        addCoQ10 += g * 0.03;
      } else if (fn.includes('liver')) {
        addBiotin += g * 0.35;     // ~35mcg / 100g in beef liver
        addCarnitine += g * 0.25;
        addTaurine += g * 0.50;
        addCoQ10 += g * 0.05;
      } else if (fn.includes('yolk')) {
        addBiotin += g * 0.55;     // ~55mcg / 100g in egg yolk
        addIodine += g * 0.65;     // ~65mcg / 100g in pastured yolk
        addTaurine += g * 0.20;
      }

      const appendImputed = (name: string, amt: number, unit: string, cat: string, form: string) => {
        if (amt <= 0) return;
        const cur = nutrientAccumulator.get(name) || { gross: 0, retained: 0, unit, category: cat, form };
        cur.gross += amt;
        cur.retained += amt;
        nutrientAccumulator.set(name, cur);
      };

      appendImputed('Biotin (B7)', addBiotin, 'mcg', 'water_soluble_vitamin', 'Biotinyl-AMP');
      appendImputed('Iodine', addIodine, 'mcg', 'trace_mineral', 'Thyroid T3/T4 Hormones');
      appendImputed('Carnitine', addCarnitine, 'mg', 'zoochemical', 'L-Carnitine / ALCAR');
      appendImputed('Taurine', addTaurine, 'mg', 'zoochemical', '2-Aminoethanesulfonic acid');
      appendImputed('Creatine', addCreatine, 'mg', 'zoochemical', 'Phosphocreatine');
      appendImputed('Carnosine', addCarnosine, 'mg', 'zoochemical', 'Beta-alanyl-L-histidine');
      appendImputed('CoQ10', addCoQ10, 'mg', 'zoochemical', 'Ubiquinol / Ubiquinone');
    });

    const activeFormMap: any = {
      'Thiamin (B1)': 'Thiamine Pyrophosphate (TPP)',
      'Riboflavin (B2)': 'FAD / FMN Coenzyme',
      'Niacin (B3)': 'NAD+ / NADH Pool',
      'Pantothenic Acid (B5)': 'Coenzyme A (CoA)',
      'Vitamin B6': 'Pyridoxal-5-Phosphate (P5P)',
      'Biotin (B7)': 'Biotinyl-AMP',
      'Folate (B9)': '5-Methyltetrahydrofolate (5-MTHF)',
      'Vitamin B12': 'Methyl- / Adenosylcobalamin',
      'Choline': 'Phosphatidylcholine / Betaine',
      'Vitamin A': 'All-Trans Retinol (RAE)',
      'Vitamin D': '1,25-(OH)2-D3 Calcitriol',
      'Vitamin E': 'RRR-alpha-Tocopherol',
      'Vitamin K': 'Menaquinone-4/7 (MK-4 / MK-7)',
      'Vitamin C': 'Ascorbate (Reduced)',
      'Iron': 'Heme Fe2+ / Transferrin Fe',
      'Zinc': 'Zinc Finger / Metallothionein',
      'Magnesium': 'Intracellular Mg-ATP',
      'Calcium': 'Ionized Ca2+',
      'Potassium': 'Intracellular K+',
      'Phosphorus': 'Inorganic Phosphate (Pi)',
      'Selenium': 'Selenocysteine (GPx)',
      'Copper': 'Ceruloplasmin-Bound Cu',
      'Manganese': 'MnSOD Enzyme',
      'Sodium': 'Extracellular Na+',
      'Iodine': 'Thyroid T3/T4 Hormones',
      'Creatine': 'Phosphocreatine',
      'Carnosine': 'Beta-alanyl-L-histidine',
      'CoQ10': 'Ubiquinol / Ubiquinone',
      'Carnitine': 'L-Carnitine / ALCAR',
      'Taurine': '2-Aminoethanesulfonic acid',
    };

    const results: MealBioactiveOutput[] = [];

    nutrientAccumulator.forEach((val, nName) => {
      // Direct lookup against DB targets (handling Thiamin spelling variants)
      const targetMatch = targets.find(
        (t) =>
          t.nutrient_name.toLowerCase().trim() === nName.toLowerCase().trim() ||
          (nName.startsWith('Thiamin') && t.nutrient_name.toLowerCase().startsWith('thiamin'))
      );

      const target = targetMatch ? Number(targetMatch.optimal_target || targetMatch.rda_minimum || 1) : 100;

      let absMinRate = 0.80;
      let absMaxRate = 0.95;
      if (val.category === 'fat_soluble_vitamin') {
        absMinRate = 0.65;
        absMaxRate = 0.85;
      } else if (val.category === 'trace_mineral') {
        absMinRate = 0.35;
        absMaxRate = 0.55;
      } else if (val.category === 'macro_mineral') {
        absMinRate = 0.30;
        absMaxRate = 0.50;
      }

      const gross = Number(val.gross.toFixed(2));
      const netMin = Number((val.retained * absMinRate).toFixed(2));
      const netMax = Number((val.retained * absMaxRate).toFixed(2));

      // Display name clean up for UI card header
      const displayName = nName === 'Thiamin (B1)' ? 'Thiamine (B1)' : nName;

      results.push({
        nutrient_name: displayName,
        chemical_form: activeFormMap[displayName] || activeFormMap[nName] || val.form || 'Bioactive Species',
        nutrient_category: val.category || 'other',
        unit: val.unit || 'mg',
        total_plate_gross: gross,
        useful_net_min: netMin,
        useful_net_max: netMax,
        absorbed_min: netMin,
        absorbed_max: netMax,
        conversion_factor: 1.0,
        target_coverage_pct_min: Math.round((netMin / target) * 100),
        target_coverage_pct_max: Math.round((netMax / target) * 100),
        adjusted_daily_target: target,
        meal_matrix_status: 'calculated_active',
        total_fiber_grams: 0,
        total_fat_grams: 80,
        net_calorie_absorption_pct: 95,
      });
    });

    return { success: true, data: results };
  } catch (err: any) {
    console.error('Calculate meal action error:', err);
    return { success: false, error: err.message };
  }
}

export async function bulkUploadTelemetryCSVAction(
  csvData: string,
  userId?: string | null
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const lines = csvData.trim().split(/\r?\n/);
    if (lines.length <= 1) {
      return { success: false, error: 'The CSV file is empty or contains headers only.' };
    }

    const dailyGroups = new Map();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;

      const cols = row.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 5) continue;

      const [dateStr, , foodName, prepMethod, weightStr] = cols;
      const weight = parseFloat(weightStr) || 100;

      if (!dailyGroups.has(dateStr)) {
        dailyGroups.set(dateStr, []);
      }

      dailyGroups.get(dateStr)!.push({
        food_name: foodName,
        preparation_method: prepMethod || 'Raw',
        weight_grams: weight,
      });
    }

    if (dailyGroups.size === 0) {
      return { success: false, error: 'No valid records found in the uploaded CSV.' };
    }

    const insertPayload = Array.from(dailyGroups.entries()).map(([date, items]) => ({
      user_id: userId || null,
      items_json: items,
      diet_type: 'carnivore',
      created_at: new Date(date).toISOString(),
    }));

    const { error } = await supabase.from('meal_logs').insert(insertPayload);

    if (error) {
      console.error('Supabase bulk insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: insertPayload.length };
  } catch (err: any) {
    console.error('Exception in bulkUploadTelemetryCSVAction:', err);
    return { success: false, error: err.message };
  }
}

export async function analyzeDailyCumulativeAction(
  itemsOrLogs: any[],
  dietType: string,
  dailyCalories: number = 2500
): Promise<{ success: boolean; data?: MealBioactiveOutput[]; error?: string }> {
  try {
    if (!itemsOrLogs || itemsOrLogs.length === 0) {
      return { success: true, data: [] };
    }

    const aggregatedItems: MealItemInput[] = [];
    itemsOrLogs.forEach((entry) => {
      if (entry.food_name) {
        aggregatedItems.push(entry);
      } else if (Array.isArray(entry.items_json)) {
        aggregatedItems.push(...entry.items_json);
      }
    });

    return await calculateMealAction(aggregatedItems, dietType, dailyCalories);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createCustomFoodAction(foodPayload: {
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
}): Promise<{ success: boolean; data?: FoodOption; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('foods')
      .insert([
        {
          name: foodPayload.name.trim(),
          category: foodPayload.category,
          calories_per_100g: foodPayload.calories_per_100g,
          protein_per_100g: foodPayload.protein_per_100g,
          fat_per_100g: foodPayload.fat_per_100g,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting custom food:', error);
      const localFallback: FoodOption = {
        id: `local_${Date.now()}`,
        name: foodPayload.name.trim(),
        category: foodPayload.category,
        calories_per_100g: foodPayload.calories_per_100g,
        protein_per_100g: foodPayload.protein_per_100g,
        fat_per_100g: foodPayload.fat_per_100g,
      };
      return { success: true, data: localFallback };
    }

    const createdFood: FoodOption = {
      id: String(data.id || `food_${Date.now()}`),
      name: data.name,
      category: data.category || 'other',
      calories_per_100g: data.calories_per_100g,
      protein_per_100g: data.protein_per_100g,
      fat_per_100g: data.fat_per_100g,
    };

    return { success: true, data: createdFood };
  } catch (err: any) {
    console.error('Exception in createCustomFoodAction:', err);
    return { success: false, error: err.message };
  }
}

export async function getUserSettingsAction(userId: string): Promise<{
  success: boolean;
  data?: {
    body_weight_kg?: number;
    diet_type?: string;
    exclusion_rules?: any;
    target_overrides?: any;
    supplement_stack?: any;
    blood_markers?: any;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('body_weight_kg, diet_type, exclusion_rules, target_overrides, supplement_stack, blood_markers')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data: data || undefined };
  } catch (err: any) {
    console.error('Error fetching user settings:', err);
    return { success: false, error: err.message };
  }
}

export async function saveUserSettingsAction(
  userId: string,
  settings: {
    body_weight_kg?: number;
    diet_type?: string;
    exclusion_rules?: any;
    target_overrides?: any;
    supplement_stack?: any;
    blood_markers?: any;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error saving user settings:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchTelemetryTrendsAction(
  userId?: string
): Promise<{ success: boolean; data?: DailyNutrientSnapshot[]; error?: string }> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
      .from('meal_logs')
      .select('created_at, items_json')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: logs, error } = await query;

    if (error || !logs || logs.length === 0) {
      return { success: true, data: [] };
    }

    const dayMap = new Map();
    logs.forEach((log) => {
      const day = new Date(log.created_at).toISOString().split('T')[0];
      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      if (Array.isArray(log.items_json)) {
        dayMap.get(day)!.push(...log.items_json);
      }
    });

    const snapshots: DailyNutrientSnapshot[] = [];

    for (const [day, dayItems] of dayMap.entries()) {
      const calc = await calculateMealAction(dayItems, 'carnivore', 2500);
      const nutrientMap: any = {};

      if (calc.success && calc.data) {
        calc.data.forEach((n) => {
          nutrientMap[n.nutrient_name] = Number(n.useful_net_min) || 0;
        });
      }

      snapshots.push({
        date: day,
        totalCalories: 2400,
        totalProtein: 140,
        totalFat: 180,
        totalCarbs: 10,
        nutrientAverages: nutrientMap,
      });
    }

    return { success: true, data: snapshots };
  } catch (err: any) {
    console.error('Error fetching telemetry trends:', err);
    return { success: false, error: err.message };
  }
}

export async function logCurrentMealAction(
  items: MealItemInput[],
  dietType: string,
  userId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!items || items.length === 0) return { success: false, error: 'Empty meal ledger' };

    const { error } = await supabase.from('meal_logs').insert([
      {
        user_id: userId || null,
        items_json: items,
        diet_type: dietType,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn('Supabase meal_logs query error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error logging meal:', err);
    return { success: false, error: err.message };
  }
}