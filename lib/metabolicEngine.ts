import { CanonicalNutrient } from '@/types/bioavailability';

export interface UserMetabolicProfile {
  diet: 'carnivore'|'keto'|'paleo'|'mediterranean'|'high_carb'|'vegetarian';
  bodyWeightKg: number;
  sex: 'male'|'female';
}
export interface MealMacroProfile { proteinG:number; carbsG:number; fatG:number; pufaG:number; fiberG:number; totalCalories:number; }
export interface DynamicTargetDetail { effectiveRda:number; baseOptimal:number; effectiveOptimal:number; upperTolerableLimit:number; surcharge?:number; triggerReason?:string; }

const t=(rda:number,opt:number,ul:number):DynamicTargetDetail=>({effectiveRda:rda,baseOptimal:opt,effectiveOptimal:opt,upperTolerableLimit:ul});

export function calculateDynamicTargets(user:UserMetabolicProfile,macros:MealMacroProfile):Record<string,DynamicTargetDetail>{
  const female=user.sex==='female',w=Math.max(30,Math.min(250,Number(user.bodyWeightKg)||70));
  const kcal=Math.max(0,Number(macros.totalCalories)||0);
  // Model-only optimization range: 0.60–0.68 mg thiamine per 1000 kcal,
  // giving 1.50–1.70 mg/day at 2500 kcal. The database target row can override this.
  const b1=Math.max(1.5,Math.min(3,+(kcal*0.00064).toFixed(2)));
  return {
    vitamina:t(female?700:900,female?1200:1500,3000),
    vitamind:t(15,25,100),vitamine:t(15,25,300),vitamink:t(female?90:120,female?140:180,1000),
    thiamineb1:t(1.1,b1,100),riboflavinb2:t(female?1.1:1.3,female?1.8:2.2,100),
    niacinb3:t(female?14:16,25,35),pantothenicacidb5:t(5,8,100),vitaminb6:t(female?1.3:1.3,2.5,100),
    biotinb7:t(30,60,900),folateb9:t(400,600,1000),vitaminb12:t(2.4,6,100),
    vitaminc:t(female?75:90,150,2000),choline:t(female?425:550,female?525:650,3500),
    calcium:t(1000,1200,2500),phosphorus:t(700,1000,4000),potassium:t(female?2600:3400,3800,6000),
    sodium:t(1500,user.diet==='carnivore'||user.diet==='keto'?4500:3500,2300),chloride:t(2300,3400,3600),sulfur:t(800,1200,3000),
    magnesium:t(female?310:400,Math.round(w*5),350),iron:t(female?18:8,female?20:15,45),
    zinc:t(female?8:11,Math.max(12,Math.round(w*.22)),40),copper:t(.9,2,10),selenium:t(55,80,400),
    iodine:t(150,200,1100),manganese:t(female?1.8:2.3,3,11),chromium:t(35,50,1000),molybdenum:t(45,90,2000),
    creatine:t(0,3,5),carnosine:t(0,.5,2),coq10:t(0,.1,.5),carnitine:t(0,.5,2),taurine:t(0,1,3)
  };
}

export function calculatePRAL(n:{proteinG:number;phosphorusMg:number;potassiumMg:number;magnesiumMg:number;calciumMg:number}){
  const score=+(n.proteinG*.4888+n.phosphorusMg*.0366-n.potassiumMg*.0205-n.magnesiumMg*.0263-n.calciumMg*.0125).toFixed(1);
  return {score,status:score>10?'Acidic' as const:score<-10?'Alkaline' as const:'Neutral' as const};
}

export function evaluateMethylationDemand(proteinG:number,cholineMg:number,_b6Mg:number,_b12Mcg:number){
  const methionineLoad=+(Math.max(0,proteinG)*.026).toFixed(2);
  const minCholineRequired=Math.round(methionineLoad*450);
  const coveragePct=Math.min(100,Math.round(Math.max(0,cholineMg)/Math.max(1,minCholineRequired)*100));
  return {methionineLoadGrams:methionineLoad,minCholineRequiredMg:minCholineRequired,currentCholineMg:cholineMg,coveragePct,isAdequate:coveragePct>=80};
}
