'use client';

import React, { useState } from 'react';

export interface AntinutrientSensitivityConfig {
  oxalateBindingFactor: number;
  phytateChelationFactor: number;
  thermalLeachingRetentionPct: number;
  activePreset: 'standard' | 'hyperoxaluria' | 'leaching_high';
}

interface AntinutrientSensitivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: AntinutrientSensitivityConfig;
  onSaveConfig: (config: AntinutrientSensitivityConfig) => void;
}

export default function AntinutrientSensitivityModal({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}: AntinutrientSensitivityModalProps) {
  const [config, setConfig] = useState<AntinutrientSensitivityConfig>(currentConfig);

  if (!isOpen) return null;

  const handlePreset = (preset: AntinutrientSensitivityConfig['activePreset']) => {
    if (preset === 'standard') {
      setConfig({
        oxalateBindingFactor: 1.0,
        phytateChelationFactor: 1.0,
        thermalLeachingRetentionPct: 70,
        activePreset: 'standard',
      });
    } else if (preset === 'hyperoxaluria') {
      setConfig({
        oxalateBindingFactor: 2.2,
        phytateChelationFactor: 1.2,
        thermalLeachingRetentionPct: 70,
        activePreset: 'hyperoxaluria',
      });
    } else if (preset === 'leaching_high') {
      setConfig({
        oxalateBindingFactor: 1.0,
        phytateChelationFactor: 1.0,
        thermalLeachingRetentionPct: 35,
        activePreset: 'leaching_high',
      });
    }
  };

  const handleSave = () => {
    onSaveConfig(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 text-slate-100 shadow-2xl font-mono text-xs">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧪</span>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Αντιθρεπτικά & Κλινικές Απώλειες Απορρόφησης
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Βαθμονόμηση δεσμεύσεων οξαλικών, φυτικών και θερμικών απωλειών βάσει συμπτωμάτων και παθολογίας.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-base px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Presets Grid */}
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Κλινικά Πρότυπα (Presets):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handlePreset('standard')}
              className={`p-3 rounded-xl border text-left transition-all ${
                config.activePreset === 'standard'
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 shadow-lg'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs text-white">Standard / Υγιές</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Φυσιολογική χηλίωση εντερικού αυλού.</div>
            </button>

            <button
              type="button"
              onClick={() => handlePreset('hyperoxaluria')}
              className={`p-3 rounded-xl border text-left transition-all ${
                config.activePreset === 'hyperoxaluria'
                  ? 'bg-amber-950/60 border-amber-600 text-amber-300 shadow-lg'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs text-amber-400">Υπεροξαλουρία / Δυσαπορρόφηση</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Πέτρες νεφρών, μυαλγίες, δέσμευση Ca.</div>
            </button>

            <button
              type="button"
              onClick={() => handlePreset('leaching_high')}
              className={`p-3 rounded-xl border text-left transition-all ${
                config.activePreset === 'leaching_high'
                  ? 'bg-rose-950/60 border-rose-600 text-rose-300 shadow-lg'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs text-rose-400">Απόρριψη Ζωμού / Βραστό</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Έκπλυση -65% υδατοδιαλυτών (B/C/K/Na).</div>
            </button>
          </div>
        </div>

        {/* 1. Οξαλικά (Oxalates) Section */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-white uppercase block">
                1. Οξαλικά Οξέα (Oxalic Acid) ➔ Δέσμευση Ασβεστίου (Ca) & Μαγνησίου (Mg)
              </span>
              <span className="text-[10px] text-slate-500 font-sans">
                Σχηματισμός αδιάλυτων κρυστάλλων οξαλικού ασβεστίου στον εντερικό αυλό.
              </span>
            </div>
            <span className="text-emerald-400 font-mono font-bold text-sm bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              {config.oxalateBindingFactor.toFixed(2)}x
            </span>
          </div>

          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={config.oxalateBindingFactor}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                oxalateBindingFactor: parseFloat(e.target.value),
                activePreset: 'standard',
              }))
            }
            className="w-full accent-emerald-500 cursor-pointer"
          />

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1 font-sans text-[11px] text-slate-300 leading-relaxed">
            <p>
              <strong className="text-amber-400 font-mono">Πάθηση / Μηχανισμός:</strong> <em>Εντερική Υπεροξαλουρία (Enteric Hyperoxaluria)</em>. Όταν υπάρχει δυσαπορρόφηση λιπών (π.χ. χαμηλά χολικά άλατα), τα ελεύθερα λιπαρά οξέα δεσμεύουν το ασβέστιο, αφήνοντας τα οξαλικά ελεύθερα να απορροφηθούν μαζικά και να καταλήξουν στα νεφρά.
            </p>
            <p>
              <strong className="text-rose-400 font-mono">Συμπτώματα:</strong> Νεφρολιθίαση (πέτρες οξαλικού ασβεστίου), μυϊκοί πόνοι / ινομυαλγία, καύσος κατά την ούρηση, αρθραλγίες και οστική απώλεια.
            </p>
          </div>
        </div>

        {/* 2. Φυτικά (Phytic Acid) Section */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-white uppercase block">
                2. Φυτικό Οξύ (Phytic Acid / Phytates) ➔ Χηλίωση Ψευδαργύρου (Zn) & Σιδήρου (Fe)
              </span>
              <span className="text-[10px] text-slate-500 font-sans">
                Πολυανιονική δέσμευση δισθενών κατιόντων (Zn2+, Fe2+, Mg2+) αποτρέποντας τη μεταφορά τους από τον DMT1.
              </span>
            </div>
            <span className="text-cyan-400 font-mono font-bold text-sm bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              {config.phytateChelationFactor.toFixed(2)}x
            </span>
          </div>

          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={config.phytateChelationFactor}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                phytateChelationFactor: parseFloat(e.target.value),
                activePreset: 'standard',
              }))
            }
            className="w-full accent-cyan-500 cursor-pointer"
          />

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1 font-sans text-[11px] text-slate-300 leading-relaxed">
            <p>
              <strong className="text-cyan-400 font-mono">Πάθηση / Μηχανισμός:</strong> <em>Σύνδρομο Μειωμένης Βιοδιαθεσιμότητας Ιχνοστοιχείων</em>. Τα φυτικά (που αφθονούν σε δημητριακά ολικής, όσπρια και σπόρους) σχηματίζουν αδιάλυτα συμπλέγματα με τον ψευδάργυρο όταν ο μοριακός λόγος Phytate:Zinc ξεπερνά το 15:1.
            </p>
            <p>
              <strong className="text-rose-400 font-mono">Συμπτώματα:</strong> Χρόνια κόπωση, σιδηροπενική αναιμία (παρά την επαρκή πρόσληψη σιδήρου), τριχόπτωση, εξασθενημένο ανοσοποιητικό, λευκές κηλίδες στα νύχια και δερματικές βλάβες / καθυστέρηση επούλωσης.
            </p>
          </div>
        </div>

        {/* 3. Θερμική Έκπλυση (Thermal Leaching) Section */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-white uppercase block">
                3. Θερμική Έκπλυση σε Υγρό (Thermal Leaching / Boiling Loss)
              </span>
              <span className="text-[10px] text-slate-500 font-sans">
                Ποσοστό διατήρησης υδατοδιαλυτών βιταμινών (Σύμπλεγμα B, Βιταμίνη C) και ηλεκτρολυτών (Κάλιο, Νάτριο).
              </span>
            </div>
            <span className="text-amber-400 font-mono font-bold text-sm bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              {config.thermalLeachingRetentionPct}% Διατήρηση
            </span>
          </div>

          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={config.thermalLeachingRetentionPct}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                thermalLeachingRetentionPct: parseInt(e.target.value, 10),
                activePreset: 'standard',
              }))
            }
            className="w-full accent-amber-500 cursor-pointer"
          />

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1 font-sans text-[11px] text-slate-300 leading-relaxed">
            <p>
              <strong className="text-amber-400 font-mono">Πρακτικός Κανόνας:</strong> Όταν βράζετε κρέας, συκώτι ή λαχανικά και <strong>πετάτε το νερό</strong>, το 40% έως 65% του Καλίου, του Μαγνησίου, της Θειαμίνης (B1) και της B6 καταλήγει στην αποχέτευση.
            </p>
            <p>
              <strong className="text-emerald-400 font-mono">Κλινική Οδηγία:</strong> Αν καταναλώνετε το ζωμό ως σούπα, ρυθμίστε το στο <strong>90-100%</strong>. Αν τον απορρίπτετε, μειώστε το στο <strong>35-50%</strong> για ακριβή υπολογισμό των πραγματικών απωλειών.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs transition-colors"
          >
            Ακύρωση
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow"
          >
            Εφαρμογή Ρυθμίσεων
          </button>
        </div>

      </div>
    </div>
  );
}