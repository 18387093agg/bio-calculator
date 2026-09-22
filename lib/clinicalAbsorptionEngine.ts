import { CanonicalNutrient, ClinicalPathologyState, MealContextState, NutrientCategory } from '@/types/bioavailability';

export interface EntericAbsorptionResult {
  sanitizedChemicalForm: string;
  effectiveActiveRate: number;
  rateMin: number;
  rateMax: number;
  conversionPhi: number;
  clinicalMechanismNotes: string[];
}
export interface CalorieAbsorptionProfile {
  proteinAbsorptionPct: number; fatAbsorptionPct: number; carbAbsorptionPct: number;
  netCalorieFactor: number; clinicalExplanation: string[];
}
const clamp=(v:number,lo=0.01,hi=0.98)=>Math.min(hi,Math.max(lo,Number.isFinite(v)?v:lo));
const lowAcid=(p:ClinicalPathologyState)=>p.gastricAcid==='hypochlorhydria'||p.gastricAcid==='achlorhydria';
const hemeFraction=(c:MealContextState,f:string)=>c.hemeIronFraction!=null?Math.min(1,Math.max(0,c.hemeIronFraction)):f.includes('heme')?1:c.isPureAnimalFood?0.4:0;

export function retentionForNutrient(prepKey:string,nutrient:string):number{
  const p=(prepKey||'raw').toLowerCase(),n=nutrient.toLowerCase();
  if(p==='raw'||p.includes('supplement'))return 1;
  const drained=p.includes('discarded')||p.includes('drain'),kept=p.includes('stew')||p.includes('brais')||p.includes('sous')||p.includes('broth');
  const high=p.includes('grill')||p.includes('char')||p.includes('well-done'),heat=p.includes('roast')||p.includes('bake')||p.includes('fry')||p.includes('smoke')||p.includes('air');
  if(/iron|zinc|copper|magnesium|calcium|selenium|potassium|sodium|phosphorus|manganese|iodine|chromium|molybdenum/.test(n))return drained?.8:kept?.97:.95;
  if(/vitamin c|thiamin|folate|riboflavin|b6|pantothen/.test(n)){if(drained)return n.includes('vitamin c')?.4:.5;if(kept)return .78;if(high)return .55;if(heat)return .7;return p.includes('steam')?.82:.75;}
  if(/vitamin a|vitamin d|vitamin e|vitamin k/.test(n))return high?.88:heat?.93:.97;
  if(n.includes('b12'))return drained?.85:.95;
  return .9;
}

export function evaluateCalorieMalabsorption(p:ClinicalPathologyState,_animal:boolean):CalorieAbsorptionProfile{
  let protein=.95,fat=.97,carbs=.98;const notes:string[]=[];
  if(p.gastricAcid==='hypochlorhydria'){protein-=.1;notes.push('Hypochlorhydria: modeled reduction in protein digestion.');}
  if(p.gastricAcid==='achlorhydria'){protein-=.2;notes.push('Achlorhydria: modeled reduction in protein digestion.');}
  if(p.pathology==='sibo'){fat-=.18;notes.push('SIBO: modeled reduction in fat absorption.');}
  if(p.pathology==='crohns_celiac'){protein-=.15;fat-=.15;carbs-=.2;notes.push('Intestinal pathology: modeled reduction in absorptive capacity.');}
  if(p.pathology==='ileal_resection'){fat-=.3;notes.push('Ileal resection: modeled reduction in fat absorption.');}
  if(p.bileImpairment){fat-=.12;notes.push('Bile impairment: modeled reduction in fat absorption.');}
  protein=Math.max(.5,protein);fat=Math.max(.4,fat);carbs=Math.max(.5,carbs);
  return {proteinAbsorptionPct:+protein.toFixed(2),fatAbsorptionPct:+fat.toFixed(2),carbAbsorptionPct:+carbs.toFixed(2),netCalorieFactor:+((protein+fat+carbs)/3).toFixed(2),clinicalExplanation:notes};
}

