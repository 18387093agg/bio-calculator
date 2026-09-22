import { CanonicalNutrient } from '@/types/bioavailability';

export type SupplementCategoryGroup = 
  | 'vitamins'
  | 'minerals'
  | 'electrolytes'
  | 'amino_derivatives'
  | 'antioxidants';

export interface SupplementDefinition {
  id: string;
  name: string;
  categoryGroup: SupplementCategoryGroup;
  targetNutrient: CanonicalNutrient;
  defaultUnit: 'mg' | 'mcg' | 'IU';
  supportedUnits: Array<'mg' | 'mcg' | 'IU'>;
  iuConversionFactor?: number;
  elementalRatio: number;
  baseAbsorptionRate: number;
  enzymaticConversionRate: number;
  conversionEnzyme?: string;
  osmoticDiarrheaRisk: boolean;
  osmoticThresholdMg?: number;
  drainCofactors?: Array<{
    nutrient: CanonicalNutrient;
    drainAmountPerUnit: number;
    clinicalMechanism: string;
  }>;
  clinicalNotes: string;
}

export interface SupplementEntryInput {
  supplementId: string;
  dose: number;
  selectedUnit?: 'mg' | 'mcg' | 'IU';
}

export interface CalculatedSupplementOutput {
  supplementId: string;
  name: string;
  targetNutrient: CanonicalNutrient;
  inputDose: number;
  unit: string;
  elementalAmount: number;
  netAbsorbedAmount: number;
  netCellularActiveAmount: number;
  warnings: string[];
  cofactorDrains: Array<{
    nutrient: CanonicalNutrient;
    additionalDemand: number;
    reason: string;
  }>;
}

