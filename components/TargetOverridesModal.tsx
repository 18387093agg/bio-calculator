'use client';

import { useState } from 'react';
import { CanonicalNutrient } from '@/types/bioavailability';

export interface NutrientOverrides {
  [nutrientName: string]: number;
}

interface TargetOverridesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOverrides: NutrientOverrides;
  onSaveOverrides: (newOverrides: NutrientOverrides) => void;
}

interface ConfigurableNutrientItem {
  name: CanonicalNutrient;
  unit: string;
  defaultTarget: number;
  category: 'minerals' | 'fat_soluble' | 'water_soluble' | 'bioactives';
}

const ALL_30_NUTRIENTS: ConfigurableNutrientItem[] = [
  // Minerals & Electrolytes
  { name: 'Magnesium', unit: 'mg', defaultTarget: 420, category: 'minerals' },
  { name: 'Calcium', unit: 'mg', defaultTarget: 1000, category: 'minerals' },
  { name: 'Phosphorus', unit: 'mg', defaultTarget: 700, category: 'minerals' },
  { name: 'Potassium', unit: 'mg', defaultTarget: 4700, category: 'minerals' },
  { name: 'Sodium', unit: 'mg', defaultTarget: 2300, category: 'minerals' },
  { name: 'Chloride', unit: 'mg', defaultTarget: 3400, category: 'minerals' },
  { name: 'Sulfur', unit: 'mg', defaultTarget: 1000, category: 'minerals' },
  { name: 'Zinc', unit: 'mg', defaultTarget: 15, category: 'minerals' },
  { name: 'Copper', unit: 'mg', defaultTarget: 1.5, category: 'minerals' },
  { name: 'Iron', unit: 'mg', defaultTarget: 18, category: 'minerals' },
  { name: 'Selenium', unit: 'mcg', defaultTarget: 70, category: 'minerals' },
  { name: 'Iodine', unit: 'mcg', defaultTarget: 150, category: 'minerals' },
  { name: 'Manganese', unit: 'mg', defaultTarget: 2.3, category: 'minerals' },
  { name: 'Molybdenum', unit: 'mcg', defaultTarget: 45, category: 'minerals' },
  { name: 'Chromium', unit: 'mcg', defaultTarget: 35, category: 'minerals' },

  // Fat-Soluble Vitamins
  { name: 'Vitamin A', unit: 'mcg', defaultTarget: 900, category: 'fat_soluble' },
  { name: 'Vitamin D', unit: 'mcg', defaultTarget: 75, category: 'fat_soluble' },
  { name: 'Vitamin E', unit: 'mg', defaultTarget: 25, category: 'fat_soluble' },
  { name: 'Vitamin K', unit: 'mcg', defaultTarget: 120, category: 'fat_soluble' },

  // Water-Soluble Vitamins & B-Complex
  { name: 'Thiamine (B1)', unit: 'mg', defaultTarget: 3.0, category: 'water_soluble' },
  { name: 'Riboflavin (B2)', unit: 'mg', defaultTarget: 3.0, category: 'water_soluble' },
  { name: 'Niacin (B3)', unit: 'mg', defaultTarget: 35, category: 'water_soluble' },
  { name: 'Pantothenic Acid (B5)', unit: 'mg', defaultTarget: 10, category: 'water_soluble' },
  { name: 'Vitamin B6', unit: 'mg', defaultTarget: 4.0, category: 'water_soluble' },
  { name: 'Biotin (B7)', unit: 'mcg', defaultTarget: 100, category: 'water_soluble' },
  { name: 'Folate (B9)', unit: 'mcg', defaultTarget: 600, category: 'water_soluble' },
  { name: 'Vitamin B12', unit: 'mcg', defaultTarget: 15, category: 'water_soluble' },
  { name: 'Choline', unit: 'mg', defaultTarget: 550, category: 'water_soluble' },
  { name: 'Vitamin C', unit: 'mg', defaultTarget: 200, category: 'water_soluble' },

  // Zoochemicals & Bioactives
  { name: 'Carnitine', unit: 'mg', defaultTarget: 500, category: 'bioactives' },
  { name: 'Taurine', unit: 'mg', defaultTarget: 1000, category: 'bioactives' },
  { name: 'Creatine', unit: 'mg', defaultTarget: 3000, category: 'bioactives' },
  { name: 'Carnosine', unit: 'mg', defaultTarget: 500, category: 'bioactives' },
  { name: 'CoQ10', unit: 'mg', defaultTarget: 100, category: 'bioactives' },
];

export default function TargetOverridesModal({
  isOpen,
  onClose,
  currentOverrides,
  onSaveOverrides,
}: TargetOverridesModalProps) {
  const [draft, setDraft] = useState<NutrientOverrides>(currentOverrides);
  const [activeTab, setActiveTab] = useState<'all' | 'minerals' | 'fat_soluble' | 'water_soluble' | 'bioactives'>('all');

  if (!isOpen) return null;

  const handleInputChange = (name: string, val: string) => {
    const num = parseFloat(val);
    setDraft((prev) => ({
      ...prev,
      [name]: isNaN(num) ? 0 : num,
    }));
  };

  const handleResetSingle = (name: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleResetAll = () => {
    setDraft({});
  };

  const handleSave = () => {
    onSaveOverrides(draft);
    onClose();
  };

  const visibleNutrients = activeTab === 'all' 
    ? ALL_30_NUTRIENTS 
    : ALL_30_NUTRIENTS.filter((n) => n.category === activeTab);

  const modifiedCount = Object.keys(draft).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎯 Προσαρμοσμένοι Στόχοι Θρεπτικών (30 Nutrients Matrix)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Εξατομίκευση ημερήσιων στόχων {modifiedCount > 0 && <span className="text-emerald-400 font-semibold font-mono">({modifiedCount} ενεργά overrides)</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-base p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
          {[
            { id: 'all', label: 'Όλα (30)' },
            { id: 'minerals', label: 'Μέταλλα & Ηλεκτρολύτες' },
            { id: 'fat_soluble', label: 'Λιποδιαλυτές (A, D, E, K)' },
            { id: 'water_soluble', label: 'Υδατοδιαλυτές (B-Complex, C)' },
            { id: 'bioactives', label: 'Ζωοχημικά & Bioactives' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 30-Nutrient Input Grid */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {visibleNutrients.map((nut) => {
              const isCustom = draft[nut.name] !== undefined;
              const currentValue = isCustom ? draft[nut.name] : nut.defaultTarget;

              return (
                <div
                  key={nut.name}
                  className={`p-3 rounded-xl border transition-all ${
                    isCustom
                      ? 'bg-slate-950 border-emerald-700/80 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200 truncate pr-1" title={nut.name}>
                      {nut.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleResetSingle(nut.name)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline"
                          title="Επαναφορά στο default"
                        >
                          Reset
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">{nut.unit}</span>
                    </div>
                  </div>

                  <input
                    type="number"
                    step="any"
                    value={currentValue}
                    onChange={(e) => handleInputChange(nut.name, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    Default: {nut.defaultTarget} {nut.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetAll}
            className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            Επαναφορά Όλων στις Προεπιλογές
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-1.5 rounded-lg transition-colors shadow"
            >
              Αποθήκευση Στόχων
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}