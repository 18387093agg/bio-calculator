import { CanonicalNutrient } from '@/types/bioavailability';

export interface BiomarkerInput {
  markerName: string;
  compartment: 'serum' | 'wbc_intracellular' | 'rbc_intracellular';
  value: number;
  unit: string;
  refLow: number;
  refHigh: number;
}

export interface BiomarkerClinicalVerdict {
  targetNutrient: CanonicalNutrient;
  status: 'deficient' | 'optimal' | 'excess' | 'unreliable_norm';
  dynamicTargetMultiplier: number;
  absorptionMultiplier?: number;
  clinicalInsight: string;
  evidenceType: 'human_intervention' | 'clinical_guideline' | 'population_reference' | 'biomarker_derived' | 'mechanistic_approximation' | 'fitted_calibration' | 'mathematical_derivation' | 'heuristic' | 'unsupported';
  evidenceNote?: string;
}

const WATER_OR_MINERAL = [
  'zinc', 'copper', 'magnesium', 'potassium', 'selenium', 'iron', 'calcium',
  'phosphorus', 'sodium', 'manganese', 'molybdenum', 'chromium', 'iodine',
  'thiamin', 'riboflavin', 'niacin', 'pantothen', 'pyridox', 'biotin', 'folat',
  'cobalamin', 'b12', 'b6', 'b9', 'b1', 'b2', 'b3', 'b5', 'b7', 'choline',
  'vitamin c', 'ascorb', 'carnitine', 'taurine', 'coq',
];

function n(s: string): string {
  return (s || '').toLowerCase();
}
function find(ctx: BiomarkerInput[], ...keys: string[]): BiomarkerInput | undefined {
  return ctx.find((m) => keys.some((k) => n(m.markerName).includes(k)));
}
function low(m?: BiomarkerInput): boolean {
  return !!m && m.value < m.refLow;
}
function high(m?: BiomarkerInput): boolean {
  return !!m && m.value > m.refHigh;
}
function inRange(m?: BiomarkerInput): boolean {
  return !!m && m.value >= m.refLow && m.value <= m.refHigh;
}
function isIntra(m: BiomarkerInput): boolean {
  return m.compartment === 'rbc_intracellular' || m.compartment === 'wbc_intracellular';
}

export function evaluateBiomarkerStatus(
  marker: BiomarkerInput,
  contextMarkers: BiomarkerInput[]
): BiomarkerClinicalVerdict | null {
  const ctx = [marker, ...contextMarkers];
  const name = n(marker.markerName);

  if (
    name.includes('ferritin') ||
    name.includes('tsat') ||
    name.includes('tibc') ||
    name.includes('transferrin') ||
    name.includes('serum iron') ||
    name === 'iron'
  ) {
    return ironPanel(marker, ctx);
  }
  if (
    name.includes('hemoglobin') ||
    name.includes('haemoglobin') ||
    name === 'hgb' ||
    name.includes('rbc') ||
    name.includes('hematocrit') ||
    name === 'mcv' ||
    name === 'mch' ||
    name === 'rdw'
  ) {
    return cbcPanel(marker, ctx);
  }
  if (name.includes('homocyst')) return homocysteinePanel(marker, ctx);
  if (name.includes('mma') || name.includes('methylmalonic')) {
    if (!high(marker)) return null;
    return verdict('Vitamin B12', 'deficient', 1.6, `High MMA ${marker.value} is functional B12 deficiency even if serum B12 looks fine.`);
  }
  if (name.includes('25-oh') || name.includes('25oh') || name.includes('hydroxyvitamin d')) {
    return vitaminDPanel(marker, ctx);
  }
  if (name.includes('pth') || name.includes('parathyroid')) return pthPanel(marker, ctx);
  if (name.includes('tsh') || name.includes('free t4') || name.includes('free t3')) {
    return thyroidPanel(marker, ctx);
  }
  if (name.includes('ceruloplasmin') && low(marker)) {
    return verdict('Copper', 'deficient', 1.4, `Low ceruloplasmin ${marker.value}. Raise copper.`);
  }
  if ((name.includes('gpx') || name.includes('glutathione peroxidase')) && low(marker)) {
    return verdict('Selenium', 'deficient', 1.4, 'Low GPx — selenium target up.');
  }
  if (name.includes('egrac') && high(marker)) {
    return verdict('Riboflavin (B2)', 'deficient', 1.4, 'EGRAC high — B2 intracellular deficit.');
  }
  if ((name.includes('etk') || name.includes('tpp effect')) && high(marker)) {
    return verdict('Thiamine (B1)', 'deficient', 1.5, 'ETKAC/TPP effect high — B1 fact.');
  }

  const nutrientish = WATER_OR_MINERAL.some((k) => name.includes(k));
  if (nutrientish || isIntra(marker)) {
    const nutrient = resolveCanonicalNutrient(marker.markerName);
    if (isIntra(marker)) {
      if (low(marker)) {
        return verdict(
          nutrient,
          'deficient',
          1.5,
          `Intracellular ${marker.markerName} ${marker.value} ${marker.unit} is below the supplied laboratory range. The +50% target adjustment is a model rule, not a physiological fact.`,
          undefined,
          'heuristic',
          'No validated universal percentage increase in dietary requirement was identified; 1.5× is retained as an explicit model assumption.'
        );
      }
      if (high(marker)) {
        return verdict(
          nutrient,
          'excess',
          0.8,
          `Intracellular ${marker.markerName} is above the supplied laboratory range. The 20% reduction is a model rule, not a physiological fact.`,
          undefined,
          'heuristic',
          'No validated universal percentage reduction in requirement was identified.'
        );
      }
      return verdict(nutrient, 'optimal', 1, `Intracellular ${marker.markerName} in range. No goalpost move.`);
    }
    if (low(marker)) {
      return verdict(nutrient, 'deficient', 1.4, `Serum ${marker.markerName} below range. Treat as deficiency. Normal/high serum is ignored.`);
    }
    return verdict(
      nutrient,
      'unreliable_norm',
      1,
      `Serum ${marker.markerName} is not low. Water-soluble/mineral serum in range or high does not move the goalpost.`
    );
  }

  if (name.includes('retinol') || (name.includes('vitamin a') && !name.includes('carotene'))) {
    if (low(marker)) return verdict('Vitamin A', 'deficient', 1.4, 'Low serum retinol.');
    if (high(marker)) return verdict('Vitamin A', 'excess', 0.7, 'High serum retinol.');
    return null;
  }
  if ((name.includes('tocopherol') || name.includes('vitamin e')) && low(marker)) {
    return verdict('Vitamin E', 'deficient', 1.3, 'Low alpha-tocopherol.');
  }
  if (name.includes('inr') && high(marker)) {
    return verdict('Vitamin K', 'deficient', 1.3, 'High INR — consider K unless anticoagulated.');
  }
  return null;
}

