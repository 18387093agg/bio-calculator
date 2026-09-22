export type CanonicalNutrient =
  | 'Vitamin A'
  | 'Vitamin D'
  | 'Vitamin E'
  | 'Vitamin K'
  | 'Thiamine (B1)'
  | 'Riboflavin (B2)'
  | 'Niacin (B3)'
  | 'Pantothenic Acid (B5)'
  | 'Vitamin B6'
  | 'Biotin (B7)'
  | 'Folate (B9)'
  | 'Vitamin B12'
  | 'Choline'
  | 'Vitamin C'
  | 'Calcium'
  | 'Magnesium'
  | 'Phosphorus'
  | 'Potassium'
  | 'Sodium'
  | 'Chloride'
  | 'Sulfur'
  | 'Iron'
  | 'Zinc'
  | 'Copper'
  | 'Selenium'
  | 'Iodine'
  | 'Manganese'
  | 'Molybdenum'
  | 'Chromium'
  | 'Carnitine'
  | 'Taurine'
  | 'Creatine'
  | 'Carnosine'
  | 'CoQ10';

export type NutrientCategory =
  | 'macro_mineral'
  | 'trace_mineral'
  | 'fat_soluble_vitamin'
  | 'water_soluble_vitamin'
  | 'electrolyte'
  | 'zoochemical'
  | 'fatty_acid';

export type NutrientOrigin = 'animal' | 'plant' | 'synthetic_supplement';

export type GastricAcidStatus = 'normochlorhydria' | 'hypochlorhydria' | 'achlorhydria';

export type GutPathology = 'none' | 'sibo' | 'crohns_celiac' | 'ileal_resection';

export interface ClinicalPathologyState {
  gastricAcid: GastricAcidStatus;
  pathology: GutPathology;
  bileImpairment: boolean;
}

export interface FormConversionDetail {
  speciesName: string;
  origin: NutrientOrigin;
  grossAmount: number;
  conversionRatio: number;
  effectiveNet: number;
  absorptionPenaltyPct: number;
}

export interface ConsolidatedNutrientResult {
  nutrientName: CanonicalNutrient;
  category: NutrientCategory;
  unit: 'mg' | 'mcg' | 'IU' | 'g';
  totalGross: number;
  netEffectiveMin: number;
  netEffectiveMax: number;
  baseTarget: number;
  effectiveTarget: number;
  coveragePctMin: number;
  coveragePctMax: number;
  animalPreformedAmount: number;
  plantPrecursorAmount: number;
  activeSpeciesList: FormConversionDetail[];
  matrixStatus: 'Optimal' | 'Ratio Loss' | 'Inhibited' | 'Enhanced' | 'Cheleated';
  clinicalNotes?: string;
}

export interface MealContextState {
  totalFatGrams: number;
  totalCarbsGrams: number;
  totalFiberGrams: number;
  totalZincMg: number;
  totalCopperMg: number;
  totalIronMg: number;
  totalCalciumMg: number;
  totalVitaminCMg: number;
  totalOxalatesMg?: number;
  totalPhytatesMg?: number;
  coingestedTannins?: boolean;
  isPureAnimalFood: boolean;
  carotenoidMatrixCooked?: boolean;
  /** 0–1 fraction of meal iron that is heme after retention. */
  hemeIronFraction?: number;
}

export interface MealItemInput {
  food_id?: string;
  food_name: string;
  preparation_method: string;
  weight_grams: number;
}

export interface MealBioactiveOutput {
  nutrient_name: string;
  chemical_form: string;
  nutrient_category: string;
  unit: string;
  total_plate_gross: number;
  absorbed_min: number;
  absorbed_max: number;
  bioavailable_min?: number;
  bioavailable_max?: number;
  conversion_factor: number;
  useful_net_min: number;
  useful_net_max: number;
  adjusted_daily_target: number;
  target_coverage_pct_min: number;
  target_coverage_pct_max: number;
  meal_matrix_status: string;
  total_fiber_grams: number;
  total_fat_grams: number;
  net_calorie_absorption_pct: number;
  /** Official intake RDA / optimal / UL (what you eat). */
  intake_rda?: number;
  intake_optimal?: number;
  intake_ul?: number;
  coverage_intake_pct_min?: number;
  coverage_intake_pct_max?: number;
  /** Intake × healthy reference abs × Φ (what the body would need as net). */
  tissue_rda?: number;
  tissue_optimal?: number;
  tissue_ul?: number;
  coverage_tissue_pct_min?: number;
  coverage_tissue_pct_max?: number;
  ref_absorb_mid?: number;
  ref_phi?: number;
}

export interface FoodOption {
  id: string;
  name: string;
  category: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbs_per_100g?: number;
  pufa_per_100g?: number;
  phytate_mg_per_100g?: number;
  oxalate_mg_per_100g?: number;
  phytate_content?: number;
  oxalate_content?: number;
}

export interface PreparationOption {
  id: string;
  method_name: string;
  retention_factor?: number;
  water_leaching_pct?: number;
  lipid_uptake_factor?: number;
}
