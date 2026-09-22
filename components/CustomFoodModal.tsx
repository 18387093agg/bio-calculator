'use client';

import { useState } from 'react';
import { FoodOption } from '@/types/bioavailability';
import { createCustomFoodAction } from '@/app/actions/meal-actions';

interface CustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodCreated: (newFood: FoodOption) => void;
}

export default function CustomFoodModal({
  isOpen,
  onClose,
  onFoodCreated,
}: CustomFoodModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('meat_organ');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Παρακαλώ εισάγετε όνομα τροφίμου.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createCustomFoodAction({
      name: name.trim(),
      category,
      calories_per_100g: Number(calories) || 0,
      protein_per_100g: Number(protein) || 0,
      fat_per_100g: Number(fat) || 0,
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      onFoodCreated(res.data);
      // Καθαρισμός πεδίων
      setName('');
      setCalories('');
      setProtein('');
      setFat('');
      onClose();
    } else {
      setErrorMsg(res.error || 'Σφάλμα κατά την αποθήκευση του τροφίμου.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🥩</span> Προσθήκη Νέου Τροφίμου
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/50 border border-rose-800 text-rose-300 text-xs p-2.5 rounded-xl font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 mb-1">Όνομα Τροφίμου / Κοπής</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Beef Flank Steak (Grass-Fed)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Κατηγορία</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-sans"
            >
              <option value="meat_organ">Κρέας & Όργανα (Meat / Organs)</option>
              <option value="seafood">Θαλασσινά (Seafood)</option>
              <option value="dairy_egg">Αυγά & Γαλακτοκομικά (Eggs / Dairy)</option>
              <option value="supplement">Σκευάσματα / Συμπληρώματα</option>
              <option value="plant">Φυτικά (Plants / Other)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Θερμίδες / 100g</label>
              <input
                type="number"
                min="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="kcal"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Πρωτεΐνη (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="g"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Λίπος (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="g"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl shadow transition-colors"
            >
              {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση στη Βάση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}