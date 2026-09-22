import { describe, expect, it } from 'vitest';
import { evaluateEntericBioavailability } from '@/lib/clinicalAbsorptionEngine';
import {
  applyB12IfCap,
  collapseMicrosForFood,
  defaultHemeRatio,
  isSupplementLikeFood,
} from '@/lib/nutrientCanonical';
import { ClinicalPathologyState, MealContextState } from '@/types/bioavailability';

const path: ClinicalPathologyState = {
  gastricAcid: 'normochlorhydria',
  pathology: 'none',
  bileImpairment: false,
};

const ctx = (over: Partial<MealContextState> = {}): MealContextState => ({
  totalFatGrams: 10,
  totalCarbsGrams: 0,
  totalFiberGrams: 0,
  totalZincMg: 4,
  totalCopperMg: 0.5,
  totalIronMg: 3,
  totalCalciumMg: 50,
  totalVitaminCMg: 0,
  isPureAnimalFood: true,
  ...over,
});

describe('pipeline audit guards', () => {
  it('does not treat muscle iron as 100% heme', () => {
    expect(defaultHemeRatio('Grass-Fed Ribeye Steak', 'meat', 0)).toBeCloseTo(0.45);
    expect(defaultHemeRatio('Carrot (Raw)', 'vegetable', 0)).toBe(0);
    expect(defaultHemeRatio('Pastured Egg Yolk', 'dairy_egg', 0)).toBe(0);
  });

  it('blends heme and non-heme iron rates', () => {
    const mixed = evaluateEntericBioavailability('Iron', 'Iron', 'trace_mineral', path, ctx({ hemeIronFraction: 0.45 }));
    const plant = evaluateEntericBioavailability('Iron', 'Iron', 'trace_mineral', path, ctx({ isPureAnimalFood: false, hemeIronFraction: 0 }));
    expect(mixed.rateMin).toBeGreaterThan(plant.rateMin);
    expect(mixed.rateMax).toBeLessThan(0.35);
  });

  it('caps B12 above 1.5 µg', () => {
    expect(applyB12IfCap(1.0)).toBe(1);
    expect(applyB12IfCap(10)).toBeCloseTo(1.5 + 8.5 * 0.012);
  });

  it('does not double-count RAE when a RAE row exists', () => {
    const map = collapseMicrosForFood([
      { nutrient_name: 'Vitamin A, RAE', amount_per_100g: 835, unit: 'mcg', nutrient_category: 'fat_soluble_vitamin', chemical_form: 'RAE' },
      { nutrient_name: 'Carotene, beta', amount_per_100g: 8285, unit: 'mcg', nutrient_category: 'fat_soluble_vitamin', chemical_form: 'beta' },
    ]);
    expect(map.get('Vitamin A')?.amountPer100g).toBeCloseTo(835);
  });

  it('flags supplement-like foods so they are not treated as steak', () => {
    expect(isSupplementLikeFood('Zinc Picolinate')).toBe(true);
    expect(isSupplementLikeFood('Grass-Fed Ribeye Steak')).toBe(false);
  });

  it('cooked+fat plant A is higher than raw low-fat plant A', () => {
    const raw = evaluateEntericBioavailability('Vitamin A', 'RAE', 'fat_soluble_vitamin', path, ctx({ isPureAnimalFood: false, totalFatGrams: 0.2, carotenoidMatrixCooked: false }));
    const cooked = evaluateEntericBioavailability('Vitamin A', 'RAE', 'fat_soluble_vitamin', path, ctx({ isPureAnimalFood: false, totalFatGrams: 8, carotenoidMatrixCooked: true }));
    expect(cooked.rateMin).toBeGreaterThan(raw.rateMin);
  });
});
