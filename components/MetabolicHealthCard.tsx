'use client';

import React from 'react';

interface MetabolicHealthCardProps {
  pral?: {
    score: number;
    status: 'Acidic' | 'Neutral' | 'Alkaline';
    details?: any[];
  };
  methylation?: {
    methionineLoadGrams: number;
    minCholineRequiredMg: number;
    currentCholineMg: number;
    coveragePct: number;
    isAdequate: boolean;
    pathways?: any[];
  };
}

export default function MetabolicHealthCard({ pral, methylation }: MetabolicHealthCardProps) {
  const safePralScore = pral?.score ?? 0;
  const safePralStatus = pral?.status ?? 'Neutral';
  
  const safeMethionine = methylation?.methionineLoadGrams ?? 0;
  const safeMinCholine = methylation?.minCholineRequiredMg ?? 450;
  const safeCurrentCholine = methylation?.currentCholineMg ?? 0;
  const safeCoveragePct = methylation?.coveragePct ?? 0;
  const isAdequate = methylation?.isAdequate ?? false;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
      {/* PRAL Panel */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Νεφρικό Φορτίο Οξέος (PRAL)</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            safePralStatus === 'Acidic' 
              ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
              : safePralStatus === 'Alkaline'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
              : 'bg-slate-900 text-cyan-300 border border-slate-700'
          }`}>
            {safePralStatus}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-white">{safePralScore > 0 ? `+${safePralScore}` : safePralScore}</span>
          <span className="text-[11px] text-slate-500">mEq / ημέρα</span>
        </div>
        <p className="text-[10px] text-slate-400">
          {safePralScore > 15
            ? 'Όξινο ισοζύγιο: Μεταβολική επιβάρυνση οστών αν λείπουν buffer ηλεκτρολύτες (K, Mg, Citrate).'
            : safePralScore < -15
            ? 'Αλκαλικό ισοζύγιο: Υψηλή αναλογία καλίου/μαγνησίου.'
            : 'Ουδέτερο μεταβολικό ισοζύγιο.'}
        </p>
      </div>

      {/* Methylation Panel */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Ισοζύγιο Μεθυλίωσης & Χολίνης</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isAdequate
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
              : 'bg-amber-950/80 text-amber-300 border border-amber-800'
          }`}>
            {safeCoveragePct}% Κάλυψη
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-white">{safeCurrentCholine}mg</span>
          <span className="text-[11px] text-slate-500">/ min {safeMinCholine}mg (απαίτηση SAMe)</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
          <div
            style={{ width: `${Math.min(100, safeCoveragePct)}%` }}
            className={`h-full rounded-full transition-all ${isAdequate ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
        </div>
        <p className="text-[10px] text-slate-400">
          Φορτίο Μεθειονίνης: {safeMethionine}g πρωτεϊνικού αζώτου.
        </p>
      </div>
    </div>
  );
}