function base(n:CanonicalNutrient,c:MealContextState,f:string):[number,number,number,string]{
  const a=c.isPureAnimalFood;
  switch(n){
    case 'Vitamin A': return a?[.7,.9,1,'Preformed retinol']:[c.carotenoidMatrixCooked&&c.totalFatGrams>=5?.55:c.carotenoidMatrixCooked?.35:c.totalFatGrams>=5?.3:.2,c.carotenoidMatrixCooked&&c.totalFatGrams>=5?.95:c.carotenoidMatrixCooked?.7:c.totalFatGrams>=5?.6:.45,1,'Provitamin A / RAE'];
    case 'Vitamin D':return[.55,.8,1,'Vitamin D'];
    case 'Vitamin E':return[.5,.8,1,'Vitamin E'];
    case 'Vitamin K':return[a?.4:.15,a?.7:.4,1,a?'Menaquinone':'Vitamin K1'];
    case 'Thiamine (B1)':return f.includes('ttfd')?[.8,.95,1,'TTFD']:[.5,.8,1,'Thiamine'];
    case 'Riboflavin (B2)':return[.6,.85,1,'Riboflavin'];
    case 'Niacin (B3)':return[.55,.85,a?1:.9,'Niacin'];
    case 'Pantothenic Acid (B5)':return[.4,.6,1,'Pantothenic acid'];
    case 'Vitamin B6':return[a?.7:.4,a?.9:.6,a?1:.75,a?'PLP/PMP':'Pyridoxine'];
    case 'Biotin (B7)':return[.5,.8,1,'Biotin'];
    case 'Folate (B9)':return[.4,.6,1,'Food folate / 5-MTHF'];
    case 'Vitamin B12':return[.45,.6,1,'Cobalamin'];
    case 'Vitamin C':return[.7,.9,1,'Ascorbate'];
    case 'Choline':return[.6,.85,1,'Choline'];
    case 'Iron':{const h=hemeFraction(c,f);return[h*.15+(1-h)*.03,h*.35+(1-h)*.12,1,h>.05?'Mixed iron ('+Math.round(h*100)+'% heme)':'Non-heme iron'];}
    case 'Zinc':return[a?.3:.15,a?.5:.3,1,'Dietary zinc'];
    case 'Copper':return[.5,.7,1,'Dietary copper'];
    case 'Magnesium':return[a?.35:.25,a?.5:.4,1,'Dietary magnesium'];
    case 'Calcium':return[.25,.4,1,'Dietary calcium'];
    case 'Selenium':return[.7,.9,1,'Selenium'];
    case 'Iodine':return[.9,.98,1,'Iodide / iodine'];
    case 'Manganese':return[.03,.08,1,'Manganese'];
    case 'Molybdenum':return[.7,.93,1,'Molybdate'];
    case 'Chromium':return f.includes('picolinate')?[.02,.05,1,'Chromium picolinate']:[.005,.02,1,'Chromium'];
    case 'Phosphorus':return[.55,.7,1,'Phosphate'];
    case 'Potassium':case 'Sodium':return[.85,.95,1,n];
    default:return[.45,.7,1,f||'Dietary form'];
  }
}

export function evaluateEntericBioavailability(nutrient:CanonicalNutrient,chemicalForm:string,category:NutrientCategory,pathology:ClinicalPathologyState,context:MealContextState):EntericAbsorptionResult{
  const f=(chemicalForm||'').toLowerCase();let [min,max,phi,formName]=base(nutrient,context,f);const notes:string[]=[];
  const h=nutrient==='Iron'?hemeFraction(context,f):0,nonHeme=1-h;
  if((context.totalOxalatesMg||0)>50&&!context.isPureAnimalFood){if(nutrient==='Calcium'){min*=.8;max*=.9;notes.push('Meal oxalate load reduces calcium availability in the model.');}if(nutrient==='Magnesium'){min*=.85;max*=.9;}}
  if((context.totalPhytatesMg||0)>100&&!context.isPureAnimalFood){if(nutrient==='Zinc'){min*=.7;max*=.8;notes.push('Meal phytate load reduces zinc availability in the model.');}if(nutrient==='Iron'&&nonHeme>0){min*=.5;max*=.6;notes.push('Meal phytate load reduces non-heme iron availability in the model.');}if(nutrient==='Calcium'){min*=.85;max*=.9;}}
  if(context.coingestedTannins&&nutrient==='Iron'&&nonHeme>0){min*=.35;max*=.45;notes.push('Co-ingested tannins reduce non-heme iron absorption.');}
  if(nutrient==='Iron'&&nonHeme>0){if(context.totalCalciumMg>350){min*=.65;max*=.75;}if(context.totalZincMg>25){min*=.75;max*=.85;}if(context.totalVitaminCMg>=50){min*=1.25;max*=1.4;notes.push('Vitamin C enhances non-heme iron absorption.');}}
  if(nutrient==='Copper'&&context.totalCopperMg>0&&context.totalZincMg/context.totalCopperMg>20){min*=.4;max*=.5;notes.push('High meal zinc:copper ratio is modeled as reducing copper absorption.');}
  if(nutrient==='Magnesium'&&context.totalCalciumMg>800){min*=.75;max*=.85;}
  if(lowAcid(pathology)){
    if(nutrient==='Iron'){min*=h+nonHeme*.4;max*=h+nonHeme*.5;if(nonHeme>0)notes.push('Low stomach acid reduces the non-heme fraction; heme iron is not given the same penalty.');}
    if(nutrient==='Vitamin B12'){const free=/supplement|crystalline|cyanocobalamin|methylcobalamin|hydroxo/.test(f);if(!free){min*=.3;max*=.4;notes.push('Low stomach acid reduces release of food-bound B12 from dietary protein.');}else notes.push('Free/crystalline supplemental B12 does not require gastric protein release.');}
    if(nutrient==='Calcium'&&f.includes('carbonate')){min*=.25;max*=.35;}
  }
  if(pathology.pathology==='crohns_celiac'){min*=.6;max*=.7;}
  if(pathology.bileImpairment&&category==='fat_soluble_vitamin'){min*=.55;max*=.7;}
  min=clamp(min);max=clamp(Math.max(min,max));
  return {sanitizedChemicalForm:formName,effectiveActiveRate:clamp((min+max)/2),rateMin:min,rateMax:max,conversionPhi:clamp(phi,0,1),clinicalMechanismNotes:notes};
}
