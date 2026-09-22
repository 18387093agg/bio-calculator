'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { FoodOption } from '@/types/bioavailability';

interface FoodSelectProps {
  foods: FoodOption[];
  selectedFoodName: string;
  onSelect: (foodName: string) => void;
}

export default function FoodSelect({ foods, selectedFoodName, onSelect }: FoodSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getFoodIcon = (name: string, category: string) => {
    const n = name.toLowerCase();
    const c = category.toLowerCase();
    if (n.includes('liver')) return '🫀';
    if (n.includes('kidney')) return '🫘';
    if (n.includes('heart')) return '❤️';
    if (n.includes('marrow') || n.includes('bone')) return '🦴';
    if (n.includes('yolk') || n.includes('egg')) return '🥚';
    if (n.includes('sardine') || n.includes('cod') || n.includes('mackerel') || n.includes('salmon')) return '🐟';
    if (n.includes('oyster') || n.includes('lobster') || n.includes('seafood')) return '🦪';
    if (n.includes('butter') || n.includes('tallow') || n.includes('ghee')) return '🧈';
    if (n.includes('beef') || n.includes('steak')) return '🥩';
    if (n.includes('pork')) return '🥓';
    if (n.includes('lamb')) return '🍖';
    if (c.includes('supplement')) return '💊';
    return '🌱';
  };

  const selectedItem = useMemo(() => {
    return foods.find((f) => f.name === selectedFoodName);
  }, [foods, selectedFoodName]);

  const filteredFoods = useMemo(() => {
    return foods.filter((f) => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'meat_organ' && (f.category.includes('meat') || f.category.includes('organ'))) ||
        (selectedCategory === 'seafood' && f.category.includes('seafood')) ||
        (selectedCategory === 'dairy_egg' && (f.category.includes('dairy') || f.category.includes('egg'))) ||
        (selectedCategory === 'supplement' && f.category.includes('supplement')) ||
        (selectedCategory === 'plant' && (f.category.includes('plant') || f.category.includes('other')));

      return matchesSearch && matchesCategory;
    });
  }, [foods, searchQuery, selectedCategory]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
        Τρόφιμο / Πηγή
      </label>

      {/* Button επιλογής με πλήρες πλάτος */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-left transition-all shadow-sm group"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">
            {getFoodIcon(selectedFoodName, selectedItem?.category || '')}
          </span>
          <span className="text-xs font-bold text-white truncate">
            {selectedFoodName || 'Επιλέξτε τρόφιμο...'}
          </span>
        </div>
        <span className="text-slate-500 text-xs shrink-0">▼</span>
      </button>

      {/* Dropdown Menu - Απελευθερωμένο πλάτος χωρίς clipping */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[320px] sm:min-w-[440px] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl z-[100] p-3 space-y-3">
          
          {/* Input Search */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση με όνομα τροφίμου..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <span className="absolute left-2.5 top-2.5 text-xs text-slate-500">🔍</span>
          </div>

          {/* Quick Category Filters */}
          <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-800">
            {[
              { id: 'all', label: 'Όλα' },
              { id: 'meat_organ', label: '🥩 Κρέας/Όργανα' },
              { id: 'seafood', label: '🐟 Θαλασσινά' },
              { id: 'dairy_egg', label: '🥚 Αυγά' },
              { id: 'supplement', label: '💊 Σκευάσματα' },
              { id: 'plant', label: '🌱 Φυτικά' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedCategory(chip.id)}
                className={`text-[10px] px-2 py-1 rounded-lg transition-all ${
                  selectedCategory === chip.id
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Food List - Άνετο scroll χωρίς να μπλοκάρει τη σελίδα */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 overscroll-contain">
            {filteredFoods.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                Δεν βρέθηκε τρόφιμο με αυτά τα κριτήρια.
              </div>
            ) : (
              filteredFoods.map((food) => (
                <button
                  key={food.id || food.name}
                  type="button"
                  onClick={() => {
                    onSelect(food.name);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    food.name === selectedFoodName
                      ? 'bg-emerald-950/70 border-emerald-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-3">
                    <span className="text-base shrink-0">{getFoodIcon(food.name, food.category)}</span>
                    <span className="text-xs font-semibold text-white truncate">{food.name}</span>
                  </div>
                  {food.calories_per_100g !== undefined && (
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {food.calories_per_100g} kcal
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}