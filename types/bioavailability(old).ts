// ============================================================================
// 1. MICRONUTRIENT & SPECIES DEFINITIONS (CANONICAL CATALOG)
// ============================================================================

export type CanonicalNutrient =
  // Fat-Soluble Vitamins
  | 'Vitamin A'
  | 'Vitamin D'
  | 'Vitamin E'
  | 'Vitamin K'
  // Water-Soluble B-Complex
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
  // Macro-Minerals & Electrolytes
  | 'Calcium'
  | 'Magnesium'
  | 'Phosphorus'
  | 'Potassium'
  | 'Sodium'
  | 'Chloride'
  | 'Sulfur'
  // Essential Trace Elements
  | 'Iron'
  | 'Zinc'
  | 'Copper'
  | 'Selenium'
  | 'Iodine'
  | 'Manganese'
  | 'Molybdenum'
  | 'Chromium'
  // Conditionally Essential Zoochemicals & Bioactives
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

// ============================================================================
// 2. CLINICAL PATHOLOGY & ABSORPTION PENALTY PROFILES
// ============================================================================

export type GastricAcidStatus =
  | 'normochlorhydria'   // pH 1.5 - 2.5 (Normal)
  | 'hypochlorhydria'    // pH > 3.0 / PPI use / Elderly (Impaired proteolysis & ionization)
  | 'achlorhydria';      // Complete absence of gastric acid

export type GutPathology =
  | 'none'
  | 'sibo'               // Small Intestinal Bacterial Overgrowth (B12 scavenging + bile deconjugation)
  | 'crohns_celiac'      // Villous atrophy / proximal duodenal damage (Fe, Folate, Ca malabsorption)
  | 'ileal_resection';   // Terminal ileal loss (Intrinsic factor-B12 receptor & bile pool loss)

export interface ClinicalPathologyState {
  gastricAcid: GastricAcidStatus;
  pathology: GutPathology;
  bileImpairment: boolean; // Gallbladder removed / cholestasis
}

// ============================================================================
// 3. CHEMICAL CONVERSION & MATRIX TELEMETRY
// ============================================================================

export interface FormConversionDetail {
  speciesName: string;            // e.g., "Beta-Carotene" vs "Retinyl Palmitate"
  origin: NutrientOrigin;
  grossAmount: number;
  conversionRatio: number;        // e.g., 0.083 (12:1) for beta-carotene to retinol
  effectiveNet: number;           // Converted bioactive equivalent
  absorptionPenaltyPct: number;   // Steric/phytate/oxalate chelation loss
}

export interface ConsolidatedNutrientResult {
  nutrientName: CanonicalNutrient;
  category: NutrientCategory;
  unit: 'mg' | 'mcg' | 'IU' | 'g';
  totalGross: number;
  
  // Useful Net Bioavailable Range
  netEffectiveMin: number;
  netEffectiveMax: number;
  
  // Baseline vs Dynamic Target
  baseTarget: number;
  effectiveTarget: number;
  coveragePctMin: number;
  coveragePctMax: number;
  
  // Form breakdown
  animalPreformedAmount: number;
  plantPrecursorAmount: number;
  activeSpeciesList: FormConversionDetail[];
  
  // Matrix warnings & interactions
  matrixStatus: 'Optimal' | 'Ratio Loss' | 'Inhibited' | 'Enhanced' | 'Cheleated';
  clinicalNotes?: string;
}

// ============================================================================
// 4. MEAL CONTEXT & DTO CONTRACTS
// ============================================================================

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
}

export interface MealItemInput {
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