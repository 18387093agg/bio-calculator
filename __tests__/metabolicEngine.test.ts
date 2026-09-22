import { describe, it, expect } from 'vitest';
import {
  calculateDynamicTargets,
  evaluateMethylationDemand,
} from '../lib/metabolicEngine';
import {
  evaluateBiomarkerStatus,
  BiomarkerInput,
} from '../lib/bloodBiomarkerEngine';
import {
  evaluateCalorieMalabsorption,
  evaluateEntericBioavailability,
} from '../lib/clinicalAbsorptionEngine';
import { calculateSupplementImpact } from '../lib/supplementRegistry';

describe('Clinical Engine Suite - Exact Physiological Math Assertions', () => {

  it('calculates EXACT metabolic surcharges for 800g Carb Shock', () => {
    const targets = calculateDynamicTargets(
      { diet: 'high_carb', bodyWeightKg: 75, sex: 'male' },
      { proteinG: 120, carbsG: 800, fatG: 40, pufaG: 4, fiberG: 20, totalCalories: 4040 }
    );

    // B1: 2.0 base + (650 * 0.005) = 5.25 mg
    expect(targets['thiamineb1'].surcharge).toBe(3.25);
    expect(targets['thiamineb1'].effectiveOptimal).toBe(5.25);

    // Mg: 75 * 6.5 = 488 base + (550 * 0.4 = 220) = 708 mg
    expect(targets['magnesium'].surcharge).toBe(220);
    expect(targets['magnesium'].effectiveOptimal).toBe(708);
  });

  it('calculates EXACT transamination and methylation metrics for 300g Protein', () => {
    const targets = calculateDynamicTargets(
      { diet: 'carnivore', bodyWeightKg: 85, sex: 'male' },
      { proteinG: 300, carbsG: 0, fatG: 140, pufaG: 3, fiberG: 0, totalCalories: 2460 }
    );

    // B6: 1.5 + (3 * 0.8) = 3.9 mg
    expect(targets['vitaminb6'].effectiveOptimal).toBe(3.9);

    // Methylation: 300 * 0.026 = 7.8g Methionine -> 7.8 * 450 = 3510 mg Choline needed
    const methylation = evaluateMethylationDemand(300, 350, 5, 10);
    expect(methylation.methionineLoadGrams).toBe(7.8);
    expect(methylation.minCholineRequiredMg).toBe(3510);
    expect(methylation.coveragePct).toBe(10);
    expect(methylation.isAdequate).toBe(false);
  });

  it('calculates EXACT enteric calorie and macro absorption factors', () => {
    const compromised = evaluateCalorieMalabsorption(
      { gastricAcid: 'hypochlorhydria', pathology: 'sibo', bileImpairment: false },
      true
    );

    // Protein: 0.95 - 0.10 = 0.85
    expect(compromised.proteinAbsorptionPct).toBe(0.85);
    // Fat: 0.97 - 0.18 = 0.79
    expect(compromised.fatAbsorptionPct).toBe(0.79);
    // Net factor: (0.85 + 0.79 + 0.98) / 3 = 0.8733 -> 0.87
    expect(compromised.netCalorieFactor).toBe(0.87);
  });

  it('enforces exact 120mg sanity cap for 10,000 IU D3 Magnesium drain', () => {
    const impact = calculateSupplementImpact([
      { supplementId: 'vit_d3', dose: 10000, selectedUnit: 'IU' },
    ]);

    expect(impact.totalCofactorSurcharges['magnesium'].amount).toBe(120);
  });

  it('verifies exact inflammation masking logic for Ferritin with hs-CRP > 3.0', () => {
    const context: BiomarkerInput[] = [
      { markerName: 'Ferritin', compartment: 'serum', value: 340, unit: 'ng/mL', refLow: 30, refHigh: 200 },
      { markerName: 'hs-CRP', compartment: 'serum', value: 4.8, unit: 'mg/L', refLow: 0, refHigh: 1.0 },
    ];

    const verdict = evaluateBiomarkerStatus(context[0], context);
    expect(verdict?.status).toBe('unreliable_norm');
    expect(verdict?.dynamicTargetMultiplier).toBe(1.0);
  });

  it('penalizes Zinc absorption dynamically under high bolus via ZIP4 saturation kinetics', () => {
    // 1. Φυσιολογικό γεύμα (10mg Zn)
    const lowBolus = evaluateEntericBioavailability(
      'Zinc',
      'Zinc Glycinate',
      'trace_mineral',
      { gastricAcid: 'normochlorhydria', pathology: 'none', bileImpairment: false },
      {
        totalFatGrams: 30,
        totalCarbsGrams: 0,
        totalFiberGrams: 0,
        totalZincMg: 10,
        totalCopperMg: 1.5,
        totalIronMg: 10,
        totalCalciumMg: 200,
        totalVitaminCMg: 30,
        isPureAnimalFood: true,
      }
    );
    expect(lowBolus.effectiveActiveRate).toBe(0.48);

    // 2. Υπερβολικό bolus (52mg Zn)
    const highBolus = evaluateEntericBioavailability(
      'Zinc',
      'Zinc Glycinate',
      'trace_mineral',
      { gastricAcid: 'normochlorhydria', pathology: 'none', bileImpairment: false },
      {
        totalFatGrams: 30,
        totalCarbsGrams: 0,
        totalFiberGrams: 0,
        totalZincMg: 52,
        totalCopperMg: 1.5,
        totalIronMg: 10,
        totalCalciumMg: 200,
        totalVitaminCMg: 30,
        isPureAnimalFood: true,
      }
    );
    // 0.48 / (1 + (52 - 12) * 0.025) = 0.48 / 2.0 = 0.24
    expect(highBolus.effectiveActiveRate).toBe(0.24);
    expect(highBolus.clinicalMechanismNotes.some((n: string) => n.includes('Κορεσμός ZIP4'))).toBe(true);
  });

});
