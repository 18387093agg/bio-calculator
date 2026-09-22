import {
  CanonicalNutrient,
  NutrientCategory,
} from '@/types/bioavailability';

export type CanonicalUnit = 'mg' | 'mcg';

export interface CanonicalizedMicro {
  canon: CanonicalNutrient;
  amountPer100g: number;
  unit: CanonicalUnit;
  category: NutrientCategory;
  chemicalForm: string;
  priority: number;
}

const DROP_NAMES = new Set([
  'vitamin a, iu',
  'folate, dfe',
  'folic acid',
  'vitamin e, added',
  'vitamin b12, added',
  'energy',
  'ash',
  'water',
  'caffeine',
  'theobromine',
  'alcohol, ethyl',
  'cholesterol',
  'fiber, total dietary',
  'total sugars',
  'carbohydrate, by difference',
  'protein',
  'total lipid (fat)',
]);

const PREFERRED_FORM: Record<string, string> = {
  'Vitamin A': 'All-Trans Retinol (RAE)',
  'Vitamin D': '1,25-(OH)2-D3 Calcitriol',
  'Vitamin E': 'RRR-alpha-Tocopherol',
  'Vitamin K': 'Menaquinone-4/7 (MK-4 / MK-7)',
  'Vitamin C': 'Ascorbate (Reduced)',
  'Thiamine (B1)': 'Thiamine Pyrophosphate (TPP)',
  'Riboflavin (B2)': 'FAD / FMN Coenzyme',
  'Niacin (B3)': 'NAD+ / NADH Pool',
  'Pantothenic Acid (B5)': 'Coenzyme A (CoA)',
  'Vitamin B6': 'Pyridoxal-5-Phosphate (P5P)',
  'Biotin (B7)': 'Biotinyl-AMP',
  'Folate (B9)': '5-Methyltetrahydrofolate (5-MTHF)',
  'Vitamin B12': 'Methyl- / Adenosylcobalamin',
  'Choline': 'Phosphatidylcholine / Betaine',
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
  Carnitine: 'L-Carnitine / ALCAR',
  Taurine: '2-Aminoethanesulfonic acid',
};

const CATEGORY_BY_CANON: Record<string, NutrientCategory> = {
  'Vitamin A': 'fat_soluble_vitamin',
  'Vitamin D': 'fat_soluble_vitamin',
  'Vitamin E': 'fat_soluble_vitamin',
  'Vitamin K': 'fat_soluble_vitamin',
  'Vitamin C': 'water_soluble_vitamin',
  'Thiamine (B1)': 'water_soluble_vitamin',
  'Riboflavin (B2)': 'water_soluble_vitamin',
  'Niacin (B3)': 'water_soluble_vitamin',
  'Pantothenic Acid (B5)': 'water_soluble_vitamin',
  'Vitamin B6': 'water_soluble_vitamin',
  'Biotin (B7)': 'water_soluble_vitamin',
  'Folate (B9)': 'water_soluble_vitamin',
  'Vitamin B12': 'water_soluble_vitamin',
  Choline: 'water_soluble_vitamin',
  Calcium: 'macro_mineral',
  Magnesium: 'macro_mineral',
  Phosphorus: 'macro_mineral',
  Potassium: 'electrolyte',
  Sodium: 'electrolyte',
  Iron: 'trace_mineral',
  Zinc: 'trace_mineral',
  Copper: 'trace_mineral',
  Selenium: 'trace_mineral',
  Iodine: 'trace_mineral',
  Manganese: 'trace_mineral',
  Molybdenum: 'trace_mineral',
  Chromium: 'trace_mineral',
  Carnitine: 'zoochemical',
  Taurine: 'zoochemical',
  Creatine: 'zoochemical',
  Carnosine: 'zoochemical',
  CoQ10: 'zoochemical',
};

const MCG_NUTRIENTS = new Set([
  'Vitamin A',
  'Vitamin D',
  'Vitamin K',
  'Vitamin B12',
  'Folate (B9)',
  'Biotin (B7)',
  'Selenium',
  'Iodine',
  'Molybdenum',
  'Chromium',
]);

export const FOOD_NAME_ALIASES: Record<string, string> = {
  'atlantic sardines (canned in water/oil)':
    'atlantic sardines (canned with bones in water/oil)',
  'beef liver': 'beef liver (raw/fresh)',
  'grass-fed beef': 'grass-fed ribeye steak',
  'grass-fed beef (ribeye)': 'grass-fed ribeye steak',
};