function verdict(
  nutrient: CanonicalNutrient,
  status: BiomarkerClinicalVerdict['status'],
  mult: number,
  insight: string,
  abs?: number,
  evidenceType: BiomarkerClinicalVerdict['evidenceType'] = 'heuristic',
  evidenceNote?: string
): BiomarkerClinicalVerdict {
  return {
    targetNutrient: nutrient,
    status,
    dynamicTargetMultiplier: mult,
    absorptionMultiplier: abs,
    clinicalInsight: insight,
    evidenceType,
    evidenceNote,
  };
}

function ironPanel(marker: BiomarkerInput, ctx: BiomarkerInput[]): BiomarkerClinicalVerdict {
  const ferritin = find(ctx, 'ferritin');
  const crp = find(ctx, 'crp', 'c-reactive');
  const tsat = find(ctx, 'tsat', 'transferrin sat');
  const tibc = find(ctx, 'tibc');
  const hb = find(ctx, 'hemoglobin', 'haemoglobin', 'hgb');
  const rbc = find(ctx, 'rbc');
  const mcv = find(ctx, 'mcv');
  const inflamed = crp ? crp.value > 3 : false;
  const anemic = low(hb) || low(rbc);
  const micro = low(mcv);

  if (ferritin && ferritin.value < ferritin.refLow) {
    return verdict('Iron', 'deficient', anemic || micro ? 1.8 : 1.5,
      `Low ferritin ${ferritin.value}: empty stores. CRP cannot fake a low ferritin.`);
  }
  if (tsat && tsat.value < (tsat.refLow || 20) && !inflamed) {
    return verdict('Iron', 'deficient', 1.4, `Low TSAT ${tsat.value}% without high CRP.`);
  }
  if (ferritin && ferritin.value > ferritin.refHigh) {
    if (!crp) return verdict('Iron', 'unreliable_norm', 1, 'High ferritin, no CRP. Do not move iron.');
    if (inflamed && !(tsat && tsat.value > (tsat.refHigh || 45))) {
      return verdict('Iron', 'unreliable_norm', 1, `High ferritin + CRP ${crp.value}. Acute phase. No change.`);
    }
    if (!inflamed && ((tsat && tsat.value > (tsat.refHigh || 45)) || (!tsat && !anemic))) {
      return verdict('Iron', 'excess', 0.5, 'High ferritin, quiet CRP. Possible overload.');
    }
    if (!inflamed && anemic) {
      return verdict('Iron', 'unreliable_norm', 1, 'High ferritin + anemia. Check B12/folate before cutting iron.');
    }
  }
  if (anemic && micro && !(ferritin && ferritin.value > ferritin.refHigh)) {
    return verdict('Iron', 'deficient', 1.3, 'Microcytic anemia, ferritin not high.');
  }
  if (tibc && high(tibc) && ferritin && low(ferritin)) {
    return verdict('Iron', 'deficient', 1.5, 'High TIBC + low ferritin.');
  }
  return verdict('Iron', 'unreliable_norm', 1, 'Iron panel not decisive.');
}

