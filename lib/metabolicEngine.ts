import { CanonicalNutrient } from '@/types/bioavailability';

export interface UserMetabolicProfile {
  diet: 'carnivore' | 'keto' | 'paleo' | 'mediterranean' | 'high_carb' | 'vegetarian';
  bodyWeightKg: number;
  sex: 'male' | 'female';
}

export interface MealMacroProfile {
  proteinG: number;
  carbsG: number;
  fatG: number;
  pufaG: number;
  fiberG: number;
  totalCalories: number;
}

export interface DynamicTargetDetail {
  effectiveRda: number;
  baseOptimal: number;
  effectiveOptimal: number;
  upperTolerableLimit: number;
  surcharge?: number;
  triggerReason?: string;
}

export function calculateDynamicTargets(
  user: UserMetabolicProfile,
  macros: MealMacroProfile
): Record<string, DynamicTargetDetail> {
  const weight = Math.max(30, Math.min(250, user.bodyWeightKg || 70));
  const isFemale = user.sex === 'female';

  const targets: Record<string, DynamicTargetDetail> = {};

  // 1. FAT-SOLUBLE VITAMINS
  targets['vitamina'] = { effectiveRda: 900, baseOptimal: 1500, effectiveOptimal: 1500, upperTolerableLimit: 3000 };
  targets['vitamind'] = { effectiveRda: 20.0, baseOptimal: 75.0, effectiveOptimal: 75.0, upperTolerableLimit: 250.0 };
  targets['vitamine'] = { effectiveRda: 15, baseOptimal: 25, effectiveOptimal: 25, upperTolerableLimit: 300 };
  targets['vitamink'] = { effectiveRda: 120, baseOptimal: 180, effectiveOptimal: 180, upperTolerableLimit: 1000 };

  // 2. WATER-SOLUBLE B-COMPLEX & C
  const baseB1 = 2.5;
  let b1Surcharge = 0;
  if (macros.carbsG > 150) b1Surcharge = Number(((macros.carbsG - 150) * 0.005).toFixed(2));
  targets['thiamineb1'] = {
    effectiveRda: 1.2,
    baseOptimal: baseB1,
    surcharge: b1Surcharge,
    effectiveOptimal: Number((baseB1 + b1Surcharge).toFixed(2)),
    upperTolerableLimit: 100,
    triggerReason: b1Surcharge > 0 ? `+${b1Surcharge}mg (Carb metabolic flux)` : undefined,
  };

  targets['riboflavinb2'] = { effectiveRda: 1.3, baseOptimal: 2.2, effectiveOptimal: 2.2, upperTolerableLimit: 100 };
  targets['niacinb3'] = { effectiveRda: 16, baseOptimal: 25, effectiveOptimal: 25, upperTolerableLimit: 35 };
  targets['pantothenicacidb5'] = { effectiveRda: 5.0, baseOptimal: 8.0, effectiveOptimal: 8.0, upperTolerableLimit: 100 };

  const b6Opt = Number((1.7 + (macros.proteinG / 100) * 0.8).toFixed(1));
  targets['vitaminb6'] = {
    effectiveRda: 1.7,
    baseOptimal: 3.5,
    effectiveOptimal: Math.max(3.5, b6Opt),
    upperTolerableLimit: 100.0,
    triggerReason: macros.proteinG > 150 ? 'Protein transamination (P5P demand)' : undefined,
  };

  targets['biotinb7'] = { effectiveRda: 30, baseOptimal: 60, effectiveOptimal: 60, upperTolerableLimit: 500 };
  targets['folateb9'] = { effectiveRda: 400, baseOptimal: 600, effectiveOptimal: 600, upperTolerableLimit: 1000 };
  targets['vitaminb12'] = { effectiveRda: 2.4, baseOptimal: 6.0, effectiveOptimal: 6.0, upperTolerableLimit: 100 };
  targets['vitaminc'] = { effectiveRda: 90, baseOptimal: 150, effectiveOptimal: 150, upperTolerableLimit: 2000 };

  // 3. CHOLINE & METHYLATION
  const baseCholine = isFemale ? 425 : 550;
  let cholineSurcharge = 0;
  if (macros.proteinG > 180) cholineSurcharge = Math.round((macros.proteinG - 180) * 1.2);
  targets['choline'] = {
    effectiveRda: baseCholine,
    baseOptimal: baseCholine + 100,
    effectiveOptimal: baseCholine + 100 + cholineSurcharge,
    upperTolerableLimit: 3500,
    triggerReason: cholineSurcharge > 0 ? `+${cholineSurcharge}mg (SAMe buffering)` : undefined,
  };

  // 4. MACRO-MINERALS & ELECTROLYTES
  targets['calcium'] = { effectiveRda: 1000, baseOptimal: 1200, effectiveOptimal: 1200, upperTolerableLimit: 2500 };
  targets['phosphorus'] = { effectiveRda: 700, baseOptimal: 1200, effectiveOptimal: 1200, upperTolerableLimit: 4000 };
  targets['potassium'] = { effectiveRda: 2600, baseOptimal: 3800, effectiveOptimal: 3800, upperTolerableLimit: 6000 };
  targets['sodium'] = {
    effectiveRda: 1500,
    baseOptimal: user.diet === 'carnivore' || user.diet === 'keto' ? 4500 : 3500,
    effectiveOptimal: user.diet === 'carnivore' || user.diet === 'keto' ? 4500 : 3500,
    upperTolerableLimit: 7000,
  };
  targets['chloride'] = { effectiveRda: 2300, baseOptimal: 3400, effectiveOptimal: 3400, upperTolerableLimit: 6000 };
  targets['sulfur'] = { effectiveRda: 800, baseOptimal: 1200, effectiveOptimal: 1200, upperTolerableLimit: 3000 };

  const baseMgOpt = Math.round(weight * 6.5);
  let mgSurcharge = 0;
  const mgReasons: string[] = [];
  if (macros.carbsG > 250) {
    const extra = Math.round((macros.carbsG - 250) * 0.4);
    mgSurcharge += extra;
    mgReasons.push(`+${extra}mg (Glycolysis)`);
  }
  if (macros.proteinG > weight * 2.2) {
    mgSurcharge += 50;
    mgReasons.push('+50mg (Urea synthesis)');
  }
  targets['magnesium'] = {
    effectiveRda: Math.round(weight * 5.0),
    baseOptimal: baseMgOpt,
    surcharge: mgSurcharge,
    effectiveOptimal: baseMgOpt + mgSurcharge,
    upperTolerableLimit: 1200,
    triggerReason: mgReasons.length > 0 ? mgReasons.join(', ') : undefined,
  };

  // 5. TRACE MINERALS
  const ironRda = isFemale ? 18.0 : 8.0;
  const ironOpt = isFemale ? 20.0 : 15.0;
  targets['iron'] = { effectiveRda: ironRda, baseOptimal: ironOpt, effectiveOptimal: ironOpt, upperTolerableLimit: 45.0 };

  const znOpt = Math.max(15, Math.round(weight * 0.22));
  targets['zinc'] = { effectiveRda: isFemale ? 8.0 : 11.0, baseOptimal: znOpt, effectiveOptimal: znOpt, upperTolerableLimit: 40.0 };
  targets['copper'] = { effectiveRda: 0.9, baseOptimal: 2.0, effectiveOptimal: 2.0, upperTolerableLimit: 10.0 };
  targets['selenium'] = { effectiveRda: 55.0, baseOptimal: 125.0, effectiveOptimal: 125.0, upperTolerableLimit: 400.0 };
  targets['iodine'] = { effectiveRda: 150.0, baseOptimal: 250.0, effectiveOptimal: 250.0, upperTolerableLimit: 1100.0 };
  targets['manganese'] = { effectiveRda: 2.3, baseOptimal: 3.0, effectiveOptimal: 3.0, upperTolerableLimit: 11.0 };
  targets['chromium'] = { effectiveRda: 35.0, baseOptimal: 120.0, effectiveOptimal: 120.0, upperTolerableLimit: 1000.0 };
  targets['molybdenum'] = { effectiveRda: 45.0, baseOptimal: 90.0, effectiveOptimal: 90.0, upperTolerableLimit: 2000.0 };

  // 6. ZOOCHEMICALS & BIOACTIVES
  targets['creatine'] = { effectiveRda: 1500, baseOptimal: 3000, effectiveOptimal: 3000, upperTolerableLimit: 10000 };
  targets['carnosine'] = { effectiveRda: 250, baseOptimal: 500, effectiveOptimal: 500, upperTolerableLimit: 2000 };
  targets['coq10'] = { effectiveRda: 30, baseOptimal: 100, effectiveOptimal: 100, upperTolerableLimit: 500 };
  targets['carnitine'] = { effectiveRda: 200, baseOptimal: 500, effectiveOptimal: 500, upperTolerableLimit: 2000 };
  targets['taurine'] = { effectiveRda: 500, baseOptimal: 1000, effectiveOptimal: 1000, upperTolerableLimit: 3000 };

  return targets;
}

