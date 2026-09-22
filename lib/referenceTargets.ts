import { CanonicalNutrient } from '@/types/bioavailability';

/**
 * Healthy-adult mixed-diet bioavailability assumed when IOM/EFSA set
 * *intake* RDAs. Not the meal’s diseased / phytate-adjusted rate.
 *
 * Tissue target = intake_RDA × refAbsorb × refPhi
 * Meal net      = gross × mealAbsorb × mealPhi
 *
 * Coverage_tissue = net / tissue_target
 * Coverage_intake = gross / intake_RDA
 *
 * If you multiplied the RDA by the *meal* factors, both coverages
 * would always be identical. That is why the reference rates stay fixed.
 */
export const REFERENCE_BIOAVAILABILITY: Record<
  string,
  { absMin: number; absMax: number; phi: number }
> = {
  'Vitamin A': { absMin: 0.7, absMax: 0.9, phi: 1 },
  'Vitamin D': { absMin: 0.55, absMax: 0.8, phi: 1 },
  'Vitamin E': { absMin: 0.5, absMax: 0.8, phi: 1 },
  'Vitamin K': { absMin: 0.3, absMax: 0.6, phi: 1 },
  'Vitamin C': { absMin: 0.7, absMax: 0.9, phi: 1 },
  'Thiamine (B1)': { absMin: 0.5, absMax: 0.8, phi: 1 },
  'Riboflavin (B2)': { absMin: 0.6, absMax: 0.85, phi: 1 },
  'Niacin (B3)': { absMin: 0.55, absMax: 0.85, phi: 1 },
  'Pantothenic Acid (B5)': { absMin: 0.4, absMax: 0.6, phi: 1 },
  'Vitamin B6': { absMin: 0.6, absMax: 0.85, phi: 0.9 },
  'Biotin (B7)': { absMin: 0.5, absMax: 0.8, phi: 1 },
  'Folate (B9)': { absMin: 0.5, absMax: 0.7, phi: 1 },
  'Vitamin B12': { absMin: 0.45, absMax: 0.55, phi: 1 },
  Choline: { absMin: 0.6, absMax: 0.85, phi: 1 },
  Calcium: { absMin: 0.25, absMax: 0.35, phi: 1 },
  Magnesium: { absMin: 0.3, absMax: 0.45, phi: 1 },
  Phosphorus: { absMin: 0.55, absMax: 0.7, phi: 1 },
  Potassium: { absMin: 0.85, absMax: 0.95, phi: 1 },
  Sodium: { absMin: 0.9, absMax: 0.98, phi: 1 },
  Iron: { absMin: 0.1, absMax: 0.18, phi: 1 },
  Zinc: { absMin: 0.25, absMax: 0.4, phi: 1 },
  Copper: { absMin: 0.5, absMax: 0.7, phi: 1 },
  Selenium: { absMin: 0.7, absMax: 0.9, phi: 1 },
  Iodine: { absMin: 0.9, absMax: 0.98, phi: 1 },
  Manganese: { absMin: 0.03, absMax: 0.08, phi: 1 },
  Molybdenum: { absMin: 0.7, absMax: 0.93, phi: 1 },
  Chromium: { absMin: 0.005, absMax: 0.02, phi: 1 },
  Carnitine: { absMin: 0.6, absMax: 0.85, phi: 1 },
  Taurine: { absMin: 0.7, absMax: 0.95, phi: 1 },
  Creatine: { absMin: 0.8, absMax: 0.95, phi: 1 },
  Carnosine: { absMin: 0.5, absMax: 0.8, phi: 1 },
  CoQ10: { absMin: 0.03, absMax: 0.1, phi: 1 },
};

export function referenceFactors(name: string): { absMin: number; absMax: number; phi: number } {
  return REFERENCE_BIOAVAILABILITY[name] || { absMin: 0.5, absMax: 0.7, phi: 1 };
}

export function scaleIntakeToAbsorbed(
  intake: number,
  name: CanonicalNutrient | string,
  which: 'min' | 'max' | 'mid' = 'mid'
): number {
  const r = referenceFactors(name);
  const abs = which === 'min' ? r.absMin : which === 'max' ? r.absMax : (r.absMin + r.absMax) / 2;
  return Number((intake * abs).toFixed(4));
}

export function scaleIntakeToTissue(
  intake: number,
  name: CanonicalNutrient | string,
  which: 'min' | 'max' | 'mid' = 'mid'
): number {
  const r = referenceFactors(name);
  return Number((scaleIntakeToAbsorbed(intake, name, which) * r.phi).toFixed(4));
}
