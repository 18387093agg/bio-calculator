'use client';
import React from 'react';

export interface DualRangeProgressBarProps {
  unit:string; chemicalForm?:string; conversionRate?:number; grossInput:number;
  animalGross?:number; plantGross?:number;
  intakeRda:number; intakeOptimalMin:number; intakeOptimalMax:number; intakeUl?:number;
  absorbedMin:number; absorbedMax:number; absorbRda:number; absorbOptimalMin:number; absorbOptimalMax:number; absorbUl?:number;
  currentMin:number; currentMax:number; tissueRda:number; tissueOptimalMin:number; tissueOptimalMax:number; tissueUl?:number;
}
const fmt=(n:number)=>!Number.isFinite(n)?'0':Math.abs(n)>=100?n.toFixed(0):Math.abs(n)>=10?n.toFixed(1):n.toFixed(2);
const pct=(v:number,opt:number,ul:number)=>{if(v<=0)return 0;if(v<=opt)return v/Math.max(opt,.001)*70;if(v<=ul)return 70+(v-opt)/Math.max(ul-opt,.001)*25;return Math.min(100,95+(v-ul)/Math.max(ul,.001)*5);};

function Markers({rda,optMin,optMax,ul}:{rda:number;optMin:number;optMax:number;ul:number}){
  const rp=Math.max(2,Math.min(66,pct(rda,optMax,ul))),mp=Math.max(3,Math.min(69,pct(optMin,optMax,ul)));
  return <><div className="absolute inset-y-0 w-[2px] bg-slate-100 z-20" style={{left:rp+'%'}}/>
    <div className="absolute inset-y-0 border-y border-dashed border-cyan-800/80 z-0" style={{left:mp+'%',width:Math.max(2,70-mp)+'%'}}/>
    <div className="absolute inset-y-0 w-[2px] bg-cyan-500 z-20" style={{left:mp+'%'}}/>
    <div className="absolute inset-y-0 w-[2.5px] bg-cyan-300 z-20" style={{left:'70%'}}/>
    <div className="absolute inset-y-0 w-[3px] bg-rose-500 z-20" style={{left:'95%'}}/>
  </>;
}
function Ticks({rda,optMin,optMax,ul}:{rda:number;optMin:number;optMax:number;ul:number}){
  const rp=Math.max(2,Math.min(66,pct(rda,optMax,ul))),mp=Math.max(3,Math.min(69,pct(optMin,optMax,ul)));
  return <div className="relative h-8 w-full text-[10px] font-semibold">
    <span className="absolute left-0 top-0 text-slate-600">0</span>
    <div className="absolute -translate-x-1/2 top-0 flex flex-col items-center" style={{left:rp+'%'}}><span className="text-white bg-slate-950/90 px-1 rounded">RDA</span><span className="text-slate-300">{fmt(rda)}</span></div>
    <div className="absolute -translate-x-1/2 top-0 flex flex-col items-center" style={{left:mp+'%'}}><span className="text-cyan-400 bg-slate-950/90 px-1 rounded">Opt min</span><span className="text-cyan-200">{fmt(optMin)}</span></div>
    <div className="absolute -translate-x-1/2 top-0 flex flex-col items-center" style={{left:'70%'}}><span className="text-cyan-300 bg-slate-950/90 px-1 rounded">Opt max</span><span className="text-cyan-100">{fmt(optMax)}</span></div>
    <div className="absolute -translate-x-1/2 top-0 flex flex-col items-center" style={{left:'95%'}}><span className="text-rose-400 bg-slate-950/90 px-1 rounded">UL</span><span className="text-rose-300">{fmt(ul)}</span></div>
  </div>;
}
function Range({min,max,opt,ul,solid,wash}:{min:number;max:number;opt:number;ul:number;solid:string;wash:string}){
  const a=pct(min,opt,ul),b=pct(max,opt,ul),over=max>ul;
  return <><div className={'absolute inset-y-0 left-0 z-10 '+(over?'bg-rose-600':solid)} style={{width:Math.min(100,a)+'%'}}/>
    <div className={'absolute inset-y-0 z-10 '+(over?'bg-rose-400/35':wash)} style={{left:a+'%',width:Math.max(0,b-a)+'%'}}/></>;
}