export const HIDDEN_FOOD_NAMES = new Set([
  'beef liver',
  'grass-fed beef',
  'grass-fed beef (ribeye)',
]);

export function normalizePrepKey(raw: string): string {
  const n = (raw || 'raw').toLowerCase().trim();
  if (n === 'raw' || n.includes('ωμό') || n.includes('unprocessed') || n.includes('uncooked')) {
    return 'raw';
  }
  if (n.includes('sous') || n.includes('poach')) return 'sous-vide / poached';
  if (n.includes('discarded') || (n.includes('boiled') && n.includes('drain'))) {
    return 'boiled (broth discarded)';
  }
  if (n.includes('broth') || n.includes('consumed') || n.includes('stewed')) {
    return 'boiled (broth consumed)';
  }
  if (n.includes('pan') || n.includes('sear') || n.includes('tallow') || n.includes('fried') && !n.includes('air')) {
    return 'pan fried / tallow seared';
  }
  if (n.includes('air')) return 'air fried';
  if (n.includes('grill') || n.includes('char')) return 'grilled / charred';
  if (n.includes('smoke')) return 'smoked (low & slow)';
  if (n.includes('slow') || n.includes('brais')) return 'slow cooked / braised';
  if (n.includes('roast') || n.includes('baked') || n.includes('oven')) {
    return 'oven roasted / baked';
  }
  if (n.includes('steam')) return 'steamed';
  if (n.includes('rare') || n.includes('sear')) return 'pan fried / tallow seared';
  if (n.includes('well-done') || n.includes('high heat')) return 'grilled / charred';
  if (n.includes('pressure')) return 'pressure cooked';
  if (n.includes('ferment') || n.includes('sourdough')) return 'fermented (sourdough / lactic)';
  if (n.includes('sprout')) return 'sprouted / germinated';
  if (n.includes('soak')) return 'soaked (12-24h water)';
  if (n.includes('supplement') || n.includes('capsule')) return 'supplement intake (direct / capsule)';
  return n;
}

export function defaultRetentionForPrep(prepKey: string): number {
  const table: Record<string, number> = {
    raw: 1.0,
    'sous-vide / poached': 0.98,
    'pan fried / tallow seared': 0.88,
    'oven roasted / baked': 0.82,
    'boiled (broth consumed)': 0.92,
    'boiled (broth discarded)': 0.6,
    'slow cooked / braised': 0.9,
    steamed: 0.9,
    'grilled / charred': 0.75,
    'air fried': 0.85,
    'smoked (low & slow)': 0.8,
    'pressure cooked': 0.85,
    'fermented (sourdough / lactic)': 0.9,
    'sprouted / germinated': 0.9,
    'soaked (12-24h water)': 0.95,
    'supplement intake (direct / capsule)': 1.0,
  };
  return table[prepKey] ?? 1.0;
}

function normUnit(unit: string): string {
  return (unit || 'mg').toLowerCase().replace('μ', 'u').replace('µ', 'u').trim();
}

