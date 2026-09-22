import { CanonicalNutrient } from '@/types/bioavailability';

export interface BiomarkerInput {
  markerName:string; compartment:'serum'|'wbc_intracellular'|'rbc_intracellular';
  value:number; unit:string; refLow:number; refHigh:number;
}
export interface BiomarkerClinicalVerdict {
  targetNutrient:CanonicalNutrient;
  status:'deficient'|'optimal'|'excess'|'unreliable_norm';
  dynamicTargetMultiplier:number;
  absorptionMultiplier?:number;
  clinicalInsight:string;
}
const s=(x:string)=>(x||'').toLowerCase();
const low=(m?:BiomarkerInput)=>!!m&&m.value<m.refLow;
const high=(m?:BiomarkerInput)=>!!m&&m.value>m.refHigh;
const inside=(m?:BiomarkerInput)=>!!m&&m.value>=m.refLow&&m.value<=m.refHigh;
const intra=(m:BiomarkerInput)=>m.compartment==='rbc_intracellular'||m.compartment==='wbc_intracellular';
const find=(a:BiomarkerInput[],...keys:string[])=>a.find(m=>keys.some(k=>s(m.markerName).includes(k)));
const verdict=(n:CanonicalNutrient,status:BiomarkerClinicalVerdict['status'],mult:number,msg:string,abs?:number):BiomarkerClinicalVerdict=>({targetNutrient:n,status,dynamicTargetMultiplier:mult,absorptionMultiplier:abs,clinicalInsight:msg});

function nutrient(name:string):CanonicalNutrient{
  const n=s(name);
  if(n.includes('thiamin')||n==='b1'||n.includes('etk'))return'Thiamine (B1)';
  if(n.includes('riboflav')||n.includes('egrac')||n==='b2')return'Riboflavin (B2)';
  if(n.includes('niacin')||n==='b3')return'Niacin (B3)';
  if(n.includes('pyridox')||n.includes('plp')||n==='b6')return'Vitamin B6';
  if(n.includes('folate')||n==='b9')return'Folate (B9)';
  if(n.includes('cobalamin')||n.includes('b12')||n.includes('mma'))return'Vitamin B12';
  if(n.includes('vitamin c')||n.includes('ascorb'))return'Vitamin C';
  if(n.includes('vitamin d')||n.includes('25-oh')||n.includes('25oh'))return'Vitamin D';
  if(n.includes('retinol')||n.includes('vitamin a'))return'Vitamin A';
  if(n.includes('tocopherol')||n.includes('vitamin e'))return'Vitamin E';
  if(n.includes('vitamin k')||n==='inr')return'Vitamin K';
  if(n.includes('zinc'))return'Zinc';if(n.includes('copper')||n.includes('ceruloplasmin'))return'Copper';
  if(n.includes('magnesium'))return'Magnesium';if(n.includes('potassium'))return'Potassium';if(n.includes('calcium'))return'Calcium';
  if(n.includes('phosph'))return'Phosphorus';if(n.includes('sodium'))return'Sodium';if(n.includes('selen')||n.includes('gpx'))return'Selenium';
  if(n.includes('iod'))return'Iodine';if(n.includes('iron')||n.includes('ferritin')||n.includes('transferrin')||n.includes('tsat')||n.includes('tibc'))return'Iron';
  if(n.includes('choline'))return'Choline';if(n.includes('carnitine'))return'Carnitine';if(n.includes('taurine'))return'Taurine';return'CoQ10';
}

