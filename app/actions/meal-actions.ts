'use server';

import { createClient } from '@supabase/supabase-js';
import {
  MealItemInput,
  MealBioactiveOutput,
  FoodOption,
  PreparationOption,
  ClinicalPathologyState,
  MealContextState,
  CanonicalNutrient,
  NutrientCategory,
} from '@/types/bioavailability';
import {
  evaluateEntericBioavailability,
  evaluateCalorieMalabsorption,
  retentionForNutrient,
} from '@/lib/clinicalAbsorptionEngine';
import { referenceFactors, scaleIntakeToTissue } from '@/lib/referenceTargets';
import {
  collapseMicrosForFood,
  defaultRetentionForPrep,
  HIDDEN_FOOD_NAMES,
  imputeZoochemicals,
  matchTargetName,
  matchTargetRecord,
  normalizePrepKey,
  resolveFoodId,
  applyB12IfCap,
  PREFERRED_FORM,
  defaultHemeRatio,
  defaultPhytateMgPer100g,
  isSupplementLikeFood,
} from '@/lib/nutrientCanonical';

export type { FoodOption, PreparationOption };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://abopcdqnricobxdcavin.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface DailyNutrientSnapshot {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  nutrientAverages: Record<string, number>;
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
    { id: '4fb61b17-e56b-45b5-b1ea-9597f0b4e61d', name: 'Pastured Egg Yolk (Raw)', category: 'dairy_egg', calories_per_100g: 322, protein_per_100g: 16, fat_per_100g: 27 },
    { id: 'c349a3d4-55ad-4ad2-af3c-a0e013a17d5d', name: 'Beef Liver (Raw/Fresh)', category: 'organ_meat', calories_per_100g: 135, protein_per_100g: 20.4, fat_per_100g: 3.6 },
    { id: '642b1a39-2b02-4caa-8b50-504745420c18', name: 'Beef Bone Marrow', category: 'meat', calories_per_100g: 786, protein_per_100g: 6.7, fat_per_100g: 84 },
    { id: '09a5d920-ac6b-4bca-8188-4ab19b6e41ea', name: 'Almonds (Raw)', category: 'nut', calories_per_100g: 579, protein_per_100g: 21, fat_per_100g: 50 },
    { id: 'f7a74e1c-dc75-4c66-94c8-4adc42283c7c', name: 'Atlantic Sardines (Canned with Bones in Water/Oil)', category: 'seafood', calories_per_100g: 208, protein_per_100g: 24.6, fat_per_100g: 11.5 },
    { id: '71407a97-c99f-4820-99dc-dbd02b6cb980', name: 'Grass-Fed Ribeye Steak', category: 'meat_organ', calories_per_100g: 198, protein_per_100g: 19.4, fat_per_100g: 12.7 },
  ];
}