export function canonicalizeMicroRow(row: {
  nutrient_name: string;
  amount_per_100g: number | string;
  unit?: string;
  nutrient_category?: string;
  chemical_form?: string;
}): CanonicalizedMicro | null {
  const rawName = (row.nutrient_name || '').trim();
  const n = rawName.toLowerCase();
  if (!rawName || DROP_NAMES.has(n)) return null;
  if (n.startsWith('sfa ') || n.startsWith('mufa ') || n.startsWith('pufa ') || n.startsWith('tfa ')) {
    return null;
  }
  if (n.startsWith('fatty acids') || n.includes('lycopene') || n.includes('lutein')) {
    return null;
  }

  const unit = normUnit(row.unit || 'mg');
  const rawAmt = Number(row.amount_per_100g);
  if (!Number.isFinite(rawAmt)) return null;

  let canon: CanonicalNutrient | null = null;
  let amount = rawAmt;
  let priority = 50;

  if (n === 'vitamin a, iu' || (n === 'vitamin a' && unit === 'iu')) {
    return null;
  } else if (n === 'retinol') {
    canon = 'Vitamin A';
    if (unit === 'iu') amount = rawAmt / 3.33;
    priority = 60;
  } else if (n === 'carotene, beta' || n === 'beta-carotene') {
    canon = 'Vitamin A';
    amount = rawAmt / 12;
    priority = 40;
  } else if (n === 'carotene, alpha' || n === 'cryptoxanthin, beta') {
    canon = 'Vitamin A';
    amount = rawAmt / 24;
    priority = 30;
  } else if (n === 'vitamin a' || n === 'vitamin a, rae') {
    canon = 'Vitamin A';
    if (unit === 'iu') amount = rawAmt / 3.33;
    priority = 100;
  } else if (n === 'vitamin d3 (cholecalciferol)' || n.includes('cholecalciferol')) {
    canon = 'Vitamin D';
    if (unit === 'iu') amount = rawAmt / 40;
    priority = 90;
  } else if (n === 'vitamin d2 (ergocalciferol)') {
    canon = 'Vitamin D';
    if (unit === 'iu') amount = rawAmt / 40;
    priority = 80;
  } else if (n === 'vitamin d') {
    canon = 'Vitamin D';
    if (unit === 'iu') amount = rawAmt / 40;
    priority = 70;
  } else if (n.startsWith('thiamin')) {
    canon = 'Thiamine (B1)';
  } else if (n.startsWith('riboflavin')) {
    canon = 'Riboflavin (B2)';
  } else if (n.startsWith('niacin')) {
    canon = 'Niacin (B3)';
  } else if (n.startsWith('pantothenic')) {
    canon = 'Pantothenic Acid (B5)';
  } else if (n.includes('b-6') || n.includes('b6') || n.startsWith('pyridox')) {
    canon = 'Vitamin B6';
  } else if (n === 'folate (b9)') {
    canon = 'Folate (B9)';
    priority = 100;
  } else if (n === 'folate, food') {
    canon = 'Folate (B9)';
    priority = 80;
  } else if (n.includes('folate') || n.includes('b9')) {
    return null;
  } else if (n.includes('b12') || n.includes('b-12') || n.includes('cobalamin')) {
    canon = 'Vitamin B12';
  } else if (n.startsWith('biotin') || n.includes('b7')) {
    canon = 'Biotin (B7)';
  } else if (n === 'choline') {
    canon = 'Choline';
    priority = 100;
  } else if (n.startsWith('choline')) {
    return null;
  } else if (n.startsWith('vitamin c') || n.includes('ascorbic')) {
    canon = 'Vitamin C';
  } else if (n === 'vitamin e' || n.includes('alpha-tocopherol')) {
    canon = 'Vitamin E';
  } else if (n.startsWith('vitamin k')) {
    canon = 'Vitamin K';
  } else if (n === 'calcium') canon = 'Calcium';
  else if (n === 'magnesium') canon = 'Magnesium';
  else if (n === 'iron') canon = 'Iron';
  else if (n === 'zinc') canon = 'Zinc';
  else if (n === 'copper') canon = 'Copper';
  else if (n === 'manganese') canon = 'Manganese';
  else if (n === 'potassium') canon = 'Potassium';
  else if (n === 'phosphorus') canon = 'Phosphorus';
  else if (n === 'selenium') canon = 'Selenium';
  else if (n === 'sodium') canon = 'Sodium';
  else if (n === 'iodine') canon = 'Iodine';
  else if (n === 'molybdenum') canon = 'Molybdenum';
  else if (n === 'chromium') canon = 'Chromium';
  else return null;

  const outUnit: CanonicalUnit = MCG_NUTRIENTS.has(canon) ? 'mcg' : 'mg';
  if (outUnit === 'mcg' && (unit === 'mg')) amount = rawAmt * 1000;
  if (outUnit === 'mg' && (unit === 'ug' || unit === 'mcg')) amount = rawAmt / 1000;

  return {
    canon,
    amountPer100g: amount,
    unit: outUnit,
    category: CATEGORY_BY_CANON[canon] || 'trace_mineral',
    chemicalForm: PREFERRED_FORM[canon] || row.chemical_form || 'Standard Matrix',
    priority,
  };
}

