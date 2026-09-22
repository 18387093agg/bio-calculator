'use client';

import { MealBioactiveOutput } from '@/types/bioavailability';

interface MealMatrixInsightsProps {
  results: MealBioactiveOutput[];
  itemsCount: number;
}

export default function MealMatrixInsights({ results, itemsCount }: MealMatrixInsightsProps) {
  if (itemsCount === 0 || results.length === 0) return null;

  const quickFixes: { title: string; mechanism: string; action: string; type: 'warning' | 'synergy' }[] = [];

  // 1. Έλεγχος Σιδήρου & Βιταμίνης C (Αναγωγή Fe3+ -> Fe2+)
  const ironItem = results.find((r) => r.nutrient_name === 'Iron');
  const vitCItem = results.find((r) => r.nutrient_name === 'Vitamin C');
  
  if (ironItem && ironItem.useful_net_min < 5.0 && vitCItem && vitCItem.useful_net_min < 20.0) {
    quickFixes.push({
      title: 'Συνέργεια Αναγωγής Fe3+ ➔ Fe2+',
      mechanism: 'Το ασκορβικό οξύ διατηρεί τον σίδηρο σε διαλυτή μορφή Fe2+, αυξάνοντας τη δέσμευση από τον μεταφορέα DMT1 κατά 200%.',
      action: 'Προσθέστε 20g φρέσκο συκώτι ή πηγή βιταμίνης C.',
      type: 'synergy',
    });
  }

  // 2. Έλεγχος Ανταγωνισμού Zn / Cu (Μεταλλοθειονίνη)
  const zincNet = results.find((r) => r.nutrient_name === 'Zinc')?.useful_net_min || 0;
  const copperNet = results.find((r) => r.nutrient_name === 'Copper')?.useful_net_min || 0;
  if (zincNet > 25 && copperNet < 1.0) {
    quickFixes.push({
      title: 'Αντιστάθμιση Ανταγωνισμού Zn/Cu',
      mechanism: 'Ο υψηλός ψευδάργυρος επάγει εντερική μεταλλοθειονίνη που δεσμεύει μη αναστρέψιμα τον χαλκό, οδηγώντας σε απώλεια κατά την απόπτωση των εντεροκυττάρων.',
      action: 'Προσθέστε 15g μοσχαρίσιο συκώτι για εξισορρόπηση χαλκού.',
      type: 'warning',
    });
  }

  // 3. Έλεγχος Βιταμίνης D
  const vitDItem = results.find((r) => r.nutrient_name === 'Vitamin D');
  if (vitDItem && vitDItem.useful_net_min < 1.0) {
    quickFixes.push({
      title: 'Ανεπαρκής Πρόσληψη Βιταμίνης D3',
      mechanism: 'Το πιάτο δεν περιέχει επαρκείς πηγές χοληκαλσιφερόλης (D3) για την εντερική επαγωγή της Calbindin-D9k.',
      action: 'Προσθέστε κρόκο αυγού pastured, λιπαρά ψάρια (σαρδέλες/σκουμπρί) ή σκεύασμα D3.',
      type: 'warning',
    });
  }
  
  // 4. Έλεγχος Αναλογίας Na : K (Καρδιαγγειακό / Ενδοθηλιακό Φορτίο)
  const sodiumNet = results.find((r) => r.nutrient_name === 'Sodium')?.useful_net_min || 0;
  const potassiumNet = results.find((r) => r.nutrient_name === 'Potassium')?.useful_net_min || 1;
  const naKRatio = sodiumNet / Math.max(1, potassiumNet);

  if (naKRatio > 1.2) {
    quickFixes.push({
      title: '⚠️ Υψηλή Αναλογία Na:K (> 1.2:1)',
      mechanism: `Η τρέχουσα αναλογία Νατρίου προς Κάλιο στο πιάτο είναι ${naKRatio.toFixed(1)}:1 (ιδανικό εύρος < 1:1.5). Αυτό αυξάνει την τάση αγγειοσύσπασης και κατακράτησης υγρών.`,
      action: 'Προσθέστε πηγές πλούσιες σε κάλιο (π.χ. ζωμό κόκαλων, κρέας ή ηλεκτρολύτες) για αποκατάσταση του αγγειακού τόνου.',
      type: 'warning',
    });
  }

  if (quickFixes.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <span>⚡ Κλινικές Προτάσεις Άμεσης Βελτιστοποίησης (Quick-Fix)</span>
        </h3>
        <span className="text-[10px] font-mono text-emerald-400">{quickFixes.length} ενεργές προτάσεις</span>
      </div>

      <div className="space-y-2">
        {quickFixes.map((fix, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
              fix.type === 'warning'
                ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                : 'bg-cyan-950/30 border-cyan-800/80 text-cyan-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5 text-white">
              <span>{fix.type === 'warning' ? '⚠️' : '💡'}</span>
              <span>{fix.title}</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{fix.mechanism}</p>
            <div className="text-[11px] font-bold text-emerald-400 font-sans pt-0.5">
              ➔ <strong>Πρόταση Διόρθωσης:</strong> {fix.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}