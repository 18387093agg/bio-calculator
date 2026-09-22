import { describe,it,expect } from 'vitest';
import { calculateDynamicTargets,evaluateMethylationDemand } from '../lib/metabolicEngine';
import { evaluateBiomarkerStatus } from '../lib/bloodBiomarkerEngine';
import { evaluateCalorieMalabsorption,evaluateEntericBioavailability } from '../lib/clinicalAbsorptionEngine';

describe('rebuilt calculation core',()=>{
  it('uses the requested energy-linked B1 model',()=>{
    const t=calculateDynamicTargets({diet:'carnivore',bodyWeightKg:75,sex:'male'},{proteinG:120,carbsG:0,fatG:40,pufaG:4,fiberG:0,totalCalories:2500});
    expect(t.thiamineb1.effectiveOptimal).toBe(1.6);
    expect(t.thiamineb1.surcharge).toBeUndefined();
  });
  it('keeps methylation calculation deterministic',()=>{
    const x=evaluateMethylationDemand(300,350,5,10);
    expect(x.methionineLoadGrams).toBe(7.8);
    expect(x.minCholineRequiredMg).toBe(3510);
    expect(x.coveragePct).toBe(10);
    expect(x.isAdequate).toBe(false);
  });
  it('keeps calorie absorption floors',()=>{
    const x=evaluateCalorieMalabsorption({gastricAcid:'hypochlorhydria',pathology:'sibo',bileImpairment:false},true);
    expect(x.proteinAbsorptionPct).toBe(.85);
    expect(x.fatAbsorptionPct).toBe(.79);
    expect(x.netCalorieFactor).toBe(.87);
  });
  it('handles ferritin with inflammation conservatively',()=>{
    const marker={markerName:'Ferritin',compartment:'serum' as const,value:340,unit:'ng/mL',refLow:30,refHigh:200};
    const crp={markerName:'hs-CRP',compartment:'serum' as const,value:4.8,unit:'mg/L',refLow:0,refHigh:1};
    const v=evaluateBiomarkerStatus(marker,[crp]);
    expect(v?.status).toBe('unreliable_norm');
    expect(v?.dynamicTargetMultiplier).toBe(1);
  });
  it('does not invent ZIP4 kinetics when SQL provides no kinetic parameters',()=>{
    const x=evaluateEntericBioavailability('Zinc','Zinc Glycinate','trace_mineral',
      {gastricAcid:'normochlorhydria',pathology:'none',bileImpairment:false},
      {totalFatGrams:30,totalCarbsGrams:0,totalFiberGrams:0,totalZincMg:100,totalCopperMg:1.5,totalIronMg:10,totalCalciumMg:200,totalVitaminCMg:30,isPureAnimalFood:true});
    expect(x.rateMin).toBe(.3);
    expect(x.rateMax).toBe(.5);
  });
  it('applies low-acid B12 only to food-bound forms',()=>{
    const path={gastricAcid:'hypochlorhydria' as const,pathology:'none' as const,bileImpairment:false};
    const food=evaluateEntericBioavailability('Vitamin B12','Food-bound cobalamin','water_soluble_vitamin',path,{totalFatGrams:10,totalCarbsGrams:0,totalFiberGrams:0,totalZincMg:5,totalCopperMg:1,totalIronMg:5,totalCalciumMg:200,totalVitaminCMg:0,isPureAnimalFood:true});
    const free=evaluateEntericBioavailability('Vitamin B12','Cyanocobalamin supplement','water_soluble_vitamin',path,{totalFatGrams:10,totalCarbsGrams:0,totalFiberGrams:0,totalZincMg:5,totalCopperMg:1,totalIronMg:5,totalCalciumMg:200,totalVitaminCMg:0,isPureAnimalFood:false});
    expect(food.rateMin).toBeLessThan(.45);
    expect(free.rateMin).toBe(.45);
  });
  it('applies low-acid iron penalty to non-heme fraction only',()=>{
    const path={gastricAcid:'hypochlorhydria' as const,pathology:'none' as const,bileImpairment:false};
    const mixed=evaluateEntericBioavailability('Iron','Mixed iron','trace_mineral',path,{totalFatGrams:10,totalCarbsGrams:0,totalFiberGrams:0,totalZincMg:5,totalCopperMg:1,totalIronMg:10,totalCalciumMg:200,totalVitaminCMg:0,isPureAnimalFood:true,hemeIronFraction:.5});
    expect(mixed.rateMin).toBeCloseTo(.105);
    expect(mixed.rateMax).toBeCloseTo(.2);
  });
});