export function collapseMicrosForFood(
  rows: Array<{
    nutrient_name: string;
    amount_per_100g: number | string;
    unit?: string;
    nutrient_category?: string;
    chemical_form?: string;
  }>
): Map<CanonicalNutrient, CanonicalizedMicro> {
  const best = new Map<CanonicalNutrient, CanonicalizedMicro>();
  let raeListed = 0;
  let raeFromCarotenoid = 0;
  let retinol = 0;
  let vitATemplate: CanonicalizedMicro | null = null;

  for (const row of rows) {
    const mapped = canonicalizeMicroRow(row);
    if (!mapped) continue;
    if (mapped.canon === 'Vitamin A') {
      vitATemplate = mapped;
      if (mapped.priority >= 100) raeListed = mapped.amountPer100g;
      else if (mapped.priority === 60) retinol = mapped.amountPer100g;
      else raeFromCarotenoid += mapped.amountPer100g;
      continue;
    }
    const prev = best.get(mapped.canon);
    if (!prev || mapped.priority > prev.priority) {
      best.set(mapped.canon, mapped);
    }
  }

  // IOM RAE = retinol + β-carotene/12 + other provitamin A/24.
  // If FDC already stored Vitamin A as RAE, do not add carotenoids on top.
  const computed = retinol + raeFromCarotenoid;
  const chosen = raeListed > 0 ? raeListed : computed;
  if (chosen > 0 && vitATemplate) {
    best.set('Vitamin A', { ...vitATemplate, amountPer100g: chosen, priority: 100 });
  } else if (chosen > 0) {
    best.set('Vitamin A', {
      canon: 'Vitamin A',
      amountPer100g: chosen,
      unit: 'mcg',
      category: 'fat_soluble_vitamin',
      chemicalForm: PREFERRED_FORM['Vitamin A'],
      priority: 100,
    });
  }
  return best;
}