export const MASTER_SUPPLEMENT_REGISTRY: SupplementDefinition[] = [
  // --- FAT SOLUBLE VITAMINS ---
  {
    id: 'vita_retinyl_palmitate',
    name: 'Retinyl Palmitate (Preformed A)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin A',
    defaultUnit: 'IU',
    supportedUnits: ['IU', 'mcg'],
    iuConversionFactor: 0.30,
    elementalRatio: 0.55,
    baseAbsorptionRate: 0.85,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Preformed retinol. Bypasses BCMO1 enzymatic cleavage.',
  },
  {
    id: 'vita_beta_carotene',
    name: 'Beta-Carotene (Isolated Provitamin A)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin A',
    defaultUnit: 'IU',
    supportedUnits: ['IU', 'mcg'],
    iuConversionFactor: 0.05,
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.25,
    enzymaticConversionRate: 0.083,
    conversionEnzyme: 'BCMO1',
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Plant precursor. Requires enzymatic cleavage by BCMO1 (12:1 ratio).',
  },
  {
    id: 'vit_d3',
    name: 'Vitamin D3 (Cholecalciferol)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin D',
    defaultUnit: 'IU',
    supportedUnits: ['IU', 'mcg'],
    iuConversionFactor: 0.025,
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.75,
    enzymaticConversionRate: 0.85,
    conversionEnzyme: 'CYP2R1 / CYP27B1',
    osmoticDiarrheaRisk: false,
    drainCofactors: [
      {
        nutrient: 'Magnesium',
        drainAmountPerUnit: 0.015,
        clinicalMechanism: 'CYP-hydroxylation reactions consume catalytic magnesium',
      },
    ],
    clinicalNotes: 'D3 activation consumes magnesium ions (~15mg per 1000 IU).',
  },
  {
    id: 'vit_k2_mk4',
    name: 'Vitamin K2 (Menaquinone-4 / MK-4)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin K',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg', 'mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.80,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Ancestral tissue isoform. Rapidly clears serum to activate Osteocalcin & MGP.',
  },
  {
    id: 'vit_k2_mk7',
    name: 'Vitamin K2 (Menaquinone-7 / MK-7)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin K',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.85,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Long half-life microbial form for sustained bone & vascular carboxylation.',
  },
  {
    id: 'vit_e_d_alpha',
    name: 'Natural Vitamin E (d-alpha-tocopherol)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin E',
    defaultUnit: 'IU',
    supportedUnits: ['IU', 'mg'],
    iuConversionFactor: 0.67,
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.65,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Natural RRR stereoisomer with maximal hepatic alpha-TTP binding affinity.',
  },

  // --- WATER SOLUBLE B-COMPLEX & VITAMIN C ---
  {
    id: 'b1_ttfd',
    name: 'TTFD (Thiamine Tetrahydrofurfuryl Disulfide)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Thiamine (B1)',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.85,
    baseAbsorptionRate: 0.90,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    drainCofactors: [
      {
        nutrient: 'Magnesium',
        drainAmountPerUnit: 0.40,
        clinicalMechanism: 'Thiamine Pyrophosphokinase (TPK) activation consumes Mg-ATP',
      },
      {
        nutrient: 'Potassium',
        drainAmountPerUnit: 0.80,
        clinicalMechanism: 'Accelerated Krebs cycle shifts potassium intracellularly',
      },
    ],
    clinicalNotes: 'Crosses blood-brain barrier via passive lipophilic diffusion.',
  },
  {
    id: 'b1_benfotiamine',
    name: 'Benfotiamine (Fat-Soluble B1)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Thiamine (B1)',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.70,
    baseAbsorptionRate: 0.80,
    enzymaticConversionRate: 0.95,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'High peripheral bioavailability. Blocks AGE product formation pathways.',
  },
  {
    id: 'b2_r5p',
    name: 'Riboflavin-5-Phosphate (Active B2)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Riboflavin (B2)',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.73,
    baseAbsorptionRate: 0.70,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Direct FAD/FMN coenzyme precursor for MTHFR and respiratory complex I.',
  },
  {
    id: 'b3_niacinamide',
    name: 'Niacinamide (Flush-Free B3)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Niacin (B3)',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.85,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Direct substrate for NAD+/NADH synthesis without prostaglandin flush.',
  },
  {
    id: 'b5_pantethine',
    name: 'Pantethine (Active Coenzyme A Precursor)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Pantothenic Acid (B5)',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.80,
    baseAbsorptionRate: 0.75,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Direct dimeric precursor to Coenzyme A for fatty acid beta-oxidation.',
  },
  {
    id: 'b6_p5p',
    name: 'Pyridoxal-5-Phosphate (P5P Active B6)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin B6',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.65,
    baseAbsorptionRate: 0.80,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Active coenzyme for amino acid transamination and neurotransmitter synthesis.',
  },
  {
    id: 'b7_biotin',
    name: 'Pure d-Biotin',
    categoryGroup: 'vitamins',
    targetNutrient: 'Biotin (B7)',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg', 'mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.85,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Essential prosthetic group for pyruvate and acetyl-CoA carboxylases.',
  },
  {
    id: 'b9_methylfolate',
    name: 'L-5-Methyltetrahydrofolate (5-MTHF)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Folate (B9)',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg'],
    elementalRatio: 0.85,
    baseAbsorptionRate: 0.90,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Bypasses MTHFR polymorphism. Direct methyl donor for methionine synthase.',
  },
  {
    id: 'b12_methylcobalamin',
    name: 'Methylcobalamin (Active B12)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin B12',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg', 'mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.50,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Active coenzyme for homocysteine remethylation.',
  },
  {
    id: 'b12_adenosylcobalamin',
    name: 'Adenosylcobalamin (Mitochondrial B12)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin B12',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg', 'mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.50,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Cofactor for methylmalonyl-CoA mutase in mitochondrial energy production.',
  },
  {
    id: 'vit_c_ascorbic',
    name: 'Ascorbic Acid (Pure L-Ascorbate)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Vitamin C',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.70,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: true,
    osmoticThresholdMg: 2000,
    clinicalNotes: 'Reduced ascorbic acid. Competes with glucose for cellular uptake via GLUT1/4.',
  },
  {
    id: 'choline_alpha_gpc',
    name: 'Alpha-GPC (L-Alpha Glycerylphosphorylcholine)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Choline',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.40,
    baseAbsorptionRate: 0.85,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'High-bioavailability choline donor crossing the blood-brain barrier.',
  },
  {
    id: 'choline_cdp',
    name: 'CDP-Choline (Citicoline)',
    categoryGroup: 'vitamins',
    targetNutrient: 'Choline',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.21,
    baseAbsorptionRate: 0.90,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Supports neuronal membrane phosphatidylcholine synthesis.',
  },

  // --- MINERALS & ELECTROLYTES ---
  {
    id: 'mg_bisglycinate',
    name: 'Magnesium Bisglycinate (TRAACS)',
    categoryGroup: 'minerals',
    targetNutrient: 'Magnesium',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.141,
    baseAbsorptionRate: 0.65,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'True amino acid chelate absorbed intact via PEPT1 dipeptide channels.',
  },
  {
    id: 'mg_malate',
    name: 'Magnesium Malate (Dimagnesium)',
    categoryGroup: 'minerals',
    targetNutrient: 'Magnesium',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.155,
    baseAbsorptionRate: 0.58,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Yields malic acid to support the citric acid cycle and ATP production.',
  },
  {
    id: 'mg_threonate',
    name: 'Magnesium L-Threonate (Magtein)',
    categoryGroup: 'minerals',
    targetNutrient: 'Magnesium',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.083,
    baseAbsorptionRate: 0.60,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Crosses blood-brain barrier to elevate cerebrospinal fluid magnesium levels.',
  },
  {
    id: 'zn_bisglycinate',
    name: 'Zinc Bisglycinate (Chelated)',
    categoryGroup: 'minerals',
    targetNutrient: 'Zinc',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.26,
    baseAbsorptionRate: 0.50,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    drainCofactors: [
      {
        nutrient: 'Copper',
        drainAmountPerUnit: 0.065,
        clinicalMechanism: 'Enterocyte metallothionein induction selectively traps copper',
      },
    ],
    clinicalNotes: 'Superior bioavailability without gastric irritation.',
  },
  {
    id: 'cu_bisglycinate',
    name: 'Copper Bisglycinate (Chelated)',
    categoryGroup: 'minerals',
    targetNutrient: 'Copper',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.10,
    baseAbsorptionRate: 0.60,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Chelated copper for ceruloplasmin synthesis and Zn:Cu ratio balancing.',
  },
  {
    id: 'fe_bisglycinate',
    name: 'Iron Bisglycinate (Ferrochel)',
    categoryGroup: 'minerals',
    targetNutrient: 'Iron',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.20,
    baseAbsorptionRate: 0.40,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Non-constipating chelated iron absorbed without DMT-1 competition.',
  },
  {
    id: 'ca_mcha',
    name: 'Microcrystalline Hydroxyapatite (MCHA Bone Calcium)',
    categoryGroup: 'minerals',
    targetNutrient: 'Calcium',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.25,
    baseAbsorptionRate: 0.40,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Whole-food bovine bone matrix providing physiological 2:1 Calcium to Phosphorus.',
  },
  {
    id: 'k_citrate',
    name: 'Potassium Citrate',
    categoryGroup: 'electrolytes',
    targetNutrient: 'Potassium',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.383,
    baseAbsorptionRate: 0.90,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Alkalinizing potassium salt. Counteracts renal acid load (PRAL).',
  },
  {
    id: 'na_chloride',
    name: 'Sodium Chloride (Electrolyte Salt)',
    categoryGroup: 'electrolytes',
    targetNutrient: 'Sodium',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.393,
    baseAbsorptionRate: 0.98,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Essential for maintaining extracellular fluid volume and adrenal aldosterone balance.',
  },
  {
    id: 'se_selenomethionine',
    name: 'L-Selenomethionine',
    categoryGroup: 'minerals',
    targetNutrient: 'Selenium',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg'],
    elementalRatio: 0.40,
    baseAbsorptionRate: 0.90,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Organic selenium incorporated directly into glutathione peroxidase enzymes.',
  },
  {
    id: 'i_potassium_iodide',
    name: 'Potassium Iodide',
    categoryGroup: 'minerals',
    targetNutrient: 'Iodine',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg'],
    elementalRatio: 0.764,
    baseAbsorptionRate: 0.95,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Inorganic iodide for thyroid hormone (T3/T4) synthesis.',
  },
  {
    id: 'mn_bisglycinate',
    name: 'Manganese Bisglycinate',
    categoryGroup: 'minerals',
    targetNutrient: 'Manganese',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.16,
    baseAbsorptionRate: 0.30,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Cofactor for mitochondrial superoxide dismutase (MnSOD) and arginase.',
  },
  {
    id: 'cr_picolinate',
    name: 'Chromium Picolinate',
    categoryGroup: 'minerals',
    targetNutrient: 'Chromium',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg'],
    elementalRatio: 0.12,
    baseAbsorptionRate: 0.035,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Binds chromodulin to amplify insulin receptor tyrosine kinase activity.',
  },
  {
    id: 'mo_glycinate',
    name: 'Molybdenum Glycinate (TRAACS)',
    categoryGroup: 'minerals',
    targetNutrient: 'Molybdenum',
    defaultUnit: 'mcg',
    supportedUnits: ['mcg'],
    elementalRatio: 0.10,
    baseAbsorptionRate: 0.85,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Essential cofactor for sulfite oxidase in sulfur amino acid metabolism.',
  },

  // --- ZOOCHEMICALS & BIOACTIVES ---
  {
    id: 'creatine_monohydrate',
    name: 'Creatine Monohydrate (Creapure)',
    categoryGroup: 'amino_derivatives',
    targetNutrient: 'Creatine',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.88,
    baseAbsorptionRate: 0.98,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Cellular energy buffer regenerates ATP during anaerobic demands.',
  },
  {
    id: 'l_carnosine',
    name: 'L-Carnosine',
    categoryGroup: 'amino_derivatives',
    targetNutrient: 'Carnosine',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.70,
    enzymaticConversionRate: 0.85,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Histidine dipeptide protecting against protein glycation and cross-linking.',
  },
  {
    id: 'coq10_ubiquinol',
    name: 'Coenzyme Q10 (Ubiquinol Active Form)',
    categoryGroup: 'antioxidants',
    targetNutrient: 'CoQ10',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.35,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Reduced electron carrier for mitochondrial electron transport chain complex III.',
  },
  {
    id: 'carnitine_alcar',
    name: 'Acetyl-L-Carnitine (ALCAR)',
    categoryGroup: 'amino_derivatives',
    targetNutrient: 'Carnitine',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 0.85,
    baseAbsorptionRate: 0.75,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Transports long-chain fatty acids into mitochondria for beta-oxidation.',
  },
  {
    id: 'taurine_pure',
    name: 'Pure Taurine Powder',
    categoryGroup: 'amino_derivatives',
    targetNutrient: 'Taurine',
    defaultUnit: 'mg',
    supportedUnits: ['mg'],
    elementalRatio: 1.0,
    baseAbsorptionRate: 0.90,
    enzymaticConversionRate: 1.0,
    osmoticDiarrheaRisk: false,
    clinicalNotes: 'Essential for bile acid conjugation (taurocholic acid) and cellular osmoprotection.',
  },
];

