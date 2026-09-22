'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
  onAuthStateChange: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUserEmail,
  onAuthStateChange,
}: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Ο λογαριασμός δημιουργήθηκε! Ελέγξτε το email σας για επιβεβαίωση.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Επιτυχής σύνδεση!');
        onAuthStateChange();
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Παρουσιάστηκε σφάλμα κατά τον έλεγχο ταυτότητας.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
    onAuthStateChange();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>👤</span> {currentUserEmail ? 'Διαχείριση Λογαριασμού' : isSignUp ? 'Εγγραφή' : 'Σύνδεση'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {currentUserEmail ? (
          <div className="space-y-4 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Συνδεδεμένος ως:</span>
              <span className="text-emerald-400 font-bold break-all">{currentUserEmail}</span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl transition-colors"
            >
              {isLoading ? 'Αποσύνδεση...' : 'Αποσύνδεση (Sign Out)'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs font-mono">
            {errorMsg && (
              <div className="bg-rose-950/50 border border-rose-800 text-rose-300 p-2.5 rounded-xl">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-2.5 rounded-xl">
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Κωδικός Πρόσβασης</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-2 rounded-xl transition-colors shadow"
            >
              {isLoading ? 'Παρακαλώ περιμένετε...' : isSignUp ? 'Δημιουργία Λογαριασμού' : 'Είσοδος'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-[11px] text-slate-400 hover:text-emerald-400 underline"
              >
                {isSignUp ? 'Έχετε ήδη λογαριασμό; Σύνδεση' : 'Δεν έχετε λογαριασμό; Εγγραφή'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}