'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MASTER_SUPPLEMENT_REGISTRY,
  SupplementEntryInput,
  SupplementDefinition,
  calculateSupplementImpact,
} from '@/lib/supplementRegistry';

interface SupplementStackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStack: SupplementEntryInput[];
  onSaveStack: (newStack: SupplementEntryInput[]) => void;
}

export default function SupplementStackModal({
  isOpen,
  onClose,
  currentStack,
  onSaveStack,
}: SupplementStackModalProps) {
  const [stack, setStack] = useState<SupplementEntryInput[]>(currentStack || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTargetNutrient, setSelectedTargetNutrient] = useState<string>('all');
  const [activeSuppId, setActiveSuppId] = useState<string>(MASTER_SUPPLEMENT_REGISTRY[0].id);
  const [doseType, setDoseType] = useState<'elemental' | 'compound'>('elemental');
  const [selectedUnit, setSelectedUnit] = useState<'mg' | 'mcg' | 'IU'>(MASTER_SUPPLEMENT_REGISTRY[0].defaultUnit);
  const [inputDose, setInputDose] = useState<number>(5000);

  useEffect(() => {
    if (isOpen) {
      setStack(currentStack || []);
    }
  }, [isOpen, currentStack]);

  const uniqueNutrients = useMemo(() => {
    const set = new Set<string>();
    MASTER_SUPPLEMENT_REGISTRY.forEach((s) => {
      if (selectedCategory === 'all' || s.categoryGroup === selectedCategory) {
        set.add(s.targetNutrient);
      }
    });
    return Array.from(set).sort();
  }, [selectedCategory]);

  const filteredSupplements = useMemo(() => {
    return MASTER_SUPPLEMENT_REGISTRY.filter((s) => {
      const matchSearch =
        searchTerm === '' ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.targetNutrient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.clinicalNotes.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategory === 'all' || s.categoryGroup === selectedCategory;
      const matchNutrient = selectedTargetNutrient === 'all' || s.targetNutrient === selectedTargetNutrient;

      return matchSearch && matchCategory && matchNutrient;
    });
  }, [searchTerm, selectedCategory, selectedTargetNutrient]);

  useEffect(() => {
    if (filteredSupplements.length > 0) {
      const exists = filteredSupplements.some((s) => s.id === activeSuppId);
      if (!exists) {
        const first = filteredSupplements[0];
        setActiveSuppId(first.id);
        setSelectedUnit(first.defaultUnit);
        applySmartDefaultDose(first, first.defaultUnit);
      }
    }
  }, [filteredSupplements, activeSuppId]);

  const currentDef = useMemo(() => {
    return (
      MASTER_SUPPLEMENT_REGISTRY.find((s) => s.id === activeSuppId) ||
      filteredSupplements[0] ||
      MASTER_SUPPLEMENT_REGISTRY[0]
    );
  }, [activeSuppId, filteredSupplements]);

  function applySmartDefaultDose(def: SupplementDefinition, unit: 'mg' | 'mcg' | 'IU') {
    if (unit === 'IU') {
      if (def.targetNutrient === 'Vitamin D') setInputDose(5000);
      else if (def.targetNutrient === 'Vitamin A') setInputDose(10000);
      else if (def.targetNutrient === 'Vitamin E') setInputDose(400);
      else setInputDose(5000);
    } else if (unit === 'mcg') {
      if (def.targetNutrient === 'Vitamin B12') setInputDose(1000);
      else if (def.targetNutrient === 'Folate (B9)') setInputDose(400);
      else if (def.targetNutrient === 'Vitamin K') setInputDose(100);
      else if (def.targetNutrient === 'Vitamin A') setInputDose(1500);
      else setInputDose(200);
    } else {
      if (def.targetNutrient === 'Copper') setInputDose(2);
      else if (def.targetNutrient === 'Zinc') setInputDose(15);
      else if (def.targetNutrient === 'Iron') setInputDose(18);
      else if (def.targetNutrient === 'Vitamin B6') setInputDose(10);
      else if (def.targetNutrient === 'Thiamine (B1)') setInputDose(100);
      else if (def.targetNutrient === 'Vitamin C') setInputDose(500);
      else if (def.targetNutrient === 'Vitamin E') setInputDose(30);
      else setInputDose(200);
    }
  }

  const handleSelectDefinition = (def: SupplementDefinition) => {
    setActiveSuppId(def.id);
    setSelectedUnit(def.defaultUnit);
    applySmartDefaultDose(def, def.defaultUnit);
  };

  const handleUnitChange = (unit: 'mg' | 'mcg' | 'IU') => {
    setSelectedUnit(unit);
    applySmartDefaultDose(currentDef, unit);
  };

  const previewImpact = useMemo(() => {
    return calculateSupplementImpact(stack);
  }, [stack]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (inputDose <= 0 || !currentDef) return;

    let normalizedDose = inputDose;
    if (selectedUnit !== 'IU') {
      normalizedDose = doseType === 'elemental'
        ? Number((inputDose / currentDef.elementalRatio).toFixed(1))
        : inputDose;
    }

    setStack((prev) => [
      ...prev,
      {
        supplementId: currentDef.id,
        dose: normalizedDose,
        selectedUnit: selectedUnit,
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setStack((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSaveStack(stack);
    onClose();
  };

  let liveElementalPreview = inputDose;
  if (selectedUnit === 'IU' && currentDef.iuConversionFactor) {
    liveElementalPreview = Number((inputDose * currentDef.iuConversionFactor).toFixed(1));
  } else if (selectedUnit !== 'IU') {
    liveElementalPreview = doseType === 'elemental'
      ? inputDose
      : Number((inputDose * currentDef.elementalRatio).toFixed(1));
  }

  const liveNetAbsorbedPreview = Number(
    (liveElementalPreview * currentDef.baseAbsorptionRate * currentDef.enzymaticConversionRate).toFixed(1)
  );

  const displayTargetUnit = currentDef.defaultUnit === 'IU' && currentDef.iuConversionFactor
    ? (currentDef.targetNutrient === 'Vitamin E' ? 'mg' : 'mcg')
    : selectedUnit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6 font-mono">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl p-5 shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>💊</span> Pharmacokinetic Supplement Registry & Stack
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Supports IU units (A, D3, E), elemental conversion, and automatic cofactor drains
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg px-2">✕</button>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-3 pb-2 space-y-2 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Search supplements (e.g. d3, malate, ttfd, p5p, 5-mthf, bisglycinate)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="sm:w-60">
              <select
                value={selectedTargetNutrient}
                onChange={(e) => setSelectedTargetNutrient(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none"
              >
                <option value="all">All Nutrients</option>
                {uniqueNutrients.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { id: 'all', label: 'All Supplements' },
              { id: 'vitamins', label: 'Vitamins (A, B, C, D, E, K)' },
              { id: 'minerals', label: 'Minerals & Trace Elements' },
              { id: 'electrolytes', label: 'Electrolytes' },
              { id: 'amino_derivatives', label: 'Zoochemicals & Aminos' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedTargetNutrient('all');
                }}
                className={`text-[11px] px-3 py-1 rounded-lg transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Builder Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 py-3 border-b border-slate-800 bg-slate-950/70 p-3.5 rounded-xl mt-3">
          <div className="md:col-span-5">
            <label className="text-[10px] text-slate-400 uppercase block mb-1 font-bold">
              Form Selection ({filteredSupplements.length} available)
            </label>
            <select
              value={currentDef.id}
              onChange={(e) => {
                const found = MASTER_SUPPLEMENT_REGISTRY.find((s) => s.id === e.target.value);
                if (found) handleSelectDefinition(found);
              }}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-bold rounded-lg p-2 focus:outline-none"
            >
              {filteredSupplements.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ➔ [{s.targetNutrient}]
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] text-slate-400 uppercase block mb-1 font-bold">
              Unit
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => handleUnitChange(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-cyan-300 font-bold rounded-lg p-2 focus:outline-none"
            >
              {currentDef.supportedUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] text-slate-400 uppercase block mb-1 font-bold">
              Dose Type
            </label>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                disabled={selectedUnit === 'IU'}
                onClick={() => setDoseType('elemental')}
                className={`flex-1 text-[10px] py-1.5 rounded font-bold transition-all disabled:opacity-40 ${
                  doseType === 'elemental' || selectedUnit === 'IU'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Elemental
              </button>
              <button
                type="button"
                disabled={selectedUnit === 'IU'}
                onClick={() => setDoseType('compound')}
                className={`flex-1 text-[10px] py-1.5 rounded font-bold transition-all disabled:opacity-40 ${
                  doseType === 'compound' && selectedUnit !== 'IU'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Compound
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] text-slate-400 uppercase block mb-1 font-bold">
              Amount ({selectedUnit})
            </label>
            <input
              type="number"
              min="0.1"
              step="any"
              value={inputDose}
              onChange={(e) => setInputDose(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-white font-bold rounded-lg p-2 focus:outline-none"
            />
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              type="button"
              onClick={handleAdd}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-colors shadow"
              title="Add to stack"
            >
              +
            </button>
          </div>

          {/* Real-time Telemetry Bar */}
          <div className="md:col-span-12 text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <span className="text-white font-semibold">{currentDef.clinicalNotes}</span>
              {currentDef.conversionEnzyme && (
                <span className="text-cyan-400 ml-2 font-mono block sm:inline">
                  (Enzyme: {currentDef.conversionEnzyme})
                </span>
              )}
            </div>
            <div className="text-right whitespace-nowrap text-xs bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              <span className="text-slate-400">Elemental Yield:</span>{' '}
              <strong className="text-amber-400">{liveElementalPreview} {displayTargetUnit}</strong>
              <span className="text-slate-400 ml-2">➔ Net Absorbed:</span>{' '}
              <strong className="text-emerald-400">{liveNetAbsorbedPreview} {displayTargetUnit}</strong>
            </div>
          </div>
        </div>

        {/* Current Active Stack List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {stack.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No supplements currently added to daily stack.
            </div>
          ) : (
            previewImpact.items.map((item, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800/90 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{item.name}</span>
                    <span className="text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      {item.inputDose} {item.unit}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ➔ Target: {item.targetNutrient} ({item.elementalAmount} {item.unit === 'IU' ? (item.targetNutrient === 'Vitamin E' ? 'mg' : 'mcg') : item.unit} net)
                    </span>
                  </div>
                  
                  <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                    <span>1. Elemental: <strong className="text-slate-200">{item.elementalAmount}</strong></span>
                    <span>→</span>
                    <span>2. Enteric Absorption: <strong className="text-cyan-300">{item.netAbsorbedAmount}</strong></span>
                    <span>→</span>
                    <span>3. Net Cellular Active: <strong className="text-emerald-400">{item.netCellularActiveAmount}</strong></span>
                  </div>

                  {item.cofactorDrains.length > 0 && (
                    <div className="text-[10px] text-amber-400 mt-1 bg-amber-950/40 border border-amber-900/60 px-2 py-0.5 rounded inline-block">
                      ⚠️ Cofactor Drain: {item.cofactorDrains.map((d) => `+${d.additionalDemand}mg ${d.nutrient} (${d.reason})`).join(' | ')}
                    </div>
                  )}

                  {item.warnings.length > 0 && (
                    <div className="text-[10px] text-rose-400 mt-1">
                      {item.warnings.join(' | ')}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-slate-500 hover:text-rose-400 px-2.5 py-1 text-xs font-bold"
                >
                  ✕ Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {stack.length} active supplements in protocol
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors shadow"
            >
              Apply Stack
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}