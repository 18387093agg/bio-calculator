'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BiomarkerInput,
  BiomarkerClinicalVerdict,
  evaluateBiomarkerStatus,
} from '@/lib/bloodBiomarkerEngine';
import { parseBloodTestDocumentAction } from '../app/actions/blood-ocr-actions';

interface BloodWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMarkers: BiomarkerInput[];
  onSaveMarkers: (markers: BiomarkerInput[]) => void;
}

export default function BloodWorkModal({
  isOpen,
  onClose,
  currentMarkers,
  onSaveMarkers,
}: BloodWorkModalProps) {
  const [markers, setMarkers] = useState<BiomarkerInput[]>(currentMarkers || []);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMarkers(currentMarkers || []);
      setNeedsReview(false);
      setScanStatus(null);
    }
  }, [isOpen, currentMarkers]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStatus(`Ανάγνωση αρχείου: ${file.name}...`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setScanStatus('Εξαγωγή δεικτών, τιμών και ορίων από το έγγραφο...');

        const res = await parseBloodTestDocumentAction(base64Data, file.type || 'application/pdf');

        if (res.success && res.data && res.data.length > 0) {
          setMarkers(res.data);
          setNeedsReview(true);
          setScanStatus(`✓ Εντοπίστηκαν ${res.data.length} δείκτες. Παρακαλούμε ελέγξτε τον παρακάτω πίνακα πριν την οριστική αποθήκευση.`);
        } else {
          setScanStatus(`❌ Σφάλμα ανάλυσης: ${res.error || 'Δεν βρέθηκαν αναγνωρίσιμοι δείκτες.'}`);
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setScanStatus(`❌ Σφάλμα: ${err.message}`);
      setIsScanning(false);
    }
  };

  const handleUpdateField = (index: number, field: keyof BiomarkerInput, val: any) => {
    setMarkers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveMarker = (index: number) => {
    setMarkers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewBlankRow = () => {
    setMarkers((prev) => [
      ...prev,
      {
        markerName: 'Νέος Δείκτης',
        compartment: 'serum',
        value: 0,
        unit: 'mg/dL',
        refLow: 0,
        refHigh: 100,
      },
    ]);
  };

  const handleSave = () => {
    onSaveMarkers(markers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-6 font-mono">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-2xl p-4 md:p-6 shadow-2xl flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🩸</span> Blood Work & Intracellular Biomarker Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Αυτόματη εξαγωγή δεικτών από PDF/εικόνες & επιτόπια επαλήθευση από τον χρήστη
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg px-2">✕</button>
        </div>

        {/* Upload Zone */}
        <div className="py-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-rose-800/60 hover:border-rose-500 bg-rose-950/20 hover:bg-rose-950/30 p-3.5 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-2xl md:text-3xl">📄</span>
              <div>
                <div className="text-xs font-bold text-rose-300">
                  Ανέβασμα Εξετάσεων Αίματος (PDF ή Εικόνα)
                </div>
                <div className="text-[11px] text-slate-400">
                  Το σύστημα σκανάρει αυτόματα τον πίνακα και συμπληρώνει τη φόρμα επαλήθευσης
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isScanning}
              className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow shrink-0"
            >
              {isScanning ? 'Σάρωση...' : '📁 Επιλογή Αρχείου'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {scanStatus && (
            <div className={`text-xs mt-2 font-mono px-3 py-1.5 rounded-lg border ${
              scanStatus.includes('✓')
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                : scanStatus.includes('❌')
                ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                : 'bg-slate-950 text-cyan-300 border-slate-800'
            }`}>
              {scanStatus}
            </div>
          )}
        </div>

        {/* Verification Alert Banner */}
        {needsReview && (
          <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl mb-2 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Έλεγχος Ορθότητας:</strong> Επαληθεύστε τα νούμερα και τις μονάδες. Μπορείτε να τροποποιήσετε άμεσα οποιοδήποτε πεδίο στον παρακάτω πίνακα πριν την εφαρμογή.
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddNewBlankRow}
              className="bg-amber-700/80 hover:bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg ml-3 shrink-0"
            >
              + Προσθήκη Γραμμής
            </button>
          </div>
        )}

        {/* Editable Verification Table */}
        <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/60 p-2 space-y-2">
          {markers.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 font-mono">
              Δεν υπάρχουν καταγεγραμμένοι δείκτες. Ανεβάστε αρχείο εξετάσεων ή προσθέστε γραμμή χειροκίνητα.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-900/80">
                    <th className="p-2.5 min-w-[150px]">Δείκτης (Marker)</th>
                    <th className="p-2.5 min-w-[150px]">Διαμέρισμα</th>
                    <th className="p-2.5 min-w-[100px]">Τιμή</th>
                    <th className="p-2.5 min-w-[100px]">Μονάδα</th>
                    <th className="p-2.5 min-w-[90px]">Ref Low</th>
                    <th className="p-2.5 min-w-[90px]">Ref High</th>
                    <th className="p-2.5 min-w-[180px]">Κλινική Αξιολόγηση</th>
                    <th className="p-2.5 text-right">Ενέργεια</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {markers.map((m, idx) => {
                    const verdict: BiomarkerClinicalVerdict | null = evaluateBiomarkerStatus(m, markers);

                    return (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        {/* Marker Name */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={m.markerName}
                            onChange={(e) => handleUpdateField(idx, 'markerName', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* Compartment */}
                        <td className="p-2">
                          <select
                            value={m.compartment}
                            onChange={(e) => handleUpdateField(idx, 'compartment', e.target.value as any)}
                            className={`w-full bg-slate-900 border rounded px-2 py-1 font-bold focus:outline-none ${
                              m.compartment.includes('intracellular')
                                ? 'border-purple-800 text-purple-300'
                                : 'border-slate-700 text-cyan-300'
                            }`}
                          >
                            <option value="serum">Serum (Ορός)</option>
                            <option value="wbc_intracellular">WBC (Intracellular)</option>
                            <option value="rbc_intracellular">RBC (Ερυθροκύτταρα)</option>
                          </select>
                        </td>

                        {/* Value */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            value={m.value}
                            onChange={(e) => handleUpdateField(idx, 'value', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 text-right"
                          />
                        </td>

                        {/* Unit */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={m.unit}
                            onChange={(e) => handleUpdateField(idx, 'unit', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
                          />
                        </td>

                        {/* Ref Low */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            value={m.refLow}
                            onChange={(e) => handleUpdateField(idx, 'refLow', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400 focus:outline-none text-right"
                          />
                        </td>

                        {/* Ref High */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            value={m.refHigh}
                            onChange={(e) => handleUpdateField(idx, 'refHigh', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400 focus:outline-none text-right"
                          />
                        </td>

                        {/* Clinical Insight */}
                        <td className="p-2">
                          <div className="text-[10px] text-slate-300 line-clamp-2" title={verdict?.clinicalInsight || ''}>
                            {verdict ? verdict.clinicalInsight : '—'}
                          </div>
                        </td>

                        {/* Remove Action */}
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMarker(idx)}
                            className="text-slate-500 hover:text-rose-400 px-2 py-1 text-xs font-bold"
                            title="Διαγραφή γραμμής"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {markers.length} δείκτες έτοιμοι για συγχρονισμό
            </span>
            <button
              type="button"
              onClick={handleAddNewBlankRow}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline"
            >
              + Προσθήκη κενού δείκτη
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors shadow"
            >
              Επιβεβαίωση & Εφαρμογή Στόχων
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}