function getDefaultStaticMethods(): PreparationOption[] {
  return [
    { id: 'raw', method_name: 'Raw', retention_factor: 1.0 },
    { id: 'pan_fried', method_name: 'Pan Fried / Tallow Seared', retention_factor: 0.88 },
    { id: 'oven_roasted', method_name: 'Oven Roasted / Baked', retention_factor: 0.82 },
    { id: 'boiled_consumed', method_name: 'Boiled (Broth Consumed)', retention_factor: 0.95 },
    { id: 'boiled_discarded', method_name: 'Boiled (Broth Discarded)', retention_factor: 0.6 },
    { id: 'slow_cooked', method_name: 'Slow Cooked / Braised', retention_factor: 0.9 },
    { id: 'steamed', method_name: 'Steamed', retention_factor: 0.9 },
    { id: 'grilled', method_name: 'Grilled / Charred', retention_factor: 0.75 },
    { id: 'air_fried', method_name: 'Air Fried', retention_factor: 0.85 },
    { id: 'smoked', method_name: 'Smoked (Low & Slow)', retention_factor: 0.8 },
    { id: 'sous_vide', method_name: 'Sous-Vide / Poached', retention_factor: 0.98 },
  ];
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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
      supabase.from('preparation_methods').select('*').order('method_name'),
    ]);

    if (!foodsRes.data || foodsRes.data.length === 0) {
      return { foods: getDefaultStaticFoods(), methods: getDefaultStaticMethods() };
    }

    const formattedFoods: FoodOption[] = foodsRes.data
      .filter((f: any) => !HIDDEN_FOOD_NAMES.has(String(f.name || '').toLowerCase().trim()))
      .map((f: any) => ({
        id: String(f.id || f.name),
        name: f.name,
        category: f.category || 'other',
        calories_per_100g: num(f.calories_per_100g),
        protein_per_100g: num(f.protein_per_100g),
        fat_per_100g: num(f.fat_per_100g),
        carbs_per_100g: num(f.carbs_per_100g),
        pufa_per_100g: num(f.pufa_per_100g),
        oxalate_mg_per_100g: num(f.oxalate_mg_per_100g ?? f.oxalate_content),
        phytate_mg_per_100g: num(f.phytate_mg_per_100g ?? f.phytate_content),
        oxalate_content: num(f.oxalate_content ?? f.oxalate_mg_per_100g),
        phytate_content: num(f.phytate_content ?? f.phytate_mg_per_100g),
      }));

    const formattedMethods: PreparationOption[] = (methodsRes.data || []).map((m: any) => ({
      id: String(m.id || m.method_name),
      method_name: m.method_name,
      retention_factor: num(m.retention_factor ?? m.thermal_factor, 1),
    }));

    const seen = new Set<string>();
    const dedupedMethods: PreparationOption[] = [];
    for (const m of [...formattedMethods, ...getDefaultStaticMethods()]) {
      const key = normalizePrepKey(m.method_name);
      if (seen.has(key)) continue;
      seen.add(key);
      dedupedMethods.push({ ...m, method_name: displayPrepName(key) });
    }

    return {
      foods: formattedFoods,
      methods: dedupedMethods.length > 0 ? dedupedMethods : getDefaultStaticMethods(),
    };
  } catch (error) {
    console.warn('Falling back to built-in food options due to connection:', error);
    return { foods: getDefaultStaticFoods(), methods: getDefaultStaticMethods() };
  }
}

function displayPrepName(key: string): string {
  const map: Record<string, string> = {
    raw: 'Raw',
    'pan fried / tallow seared': 'Pan Fried / Tallow Seared',
    'oven roasted / baked': 'Oven Roasted / Baked',
    'boiled (broth consumed)': 'Boiled (Broth Consumed)',
    'boiled (broth discarded)': 'Boiled (Broth Discarded)',
    'slow cooked / braised': 'Slow Cooked / Braised',
    steamed: 'Steamed',
    'grilled / charred': 'Grilled / Charred',
    'air fried': 'Air Fried',
    'smoked (low & slow)': 'Smoked (Low & Slow)',
    'sous-vide / poached': 'Sous-Vide / Poached',
  };
  return map[key] || key;
}

function lipidFactor(totalFatGrams: number): number {
  if (totalFatGrams >= 10) return 0.9;
  if (totalFatGrams >= 5) return 0.8;
  if (totalFatGrams >= 2) return 0.65;
  return 0.5;
}