export function DualRangeProgressBar(p:DualRangeProgressBarProps){
  const conversionRate=p.conversionRate ?? 1;\n  const inUl=p.intakeUl&&p.intakeUl>p.intakeOptimalMax?p.intakeUl:p.intakeOptimalMax*4;
  const aUl=p.absorbUl&&p.absorbUl>p.absorbOptimalMax?p.absorbUl:p.absorbOptimalMax*4;
  const tUl=p.tissueUl&&p.tissueUl>p.tissueOptimalMax?p.tissueUl:p.tissueOptimalMax*4;
  const animal=Math.max(0,p.animalGross||0),plant=Math.max(0,p.plantGross||0),gross=Math.max(0,p.grossInput);
  const totalSources=animal+plant;
  const grossPct=pct(gross,p.intakeOptimalMax,inUl);
  const animalWidth=totalSources>0?grossPct*Math.min(1,animal/totalSources):grossPct;
  const plantWidth=totalSources>0?grossPct*Math.min(1,plant/totalSources):0;
  const tip=(label:string,value:number)=>label+': '+fmt(value)+' '+p.unit;
  return <div className="w-full font-mono space-y-4 pt-1">
    {p.chemicalForm&&<div className="text-[10px] text-slate-500 truncate">Active form: <span className="text-slate-300">{p.chemicalForm}</span>{conversionRate!==1&&<span className="ml-2 text-amber-300">Φ {(conversionRate*100).toFixed(0)}%</span>}</div>}
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500"><span>1. Plate gross (actual intake)</span><span className="text-slate-300">{fmt(gross)} {p.unit}</span></div>
      <div className="relative h-5 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-visible" title={tip('Gross',gross)}>
        {totalSources>0?<><div className="absolute inset-y-0 left-0 z-10 bg-emerald-500 rounded-l-lg" style={{width:animalWidth+'%'}} title={tip('Animal / preformed',animal)}/><div className="absolute inset-y-0 z-10 bg-amber-500" style={{left:animalWidth+'%',width:plantWidth+'%'}} title={tip('Plant / precursor',plant)}/></>:<div className="absolute inset-y-0 left-0 z-10 bg-emerald-500" style={{width:grossPct+'%'}}/>}
        <Markers rda={p.intakeRda} optMin={p.intakeOptimalMin} optMax={p.intakeOptimalMax} ul={inUl}/>
      </div>
      <Ticks rda={p.intakeRda} optMin={p.intakeOptimalMin} optMax={p.intakeOptimalMax} ul={inUl}/>
      {totalSources>0&&<div className="flex gap-3 text-[10px] text-slate-500"><span><span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm mr-1"/>Animal / preformed: {fmt(animal)} {p.unit}</span><span><span className="inline-block w-2 h-2 bg-amber-500 rounded-sm mr-1"/>Plant / precursor: {fmt(plant)} {p.unit}</span></div>}
    </div>
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500"><span>2. Absorbed</span><span className="text-slate-300">{fmt(p.absorbedMin)} – {fmt(p.absorbedMax)} {p.unit}</span></div>
      <div className="relative h-5 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-visible" title={tip('Absorbed range',p.absorbedMax)}><Range min={p.absorbedMin} max={p.absorbedMax} opt={p.absorbOptimalMax} ul={aUl} solid="bg-sky-500" wash="bg-sky-400/35"/><Markers rda={p.absorbRda} optMin={p.absorbOptimalMin} optMax={p.absorbOptimalMax} ul={aUl}/></div>
      <Ticks rda={p.absorbRda} optMin={p.absorbOptimalMin} optMax={p.absorbOptimalMax} ul={aUl}/>
    </div>
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500"><span>3. Converted / active form</span><span className="text-slate-300">{fmt(p.currentMin)} – {fmt(p.currentMax)} {p.unit}</span></div>
      <div className="relative h-5 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-visible" title={tip('Active range',p.currentMax)}><Range min={p.currentMin} max={p.currentMax} opt={p.tissueOptimalMax} ul={tUl} solid="bg-emerald-500" wash="bg-emerald-400/35"/><Markers rda={p.tissueRda} optMin={p.tissueOptimalMin} optMax={p.tissueOptimalMax} ul={tUl}/></div>
      <Ticks rda={p.tissueRda} optMin={p.tissueOptimalMin} optMax={p.tissueOptimalMax} ul={tUl}/>
    </div>
  </div>;
}
export default DualRangeProgressBar;
