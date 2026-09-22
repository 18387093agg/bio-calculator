'use client';

import { useState, useEffect, useMemo } from 'react';
import { MealItemInput, MealBioactiveOutput } from '@/types/bioavailability';
import { analyzeDailyCumulativeAction } from '@/app/actions/meal-actions';

interface DailyMealLog {
  id: string;
  meal_slot: string;
  items_json: MealItemInput[];
  created_at?: string;
}

interface DailyDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DailyMealLog[];
  bodyWeightKg: number;
  dietType: string;
}

export default function DailyDashboardModal({
  isOpen,
  onClose,
  logs,
  bodyWeightKg,
  dietType,
}: DailyDashboardModalProps) {
  const [cumulativeResults, setCumulativeResults] = useState<MealBioactiveOutput[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Συγκέντρωση όλων των items από όλα τα slots της ημέρας
  const allDayItems = useMemo(() => {
    const items: MealItemInput[] = [];
    logs.forEach((log) => {
      if (Array.isArray(log.items_json)) {
        items.push(...log.items_json);
      }
    });
    return items;
  }, [logs]);

  useEffect(() => {
    if (!isOpen || allDayItems.length === 0) {
      setCumulativeResults([]);
      return;
    }

    async function runCumulativeAudit() {
      setIsAnalyzing(true);
      const res = await analyzeDailyCumulativeAction(allDayItems, dietType, 2500);
      if (res.success && res.data) {
        setCumulativeResults(res.data);
      }
      setIsAnalyzing(false);
    }

    runCumulativeAudit();
  }, [isOpen, allDayItems, dietType]);

  // Υπολογισμός ορμονικών ορίων 24ώρου
  const audit = useMemo(() => {
    const weight = Math.max(40, bodyWeightKg);
    const fatFloor = Math.max(50, Math.round(weight * 0.8));
    const proteinFloor = Math.round(weight * 1.6);
    const carbFloor = 120;

    const totalFat = cumulativeResults.length > 0 ? Number(cumulativeResults[0]?.total_fat_grams || 0) : 0;
    const totalFiber = cumulativeResults.length > 0 ? Number(cumulativeResults[0]?.total_fiber_grams || 0) : 0;
    const totalFoodGrams = allDayItems.reduce((acc, cur) => acc + (Number(cur.weight_grams) || 0), 0);

    const isKetogenic = dietType === 'carnivore' || dietType === 'ketogenic';
    const fatPassed = totalFat >= fatFloor;

    // Έλεγχος Zn:Cu σε επίπεδο 24ώρου
    const zincItem = cumulativeResults.find((r) => r.nutrient_name === 'Zinc');
    const copperItem = cumulativeResults.find((r) => r.nutrient_name === 'Copper');

    const totalZnNet = zincItem ? Number(zincItem.useful_net_max) : 0;
    const totalCuNet = copperItem ? Number(copperItem.useful_net_max) : 0;
    const znCuRatio = totalCuNet > 0 ? (totalZnNet / totalCuNet).toFixed(1) : 'N/A';
    const znCuBalanced = totalCuNet > 0 && totalZnNet / totalCuNet <= 12;

    return {
      weight,
      fatFloor,
      proteinFloor,
      carbFloor,
      totalFat,
      totalFiber,
      totalFoodGrams,
      isKetogenic,
      fatPassed,
      totalZnNet,
      totalCuNet,
      znCuRatio,
      znCuBalanced,
    };
  }, [cumulativeResults, allDayItems, bodyWeightKg, dietType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📊 Ημερήσιο Κέντρο Ελέγχου (24h Accumulator & Endocrine Audit)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Συγκεντρωτικός έλεγχος ημερήσιας κάλυψης, ορμονικών ορίων και εξισορρόπησης μετάλλων
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 24h Endocrine Floor Audit Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Fat Floor */}
          <div className={`p-4 rounded-xl border ${audit.fatPassed ? 'bg-emerald-950/40 border-emerald-800' : 'bg-rose-950/40 border-rose-800'} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">🥑 Στεροειδογένεση (Λίπος)</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${audit.fatPassed ? 'bg-emerald-900 text-emerald-200 border-emerald-700' : 'bg-rose-900 text-rose-200 border-rose-700'}`}>
                {audit.fatPassed ? '✓ PASSED' : '⚠️ DEFICIT'}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {audit.totalFat.toFixed(1)}g <span className="text-xs font-normal text-slate-400">/ min {audit.fatFloor}g</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {audit.fatPassed
                ? 'Επαρκές υπόστρωμα χοληστερόλης/λιπαρών για σύνθεση τεστοστερόνης και κορτιζόλης.'
                : `Υπολείπονται ${(audit.fatFloor - audit.totalFat).toFixed(1)}g για την αποφυγή ορμονικής καταστολής.`}
            </p>
          </div>

          {/* Thyroid / Carbs */}
          <div className="p-4 rounded-xl border bg-slate-950 border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">⚡ Θυρεοειδής (T4 → T3)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-slate-800 text-cyan-300 border-slate-700">
                {audit.isKetogenic ? 'KETO ADAPTED' : 'GLUCOSE TRACK'}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {audit.isKetogenic ? 'T3 Sparing' : `≥ ${audit.carbFloor}g Floor`}
            </div>
            <p className="text-[11px] text-slate-400">
              {audit.isKetogenic
                ? 'Σε κετογονική/carnivore διατροφή ο οργανισμός εξοικονομεί T3 μέσω αυξημένης ευαισθησίας υποδοχέων.'
                : 'Απαιτούνται υδατάνθρακες για την ηπατική μετατροπή της T4 στην ενεργό T3.'}
            </p>
          </div>

          {/* 24h Zn:Cu Ratio Balance */}
          <div className={`p-4 rounded-xl border ${audit.znCuBalanced ? 'bg-emerald-950/40 border-emerald-800' : 'bg-amber-950/40 border-amber-800'} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">⚖️ Ισοζύγιο Zn : Cu 24h</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${audit.znCuBalanced ? 'bg-emerald-900 text-emerald-200 border-emerald-700' : 'bg-amber-900 text-amber-200 border-amber-700'}`}>
                {audit.znCuBalanced ? '✓ BALANCED' : '⚠️ ANTAGONISM'}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {audit.znCuRatio}:1 <span className="text-xs font-normal text-slate-400">(Zn: {audit.totalZnNet.toFixed(1)}mg / Cu: {audit.totalCuNet.toFixed(2)}mg)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {audit.znCuBalanced
                ? 'Η συνολική αναλογία της ημέρας προστατεύει την εντερική μεταλλοθειονίνη.'
                : 'Ημερήσια υπεροχή ψευδαργύρου (>12:1). Προτείνεται προσθήκη συκωτιού στο επόμενο γεύμα.'}
            </p>
          </div>
        </div>

        {/* Logged Meal Slots */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Καταγεγραμμένα Γεύματα Σήμερα ({logs.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Συνολικός όγκος: {audit.totalFoodGrams}g τροφής
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500">
              Δεν έχουν καταχωρηθεί γεύματα για σήμερα. Χρησιμοποιήστε το κουμπί «Καταχώρηση» στο κεντρικό panel.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-xs font-bold text-white capitalize">
                      {log.meal_slot.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {log.items_json.length} υλικά
                    </span>
                  </div>
                  <div className="space-y-1">
                    {log.items_json.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-300">
                        <span className="truncate pr-2">• {it.food_name}</span>
                        <span className="font-mono text-slate-400 shrink-0">{it.weight_grams}g ({it.preparation_method})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 24h Cumulative Useful Net Micronutrients */}
        {cumulativeResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>🧬</span> Συγκεντρωτική Κάλυψη 24ώρου (Top Nutrients)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {cumulativeResults.slice(0, 8).map((nut, idx) => {
                const opt = Number(nut.adjusted_daily_target);
                const useful = Number(nut.useful_net_max);
                const pct = opt > 0 ? Math.min(200, Math.round((useful / opt) * 100)) : 0;

                return (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-white truncate">{nut.nutrient_name}</span>
                      <span className="font-mono text-emerald-400">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {useful.toFixed(1)} / {opt.toFixed(0)} {nut.unit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-2 rounded-lg transition-colors"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
}