function cbcPanel(marker: BiomarkerInput, ctx: BiomarkerInput[]): BiomarkerClinicalVerdict | null {
  const mcv = find(ctx, 'mcv');
  const hb = find(ctx, 'hemoglobin', 'haemoglobin', 'hgb');
  const rbc = find(ctx, 'rbc');
  const b12 = find(ctx, 'b12', 'cobalamin');
  const folate = find(ctx, 'folate', 'b9');
  const ferritin = find(ctx, 'ferritin');
  const anemic = low(hb) || low(rbc);

  if (anemic && high(mcv)) {
    if (b12 && low(b12)) return verdict('Vitamin B12', 'deficient', 1.6, 'Macrocytic anemia + low B12.');
    if (folate && low(folate)) return verdict('Folate (B9)', 'deficient', 1.6, 'Macrocytic anemia + low folate.');
    return verdict('Vitamin B12', 'deficient', 1.3, 'Macrocytic anemia. Raise B12 pending MMA/folate.');
  }
  if (anemic && low(mcv)) {
    if (ferritin && high(ferritin)) return verdict('Iron', 'unreliable_norm', 1, 'Microcytic anemia but ferritin high. No auto-raise.');
    return verdict('Iron', 'deficient', 1.4, 'Microcytic anemia. Iron first.');
  }
  if (anemic && mcv && inRange(mcv)) {
    return verdict('Vitamin B12', 'unreliable_norm', 1, 'Normocytic anemia. Need ferritin + MMA.');
  }
  return null;
}

function homocysteinePanel(marker: BiomarkerInput, ctx: BiomarkerInput[]): BiomarkerClinicalVerdict | null {
  if (!high(marker)) return null;
  const b12 = find(ctx, 'b12', 'cobalamin');
  const folate = find(ctx, 'folate', 'b9');
  const b6 = find(ctx, 'b6', 'pyridox', 'plp');
  const rbcFolate = ctx.find((m) => n(m.markerName).includes('folate') && isIntra(m));
  if (low(b12)) return verdict('Vitamin B12', 'deficient', 1.5, `High Hcy + low B12.`);
  if (low(folate) || (rbcFolate && low(rbcFolate))) return verdict('Folate (B9)', 'deficient', 1.5, 'High Hcy + low folate.');
  if (low(b6)) return verdict('Vitamin B6', 'deficient', 1.4, 'High Hcy + low B6.');
  return verdict('Folate (B9)', 'deficient', 1.25, `High homocysteine ${marker.value}. Co-factor not pinned. Modest folate lift.`);
}

function vitaminDPanel(marker: BiomarkerInput, ctx: BiomarkerInput[]): BiomarkerClinicalVerdict {
  const ca = find(ctx, 'calcium');
  const pth = find(ctx, 'pth', 'parathyroid');
  if (low(marker)) return verdict('Vitamin D', 'deficient', 1.5, `Low 25-OH-D ${marker.value}.`);
  if (high(marker) && high(ca)) {
    return verdict('Vitamin D', 'excess', 0.65, 'High D and high Ca. Cut D, watch Ca UL.', 1.2);
  }
  if (high(marker)) return verdict('Vitamin D', 'excess', 0.85, 'High 25-OH-D. Soften D. Do not slash Ca food unless serum Ca high.', 1.1);
  if (pth && high(pth)) return verdict('Vitamin D', 'deficient', 1.2, 'PTH high with “normal” 25-OH-D.');
  return verdict('Vitamin D', 'optimal', 1, '25-OH-D in range.');
}

function pthPanel(marker: BiomarkerInput, ctx: BiomarkerInput[]): BiomarkerClinicalVerdict | null {
  const ca = find(ctx, 'calcium');
  const d = find(ctx, '25-oh', '25oh', 'hydroxyvitamin d');
  if (high(marker) && low(ca)) return verdict('Calcium', 'deficient', 1.3, 'High PTH + low Ca.');
  if (high(marker) && d && low(d)) return verdict('Vitamin D', 'deficient', 1.4, 'High PTH + low D.');
  if (high(marker) && high(ca)) return verdict('Calcium', 'excess', 0.7, 'High PTH + high Ca. Workup.');
  return null;
}

