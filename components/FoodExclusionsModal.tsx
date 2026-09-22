'use client';

import { useState } from 'react';

export interface ExclusionRules {
  excludeHighHistamine: boolean;
  excludeDairy: boolean;
  excludeNightshades: boolean;
  excludeOrganMeats: boolean;
  excludePork: boolean;
}

interface FoodExclusionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRules: ExclusionRules;
  onSaveRules: (rules: ExclusionRules) => void;
}

export default function FoodExclusionsModal({
  isOpen,
  onClose,
  currentRules,
  onSaveRules,
}: FoodExclusionsModalProps) {
  const [draft, setDraft] = useState<ExclusionRules>(currentRules);

  if (!isOpen) return null;

  const handleToggle = (key: keyof ExclusionRules) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    setDraft({
      excludeHighHistamine: false,
      excludeDairy: false,
      excludeNightshades: false,
      excludeOrganMeats: false,
      excludePork: false,
    });
  };

  const handleSave = () => {
    onSaveRules(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🛡️ Κανόνες Αποκλεισμού & Ευαισθησιών</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Φιλτράρισμα διαθέσιμων τροφίμων και προστασία από αλλεργιογόνα / ενεργοποιητές φλεγμονής
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-base p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Rules Toggles */}
        <div className="space-y-3 text-xs">
          {/* Histamine */}
          <div
            onClick={() => handleToggle('excludeHighHistamine')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              draft.excludeHighHistamine
                ? 'bg-rose-950/40 border-rose-700/80 text-rose-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <input
              type="checkbox"
              checked={draft.excludeHighHistamine}
              onChange={() => {}}
              className="mt-0.5 rounded border-slate-700 accent-rose-600 pointer-events-none"
            />
            <div className="space-y-0.5">
              <span className="font-bold block text-white">Αποκλεισμός Υψηλής Ισταμίνης (Histamine Intolerance)</span>
              <p className="text-[11px] text-slate-400">
                Φιλτράρει κονσέρβες ψαριών (σαρδέλες, τόνο), παλαιωμένα αλλαντικά (prosciutto) και ωριμασμένα κρέατα.
              </p>
            </div>
          </div>

          {/* Dairy */}
          <div
            onClick={() => handleToggle('excludeDairy')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              draft.excludeDairy
                ? 'bg-rose-950/40 border-rose-700/80 text-rose-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <input
              type="checkbox"
              checked={draft.excludeDairy}
              onChange={() => {}}
              className="mt-0.5 rounded border-slate-700 accent-rose-600 pointer-events-none"
            />
            <div className="space-y-0.5">
              <span className="font-bold block text-white">Αποκλεισμός Γαλακτοκομικών (Dairy & Casein Free)</span>
              <p className="text-[11px] text-slate-400">
                Αφαιρεί βούτυρο, τυριά και κρέμες. Επιτρέπει μόνο καθαρισμένο Ghee / Tallow.
              </p>
            </div>
          </div>

          {/* Nightshades */}
          <div
            onClick={() => handleToggle('excludeNightshades')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              draft.excludeNightshades
                ? 'bg-rose-950/40 border-rose-700/80 text-rose-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <input
              type="checkbox"
              checked={draft.excludeNightshades}
              onChange={() => {}}
              className="mt-0.5 rounded border-slate-700 accent-rose-600 pointer-events-none"
            />
            <div className="space-y-0.5">
              <span className="font-bold block text-white">Αποκλεισμός Σολανωδών (Nightshades & High Oxalate)</span>
              <p className="text-[11px] text-slate-400">
                Αφαιρεί ντομάτες, πιπεριές, σπανάκι και τρόφιμα με ακραίο φορτίο οξαλικών κρυστάλλων.
              </p>
            </div>
          </div>

          {/* Organ Meats */}
          <div
            onClick={() => handleToggle('excludeOrganMeats')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              draft.excludeOrganMeats
                ? 'bg-rose-950/40 border-rose-700/80 text-rose-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <input
              type="checkbox"
              checked={draft.excludeOrganMeats}
              onChange={() => {}}
              className="mt-0.5 rounded border-slate-700 accent-rose-600 pointer-events-none"
            />
            <div className="space-y-0.5">
              <span className="font-bold block text-white">Αποκλεισμός Εντοσθίων / Οργάνων (Organ Free)</span>
              <p className="text-[11px] text-slate-400">
                Αποκλείει συκώτι, νεφρά και σπλήνα. Οι προτάσεις αναλογιών στρέφονται σε θαλασσινά ή συμπληρώματα.
              </p>
            </div>
          </div>

          {/* Pork */}
          <div
            onClick={() => handleToggle('excludePork')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              draft.excludePork
                ? 'bg-rose-950/40 border-rose-700/80 text-rose-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <input
              type="checkbox"
              checked={draft.excludePork}
              onChange={() => {}}
              className="mt-0.5 rounded border-slate-700 accent-rose-600 pointer-events-none"
            />
            <div className="space-y-0.5">
              <span className="font-bold block text-white">Αποκλεισμός Χοιρινού (Pork Free / PUFA Limit)</span>
              <p className="text-[11px] text-slate-400">
                Αφαιρεί χοιρινά κομμάτια και λαρδί για περιορισμό λινελαϊκού οξέος (n-6 PUFA).
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Επαναφορά (Κανένας Αποκλεισμός)
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              Ακύρωση
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow"
            >
              Αποθήκευση Κανόνων
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}