export function matchTargetRecord(
  canon: string,
  targets: Array<{
    nutrient_name: string;
    optimal_target?: number;
    rda_minimum?: number;
    upper_limit?: number;
  }>
): { rda: number; optimal: number; ul?: number } {
  const key = canon.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hit = targets.find((t) => {
    const tn = (t.nutrient_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return tn === key || (key.includes('thiamin') && tn.includes('thiamin'));
  });
  const fallback: Record<string, number> = {
    carnitine: 100,
    taurine: 200,
    creatine: 3000,
    carnosine: 500,
    coq10: 100,
    phosphorus: 1000,
  };
  const optimal = hit
    ? Number(hit.optimal_target || hit.rda_minimum || 100)
    : fallback[key] ?? 100;
  const rda = hit ? Number(hit.rda_minimum || optimal * 0.65) : Number((optimal * 0.65).toFixed(2));
  const ul = hit && hit.upper_limit != null ? Number(hit.upper_limit) : undefined;
  return { rda, optimal, ul };
}

export function matchTargetName(
  canon: string,
  targets: Array<{ nutrient_name: string; optimal_target?: number; rda_minimum?: number }>
): number {
  return matchTargetRecord(canon, targets).optimal;
}

export function resolveFoodId(
  item: { food_id?: string | null; food_name: string },
  dbFoods: Array<{ id: string; name: string }>
): string | null {
  if (item.food_id) {
    const byId = dbFoods.find((f) => String(f.id) === String(item.food_id));
    if (byId) return String(byId.id);
  }
  const raw = (item.food_name || '').toLowerCase().trim();
  const aliased = FOOD_NAME_ALIASES[raw] || raw;
  const exact = dbFoods.find((f) => f.name.toLowerCase().trim() === aliased);
  if (exact) return String(exact.id);
  const exactOrig = dbFoods.find((f) => f.name.toLowerCase().trim() === raw);
  return exactOrig ? String(exactOrig.id) : null;
}

export type TissueClass = 'ruminant_muscle' | 'liver' | 'yolk' | 'sardine' | 'other';

export function classifyTissue(foodName: string): TissueClass {
  const n = (foodName || '').toLowerCase();
  if (n.includes('liver')) return 'liver';
  if (n.includes('yolk')) return 'yolk';
  if (n.includes('sardine')) return 'sardine';
  if (
    n.includes('ribeye') ||
    n.includes('steak') ||
    (n.includes('beef') && !n.includes('liver') && !n.includes('kidney') && !n.includes('heart') && !n.includes('brain'))
  ) {
    return 'ruminant_muscle';
  }
  return 'other';
}

export function imputeZoochemicals(foodName: string, grams: number) {
  const g = grams;
  const cls = classifyTissue(foodName);
  const out = {
    biotinMcg: 0,
    iodineMcg: 0,
    carnitineMg: 0,
    taurineMg: 0,
    creatineMg: 0,
    carnosineMg: 0,
    coq10Mg: 0,
  };
  if (cls === 'ruminant_muscle') {
    out.carnitineMg = g * 0.95;
    out.taurineMg = g * 0.45;
    out.creatineMg = g * 4.5;
    out.carnosineMg = g * 2.0;
    out.coq10Mg = g * 0.04;
  } else if (cls === 'sardine') {
    out.iodineMcg = g * 0.3;
    out.taurineMg = g * 1.5;
    out.carnitineMg = g * 0.1;
    out.coq10Mg = g * 0.03;
  } else if (cls === 'liver') {
    out.biotinMcg = g * 0.35;
    out.carnitineMg = g * 0.25;
    out.taurineMg = g * 0.5;
    out.coq10Mg = g * 0.05;
  } else if (cls === 'yolk') {
    out.biotinMcg = g * 0.55;
    out.iodineMcg = g * 0.65;
    out.taurineMg = g * 0.2;
  }
  return out;
}

export function applyB12IfCap(absorbedMcg: number): number {
  if (absorbedMcg <= 1.5) return absorbedMcg;
  return 1.5 + (absorbedMcg - 1.5) * 0.012;
}

/** Muscle/organ heme is a fraction of total Fe, not 100%. Hunt 2005. */
export function defaultHemeRatio(
  foodName: string,
  category: string,
  dbRatio?: number | null
): number {
  const stored = Number(dbRatio);
  if (Number.isFinite(stored) && stored > 0 && stored <= 1) return stored;
  const n = (foodName || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (/egg|yolk|dairy|milk|cheese|butter|yogurt/.test(n) || /dairy|egg/.test(c)) return 0;
  if (/carrot|spinach|rice|bean|lentil|oat|almond|walnut|apple|banana|potato/.test(n)) return 0;
  if (/plant|vegetable|fruit|grain|nut|legume/.test(c) && !/meat|organ|seafood/.test(c)) return 0;
  if (/liver|kidney|heart|organ/.test(n) || /organ/.test(c)) return 0.4;
  if (/meat|seafood|beef|steak|ribeye|lamb|pork|sardine|mackerel|oyster|salmon/.test(n + ' ' + c)) return 0.45;
  return 0;
}

export function isSupplementLikeFood(foodName: string): boolean {
  return /picolinate|ttfd|allithiamine|supplement|ascorbate powder|methylfolate capsule/.test(
    (foodName || '').toLowerCase()
  );
}

/**
 * Cooked edible mass / raw mass. Used only when the user types cooked grams
 * of a raw-profile food. If Cooked→Raw already ran, yield = 1 on the converted grams.
 */
export function cookingYieldFraction(prepKey: string, animalish: boolean): number {
  const p = (prepKey || 'raw').toLowerCase();
  if (p === 'raw' || p.includes('supplement')) return 1;
  if (p.includes('discarded')) return animalish ? 0.75 : 0.82;
  if (p.includes('grill') || p.includes('char')) return animalish ? 0.72 : 0.85;
  if (p.includes('fried') || p.includes('sear') || p.includes('tallow')) return animalish ? 0.78 : 0.88;
  if (p.includes('roast') || p.includes('bake')) return animalish ? 0.75 : 0.88;
  if (p.includes('boil') || p.includes('steam') || p.includes('sous')) return animalish ? 0.8 : 0.9;
  if (p.includes('brais') || p.includes('slow')) return 0.85;
  return 0.9;
}

/** When phytate columns are 0, use a category stub so the inhibitor path is not dead. */
export function defaultPhytateMgPer100g(foodName: string, category: string, stored: number): number {
  if (stored > 0) return stored;
  const n = (foodName || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (/bean|lentil|chickpea/.test(n)) return 500;
  if (/oat|rice|wheat|bread/.test(n)) return 300;
  if (/almond|walnut|seed/.test(n)) return 350;
  if (/spinach/.test(n)) return 20;
  if (/meat|organ|seafood|egg|dairy/.test(c) || /beef|liver|yolk|sardine/.test(n)) return 0;
  return 0;
}

export { PREFERRED_FORM, CATEGORY_BY_CANON };
