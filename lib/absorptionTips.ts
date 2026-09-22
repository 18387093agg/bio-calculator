export function tipsForNutrient(opts: {
  nutrient: string;
  plantGross: number;
  animalGross: number;
  fatGrams: number;
  cooked: boolean;
}): string[] {
  const n = (opts.nutrient || '').toLowerCase();
  const plant = opts.plantGross > 0.05;
  const tips: string[] = [];

  if (n.includes('vitamin a') || n.includes('carotene')) {
    if (plant && !opts.cooked) {
      tips.push('Plant A is β-carotene. Cook or puree the carrot/veg — raw cell walls keep uptake near the low end of the band.');
    }
    if (plant && opts.fatGrams < 5) {
      tips.push('Add 5–10 g fat (yolk, tallow, oil) so carotenoids can enter mixed micelles. Fat-free plates waste most of the RAE.');
    }
    if (plant && opts.cooked && opts.fatGrams >= 5) {
      tips.push('Cooked + fat is the high end for plant A. Do not divide USDA RAE by 12 again.');
    }
  }

  if (n === 'iron' || n.endsWith(' iron')) {
    if (plant) {
      tips.push('Non-heme iron: add ≥50 mg vitamin C in the same meal (citrus, kiwi, peppers) or a little meat. Skip tea/coffee for 1 h.');
    }
    if (opts.animalGross > 0) {
      tips.push('Muscle iron is only ~40–45% heme. The rest behaves like plant iron and still likes vitamin C.');
    }
  }

  if (n.includes('zinc')) {
    if (plant) tips.push('Plant zinc sits behind phytate. Soak/ferment grains and beans, or pair with animal protein.');
    tips.push('Large single zinc doses saturate ZIP4 — split doses if using a supplement.');
  }

  if (n.includes('copper')) {
    tips.push('High zinc relative to copper induces metallothionein and can drop copper. Keep a food source of Cu (liver, oyster) in the week.');
  }

  if (n.includes('calcium') || n.includes('magnesium')) {
    if (plant) tips.push('Oxalate-heavy greens bind Ca/Mg. Boil and discard water for spinach, or use low-oxalate greens.');
    if (n.includes('calcium')) tips.push('Calcium absorption rises with vitamin D status and falls at high single doses — split if >500 mg at once.');
  }

  if (n.includes('vitamin d')) {
    tips.push('D3 needs bile and fat. Take with the fattiest meal. Magnesium is a cofactor for activation — that is a drain hypothesis, not a fixed mg/IU.');
  }

  if (n.includes('vitamin k')) {
    if (plant) tips.push('K1 from greens absorbs poorly unless chopped and eaten with fat. MK-4/MK-7 from animal/fermented foods are different species.');
  }

  if (n.includes('vitamin e')) {
    tips.push('Tocopherols need micelles. A dry salad of nuts without oil stays at the low end.');
  }

  if (n.includes('vitamin c')) {
    tips.push('Heat and discarded boil-water destroy ascorbate. Raw or steam-and-keep-liquid. SVCT1 saturates at gram doses.');
  }

  if (n.includes('b6') || n.includes('pyridox')) {
    if (plant) tips.push('Plant B6 includes glycosides — cooking helps a bit; animal PLP converts 1:1.');
  }

  if (n.includes('folate') || n.includes('b9')) {
    if (plant) tips.push('Food folate is unstable to heat and light. Light steam, do not boil-and-dump. RDA is already DFE.');
  }

  if (n.includes('b12') || n.includes('cobalamin')) {
    tips.push('IF saturates near 1.5–2 µg per sitting. Extra food B12 is ~1% passive. Split liver across the week, do not stack one huge serving.');
    tips.push('Low stomach acid leaves B12 stuck on food protein — that is an acid problem, not an intake problem.');
  }

  if (n.includes('thiamin') || n.includes('b1')) {
    tips.push('Food thiamin uses THTR1/2 and saturates. Tannin drinks at the meal cut uptake. TTFD is a different transporter.');
  }

  if (n.includes('biotin')) {
    tips.push('Raw egg white avidin binds biotin. Cooked yolk is the food source; whites raw will cancel it.');
  }

  if (n.includes('choline')) {
    tips.push('Yolk and liver carry preformed choline. Plant phosphatidylcholine is lower density — you need more grams.');
  }

  if (n.includes('selenium') || n.includes('iodine')) {
    tips.push('These are well absorbed from food when present. The limiter is whether the food was grown/fed with the mineral.');
  }

  if (n.includes('creatine') || n.includes('carnosine') || n.includes('coq10') || n.includes('carnitine') || n.includes('taurine')) {
    tips.push('These are animal-matrix compounds. Plants do not replace them 1:1; cooking does not create them.');
  }

  return tips;
}
