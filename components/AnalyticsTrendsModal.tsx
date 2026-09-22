'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchTelemetryTrendsAction, DailyNutrientSnapshot } from '@/app/actions/meal-actions';

interface AnalyticsTrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodyWeightKg: number;
}

export default function AnalyticsTrendsModal({
  isOpen,
  onClose,
  bodyWeightKg,
}: AnalyticsTrendsModalProps) {
  const [selectedNutrient, setSelectedNutrient] = useState<string>('Vitamin A');
  const [snapshots, setSnapshots] = useState<DailyNutrientSnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoData, setIsDemoData] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadTrends() {
      setLoading(true);
      try {
        const res = await fetchTelemetryTrendsAction();

        if (res && res.success && res.data && res.data.length > 0) {
          setSnapshots(res.data);
          setIsDemoData(false);
        } else {
          setSnapshots(generateFallbackTrendData());
          setIsDemoData(true);
        }
      } catch (err) {
        console.warn('Error loading telemetry trends, activating fallback feed:', err);
        setSnapshots(generateFallbackTrendData());
        setIsDemoData(true);
      } finally {
        setLoading(false);
      }
    }

    loadTrends();
  }, [isOpen]);

  const trendPoints = useMemo(() => {
    return snapshots.map((s) => ({
      date: (s.date || '').slice(5),
      val: s.nutrientAverages ? s.nutrientAverages[selectedNutrient] ?? 0 : 0,
    }));
  }, [snapshots, selectedNutrient]);

  if (!isOpen) return null;

  const values = trendPoints.map((p) => p.val);
  const maxVal = Math.max(1, ...values) * 1.15;
  const avgVal = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>📈</span> Διαχρονικές Τάσεις Βιοδιαθεσιμότητας (30D Telemetry)
              </h2>
              {isDemoData && (
                <span className="text-[10px] bg-amber-950/80 border border-amber-800 text-amber-300 px-2 py-0.5 rounded font-mono">
                  Simulation Feed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Παρακολούθηση κυτταρικού κορεσμού και διακυμάνσεων απορρόφησης
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm p-1"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Επιλογή Θρεπτικού:</span>
            <select
              value={selectedNutrient}
              onChange={(e) => setSelectedNutrient(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-emerald-400 font-bold px-2.5 py-1.5 rounded-lg focus:outline-none"
            >
              <option value="Vitamin A">Vitamin A (Retinol mcg)</option>
              <option value="Vitamin D">Vitamin D (mcg)</option>
              <option value="Vitamin B6">Vitamin B6 (mg)</option>
              <option value="Vitamin B12">Vitamin B12 (mcg)</option>
              <option value="Zinc">Zinc (mg)</option>
              <option value="Copper">Copper (mg)</option>
              <option value="Iron">Iron (Heme mg)</option>
              <option value="Magnesium">Magnesium (mg)</option>
              <option value="Potassium">Potassium (mg)</option>
              <option value="Sodium">Sodium (mg)</option>
              <option value="Choline">Choline (mg)</option>
            </select>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div>
              <span className="text-slate-500">Μέσος Όρος 30D: </span>
              <span className="text-white font-bold">{avgVal.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-slate-500">Μέγιστο: </span>
              <span className="text-emerald-400 font-bold">{Math.max(...values, 0).toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-end min-h-[260px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-500">
              Φόρτωση τηλεμετρίας...
            </div>
          ) : (
            <div className="w-full h-48 flex items-end gap-1.5 pt-6 pb-2">
              {trendPoints.map((pt, i) => {
                const heightPct = Math.max(8, Math.min(100, Math.round((pt.val / maxVal) * 100)));
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                  >
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-slate-800 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        {pt.date}: <span className="text-emerald-400 font-bold">{pt.val.toFixed(1)}</span>
                      </div>
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-t opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                    />
                    <span className="text-[8px] font-mono text-slate-600 block truncate w-full text-center">
                      {i % 4 === 0 ? pt.date : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800 pt-3">
          <span>Υπολογισμός με βάση {bodyWeightKg}kg LBM</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
}

function generateFallbackTrendData(): DailyNutrientSnapshot[] {
  const list: DailyNutrientSnapshot[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const factor = 0.85 + Math.sin(i / 2) * 0.25;

    list.push({
      date: dateStr,
      totalCalories: Math.round(2400 * factor),
      totalProtein: Math.round(145 * factor),
      totalFat: Math.round(175 * factor),
      totalCarbs: Math.round(12 * factor),
      nutrientAverages: {
        'Vitamin A': Number((1650 * factor).toFixed(1)),
        'Vitamin D': Number((45 * factor).toFixed(1)),
        'Vitamin B6': Number((3.2 * factor).toFixed(2)),
        'Vitamin B12': Number((4.8 * factor).toFixed(1)),
        'Zinc': Number((19.5 * factor).toFixed(1)),
        'Copper': Number((2.4 * factor).toFixed(2)),
        'Iron': Number((16.0 * factor).toFixed(1)),
        'Magnesium': Number((420 * factor).toFixed(0)),
        'Potassium': Number((3600 * factor).toFixed(0)),
        'Sodium': Number((2800 * factor).toFixed(0)),
        'Choline': Number((680 * factor).toFixed(0)),
      },
    });
  }

  return list;
}