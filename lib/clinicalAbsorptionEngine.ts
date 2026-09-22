import {
  CanonicalNutrient,
  NutrientCategory,
  ClinicalPathologyState,
  MealContextState,
} from '@/types/bioavailability';

export interface EntericAbsorptionResult {
  sanitizedChemicalForm: string;
  /** Midpoint used when a single number is required. */
  effectiveActiveRate: number;
  rateMin: number;
  rateMax: number;
  /** Post-absorption conversion to the named active species (RAE, 5-MTHF, P5P…). */
  conversionPhi: number;
  clinicalMechanismNotes: string[];
}

export interface CalorieAbsorptionProfile {
  proteinAbsorptionPct: number;
  fatAbsorptionPct: number;
  carbAbsorptionPct: number;
  netCalorieFactor: number;
  clinicalExplanation: string[];
}

/**
 * USDA Table of Nutrient Retention Factors (release 6) — compact classes.
 * Minerals barely leave the food unless cooking water is discarded.
 * Ascorbate / thiamin / folate leave with heat + leachate.
 */
export function retentionForNutrient(prepKey: string, nutrient: string): number {
  const p = (prepKey || 'raw').toLowerCase();
  const n = nutrient.toLowerCase();
  if (p === 'raw' || p.includes('supplement')) return 1;

  const waterLost = p.includes('discarded') || (p.includes('boiled') && p.includes('drain'));
  const waterKept = p.includes('consumed') || p.includes('stew') || p.includes('brais') || p.includes('sous');
  const highHeat = p.includes('grill') || p.includes('char') || p.includes('well-done');
  const moderateHeat = p.includes('roast') || p.includes('bake') || p.includes('fry') || p.includes('smoke') || p.includes('air');

  const waterSensitive =
    n.includes('vitamin c') ||
    n.includes('thiamin') ||
    n.includes('folate') ||
    n.includes('riboflavin') ||
    n.includes('b6') ||
    n.includes('pantothen');

  const mineral =
    n.includes('iron') ||
    n.includes('zinc') ||
    n.includes('copper') ||
    n.includes('magnesium') ||
    n.includes('calcium') ||
    n.includes('selenium') ||
    n.includes('potassium') ||
    n.includes('sodium') ||
    n.includes('phosphorus') ||
    n.includes('manganese') ||
    n.includes('iodine');

  const fatSol =
    n.includes('vitamin a') ||
    n.includes('vitamin d') ||
    n.includes('vitamin e') ||
    n.includes('vitamin k');

  if (mineral) {
    if (waterLost) return 0.80;
    if (waterKept) return 0.97;
    return 0.95;
  }
  if (waterSensitive) {
    if (waterLost) return n.includes('vitamin c') ? 0.40 : 0.50;
    if (waterKept) return 0.78;
    if (highHeat) return 0.55;
    if (moderateHeat) return 0.70;
    if (p.includes('steam')) return 0.82;
    return 0.75;
  }
  if (fatSol) {
    if (highHeat) return 0.88;
    if (moderateHeat) return 0.93;
    return 0.97;
  }
  if (n.includes('b12')) return waterLost ? 0.85 : 0.95;
  return 0.90;
}

export function evaluateCalorieMalabsorption(
  pathology: ClinicalPathologyState,
  _isPureAnimalFood: boolean
): CalorieAbsorptionProfile {
  let proteinPct = 0.95;
  let fatPct = 0.97;
  let carbPct = 0.98;
  const explanation: string[] = [];

  if (pathology.gastricAcid === 'hypochlorhydria') {
    proteinPct -= 0.10;
    explanation.push('Hypochlorhydria: lower pepsin activation (−10% protein).');
  } else if (pathology.gastricAcid === 'achlorhydria') {
    proteinPct -= 0.20;
    explanation.push('Achlorhydria: no gastric acid (−20% protein).');
  }

  if (pathology.pathology === 'sibo') {
    fatPct -= 0.18;
    explanation.push('SIBO: bile-salt deconjugation (−18% fat).');
  }
  if (pathology.pathology === 'crohns_celiac') {
    proteinPct -= 0.15;
    fatPct -= 0.15;
    carbPct -= 0.20;
    explanation.push('Villous atrophy: smaller absorptive surface.');
  } else if (pathology.pathology === 'ileal_resection') {
    fatPct -= 0.30;
    explanation.push('Ileal resection: bile-salt wasting (−30% fat).');
  }
  if (pathology.bileImpairment) {
    fatPct -= 0.12;
    explanation.push('Bile impairment: incomplete micelles (−12% fat).');
  }

  return {
    proteinAbsorptionPct: Math.max(0.5, Number(proteinPct.toFixed(2))),
    fatAbsorptionPct: Math.max(0.4, Number(fatPct.toFixed(2))),
    carbAbsorptionPct: Math.max(0.5, Number(carbPct.toFixed(2))),
    netCalorieFactor: Number(((proteinPct + fatPct + carbPct) / 3).toFixed(2)),
    clinicalExplanation: explanation,
  };
}

