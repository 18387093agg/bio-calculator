'use client';

import { useState, useRef } from 'react';
import { bulkUploadTelemetryCSVAction } from '@/app/actions/meal-actions';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function CSVUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: CSVUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Παραγωγή 365 ημερών με ρεαλιστικά διατροφικά δεδομένα
  const handleGenerateAndDownloadMockCSV = () => {
    const headers = 'Date,MealSlot,FoodName,PreparationMethod,WeightGrams\n';
    const sampleFoods = [
      { name: 'Pastured Egg Yolk (Raw)', prep: 'Raw / Ωμό', weight: 40 },
      { name: 'Beef Liver (Raw/Fresh)', prep: 'Raw / Ωμό', weight: 25 },
      { name: 'Beef Bone Marrow', prep: 'Pan Fried / Tallow Seared', weight: 250 },
      { name: 'Grass-Fed Ribeye Steak', prep: 'Pan Fried / Tallow Seared', weight: 350 },
      { name: 'Atlantic Sardines (Canned in Water/Oil)', prep: 'Raw / Ωμό', weight: 120 },
    ];

    const rows: string[] = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Προσθήκη 2-3 τυχαίων υλικών ανά ημέρα
      const count = 2 + (i % 2);
      for (let j = 0; j < count; j++) {
        const item = sampleFoods[(i + j) % sampleFoods.length];
        rows.push(`${dateStr},Meal_${j + 1},"${item.name}","${item.prep}",${item.weight}`);
      }
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'telemetry_history_365d.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setIsUploading(false);
        setStatusMsg({ type: 'error', text: 'Αποτυχία ανάγνωσης του αρχείου.' });
        return;
      }

      const res = await bulkUploadTelemetryCSVAction(text);
      setIsUploading(false);

      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: `Επιτυχής εισαγωγή ${res.count} ημερήσιων αρχείων τηλεμετρίας!`,
        });
        onUploadSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg({
          type: 'error',
          text: res.error || 'Σφάλμα κατά τη μαζική εισαγωγή.',
        });
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>📁</span> Μαζική Εισαγωγή Ιστορικού (365D CSV)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-400 font-mono">
          Ανεβάστε ιστορικές καταγραφές γευμάτων για πλήρη αναδρομικό υπολογισμό βιοδιαθεσιμότητας και κυτταρικών δεξαμενών.
        </p>

        {statusMsg && (
          <div
            className={`text-xs p-3 rounded-xl border font-mono ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <div className="space-y-3 pt-2 font-mono text-xs">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2"
          >
            <span>📤</span> {isUploading ? 'Επεξεργασία & Εισαγωγή...' : 'Επιλογή Αρχείου CSV'}
          </button>

          <div className="pt-2 border-t border-slate-800 text-center">
            <span className="text-slate-500 block mb-2 text-[11px]">Χρειάζεστε δείγμα αρχείου;</span>
            <button
              type="button"
              onClick={handleGenerateAndDownloadMockCSV}
              className="text-[11px] text-slate-300 hover:text-emerald-400 underline transition-colors"
            >
              📥 Λήψη Πρότυπου 365D Mock CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}