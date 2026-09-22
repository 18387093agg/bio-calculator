import { describe, it, expect } from 'vitest';
import {
  calculateDynamicTargets,
  calculatePRAL,
  evaluateMethylationDemand,
} from '../lib/metabolicEngine';
import {
  evaluateCalorieMalabsorption,
  evaluateEntericBioavailability,
} from '../lib/clinicalAbsorptionEngine';
import { calculateSupplementImpact } from '../lib/supplementRegistry';

describe('Enterprise Guardrails & Sanity Checks — Absolute Output Correctness', () => {

  it('GUARDRAIL: Prevents absurd magnesium telemetry spikes (Upper Bound < 1200mg)', () => {
    // Δοκιμή με ακραίο σενάριο υψηλών υδατανθράκων και πρωτεΐνης
    const targets = calculateDynamicTargets(
      { diet: 'high_carb', bodyWeightKg: 80, sex: 'male' },
      { proteinG: 200, carbsG: 800, fatG: 60, pufaG: 6, fiberG: 40, totalCalories: 4800 }
    );

    // Το βέλτιστο μαγνήσιο δεν πρέπει ποτέ να ξεπερνά τα λογικά φυσιολογικά όρια ή να χτυπάει "3000mg"
    expect(targets['magnesium'].effectiveOptimal).toBeLessThan(1200);
    expect(targets['magnesium'].effectiveOptimal).toBeGreaterThan(300);
  });

  it('GUARDRAIL: Enforces strict stoichiometry on Remer-Manz PRAL calculation', () => {
    const pralNormal = calculatePRAL({
      proteinG: 100,
      phosphorusMg: 1000,
      potassiumMg: 3500,
      magnesiumMg: 400,
      calciumMg: 1000,
    });

    // Ένα ισορροπημένο πιάτο πρέπει να δίνει λογικό PRAL score χωρίς ακραίες αποκλίσεις
    expect(pralNormal.score).toBeTypeOf('number');
    expect(Math.abs(pralNormal.score)).toBeLessThan(50);
  });

  it('GUARDRAIL: Validates Choline vs Methionine demand proportionality', () => {
    // 300g πρωτεΐνης -> ~7.8g Μεθειονίνη -> Απαίτηση χολίνης ακριβώς 3510mg
    const methylation = evaluateMethylationDemand(300, 500, 5, 10);
    
    expect(methylation.methionineLoadGrams).toBe(7.8);
    expect(methylation.minCholineRequiredMg).toBe(3510);
    expect(methylation.coveragePct).toBe(14); // 500 / 3510 = 14.2% -> 14%
    expect(methylation.isAdequate).toBe(false);
  });

  it('GUARDRAIL: Enforces SIBO and Celiac malabsorption degradation floors', () => {
    const profile = evaluateCalorieMalabsorption(
      { gastricAcid: 'hypochlorhydria', pathology: 'crohns_celiac', bileImpairment: true },
      false
    );

    // Οι συντελεστές απορρόφησης δεν πρέπει ποτέ να πέφτουν κάτω από το κλινικό ασφαλές κατώφλι (0.40)
    expect(profile.proteinAbsorptionPct).toBeGreaterThanOrEqual(0.50);
    expect(profile.fatAbsorptionPct).toBeGreaterThanOrEqual(0.40);
    expect(profile.netCalorieFactor).toBeGreaterThan(0.50);
  });

  it('GUARDRAIL: Caps D3 and TTFD Magnesium cofactor drains to prevent cascading overflows', () => {
    const impact = calculateSupplementImpact([
      { supplementId: 'vit_d3', dose: 20000, selectedUnit: 'IU' },
      { supplementId: 'b1_ttfd', dose: 300, selectedUnit: 'mg' },
    ]);

    // Η επιβάρυνση μαγνησίου από συμπληρώματα πρέπει να υπακούει σε αυστηρά ανώτατα όρια ασφαλείας
    const mgDrain = impact.totalCofactorSurcharges['magnesium']?.amount || 0;
    expect(mgDrain).toBeLessThanOrEqual(250);
  });

  it('GUARDRAIL: Verifies ZIP4 non-linear fractional absorption collapse under massive Zinc bolus', () => {
    const massiveBolus = evaluateEntericBioavailability(
      'Zinc',
      'Zinc Glycinate',
      'trace_mineral',
      { gastricAcid: 'normochlorhydria', pathology: 'none', bileImpairment: false },
      {
        totalFatGrams: 30,
        totalCarbsGrams: 0,
        totalFiberGrams: 0,
        totalZincMg: 100, // Τρομακτικό bolus 100mg
        totalCopperMg: 1.5,
        totalIronMg: 10,
        totalCalciumMg: 200,
        totalVitaminCMg: 30,
        isPureAnimalFood: true,
      }
    );

    // Η απορρόφηση πρέπει να πέσει στο ελάχιστο όριο κορεσμού (16%) λόγω ενδοκυττάρωσης ZIP4
    expect(massiveBolus.effectiveActiveRate).toBe(0.16);
  });

});