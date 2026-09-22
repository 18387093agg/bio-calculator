'use client';

import React from 'react';

export interface DualRangeProgressBarProps {
  unit: string;
  chemicalForm?: string;
  conversionRate?: number;
  grossInput: number;
  animalGross?: number;
  plantGross?: number;
  intakeRda: number;
  intakeOptimalMin: number;
  intakeOptimalMax: number;
  intakeUl?: number;
  absorbedMin: number;
  absorbedMax: number;
  absorbRda: number;
  absorbOptimalMin: number;
  absorbOptimalMax: number;
  absorbUl?: number;
  currentMin: number;
  currentMax: number;
  tissueRda: number;
  tissueOptimalMin: number;
  tissueOptimalMax: number;
  tissueUl?: number;
}

function pct(val: number, opt: number, ul: number): number {
  if (val <= 0) return 0;
  if (val <= opt) return (val / Math.max(opt, 0.001)) * 70;
  if (val <= ul) return 70 + ((val - opt) / Math.max(ul - opt, 0.001)) * 25;
  return Math.min(100, 95 + ((val - ul) / Math.max(ul, 0.001)) * 5);
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function Ticks({
  rda,
  optMin,
  optMax,
  ul,
}: {
  rda: number;
  optMin: number;
  optMax: number;
  ul: number;
}) {
  const rdaP = Math.max(2, Math.min(66, pct(rda, optMax, ul)));
  const optMinP = Math.max(3, Math.min(69, pct(optMin, optMax, ul)));
  const optMaxP = 70;
  const ulP = 95;
  return (
    <div className="relative h-8 w-full text-[10px] font-semibold">
      <span className="absolute left-0 top-0 text-slate-600">0</span>
      <div className="absolute -translate-x-1/2 top-0 flex flex-col items-center" style={{ left: `${rdaP}%` }}>
        <span className="text-white bg-slate-950/90 px-1 rounded">RDA</span>
        <span className="text-slate-300">{fmt(rda)}</span>
      </div>
      <div className="absolute -translate-x-1/2 top-0 flex flex-col items-center" style={{ left: `${optMinP}%` }}>
        <span className="text-cyan-400 bg-slate-950/90 px-1 rounded">Opt min</span>
        <span className="text-cyan-200">{fmt(optMin)}</span>
      </div>
      <div className="absolute -translate-x-1/2 top-0 flex flex-col items-center" style={{ left: `${optMaxP}%` }}>
        <span className="text-cyan-300 bg-slate-950/90 px-1 rounded">Opt max</span>
        <span className="text-cyan-100">{fmt(optMax)}</span>
      </div>
      <div className="absolute -translate-x-1/2 top-0 flex flex-col items-center" style={{ left: `${ulP}%` }}>
        <span className="text-rose-400 bg-slate-950/90 px-1 rounded">UL</span>
        <span className="text-rose-300">{fmt(ul)}</span>
      </div>
    </div>
  );
}

function RangeFill({
  fillMin,
  fillMax,
  optMax,
  ul,
  solidClass,
  washClass,
}: {
  fillMin: number;
  fillMax: number;
  optMax: number;
  ul: number;
  solidClass: string;
  washClass: string;
}) {
  const minP = pct(fillMin, optMax, ul);
  const maxP = pct(fillMax, optMax, ul);
  const over = fillMax > ul;
  return (
    <>
      <div
        className={`absolute inset-y-0 left-0 z-10 ${over ? 'bg-rose-600' : solidClass}`}
        style={{ width: `${Math.min(100, minP)}%` }}
      />
      <div
        className={`absolute inset-y-0 z-10 ${over ? 'bg-rose-400/35' : washClass}`}
        style={{ left: `${minP}%`, width: `${Math.max(0, maxP - minP)}%` }}
      />
    </>
  );
}

function MarkerLines({ rda, optMin, optMax, ul }: { rda: number; optMin: number; optMax: number; ul: number }) {
  const rdaP = Math.max(2, Math.min(66, pct(rda, optMax, ul)));
  const optMinP = Math.max(3, Math.min(69, pct(optMin, optMax, ul)));
  return (
    <>
      <div className="absolute top-0 bottom-0 w-[2px] bg-slate-100 z-20" style={{ left: `${rdaP}%` }} />
      <div
        className="absolute top-0 bottom-0 border-y border-dashed border-cyan-800/80 z-0"
        style={{ left: `${optMinP}%`, width: `${Math.max(2, 70 - optMinP)}%` }}
      />
      <div className="absolute top-0 bottom-0 w-[2px] bg-cyan-500 z-20" style={{ left: `${optMinP}%` }} />
      <div className="absolute top-0 bottom-0 w-[2.5px] bg-cyan-300 z-20" style={{ left: '70%' }} />
      <div className="absolute top-0 bottom-0 w-[3px] bg-rose-500 z-20" style={{ left: '95%' }} />
    </>
  );
}

export function DualRangeProgressBar({
  unit,
  chemicalForm,
  conversionRate = 1,
  grossInput,
  animalGross = 0,
  plantGross = 0,
  intakeRda,
  intakeOptimalMin,
  intakeOptimalMax,
  intakeUl,
  absorbedMin,
  absorbedMax,
  absorbRda,
  absorbOptimalMin,
  absorbOptimalMax,
  absorbUl,
  currentMin,
  currentMax,
  tissueRda,
  tissueOptimalMin,
  tissueOptimalMax,
  tissueUl,
}: DualRangeProgressBarProps) {
  const inUl = intakeUl && intakeUl > intakeOptimalMax ? intakeUl : intakeOptimalMax * 4;
  const aUl = absorbUl && absorbUl > absorbOptimalMax ? absorbUl : absorbOptimalMax * 4;
  const tUl = tissueUl && tissueUl > tissueOptimalMax ? tissueUl : tissueOptimalMax * 4;

  const animal = Math.max(0, animalGross);
  const plant = Math.max(0, plantGross);
  const split = animal + plant > 0 ? animal + plant : grossInput;
  const animalPct = split > 0 ? (animal / split) * pct(grossInput, intakeOptimalMax, inUl) : 0;
  const plantPct = split > 0 ? (plant / split) * pct(grossInput, intakeOptimalMax, inUl) : pct(grossInput, intakeOptimalMax, inUl);

  return (
    <div className="w-full font-mono space-y-4 pt-1">
      <div className="text-[10px] text-slate-500 uppercase tracking-wide">
        Status scale — bar position is intentionally non-linear; use the values and tooltips for quantitative amounts.
      </div>
      {chemicalForm && (
        <div className="text-[10px] text-slate-500 truncate">
          Active form: <span className="text-slate-300">{chemicalForm}</span>
          {conversionRate !== 1 && (
            <span className="ml-2 text-amber-300">Φ {(conversionRate * 100).toFixed(0)}%</span>
          )}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500">
          <span>1. Plate gross (animal vs plant)</span>
          <span className="font-mono text-slate-300">
            {fmt(grossInput)} {unit}
            {animal + plant > 0 && (
              <span className="text-slate-500">
                {' '}
                (🥩 {fmt(animal)} / 🌱 {fmt(plant)})
              </span>
            )}
          </span>
        </div>
        <div className="relative h-5 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 z-10 bg-emerald-500"
            style={{ width: `${animalPct}%` }}
            title={`Animal / preformed: ${fmt(animal)} ${unit}`}
          />
          <div
            className="absolute inset-y-0 z-10 bg-amber-500"
            style={{ left: `${animalPct}%`, width: `${plantPct}%` }}
            title={`Plant / precursor: ${fmt(plant)} ${unit}`}
          />
          <MarkerLines rda={intakeRda} optMin={intakeOptimalMin} optMax={intakeOptimalMax} ul={inUl} />
        </div>
        <Ticks rda={intakeRda} optMin={intakeOptimalMin} optMax={intakeOptimalMax} ul={inUl} />
        <div className="flex gap-3 text-[10px] text-slate-500">
          <span>
            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm mr-1" />
            Animal / preformed
          </span>
          <span>
            <span className="inline-block w-2 h-2 bg-amber-500 rounded-sm mr-1" />
            Plant / precursor
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500">
          <span>2. Absorbed (healthy-adult RDA × absorption)</span>
          <span className="font-mono text-slate-300">
            {fmt(absorbedMin)} – {fmt(absorbedMax)} {unit}
          </span>
        </div>
        <div className="relative h-5 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 z-30 cursor-help"
            style={{ width: `${Math.min(100, pct(absorbedMax, absorbOptimalMax, aUl))}%` }}
            title={`Absorbed estimate: ${fmt(absorbedMin)}–${fmt(absorbedMax)} ${unit}`}
          />
          <RangeFill
            fillMin={absorbedMin}
            fillMax={absorbedMax}
            optMax={absorbOptimalMax}
            ul={aUl}
            solidClass="bg-sky-500"
            washClass="bg-sky-400/35"
          />
          <MarkerLines rda={absorbRda} optMin={absorbOptimalMin} optMax={absorbOptimalMax} ul={aUl} />
        </div>
        <Ticks rda={absorbRda} optMin={absorbOptimalMin} optMax={absorbOptimalMax} ul={aUl} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500">
          <span>3. Converted / active form (abs × Φ)</span>
          <span className="font-mono text-slate-300">
            {fmt(currentMin)} – {fmt(currentMax)} {unit}
          </span>
        </div>
        <div className="relative h-5 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 z-30 cursor-help"
            style={{ width: `${Math.min(100, pct(currentMax, tissueOptimalMax, tUl))}%` }}
            title={`Active/converted estimate: ${fmt(currentMin)}–${fmt(currentMax)} ${unit}`}
          />
          <RangeFill
            fillMin={currentMin}
            fillMax={currentMax}
            optMax={tissueOptimalMax}
            ul={tUl}
            solidClass="bg-emerald-500"
            washClass="bg-emerald-400/35"
          />
          <MarkerLines rda={tissueRda} optMin={tissueOptimalMin} optMax={tissueOptimalMax} ul={tUl} />
        </div>
        <Ticks rda={tissueRda} optMin={tissueOptimalMin} optMax={tissueOptimalMax} ul={tUl} />
      </div>
    </div>
  );
}

export default DualRangeProgressBar;