export function calculatePRAL(nutrients: {
  proteinG: number;
  phosphorusMg: number;
  potassiumMg: number;
  magnesiumMg: number;
  calciumMg: number;
}) {
  // Κλινική εξίσωση Remer & Manz: PRAL (mEq/d)
  const pral =
    nutrients.proteinG * 0.4888 +
    nutrients.phosphorusMg * 0.0366 -
    nutrients.potassiumMg * 0.0205 -
    nutrients.magnesiumMg * 0.0263 -
    nutrients.calciumMg * 0.0125;

  const score = Number(pral.toFixed(1));
  let status: 'Acidic' | 'Neutral' | 'Alkaline' = 'Neutral';

  if (score > 10) status = 'Acidic';
  else if (score < -10) status = 'Alkaline';

  return { score, status };
}

export function evaluateMethylationDemand(
  proteinG: number,
  cholineMg: number,
  b6Mg: number,
  b12Mcg: number
) {
  const methionineLoad = Number((proteinG * 0.026).toFixed(2));
  const minCholineRequired = Math.round(methionineLoad * 450);
  const coveragePct = Math.min(100, Math.round((cholineMg / Math.max(1, minCholineRequired)) * 100));

  return {
    methionineLoadGrams: methionineLoad,
    minCholineRequiredMg: minCholineRequired,
    currentCholineMg: cholineMg,
    coveragePct,
    isAdequate: coveragePct >= 80,
  };
}