export function calculateSupplementImpact(
  supplements: SupplementEntryInput[]
): {
  items: CalculatedSupplementOutput[];
  totalActiveNutrientYield: Record<string, number>;
  totalCofactorSurcharges: Record<string, { amount: number; reasons: string[] }>;
  criticalWarnings: string[];
} {
  const items: CalculatedSupplementOutput[] = [];
  const totalActiveNutrientYield: Record<string, number> = {};
  const totalCofactorSurcharges: Record<string, { amount: number; reasons: string[] }> = {};
  const criticalWarnings: string[] = [];

  supplements.forEach((entry) => {
    const def = MASTER_SUPPLEMENT_REGISTRY.find((s) => s.id === entry.supplementId);
    if (!def || entry.dose <= 0) return;

    const currentUnit = entry.selectedUnit || def.defaultUnit;
    const warnings: string[] = [];
    const drains: CalculatedSupplementOutput['cofactorDrains'] = [];

    let standardizedDose = entry.dose;
    if (currentUnit === 'IU' && def.iuConversionFactor) {
      standardizedDose = entry.dose * def.iuConversionFactor;
    }

    const elemental = standardizedDose * def.elementalRatio;
    const absorbed = elemental * def.baseAbsorptionRate;
    const netCellular = absorbed * def.enzymaticConversionRate;

    if (def.drainCofactors && def.drainCofactors.length > 0) {
      def.drainCofactors.forEach((drain) => {
        let rawExtraDemand = 0;

        if (def.targetNutrient === 'Vitamin D' && drain.nutrient === 'Magnesium') {
          const actualIUDose = currentUnit === 'IU' ? entry.dose : entry.dose / (def.iuConversionFactor || 0.025);
          rawExtraDemand = Math.min(120, Math.round((actualIUDose / 1000) * 15));
        } else if (drain.nutrient === 'Magnesium') {
          rawExtraDemand = Math.min(100, Math.round((elemental / 100) * 40));
        } else if (drain.nutrient === 'Copper') {
          rawExtraDemand = Math.min(3.0, Number(((elemental / 15) * 1.0).toFixed(1)));
        } else {
          rawExtraDemand = Math.round(entry.dose * drain.drainAmountPerUnit);
        }

        const extraDemand = Math.max(0, rawExtraDemand);

        drains.push({
          nutrient: drain.nutrient,
          additionalDemand: extraDemand,
          reason: drain.clinicalMechanism,
        });

        const key = drain.nutrient.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!totalCofactorSurcharges[key]) {
          totalCofactorSurcharges[key] = { amount: 0, reasons: [] };
        }
        totalCofactorSurcharges[key].amount += extraDemand;
        totalCofactorSurcharges[key].reasons.push(`${def.name}: +${extraDemand}mg ${drain.nutrient}`);
      });
    }

    const canonKey = def.targetNutrient.toLowerCase().replace(/[^a-z0-9]/g, '');
    totalActiveNutrientYield[canonKey] = (totalActiveNutrientYield[canonKey] || 0) + netCellular;

    items.push({
      supplementId: def.id,
      name: def.name,
      targetNutrient: def.targetNutrient,
      inputDose: entry.dose,
      unit: currentUnit,
      elementalAmount: Number(elemental.toFixed(1)),
      netAbsorbedAmount: Number(absorbed.toFixed(1)),
      netCellularActiveAmount: Number(netCellular.toFixed(1)),
      warnings,
      cofactorDrains: drains,
    });
  });

  return {
    items,
    totalActiveNutrientYield,
    totalCofactorSurcharges,
    criticalWarnings,
  };
}