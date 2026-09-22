'use client';

import { useState } from 'react';

interface WeightEstimatorModalProps {
  foodName: string;
  category: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyRawWeight: (calculatedRawGrams: number) => void;
}

export default function WeightEstimatorModal({
  foodName,
  category,
  isOpen,
  onClose,
  onApplyRawWeight,
}: WeightEstimatorModalProps) {
  const [cookedWeight, setCookedWeight] = useState<number>(150);
  const [intensity, setIntensity] = useState<string>('medium');

  if (!isOpen) return null;

  const isMeatOrFish = ['meat', 'organ', 'seafood'].includes(category.toLowerCase());
  const isGrainOrLegume = ['grain', 'legume', 'seed'].includes(category.toLowerCase()) || 
                          foodName.toLowerCase().includes('bean') || 
                          foodName.toLowerCase().includes('rice') || 
                          foodName.toLowerCase().includes('oat') ||
                          foodName.toLowerCase().includes('lentil');

  // Υπολογισμός Συντελεστή (Cooked Yield Factor)
  let yieldFactor = 0.75; // default: 25% moisture loss
  let options: { id: string; label: string; desc: string; factor: number }[] = [];

  if (isMeatOrFish) {
    options = [
      { id: 'light', label: 'Rare / Ελαφρύ Ψήσιμο', desc: '~15% απώλεια υγρών (ζουμερό)', factor: 0.85 },
      { id: 'medium', label: 'Medium / Κανονικό Ψήσιμο', desc: '~25% απώλεια υγρών (τυπικό φιλέτο/μπριζόλα)', factor: 0.75 },
      { id: 'heavy', label: 'Well-Done / Slow Roast / Braised', desc: '~35-40% απώλεια (παρατεταμένο ψήσιμο/brisket)', factor: 0.62 },
    ];
  } else if (isGrainOrLegume) {
    options = [
      { id: 'light', label: 'Al Dente / Σφιχτό', desc: 'Απορρόφηση νερού ~2.0x του ωμού βάρους', factor: 2.0 },
      { id: 'medium', label: 'Κανονικά Βρασμένο', desc: 'Απορρόφηση νερού ~2.3x του ωμού βάρους', factor: 2.3 },
      { id: 'heavy', label: 'Μαλακό / Χυλωμένο / Σούπα', desc: 'Απορρόφηση νερού ~2.7x του ωμού βάρους', factor: 2.7 },
    ];
  } else {
    // Vegetables & Others
    options = [
      { id: 'light', label: 'Ελαφρύ Σοτάρισμα / Ατμός', desc: '~10-15% συρρίκνωση', factor: 0.88 },
      { id: 'medium', label: 'Ψητό Φούρνου / Τηγανητό', desc: '~25% απώλεια υγρασίας', factor: 0.75 },
      { id: 'heavy', label: 'Πλήρως Μαγειρεμένο / Σιγοβρασμένο', desc: '~45% συρρίκνωση (π.χ. σπανάκι, μανιτάρια)', factor: 0.55 },
    ];
  }

  const selectedOption = options.find((o) => o.id === intensity) || options[1];
  yieldFactor = selectedOption.factor;

  // Τελικός υπολογισμός ωμού βάρους: Cooked / Factor
  const calculatedRaw = Math.round(cookedWeight / yieldFactor);

  const handleApply = () => {
    onApplyRawWeight(calculatedRaw);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚖️ Μετατροπέας Μαγειρεμένου σε Ωμό</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Υπολογισμός ισοδύναμου αρχικού βάρους για: <span className="text-emerald-400 font-semibold">{foodName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Cooked Weight Input */}
        <div>
          <label className="text-xs text-slate-300 block mb-1.5 font-medium">
            Βάρος στο Πιάτο (Μαγειρεμένο σε γραμμάρια):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={cookedWeight}
              onChange={(e) => setCookedWeight(Math.max(1, Number(e.target.value)))}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <span className="text-xs font-mono text-slate-400">g</span>
          </div>
        </div>

        {/* Cooking Degree Options */}
        <div className="space-y-2">
          <label className="text-xs text-slate-300 block font-medium">
            Ένταση & Χρόνος Μαγειρέματος:
          </label>
          <div className="grid grid-cols-1 gap-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIntensity(opt.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  intensity === opt.id
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>{opt.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {isGrainOrLegume ? `${opt.factor}x ενυδάτωση` : `-${Math.round((1 - opt.factor) * 100)}% υγρά`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Result Callout */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">Ισοδύναμο Ωμό Βάρος:</div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              ~{calculatedRaw} <span className="text-xs font-normal text-slate-500">g (Raw)</span>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500 max-w-[140px]">
            Αυτό το βάρος θα σταλεί στον υπολογιστή βιοδιαθεσιμότητας.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Άκυρο
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2 rounded-lg shadow transition-colors"
          >
            Εφαρμογή ({calculatedRaw}g)
          </button>
        </div>
      </div>
    </div>
  );
}