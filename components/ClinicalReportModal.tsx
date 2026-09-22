'use client';

import React from 'react';
import { MealBioactiveOutput } from '@/types/bioavailability';

export interface ReportPRAL {
  score: number;
  status: 'Acidic' | 'Neutral' | 'Alkaline';
}

export interface ReportMethylation {
  methionineLoadGrams: number;
  minCholineRequiredMg: number;
  currentCholineMg: number;
  coveragePct: number;
  isAdequate: boolean;
}

interface ClinicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dietType: string;
  dailyCalories: number;
  bodyWeightKg: number;
  proteinMetrics: {
    optProteinMin: number;
    optProteinMax: number;
    minHormonalFatGrams: number;
    proteinQualityStatus: string;
  };
  results: MealBioactiveOutput[];
  itemsCount: number;
  totalGrams: number;
  pral?: ReportPRAL;
  methylation?: ReportMethylation;
}

export default function ClinicalReportModal({
  isOpen,
  onClose,
  dietType,
  dailyCalories,
  bodyWeightKg,
  proteinMetrics,
  results,
  itemsCount,
  totalGrams,
  pral,
  methylation,
}: ClinicalReportModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('el-GR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 text-slate-100 shadow-2xl print:max-h-none print:overflow-visible print:border-none print:p-8 print:bg-white print:text-black print:shadow-none">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📄</span>
              <h2 className="text-lg font-bold tracking-tight text-white print:text-black uppercase">
                Κλινική Έκθεση Εντερικής Βιοδιαθεσιμότητας & Μεταβολισμού
              </h2>
            </div>
            <p className="text-xs text-slate-400 print:text-slate-600 font-mono mt-1">
              Ημερομηνία: {currentDate} | Telemetry Engine v2.8 Enterprise
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow"
            >
              <span>🖨️</span> Εκτύπωση / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs transition-colors"
            >
              ✕ Κλείσιμο
            </button>
          </div>
        </div>

        {/* Patient & Metabolic Summary Block */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 border border-slate-800/80 rounded-xl p-4 font-mono text-xs print:bg-slate-50 print:border-slate-300 print:text-black">
          <div>
            <span className="text-[10px] text-slate-400 print:text-slate-500 uppercase block">Διατροφικό Μοτίβο</span>
            <span className="font-bold text-emerald-400 print:text-emerald-700 uppercase">{dietType}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 print:text-slate-500 uppercase block">Σωματικό Βάρος</span>
            <span className="font-bold text-white print:text-black">{bodyWeightKg} kg</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 print:text-slate-500 uppercase block">Σύνολο Πιάτου</span>
            <span className="font-bold text-white print:text-black">{itemsCount} υλικά ({totalGrams}g)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 print:text-slate-500 uppercase block">Ενεργειακός Στόχος</span>
            <span className="font-bold text-white print:text-black">{dailyCalories} kcal</span>
          </div>
        </div>

        {/* Metabolic Analysis: PRAL & Methylation */}
        {(pral || methylation) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {pral && (
              <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-1.5 print:bg-slate-50 print:border-slate-300">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300 print:text-slate-700">Νεφρικό Όξινο Φορτίο (PRAL)</span>
                  <span className={`font-bold ${pral.score > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {pral.score > 0 ? `+${pral.score}` : pral.score} mEq
                  </span>
                </div>
                <div className="text-xs font-semibold text-white print:text-black">Ισοζύγιο: {pral.status}</div>
                <p className="text-[11px] text-slate-400 print:text-slate-600 font-sans leading-relaxed">
                  {pral.score > 10
                    ? 'Όξινο φορτίο: Απαιτεί εξισορρόπηση με κάλιο/μαγνήσιο για αποφυγή οστικής απορρόφησης.'
                    : pral.score < -10
                    ? 'Αλκαλικό φορτίο: Υψηλή προστασία νεφρικού και οστικού ιστού.'
                    : 'Ουδέτερο μεταβολικό φορτίο.'}
                </p>
              </div>
            )}

            {methylation && (
              <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-1.5 print:bg-slate-50 print:border-slate-300">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300 print:text-slate-700">Methylation Buffer (Χολίνη)</span>
                  <span className={`font-bold ${methylation.isAdequate ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {methylation.coveragePct}% Κάλυψη
                  </span>
                </div>
                <div className="text-xs font-semibold text-white print:text-black">
                  {methylation.currentCholineMg}mg Choline / ~{methylation.methionineLoadGrams}g Met
                </div>
                <p className="text-[11px] text-slate-400 print:text-slate-600 font-sans leading-relaxed">
                  Κατάσταση: {methylation.isAdequate ? 'Επαρκής απομάκρυνση ομοκυστεΐνης' : 'Αυξημένη μεταβολική ζήτηση χολίνης/SAMe'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Protein & Hormonal Thresholds */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 font-mono text-xs space-y-1 print:bg-slate-50 print:border-slate-300">
          <div className="text-xs font-bold text-slate-300 print:text-slate-800">
            Ορμονικά & Πρωτεϊνικά Όρια (DIAAS & Στεροειδογένεση)
          </div>
          <div className="text-slate-400 print:text-slate-600">
            • Εύρος Πρωτεΐνης: <strong className="text-white print:text-black">{proteinMetrics.optProteinMin}g – {proteinMetrics.optProteinMax}g</strong> ({proteinMetrics.proteinQualityStatus})
          </div>
          <div className="text-slate-400 print:text-slate-600">
            • Ελάχιστο Λίπος Στεροειδογένεσης: <strong className="text-white print:text-black">{proteinMetrics.minHormonalFatGrams}g</strong> (απαραίτητο για μικύλλια και CCK)
          </div>
        </div>

        {/* Comprehensive Nutrient Bio-Yield Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-slate-800 font-mono">
            Πίνακας Εντερικής Απόδοσης & Καθαρής Χρηστικότητας
          </h3>
          <div className="border border-slate-800 rounded-xl overflow-hidden print:border-slate-300">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                <tr>
                  <th className="p-2.5">Θρεπτικό Συστατικό</th>
                  <th className="p-2.5">Χημική Μορφή</th>
                  <th className="p-2.5 text-right">Plate Gross</th>
                  <th className="p-2.5 text-right">Net Bioavailable</th>
                  <th className="p-2.5 text-right">Στόχος</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      Δεν υπάρχουν καταγεγραμμένα δεδομένα θρεπτικών.
                    </td>
                  </tr>
                ) : (
                  results.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-950/40 print:hover:bg-transparent">
                      <td className="p-2.5 font-bold text-white print:text-black">{r.nutrient_name}</td>
                      <td className="p-2.5 text-slate-400 print:text-slate-600">{r.chemical_form || '—'}</td>
                      <td className="p-2.5 text-right text-slate-300 print:text-slate-700">
                        {Number(r.total_plate_gross).toFixed(1)} {r.unit}
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-400 print:text-emerald-700">
                        {Number(r.useful_net_min).toFixed(1)} – {Number(r.useful_net_max).toFixed(1)} {r.unit}
                      </td>
                      <td className="p-2.5 text-right text-slate-400 print:text-slate-600">
                        {r.adjusted_daily_target} {r.unit}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Practitioner Clinical Sign-off Block */}
        <div className="pt-4 border-t border-slate-800 text-xs font-mono grid grid-cols-2 gap-8 print:border-slate-300 print:text-black">
          <div>
            <span className="text-[10px] text-slate-400 print:text-slate-500 uppercase block">Κλινικές Παρατηρήσεις:</span>
            <div className="mt-1 h-16 border-b border-dashed border-slate-700 print:border-slate-400" />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 print:text-slate-500 uppercase block">Υπογραφή Επαγγελματία Υγείας:</span>
            <div className="mt-1 h-16 border-b border-dashed border-slate-700 print:border-slate-400" />
          </div>
        </div>

      </div>
    </div>
  );
}