function thyroidPanel(marker: BiomarkerInput, ctx: BiomarkerInput[]): BiomarkerClinicalVerdict | null {
  const tsh = find(ctx, 'tsh') || (n(marker.markerName).includes('tsh') ? marker : undefined);
  const ft4 = find(ctx, 'free t4', 'ft4');
  const se = find(ctx, 'selenium');
  if (tsh && high(tsh)) {
    if (se && low(se)) return verdict('Selenium', 'deficient', 1.3, 'High TSH + low Se.');
    return verdict('Iodine', 'deficient', 1.3, `High TSH ${tsh.value}. Modest iodine up; check Se/iron.`);
  }
  if (tsh && low(tsh) && ft4 && high(ft4)) {
    return verdict('Iodine', 'unreliable_norm', 1, 'Low TSH + high fT4. Do not add iodine.');
  }
  return null;
}

export function resolveCanonicalNutrient(rawName: string): CanonicalNutrient {
  const x = rawName.toLowerCase();
  if (x.includes('zinc')) return 'Zinc';
  if (x.includes('copper') || x.includes('ceruloplasmin')) return 'Copper';
  if (x.includes('magnesium')) return 'Magnesium';
  if (x.includes('potassium')) return 'Potassium';
  if (x.includes('selenium') || x.includes('gpx')) return 'Selenium';
  if (x.includes('calcium')) return 'Calcium';
  if (x.includes('phosphorus') || x.includes('phosphate')) return 'Phosphorus';
  if (x.includes('iron') || x.includes('ferritin') || x.includes('tsat') || x.includes('tibc')) return 'Iron';
  if (x.includes('thiamin') || x.includes('b1') || x.includes('etk')) return 'Thiamine (B1)';
  if (x.includes('riboflavin') || x.includes('b2') || x.includes('egrac')) return 'Riboflavin (B2)';
  if (x.includes('niacin') || x.includes('b3')) return 'Niacin (B3)';
  if (x.includes('pantothen') || x.includes('b5')) return 'Pantothenic Acid (B5)';
  if (x.includes('pyridox') || x.includes('b6') || x.includes('plp')) return 'Vitamin B6';
  if (x.includes('biotin') || x.includes('b7')) return 'Biotin (B7)';
  if (x.includes('folat') || x.includes('b9')) return 'Folate (B9)';
  if (x.includes('cobalamin') || x.includes('b12') || x.includes('mma')) return 'Vitamin B12';
  if (x.includes('choline')) return 'Choline';
  if (x.includes('ascorb') || x.includes('vitamin c')) return 'Vitamin C';
  if (x.includes('carnitine')) return 'Carnitine';
  if (x.includes('taurine')) return 'Taurine';
  if (x.includes('coq')) return 'CoQ10';
  if (x.includes('iodine') || x.includes('tsh')) return 'Iodine';
  if (x.includes('vitamin d') || x.includes('25-oh') || x.includes('25oh')) return 'Vitamin D';
  if (x.includes('vitamin a') || x.includes('retinol')) return 'Vitamin A';
  if (x.includes('vitamin e') || x.includes('tocopherol')) return 'Vitamin E';
  if (x.includes('vitamin k')) return 'Vitamin K';
  if (x.includes('homocyst')) return 'Folate (B9)';
  return 'Vitamin C';
}

export function mergeTargetMultipliers(verdicts: BiomarkerClinicalVerdict[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of verdicts) {
    const key = item.targetNutrient;
    if (item.status === 'unreliable_norm' || item.status === 'optimal') {
      if (out[key] == null) out[key] = 1;
      continue;
    }
    const prev = out[key] ?? 1;
    if (item.status === 'deficient') out[key] = Math.max(prev, item.dynamicTargetMultiplier);
    else if (item.status === 'excess') out[key] = Math.min(prev, item.dynamicTargetMultiplier);
  }
  return out;
}

export function evaluateAllBiomarkers(markers: BiomarkerInput[]): BiomarkerClinicalVerdict[] {
  const out: BiomarkerClinicalVerdict[] = [];
  for (const m of markers) {
    const one = evaluateBiomarkerStatus(m, markers);
    if (one) out.push(one);
  }
  const hcy = markers.find((x) => n(x.markerName).includes('homocyst'));
  if (hcy && high(hcy)) {
    if (!out.some((v) => v.targetNutrient === 'Vitamin B12' && v.status === 'deficient')) {
      out.push(verdict('Vitamin B12', 'deficient', 1.2, 'High homocysteine: co-raise B12 unless MMA is low.'));
    }
    if (!out.some((v) => v.targetNutrient === 'Vitamin B6' && v.status === 'deficient')) {
      out.push(verdict('Vitamin B6', 'deficient', 1.15, 'High homocysteine: co-raise B6.'));
    }
  }
  return out;
}