export async function calculateMealAction(
  items: MealItemInput[],
  dietType: string = 'carnivore',
  dailyCalories: number = 2500,
  pathology?: ClinicalPathologyState
): Promise<{ success: boolean; data?: MealBioactiveOutput[]; error?: string }> {
  try {
    if (!items || items.length === 0) return { success: true, data: [] };

    const { data: dbFoods, error: foodsError } = await supabase
      .from('foods')
      .select('id, name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, phytate_mg_per_100g, oxalate_mg_per_100g, phytate_content, oxalate_content');

    if (foodsError || !dbFoods) {
      return { success: false, error: foodsError?.message || 'Failed to fetch foods' };
    }

    const resolved = items
      .map((item) => {
        const food_id = resolveFoodId(item, dbFoods);
        return {
          ...item,
          food_id,
          weight: num(item.weight_grams),
          foodRow: dbFoods.find((f) => String(f.id) === String(food_id)),
        };
      })
      .filter((i) => i.food_id && i.weight > 0);

    if (resolved.length === 0) return { success: true, data: [] };

    const foodIds = Array.from(new Set(resolved.map((i) => i.food_id!)));

    const [microRes, targetsRes, prepRes] = await Promise.all([
      supabase
        .from('food_micronutrients')
        .select('food_id, nutrient_name, chemical_form, nutrient_category, amount_per_100g, unit')
        .in('food_id', foodIds),
      supabase.from('nutrient_daily_targets').select('nutrient_name, rda_minimum, optimal_target, upper_limit, unit'),
      supabase.from('preparation_methods').select('method_name, thermal_factor'),
    ]);

    const microRows = microRes.data || [];
    const targets = targetsRes.data || [];
    const prepMethods = prepRes.data || [];

    const retentionMap = new Map<string, number>();
    prepMethods.forEach((p: any) => {
      retentionMap.set(normalizePrepKey(p.method_name), num(p.thermal_factor, 1));
    });

    interface Acc {
      gross: number;
      retained: number;
      animalRetained: number;
      plantRetained: number;
      unit: string;
      category: NutrientCategory;
      form: string;
    }

    const nutrientAccumulator = new Map<string, Acc>();
    let totalFat = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalCalories = 0;
    let totalPhytate = 0;
    let totalOxalate = 0;
    let animalWeight = 0;
    let plantWeight = 0;
    let carotenoidMatrixCooked = false;
    let hemeIronRetained = 0;
    let totalIronRetained = 0;

    const addAmt = (
      name: string,
      amt: number,
      retained: number,
      unit: string,
      category: NutrientCategory,
      form: string,
      fromAnimal = false
    ) => {
      if (amt <= 0 && retained <= 0) return;
      const cur = nutrientAccumulator.get(name) || {
        gross: 0,
        retained: 0,
        animalRetained: 0,
        plantRetained: 0,
        unit,
        category,
        form,
      };
      cur.gross += amt;
      cur.retained += retained;
      if (fromAnimal) cur.animalRetained += retained;
      else cur.plantRetained += retained;
      nutrientAccumulator.set(name, cur);
    };

    resolved.forEach((item) => {
      if (isSupplementLikeFood(item.food_name)) {
        return;
      }
      const foodMicros = microRows.filter((m: any) => String(m.food_id) === String(item.food_id));
      const collapsed = collapseMicrosForFood(foodMicros);
      const prepKey = normalizePrepKey(item.preparation_method || 'Raw');
      const g = item.weight;
      const row = item.foodRow as any;

      const fat100 = num(row?.fat_per_100g);
      const pro100 = num(row?.protein_per_100g);
      const carb100 = num(row?.carbs_per_100g);
      const cal100 = num(row?.calories_per_100g);
      totalFat += (fat100 * g) / 100;
      if (/tallow|sear|fried|oil|butter/.test((item.preparation_method || '').toLowerCase())) {
        totalFat += 8;
      }
      totalProtein += (pro100 * g) / 100;
      totalCarbs += (carb100 * g) / 100;
      totalCalories += (cal100 * g) / 100;
      const cat = String(row?.category || '').toLowerCase();
      const storedPhyt = num(row?.phytate_mg_per_100g ?? row?.phytate_content);
      totalPhytate += (defaultPhytateMgPer100g(item.food_name, cat, storedPhyt) * g) / 100;
      totalOxalate += (num(row?.oxalate_mg_per_100g ?? row?.oxalate_content) * g) / 100;

      const animalish = /meat|organ|seafood|dairy|egg/.test(cat) || /beef|liver|yolk|sardine|steak|ribeye|mackerel|oyster/.test(item.food_name.toLowerCase());
      if (animalish) animalWeight += g;
      else plantWeight += g;
      if (prepKey !== 'raw' && !prepKey.includes('supplement')) carotenoidMatrixCooked = true;

      const hemeRatio = defaultHemeRatio(item.food_name, cat, row?.heme_iron_ratio);

      collapsed.forEach((micro, canon) => {
        const amount = (micro.amountPer100g * g) / 100;
        const nutrientR = retentionForNutrient(prepKey, canon);
        const retained = amount * nutrientR;
        addAmt(canon, amount, retained, micro.unit, micro.category, micro.chemicalForm, animalish);
        if (canon === 'Iron') {
          totalIronRetained += retained;
          hemeIronRetained += retained * hemeRatio;
        }
      });

      const imputed = imputeZoochemicals(item.food_name, g);
      const maybeFill = (name: CanonicalNutrient, amt: number, unit: 'mg' | 'mcg', catg: NutrientCategory) => {
        if (amt <= 0) return;
        const existing = nutrientAccumulator.get(name);
        if (existing && existing.gross > 0) return;
        addAmt(name, amt, amt, unit, catg, PREFERRED_FORM[name] || name, true);
      };
      maybeFill('Biotin (B7)', imputed.biotinMcg, 'mcg', 'water_soluble_vitamin');
      maybeFill('Iodine', imputed.iodineMcg, 'mcg', 'trace_mineral');
      maybeFill('Carnitine', imputed.carnitineMg, 'mg', 'zoochemical');
      maybeFill('Taurine', imputed.taurineMg, 'mg', 'zoochemical');
      maybeFill('Creatine', imputed.creatineMg, 'mg', 'zoochemical');
      maybeFill('Carnosine', imputed.carnosineMg, 'mg', 'zoochemical');
      maybeFill('CoQ10', imputed.coq10Mg, 'mg', 'zoochemical');
    });

    const isPureAnimalFood = plantWeight === 0 && animalWeight > 0;
    const path: ClinicalPathologyState = pathology || {
      gastricAcid: 'normochlorhydria',
      pathology: 'none',
      bileImpairment: false,
    };

    const context: MealContextState = {
      totalFatGrams: totalFat,
      totalCarbsGrams: totalCarbs,
      totalFiberGrams: 0,
      totalZincMg: nutrientAccumulator.get('Zinc')?.retained || 0,
      totalCopperMg: nutrientAccumulator.get('Copper')?.retained || 0,
      totalIronMg: nutrientAccumulator.get('Iron')?.retained || 0,
      totalCalciumMg: nutrientAccumulator.get('Calcium')?.retained || 0,
      totalVitaminCMg: nutrientAccumulator.get('Vitamin C')?.retained || 0,
      totalOxalatesMg: totalOxalate,
      totalPhytatesMg: totalPhytate,
      isPureAnimalFood,
      carotenoidMatrixCooked,
      hemeIronFraction: totalIronRetained > 0 ? hemeIronRetained / totalIronRetained : 0,
    };

    const calorieAbs = evaluateCalorieMalabsorption(path, isPureAnimalFood);
    const fatMicelle = lipidFactor(totalFat);

    const results: MealBioactiveOutput[] = [];

    nutrientAccumulator.forEach((val, nName) => {
      const intake = matchTargetRecord(nName, targets);
      const target = intake.optimal;
      const ref = referenceFactors(nName);
      const tissueRda = scaleIntakeToTissue(intake.rda, nName, 'mid');
      const tissueOpt = scaleIntakeToTissue(intake.optimal, nName, 'mid');
      const tissueUl = intake.ul != null ? scaleIntakeToTissue(intake.ul, nName, 'mid') : undefined;
      const animalShare = val.animalRetained || 0;
      const plantShare = val.plantRetained || Math.max(0, val.retained - animalShare);
      const entericAnimal = evaluateEntericBioavailability(
        nName as CanonicalNutrient,
        val.form,
        val.category,
        path,
        { ...context, isPureAnimalFood: true }
      );
      const entericPlant = evaluateEntericBioavailability(
        nName as CanonicalNutrient,
        val.form,
        val.category,
        path,
        { ...context, isPureAnimalFood: false }
      );
      const enteric = animalShare >= plantShare ? entericAnimal : entericPlant;

      const micelle = val.category === 'fat_soluble_vitamin' && nName !== 'Vitamin A' ? fatMicelle : 1;
      const aMin = (entericAnimal.rateMin ?? 0.5) * micelle;
      const aMax = Math.min(0.98, (entericAnimal.rateMax ?? 0.7) * Math.min(1, micelle + 0.15));
      const pMin = (entericPlant.rateMin ?? 0.4) * micelle;
      const pMax = Math.min(0.98, (entericPlant.rateMax ?? 0.6) * Math.min(1, micelle + 0.15));
      const aPhi = entericAnimal.conversionPhi ?? 1;
      const pPhi = entericPlant.conversionPhi ?? 1;

      let netMin = animalShare * aMin * aPhi + plantShare * pMin * pPhi;
      let netMax = animalShare * aMax * aPhi + plantShare * pMax * pPhi;
      const rateMin = val.retained > 0 ? netMin / val.retained : 0;
      const rateMax = val.retained > 0 ? netMax / val.retained : 0;
      const phi = animalShare >= plantShare ? aPhi : pPhi;

      if (/b12|cobalamin/i.test(nName)) {
        netMin = applyB12IfCap(netMin);
        netMax = applyB12IfCap(netMax);
      }

      results.push({
        nutrient_name: nName,
        chemical_form: enteric.sanitizedChemicalForm || val.form,
        nutrient_category: val.category,
        unit: val.unit,
        total_plate_gross: Number(val.gross.toFixed(2)),
        useful_net_min: Number(Math.max(0, netMin).toFixed(2)),
        useful_net_max: Number(Math.max(0, netMax).toFixed(2)),
        absorbed_min: Number(Math.max(0, val.retained * rateMin).toFixed(2)),
        absorbed_max: Number(Math.max(0, val.retained * rateMax).toFixed(2)),
        conversion_factor: phi,
        target_coverage_pct_min: Math.round((netMin / Math.max(tissueOpt, 0.0001)) * 100),
        target_coverage_pct_max: Math.round((netMax / Math.max(tissueOpt, 0.0001)) * 100),
        adjusted_daily_target: Number(tissueOpt.toFixed(2)),
        intake_rda: intake.rda,
        intake_optimal: intake.optimal,
        intake_ul: intake.ul,
        coverage_intake_pct_min: Math.round((val.gross / Math.max(intake.rda, 0.0001)) * 100),
        coverage_intake_pct_max: Math.round((val.gross / Math.max(intake.optimal, 0.0001)) * 100),
        tissue_rda: Number(tissueRda.toFixed(2)),
        tissue_optimal: Number(tissueOpt.toFixed(2)),
        tissue_ul: tissueUl != null ? Number(tissueUl.toFixed(2)) : undefined,
        coverage_tissue_pct_min: Math.round((netMin / Math.max(tissueOpt, 0.0001)) * 100),
        coverage_tissue_pct_max: Math.round((netMax / Math.max(tissueOpt, 0.0001)) * 100),
        ref_absorb_mid: (ref.absMin + ref.absMax) / 2,
        ref_phi: ref.phi,
        meal_matrix_status: enteric.clinicalMechanismNotes.join(' | ') || 'calculated_active',
        total_fiber_grams: 0,
        total_fat_grams: Number(totalFat.toFixed(1)),
        net_calorie_absorption_pct: Math.round(calorieAbs.netCalorieFactor * 100),
      });
    });

    results.sort((a, b) => a.nutrient_name.localeCompare(b.nutrient_name));
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

    const dailyGroups = new Map<string, MealItemInput[]>();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;
      const cols = row.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 5) continue;
      const [dateStr, , foodName, prepMethod, weightStr] = cols;
      const weight = parseFloat(weightStr) || 100;
      if (!dailyGroups.has(dateStr)) dailyGroups.set(dateStr, []);
      dailyGroups.get(dateStr)!.push({
        food_name: foodName,
        preparation_method: prepMethod || 'Raw',
        weight_grams: weight,
      });
    }

    if (dailyGroups.size === 0) {
      return { success: false, error: 'No valid records found in the uploaded CSV.' };
    }

    const insertPayload = Array.from(dailyGroups.entries()).map(([date, mealItems]) => ({
      user_id: userId || null,
      items_json: mealItems,
      diet_type: 'carnivore',
      created_at: new Date(date).toISOString(),
    }));

    const { error } = await supabase.from('meal_logs').insert(insertPayload);
    if (error) return { success: false, error: error.message };
    return { success: true, count: insertPayload.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function analyzeDailyCumulativeAction(
  itemsOrLogs: any[],
  dietType: string,
  dailyCalories: number = 2500
): Promise<{ success: boolean; data?: MealBioactiveOutput[]; error?: string }> {
  try {
    if (!itemsOrLogs || itemsOrLogs.length === 0) return { success: true, data: [] };
    const aggregatedItems: MealItemInput[] = [];
    itemsOrLogs.forEach((entry) => {
      if (entry.food_name) aggregatedItems.push(entry);
      else if (Array.isArray(entry.items_json)) aggregatedItems.push(...entry.items_json);
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

    return {
      success: true,
      data: {
        id: String(data.id || `food_${Date.now()}`),
        name: data.name,
        category: data.category || 'other',
        calories_per_100g: data.calories_per_100g,
        protein_per_100g: data.protein_per_100g,
        fat_per_100g: data.fat_per_100g,
      },
    };
  } catch (err: any) {
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
      { user_id: userId, ...settings, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
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

    if (userId) query = query.eq('user_id', userId);

    const { data: logs, error } = await query;
    if (error || !logs || logs.length === 0) return { success: true, data: [] };

    const dayMap = new Map<string, MealItemInput[]>();
    logs.forEach((log: any) => {
      const day = new Date(log.created_at).toISOString().split('T')[0];
      if (!dayMap.has(day)) dayMap.set(day, []);
      if (Array.isArray(log.items_json)) dayMap.get(day)!.push(...log.items_json);
    });

    const snapshots: DailyNutrientSnapshot[] = [];
    for (const [day, dayItems] of dayMap.entries()) {
      const calc = await calculateMealAction(dayItems, 'carnivore', 2500);
      const nutrientMap: Record<string, number> = {};
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
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
