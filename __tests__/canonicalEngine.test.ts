import { describe, it, expect } from 'vitest';
import {
  canonicalizeMicroRow,
  collapseMicrosForFood,
  classifyTissue,
  imputeZoochemicals,
  applyB12IfCap,
  resolveFoodId,
  normalizePrepKey,
  defaultRetentionForPrep,
} from '../lib/nutrientCanonical';

describe('canonical micronutrient mapping', () => {
  it('does not add Vitamin A IU on top of RAE ug', () => {
    const collapsed = collapseMicrosForFood([
      { nutrient_name: 'Vitamin A', amount_per_100g: 4970, unit: 'ug' },
      { nutrient_name: 'Vitamin A, IU', amount_per_100g: 16900, unit: 'iu' },
      { nutrient_name: 'Retinol', amount_per_100g: 4950, unit: 'ug' },
    ]);
    expect(collapsed.get('Vitamin A')?.amountPer100g).toBe(4970);
  });

  it('converts Vitamin D IU to mcg and prefers D3', () => {
    const collapsed = collapseMicrosForFood([
      { nutrient_name: 'Vitamin D', amount_per_100g: 49, unit: 'iu' },
      { nutrient_name: 'Vitamin D3 (cholecalciferol)', amount_per_100g: 1.2, unit: 'ug' },
    ]);
    expect(collapsed.get('Vitamin D')?.amountPer100g).toBeCloseTo(1.2, 5);
    expect(collapsed.get('Vitamin D')?.unit).toBe('mcg');
  });

  it('converts IU-only Vitamin D', () => {
    const row = canonicalizeMicroRow({
      nutrient_name: 'Vitamin D',
      amount_per_100g: 40,
      unit: 'iu',
    });
    expect(row?.amountPer100g).toBeCloseTo(1.0, 5);
  });

  it('does not double-count folate food + folate B9', () => {
    const collapsed = collapseMicrosForFood([
      { nutrient_name: 'Folate (B9)', amount_per_100g: 290, unit: 'ug' },
      { nutrient_name: 'Folate, food', amount_per_100g: 290, unit: 'ug' },
      { nutrient_name: 'Folate, DFE', amount_per_100g: 290, unit: 'ug' },
      { nutrient_name: 'Folic acid', amount_per_100g: 0, unit: 'ug' },
    ]);
    expect(collapsed.get('Folate (B9)')?.amountPer100g).toBe(290);
  });

  it('maps Thiamine spelling to CanonicalNutrient Thiamine (B1)', () => {
    const row = canonicalizeMicroRow({
      nutrient_name: 'Thiamine (B1)',
      amount_per_100g: 0.26,
      unit: 'mg',
    });
    expect(row?.canon).toBe('Thiamine (B1)');
  });
});

describe('identity + imputation', () => {
  it('resolves by food_id first', () => {
    const id = resolveFoodId(
      { food_id: 'c349a3d4-55ad-4ad2-af3c-a0e013a17d5d', food_name: 'Beef' },
      [
        { id: 'aaa', name: 'Grass-Fed Beef' },
        { id: 'c349a3d4-55ad-4ad2-af3c-a0e013a17d5d', name: 'Beef Liver (Raw/Fresh)' },
      ]
    );
    expect(id).toBe('c349a3d4-55ad-4ad2-af3c-a0e013a17d5d');
  });

  it('aliases short sardine name', () => {
    const id = resolveFoodId(
      { food_name: 'Atlantic Sardines (Canned in Water/Oil)' },
      [{ id: 'sard', name: 'Atlantic Sardines (Canned with Bones in Water/Oil)' }]
    );
    expect(id).toBe('sard');
  });

  it('does not treat liver as muscle for carnitine rates', () => {
    expect(classifyTissue('Beef Liver (Raw/Fresh)')).toBe('liver');
    expect(classifyTissue('Grass-Fed Ribeye Steak')).toBe('ruminant_muscle');
    const liver = imputeZoochemicals('Beef Liver (Raw/Fresh)', 100);
    const steak = imputeZoochemicals('Grass-Fed Ribeye Steak', 100);
    expect(steak.creatineMg).toBeGreaterThan(liver.creatineMg);
    expect(liver.biotinMcg).toBeGreaterThan(0);
  });

  it('caps B12 IF absorption', () => {
    expect(applyB12IfCap(1.0)).toBe(1.0);
    expect(applyB12IfCap(10)).toBeCloseTo(1.5 + 8.5 * 0.012, 5);
  });

  it('normalizes cooking methods to a retention key', () => {
    expect(normalizePrepKey('Raw / Ωμό')).toBe('raw');
    expect(normalizePrepKey('Pan Fried / Tallow Seared')).toBe('pan fried / tallow seared');
    expect(defaultRetentionForPrep('boiled (broth discarded)')).toBe(0.6);
  });
});