function clampRate(n: number): number {
  return Math.min(0.98, Math.max(0.01, Number(n.toFixed(3))));
}

/**
 * Hill-type ZIP4 saturation. Not a fitted paper constant —
 * shape matches declining Zn absorption as luminal Zn rises (Cousins / Hunt).
 */
function zip4Scale(totalZnMg: number): number {
  const km = 12;
  const excess = Math.max(0, totalZnMg - 8);
  return km / (km + excess);
}

export function evaluateEntericBioavailability(
  nutrient: CanonicalNutrient,
  chemicalForm: string,
  category: NutrientCategory,
  pathology: ClinicalPathologyState,
  context: MealContextState
): EntericAbsorptionResult {
  const notes: string[] = [];
  let formName = chemicalForm || 'Dietary form';
  let min = 0.45;
  let max = 0.65;
  let phi = 1;

  const animal = !!context.isPureAnimalFood;
  const form = (chemicalForm || '').toLowerCase();

  switch (nutrient) {
    case 'Vitamin A':
      if (animal) {
        min = 0.7;
        max = 0.9;
        phi = 1;
        formName = 'Preformed retinol / retinyl esters';
        notes.push('Animal retinol: IOM absorption ~70–90% with fat. Φ = 1.');
      } else {
        // Incoming amount should already be RAE (see collapseMicrosForFood).
        const fat = context.totalFatGrams || 0;
        const cooked = !!context.carotenoidMatrixCooked;
        if (cooked && fat >= 5) {
          min = 0.55;
          max = 0.95;
          notes.push('Cooked + fat: cell walls open and micelles form. Net often above raw and can beat IOM 12:1. Char only burns a slice of βC (~10–20%).');
        } else if (cooked) {
          min = 0.35;
          max = 0.7;
          notes.push('Cooked without much added fat still raises carotenoid bioaccess vs raw (Hedrén / Rock). Grill/char ≠ raw.');
        } else if (fat >= 5) {
          min = 0.3;
          max = 0.6;
          notes.push('Raw + fat helps micelles; intact raw matrix still limits uptake.');
        } else {
          min = 0.2;
          max = 0.45;
          notes.push('Raw, low fat: poorest carotenoid yield. Cooking or oil raises bar 2.');
        }
        phi = 1;
        formName = 'Provitamin A already as RAE';
      }
      break;

    case 'Vitamin D':
      min = 0.55;
      max = 0.8;
      formName = 'Cholecalciferol';
      break;

    case 'Vitamin E':
      min = 0.5;
      max = 0.8;
      break;

    case 'Vitamin K':
      min = animal ? 0.4 : 0.15;
      max = animal ? 0.7 : 0.4;
      notes.push(animal ? 'MK-4 from animal tissues.' : 'K1 absorption is incomplete and bile-dependent.');
      break;

    case 'Thiamine (B1)':
      if (form.includes('ttfd')) {
        min = 0.8;
        max = 0.95;
        formName = 'TTFD (supplement)';
      } else {
        min = 0.5;
        max = 0.8;
        notes.push('Food thiamin via THTR1/2; saturates at supplement doses.');
      }
      break;

    case 'Riboflavin (B2)':
      min = 0.6;
      max = 0.85;
      break;

    case 'Niacin (B3)':
      min = 0.55;
      max = 0.85;
      phi = animal ? 1 : 0.9;
      break;

    case 'Pantothenic Acid (B5)':
      min = 0.4;
      max = 0.6;
      break;

    case 'Vitamin B6':
      min = animal ? 0.7 : 0.4;
      max = animal ? 0.9 : 0.6;
      phi = animal ? 1 : 0.5;
      notes.push(animal ? 'Animal B6 is largely PLP/PMP (Φ≈1).' : 'Plant pyridoxine glycosides lower Φ to ~0.75.');
      break;

    case 'Biotin (B7)':
      min = 0.5;
      max = 0.8;
      break;

    case 'Folate (B9)':
      min = 0.4;
      max = 0.6;
      phi = 1;
      formName = 'Food folate / 5-MTHF';
      notes.push('Food-dose absorption ~50–70%. RDA is already DFE — no second 0.5 Φ.');
      break;

    case 'Vitamin B12':
      min = 0.45;
      max = 0.6;
      formName = 'Cobalamin (IF + passive)';
      notes.push('IF saturates near 1.5–2 µg; extra is ~1% passive. Cap applied after this rate.');
      break;

    case 'Vitamin C':
      min = 0.7;
      max = 0.9;
      notes.push('SVCT1 saturates at gram doses; food doses stay high.');
      break;

    case 'Choline':
      min = 0.6;
      max = 0.85;
      break;

    case 'Iron': {
      const hemeFrac =
        context.hemeIronFraction != null
          ? Math.min(1, Math.max(0, context.hemeIronFraction))
          : animal || form.includes('heme')
            ? 1
            : 0;
      const hMin = 0.15;
      const hMax = 0.35;
      const nMin = 0.03;
      const nMax = 0.12;
      min = hemeFrac * hMin + (1 - hemeFrac) * nMin;
      max = hemeFrac * hMax + (1 - hemeFrac) * nMax;
      formName = hemeFrac > 0.05 ? `Mixed iron (${Math.round(hemeFrac * 100)}% heme)` : 'Non-heme iron';
      notes.push(
        `Iron = heme×15–35% + non-heme×2–12% (Hunt/Hallberg). Muscle is not 100% heme.`
      );
      break;
    }

    case 'Zinc':
      min = animal ? 0.3 : 0.15;
      max = animal ? 0.5 : 0.3;
      {
        const z = zip4Scale(context.totalZincMg || 0);
        min *= z;
        max *= z;
        if ((context.totalZincMg || 0) > 12) {
          notes.push(
            `HEURISTIC_GROUP_10: ZIP4 Hill scale at ${context.totalZincMg.toFixed(1)} mg Zn — shape only, not a measured constant.`
          );
        }
      }
      break;

    case 'Copper':
      min = 0.5;
      max = 0.7;
      break;

    case 'Magnesium':
      min = animal ? 0.35 : 0.25;
      max = animal ? 0.5 : 0.4;
      break;

    case 'Calcium':
      min = 0.25;
      max = 0.4;
      notes.push('Typical adult Ca absorption 25–35%; higher if deficient or high 1,25-(OH)2-D.');
      break;

    case 'Selenium':
      min = 0.7;
      max = 0.9;
      break;

    case 'Iodine':
      min = 0.9;
      max = 0.98;
      break;

    case 'Chromium':
      if (form.includes('picolinate')) {
        min = 0.02;
        max = 0.05;
        formName = 'Chromium picolinate';
      } else {
        min = 0.005;
        max = 0.02;
      }
      break;

    case 'Molybdenum':
      min = 0.7;
      max = 0.93;
      break;

    case 'Manganese':
      min = 0.03;
      max = 0.08;
      break;

    case 'Phosphorus':
      min = 0.55;
      max = 0.7;
      break;

    case 'Potassium':
    case 'Sodium':
      min = 0.85;
      max = 0.95;
      break;

    default:
      min = 0.45;
      max = 0.7;
      break;
  }

  const oxalates = context.totalOxalatesMg || 0;
  if (oxalates > 50 && !animal) {
    if (nutrient === 'Calcium') {
      const penalty = Math.min(0.7, (oxalates / 250) * 0.5);
      min *= 1 - penalty;
      max *= 1 - penalty;
      notes.push(`Oxalate ${oxalates.toFixed(0)} mg binds Ca (−${Math.round(penalty * 100)}%).`);
    } else if (nutrient === 'Magnesium') {
      const penalty = Math.min(0.4, (oxalates / 300) * 0.3);
      min *= 1 - penalty;
      max *= 1 - penalty;
    }
  }

  if (context.coingestedTannins) {
    if (nutrient === 'Iron' && !formName.toLowerCase().includes('heme')) {
      min *= 0.35;
      max *= 0.45;
      notes.push('Tea/coffee tannins chelate non-heme Fe.');
    }
    if (nutrient === 'Thiamine (B1)' && !form.includes('ttfd')) {
      min *= 0.6;
      max *= 0.7;
    }
  }

  const phytates = context.totalPhytatesMg || 0;
  if (phytates > 100 && !animal) {
    if (nutrient === 'Zinc') {
      const penalty = Math.min(0.6, (phytates / 400) * 0.45);
      min *= 1 - penalty;
      max *= 1 - penalty;
      notes.push(`Phytate ${phytates.toFixed(0)} mg forms Zn complexes.`);
    } else if (nutrient === 'Iron' && !formName.toLowerCase().includes('heme')) {
      min *= 0.5;
      max *= 0.6;
      notes.push('Phytate blocks non-heme Fe reduction.');
    } else if (nutrient === 'Calcium') {
      min *= 0.85;
      max *= 0.9;
    }
  }

  if (nutrient === 'Iron' && !formName.toLowerCase().includes('heme')) {
    if ((context.totalCalciumMg || 0) > 350) {
      min *= 0.65;
      max *= 0.75;
      notes.push('Ca >350 mg competes at DMT1.');
    }
    if ((context.totalZincMg || 0) > 25) {
      min *= 0.75;
      max *= 0.85;
      notes.push('Zn >25 mg competes at DMT1.');
    }
    if ((context.totalVitaminCMg || 0) >= 50) {
      min *= 1.4;
      max *= 1.5;
      notes.push('Vitamin C ≥50 mg reduces Fe3+ → Fe2+.');
    }
  }

  if (nutrient === 'Copper') {
    const zn = context.totalZincMg || 0;
    const cu = Math.max(0.1, context.totalCopperMg || 0.1);
    const ratio = zn / cu;
    if (ratio > 20) {
      min *= 0.4;
      max *= 0.5;
      notes.push(`Zn:Cu ${ratio.toFixed(1)}:1 induces metallothionein (IOM caution ≥15–20:1).`);
    }
  }

  if (nutrient === 'Magnesium' && (context.totalCalciumMg || 0) > 800) {
    min *= 0.75;
    max *= 0.85;
    notes.push('Ca >800 mg modestly lowers Mg uptake.');
  }

  if (pathology.gastricAcid === 'hypochlorhydria' || pathology.gastricAcid === 'achlorhydria') {
    if (nutrient === 'Iron' && !formName.toLowerCase().includes('heme')) {
      min *= 0.4;
      max *= 0.5;
      notes.push('Low acid: non-heme Fe stays undissociated.');
    }
    if (nutrient === 'Calcium' && form.includes('carbonate')) {
      min *= 0.25;
      max *= 0.35;
    }
    if (nutrient === 'Vitamin B12') {
      min *= 0.3;
      max *= 0.4;
      notes.push('Low acid: B12 not freed from food protein.');
    }
    if (nutrient === 'Zinc' && !animal) {
      min *= 0.7;
      max *= 0.8;
    }
  }

  if (pathology.pathology === 'crohns_celiac') {
    min *= 0.6;
    max *= 0.7;
    notes.push('Villous atrophy cuts absorptive area.');
  }
  if (pathology.bileImpairment && category === 'fat_soluble_vitamin') {
    min *= 0.55;
    max *= 0.7;
    notes.push('Bile impairment: poor micelles for A/D/E/K.');
  }

  min = clampRate(min);
  max = clampRate(Math.max(min, max));
  const mid = clampRate((min + max) / 2);

  return {
    sanitizedChemicalForm: formName,
    effectiveActiveRate: mid,
    rateMin: min,
    rateMax: max,
    conversionPhi: phi,
    clinicalMechanismNotes: notes,
  };
}
