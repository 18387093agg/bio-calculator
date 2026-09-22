import { CanonicalNutrient } from '@/types/bioavailability';

export const REFERENCE_BIOAVAILABILITY: Record<string,{absMin:number;absMax:number;phi:number}> = {
  'Vitamin A':{absMin:.7,absMax:.9,phi:1},'Vitamin D':{absMin:.55,absMax:.8,phi:1},
  'Vitamin E':{absMin:.5,absMax:.8,phi:1},'Vitamin K':{absMin:.3,absMax:.6,phi:1},
  'Vitamin C':{absMin:.7,absMax:.9,phi:1},'Thiamine (B1)':{absMin:.5,absMax:.8,phi:1},
  'Riboflavin (B2)':{absMin:.6,absMax:.85,phi:1},'Niacin (B3)':{absMin:.55,absMax:.85,phi:1},
  'Pantothenic Acid (B5)':{absMin:.4,absMax:.6,phi:1},'Vitamin B6':{absMin:.6,absMax:.85,phi:.9},
  'Biotin (B7)':{absMin:.5,absMax:.8,phi:1},'Folate (B9)':{absMin:.5,absMax:.7,phi:1},
  'Vitamin B12':{absMin:.45,absMax:.55,phi:1},Choline:{absMin:.6,absMax:.85,phi:1},
  Calcium:{absMin:.25,absMax:.35,phi:1},Magnesium:{absMin:.3,absMax:.45,phi:1},
  Phosphorus:{absMin:.55,absMax:.7,phi:1},Potassium:{absMin:.85,absMax:.95,phi:1},
  Sodium:{absMin:.9,absMax:.98,phi:1},Iron:{absMin:.1,absMax:.18,phi:1},
  Zinc:{absMin:.25,absMax:.4,phi:1},Copper:{absMin:.5,absMax:.7,phi:1},
  Selenium:{absMin:.7,absMax:.9,phi:1},Iodine:{absMin:.9,absMax:.98,phi:1},
  Manganese:{absMin:.03,absMax:.08,phi:1},Molybdenum:{absMin:.7,absMax:.93,phi:1},
  Chromium:{absMin:.005,absMax:.02,phi:1},Carnitine:{absMin:.6,absMax:.85,phi:1},
  Taurine:{absMin:.7,absMax:.95,phi:1},Creatine:{absMin:.8,absMax:.95,phi:1},
  Carnosine:{absMin:.5,absMax:.8,phi:1},CoQ10:{absMin:.03,absMax:.1,phi:1}
};

export function referenceFactors(name:string){return REFERENCE_BIOAVAILABILITY[name]||{absMin:.5,absMax:.7,phi:1};}
export function scaleIntakeToAbsorbed(intake:number,name:CanonicalNutrient|string,which:'min'|'max'|'mid'='mid'){
  const r=referenceFactors(name),a=which==='min'?r.absMin:which==='max'?r.absMax:(r.absMin+r.absMax)/2;
  return +(intake*a).toFixed(4);
}
export function scaleIntakeToTissue(intake:number,name:CanonicalNutrient|string,which:'min'|'max'|'mid'='mid'){
  const r=referenceFactors(name);return +(scaleIntakeToAbsorbed(intake,name,which)*r.phi).toFixed(4);
}
