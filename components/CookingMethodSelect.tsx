'use client';

import { useState, useRef, useEffect } from 'react';
import { PreparationOption } from '@/types/bioavailability';

interface CookingMethodSelectProps {
  methods: PreparationOption[];
  selectedMethod: string;
  onSelect: (methodName: string) => void;
}

export default function CookingMethodSelect({
  methods,
  selectedMethod,
  onSelect,
}: CookingMethodSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getMethodDetails = (rawName: string) => {
    const n = (rawName || '').toLowerCase();
    if (n.includes('raw')) {
      return { icon: '🥩', cleanName: 'Raw', badge: '100% Retention', badgeColor: 'border-emerald-800 text-emerald-300 bg-emerald-950/60' };
    }
    if (n.includes('fried') || n.includes('rendered') || n.includes('pan') || n.includes('seared')) {
      return { icon: '🍳', cleanName: 'Pan Fried / Tallow Seared', badge: 'Lipid Trapping', badgeColor: 'border-amber-800 text-amber-300 bg-amber-950/60' };
    }
    if (n.includes('roast') || n.includes('baked') || n.includes('oven')) {
      return { icon: '🔥', cleanName: 'Oven Roasted / Baked', badge: 'Moisture Loss Only', badgeColor: 'border-slate-700 text-slate-300 bg-slate-800' };
    }
    if (n.includes('broth') || n.includes('retained') || (n.includes('boiled') && !n.includes('discarded') && !n.includes('drained'))) {
      return { icon: '🍲', cleanName: 'Boiled (Broth Consumed)', badge: 'No Leaching Loss', badgeColor: 'border-cyan-800 text-cyan-300 bg-cyan-950/60' };
    }
    if (n.includes('drained') || n.includes('discarded')) {
      return { icon: '💧', cleanName: 'Boiled (Broth Discarded)', badge: '-40% B/C Leaching', badgeColor: 'border-rose-800 text-rose-300 bg-rose-950/60' };
    }
    if (n.includes('slow') || n.includes('braised') || n.includes('stew')) {
      return { icon: '🥘', cleanName: 'Slow Cooked / Braised', badge: 'Collagen Gelatinized', badgeColor: 'border-purple-800 text-purple-300 bg-purple-950/60' };
    }
    if (n.includes('steam')) {
      return { icon: '💨', cleanName: 'Steamed', badge: '90% Retention', badgeColor: 'border-teal-800 text-teal-300 bg-teal-950/60' };
    }
    if (n.includes('grill') || n.includes('char')) {
      return { icon: '🥩', cleanName: 'Grilled / Charred', badge: 'High Heat Loss', badgeColor: 'border-orange-800 text-orange-300 bg-orange-950/60' };
    }
    if (n.includes('air')) {
      return { icon: '🌪️', cleanName: 'Air Fried', badge: 'Dry Convection', badgeColor: 'border-amber-700 text-amber-300 bg-amber-900/60' };
    }
    if (n.includes('smoke')) {
      return { icon: '🪵', cleanName: 'Smoked (Low & Slow)', badge: 'Cold/Warm Smoked', badgeColor: 'border-yellow-800 text-yellow-300 bg-yellow-950/60' };
    }
    if (n.includes('sous') || n.includes('poach')) {
      return { icon: '🌡️', cleanName: 'Sous-Vide / Poached', badge: '98% Retention Sealed', badgeColor: 'border-blue-800 text-blue-300 bg-blue-950/60' };
    }
    return { icon: '🍽️', cleanName: rawName, badge: 'Standard Heat', badgeColor: 'border-slate-800 text-slate-400 bg-slate-900' };
  };

  const currentDetails = getMethodDetails(selectedMethod);
  const activeMethods: PreparationOption[] = methods && methods.length > 0 ? methods : [
    { id: 'raw', method_name: 'Raw' },
    { id: 'pan_fried', method_name: 'Pan Fried / Tallow Seared' },
    { id: 'oven_roasted', method_name: 'Oven Roasted / Baked' },
    { id: 'boiled_consumed', method_name: 'Boiled (Broth Consumed)' },
    { id: 'boiled_discarded', method_name: 'Boiled (Broth Discarded)' },
    { id: 'slow_cooked', method_name: 'Slow Cooked / Braised' },
    { id: 'steamed', method_name: 'Steamed' },
    { id: 'grilled', method_name: 'Grilled / Charred' },
    { id: 'air_fried', method_name: 'Air Fried' },
    { id: 'smoked', method_name: 'Smoked (Low & Slow)' },
    { id: 'sous_vide', method_name: 'Sous-Vide / Poached' },
  ];

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
        Preparation / Cooking Method
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-left transition-all shadow-sm group"
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className="text-lg group-hover:scale-110 transition-transform">
            {currentDetails.icon}
          </span>
          <span className="text-xs font-bold text-white truncate">
            {currentDetails.cleanName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${currentDetails.badgeColor}`}>
            {currentDetails.badge}
          </span>
          <span className="text-slate-500 text-xs">▼</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[320px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {activeMethods.map((m) => {
            const mName = typeof m === 'string' ? m : m.method_name;
            const info = getMethodDetails(mName);
            const isSelected = mName === selectedMethod;
            return (
              <button
                key={mName}
                type="button"
                onClick={() => {
                  onSelect(mName);
                  setIsOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-950/50 border-emerald-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="text-base">{info.icon}</span>
                  <span className="text-xs font-bold text-white truncate">{info.cleanName}</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${info.badgeColor}`}>
                  {info.badge}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}