export function evaluateBiomarkerStatus(marker:BiomarkerInput,contextMarkers:BiomarkerInput[]):BiomarkerClinicalVerdict|null{
  const ctx=[marker,...contextMarkers],name=s(marker.markerName);

  if(name.includes('ferritin')||name.includes('tsat')||name.includes('tibc')||name.includes('transferrin')||name==='iron'){
    const ferritin=find(ctx,'ferritin'),crp=find(ctx,'crp','c-reactive'),tsat=find(ctx,'tsat','transferrin sat'),hb=find(ctx,'hemoglobin','haemoglobin','hgb'),mcv=find(ctx,'mcv');
    const inflamed=!!crp&&crp.value>crp.refHigh,anemia=low(hb);
    if(ferritin&&low(ferritin))return verdict('Iron','deficient',anemia||low(mcv)?1.5:1.3,'Ferritin is below the supplied reference interval.');
    if(tsat&&low(tsat)&&!inflamed)return verdict('Iron','deficient',1.3,'TSAT is below the supplied reference interval without elevated CRP.');
    if(ferritin&&high(ferritin)&&inflamed)return verdict('Iron','unreliable_norm',1,'High ferritin with an inflammatory marker is not interpreted as iron excess.');
    if(ferritin&&high(ferritin)&&tsat&&high(tsat)&&!inflamed)return verdict('Iron','excess',.8,'Ferritin and TSAT are both high without an elevated inflammatory marker.');
    return verdict('Iron','unreliable_norm',1,'The supplied iron markers do not establish a specific nutritional state.');
  }
  if(name.includes('mma')||name.includes('methylmalonic'))return high(marker)?verdict('Vitamin B12','deficient',1.5,'MMA is above the supplied reference interval.'):null;
  if(name.includes('homocyst')){
    if(!high(marker))return null;
    const b12=find(ctx,'b12','cobalamin'),folate=find(ctx,'folate','b9'),b6=find(ctx,'b6','pyrid','plp');
    if(low(b12))return verdict('Vitamin B12','deficient',1.4,'High homocysteine plus low B12.');
    if(low(folate))return verdict('Folate (B9)','deficient',1.4,'High homocysteine plus low folate.');
    if(low(b6))return verdict('Vitamin B6','deficient',1.3,'High homocysteine plus low B6.');
    return verdict('Folate (B9)','unreliable_norm',1,'Homocysteine is nonspecific without a supporting cofactor abnormality.');
  }
  if(name.includes('25-oh')||name.includes('25oh')||name.includes('hydroxyvitamin d')){
    if(low(marker))return verdict('Vitamin D','deficient',1.4,'25-OH vitamin D is below the supplied reference interval.');
    if(high(marker))return verdict('Vitamin D','excess',.8,'25-OH vitamin D is above the supplied reference interval.');
    return verdict('Vitamin D','optimal',1,'25-OH vitamin D is within the supplied reference interval.');
  }
  if(name.includes('pth')||name.includes('parathyroid')){
    const ca=find(ctx,'calcium'),d=find(ctx,'25-oh','25oh','hydroxyvitamin d');
    if(high(marker)&&low(ca))return verdict('Calcium','deficient',1.2,'High PTH with low calcium.');
    if(high(marker)&&d&&low(d))return verdict('Vitamin D','deficient',1.2,'High PTH with low vitamin D.');
    return null;
  }
  if(name.includes('ceruloplasmin')&&low(marker))return verdict('Copper','deficient',1.3,'Ceruloplasmin is below the supplied reference interval.');
  if((name.includes('gpx')||name.includes('glutathione peroxidase'))&&low(marker))return verdict('Selenium','deficient',1.3,'GPx is below the supplied reference interval.');
  if(name.includes('egrac')&&high(marker))return verdict('Riboflavin (B2)','deficient',1.3,'EGRAC is above the supplied reference interval.');
  if((name.includes('etk')||name.includes('tpp effect'))&&high(marker))return verdict('Thiamine (B1)','deficient',1.3,'ETK/TPP effect is above the supplied reference interval.');
  if(name.includes('hemoglobin')||name==='hgb'||name.includes('mcv')||name.includes('rbc')||name.includes('hematocrit')){
    const hb=find(ctx,'hemoglobin','haemoglobin','hgb'),mcv=find(ctx,'mcv'),b12=find(ctx,'b12','cobalamin'),folate=find(ctx,'folate','b9'),ferritin=find(ctx,'ferritin');
    if(low(hb)&&mcv&&high(mcv)){if(low(b12))return verdict('Vitamin B12','deficient',1.4,'Macrocytic anemia with low B12.');if(low(folate))return verdict('Folate (B9)','deficient',1.4,'Macrocytic anemia with low folate.');return verdict('Vitamin B12','unreliable_norm',1,'Macrocytosis requires confirmation rather than automatic B12 attribution.');}
    if(low(hb)&&mcv&&low(mcv)){if(ferritin&&high(ferritin))return verdict('Iron','unreliable_norm',1,'Microcytosis with high ferritin is not automatically iron deficiency.');return verdict('Iron','unreliable_norm',1,'Microcytosis is compatible with iron deficiency but is not diagnostic by itself.');}
    return null;
  }
  if(intra(marker)){
    const n=nutrient(marker.markerName);
    if(low(marker))return verdict(n,'deficient',1.25,'Intracellular marker is below the supplied reference interval; the multiplier is a model response, not a measured physiological constant.');
    if(high(marker))return verdict(n,'excess',.9,'Intracellular marker is above the supplied reference interval; the multiplier is a model response.');
    if(inside(marker))return verdict(n,'optimal',1,'Intracellular marker is within the supplied reference interval.');
  }
  return null;
}
