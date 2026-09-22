import {describe,it,expect} from 'vitest';
import {calculateDynamicTargets,calculatePRAL,evaluateMethylationDemand} from '../lib/metabolicEngine';
import {evaluateCalorieMalabsorption} from '../lib/clinicalAbsorptionEngine';
import {calculateSupplementImpact} from '../lib/supplementRegistry';

describe('core guardrails',()=>{
 it('keeps magnesium target bounded',()=>{
  const t=calculateDynamicTargets({diet:'high_carb',bodyWeightKg:80,sex:'male'},{proteinG:200,carbsG:800,fatG:60,pufaG:6,fiberG:40,totalCalories:4800});
  expect(t.magnesium.effectiveOptimal).toBeGreaterThan(300);expect(t.magnesium.effectiveOptimal).toBeLessThan(600);
 });
 it('calculates PRAL deterministically',()=>{
  const p=calculatePRAL({proteinG:100,phosphorusMg:1000,potassiumMg:3500,magnesiumMg:400,calciumMg:1000});
  expect(p.score).toBeTypeOf('number');expect(Math.abs(p.score)).toBeLessThan(50);
 });
 it('keeps methylation output deterministic',()=>{
  const x=evaluateMethylationDemand(300,500,5,10);
  expect(x.methionineLoadGrams).toBe(7.8);expect(x.minCholineRequiredMg).toBe(3510);expect(x.coveragePct).toBe(14);
 });
 it('keeps macronutrient absorption floors',()=>{
  const x=evaluateCalorieMalabsorption({gastricAcid:'hypochlorhydria',pathology:'crohns_celiac',bileImpairment:true},false);
  expect(x.proteinAbsorptionPct).toBeGreaterThanOrEqual(.5);expect(x.fatAbsorptionPct).toBeGreaterThanOrEqual(.4);
 });
 it('preserves the existing supplement API',()=>{
  const x=calculateSupplementImpact([{supplementId:'vit_d3',dose:20000,selectedUnit:'IU'},{supplementId:'b1_ttfd',dose:300,selectedUnit:'mg'}]);
  expect(x.totalCofactorSurcharges).toBeDefined();
 });
});
