
'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MealItemInput,
  MealBioactiveOutput,
  ClinicalPathologyState,
  GastricAcidStatus,
  GutPathology,
  CanonicalNutrient,
  FoodOption,
  PreparationOption,
  MealContextState,
} from '@/types/bioavailability';
import {
  getMealBuilderOptionsAction,
  calculateMealAction,
  getUserSettingsAction,
  saveUserSettingsAction,
  logCurrentMealAction,
} from '@/app/actions/meal-actions';
import {
  calculateDynamicTargets,
  calculatePRAL,
  evaluateMethylationDemand,
} from '@/lib/metabolicEngine';
import {
  evaluateEntericBioavailability,
  evaluateCalorieMalabsorption,
} from '@/lib/clinicalAbsorptionEngine';
import { scaleIntakeToAbsorbed, scaleIntakeToTissue } from '@/lib/referenceTargets';
import { tipsForNutrient } from '@/lib/absorptionTips';
import { applyB12IfCap } from '@/lib/nutrientCanonical';
import {
  SupplementEntryInput,
  calculateSupplementImpact,
} from '@/lib/supplementRegistry';
import {
  BiomarkerInput,
  evaluateBiomarkerStatus,
} from '@/lib/bloodBiomarkerEngine';

import FoodSelect from '@/components/FoodSelect';
import CookingMethodSelect from '@/components/CookingMethodSelect';
import { DualRangeProgressBar } from '@/components/DualRangeProgressBar';
import MealMatrixInsights from '@/components/MealMatrixInsights';
import MetabolicHealthCard from '@/components/MetabolicHealthCard';

import CustomFoodModal from '@/components/CustomFoodModal';
import CSVUploadModal from '@/components/CSVUploadModal';
import ClinicalReportModal from '@/components/ClinicalReportModal';
import FoodExclusionsModal, { ExclusionRules } from '@/components/FoodExclusionsModal';
import TargetOverridesModal, { NutrientOverrides } from '@/components/TargetOverridesModal';
import AntinutrientSensitivityModal, { AntinutrientSensitivityConfig } from '@/components/AntinutrientSensitivityModal';
import AnalyticsTrendsModal from '@/components/AnalyticsTrendsModal';
import WeightEstimatorModal from '@/components/WeightEstimatorModal';
import SupplementStackModal from '@/components/SupplementStackModal';
import BloodWorkModal from '@/components/BloodWorkModal';
import AuthModal from '@/components/AuthModal';

export interface CanonicalNutrientDef {
  name: CanonicalNutrient;
  category: 'vitamins' | 'minerals';
  unit: string;
  defaultRda: number;
  defaultOptMin: number;
  defaultTarget: number;
  upperLimit?: number;
  mainActiveForm: string;
}

export const ALL_CANONICAL_NUTRIENTS: CanonicalNutrientDef[] = [
  // Fat-Soluble Vitamins
  { name: 'Vitamin A', category: 'vitamins', unit: 'mcg', defaultRda: 900, defaultOptMin: 1170.0, defaultTarget: 1500, upperLimit: 3000, mainActiveForm: 'All-Trans Retinol (RAE)' },
  { name: 'Vitamin D', category: 'vitamins', unit: 'mcg', defaultRda: 20, defaultOptMin: 44.75, defaultTarget: 75, upperLimit: 250, mainActiveForm: '1,25-(OH)2-D3 Calcitriol' },
  { name: 'Vitamin E', category: 'vitamins', unit: 'mg', defaultRda: 15, defaultOptMin: 19.5, defaultTarget: 25, upperLimit: 300, mainActiveForm: 'RRR-alpha-Tocopherol' },
  { name: 'Vitamin K', category: 'vitamins', unit: 'mcg', defaultRda: 120, defaultOptMin: 147.0, defaultTarget: 180, upperLimit: 1000, mainActiveForm: 'Menaquinone-4/7 (MK-4 / MK-7)' },

  // Water-Soluble B-Complex & C
  { name: 'Thiamine (B1)', category: 'vitamins', unit: 'mg', defaultRda: 1.2, defaultOptMin: 1.79, defaultTarget: 2.5, upperLimit: 100, mainActiveForm: 'Thiamine Pyrophosphate (TPP)' },
  { name: 'Riboflavin (B2)', category: 'vitamins', unit: 'mg', defaultRda: 1.3, defaultOptMin: 1.71, defaultTarget: 2.2, upperLimit: 100, mainActiveForm: 'FAD / FMN Coenzyme' },
  { name: 'Niacin (B3)', category: 'vitamins', unit: 'mg', defaultRda: 16, defaultOptMin: 20.05, defaultTarget: 25, upperLimit: 35, mainActiveForm: 'NAD+ / NADH Pool' },
  { name: 'Pantothenic Acid (B5)', category: 'vitamins', unit: 'mg', defaultRda: 5.0, defaultOptMin: 6.35, defaultTarget: 8.0, upperLimit: 100, mainActiveForm: 'Coenzyme A (CoA)' },
  { name: 'Vitamin B6', category: 'vitamins', unit: 'mg', defaultRda: 1.7, defaultOptMin: 2.51, defaultTarget: 3.5, upperLimit: 100, mainActiveForm: 'Pyridoxal-5-Phosphate (P5P)' },
  { name: 'Biotin (B7)', category: 'vitamins', unit: 'mcg', defaultRda: 30, defaultOptMin: 43.5, defaultTarget: 60, upperLimit: 500, mainActiveForm: 'Biotinyl-AMP' },
  { name: 'Folate (B9)', category: 'vitamins', unit: 'mcg', defaultRda: 400, defaultOptMin: 490.0, defaultTarget: 600, upperLimit: 1000, mainActiveForm: '5-Methyltetrahydrofolate (5-MTHF)' },
  { name: 'Vitamin B12', category: 'vitamins', unit: 'mcg', defaultRda: 2.4, defaultOptMin: 4.02, defaultTarget: 6.0, upperLimit: 100, mainActiveForm: 'Methyl- / Adenosylcobalamin' },
  { name: 'Choline', category: 'vitamins', unit: 'mg', defaultRda: 550, defaultOptMin: 595.0, defaultTarget: 650, upperLimit: 3500, mainActiveForm: 'Phosphatidylcholine / Betaine' },
  { name: 'Vitamin C', category: 'vitamins', unit: 'mg', defaultRda: 90, defaultOptMin: 117.0, defaultTarget: 150, upperLimit: 2000, mainActiveForm: 'Ascorbate (Reduced)' },

  // Macro-Minerals & Electrolytes
  { name: 'Calcium', category: 'minerals', unit: 'mg', defaultRda: 1000, defaultOptMin: 1090.0, defaultTarget: 1200, upperLimit: 2500, mainActiveForm: 'Ionized Ca2+' },
  { name: 'Magnesium', category: 'minerals', unit: 'mg', defaultRda: 420, defaultOptMin: 478.5, defaultTarget: 550, upperLimit: 1200, mainActiveForm: 'Intracellular Mg-ATP' },
  { name: 'Phosphorus', category: 'minerals', unit: 'mg', defaultRda: 700, defaultOptMin: 925.0, defaultTarget: 1200, upperLimit: 4000, mainActiveForm: 'Inorganic Phosphate (Pi)' },
  { name: 'Potassium', category: 'minerals', unit: 'mg', defaultRda: 2600, defaultOptMin: 3140.0, defaultTarget: 3800, upperLimit: 6000, mainActiveForm: 'Intracellular K+' },
  { name: 'Sodium', category: 'minerals', unit: 'mg', defaultRda: 1500, defaultOptMin: 2400.0, defaultTarget: 3500, upperLimit: 7000, mainActiveForm: 'Extracellular Na+' },
  { name: 'Chloride', category: 'minerals', unit: 'mg', defaultRda: 2300, defaultOptMin: 2795.0, defaultTarget: 3400, upperLimit: 6000, mainActiveForm: 'Gastric & Extracellular Cl-' },
  { name: 'Sulfur', category: 'minerals', unit: 'mg', defaultRda: 800, defaultOptMin: 980.0, defaultTarget: 1200, upperLimit: 3000, mainActiveForm: 'Sulfur Amino Acids / MSM' },

  // Trace Minerals
  { name: 'Iron', category: 'minerals', unit: 'mg', defaultRda: 15, defaultOptMin: 16.35, defaultTarget: 18, upperLimit: 45, mainActiveForm: 'Heme Fe2+ / Transferrin Fe' },
  { name: 'Zinc', category: 'minerals', unit: 'mg', defaultRda: 11, defaultOptMin: 15.05, defaultTarget: 20, upperLimit: 40, mainActiveForm: 'Zinc Finger / Metallothionein' },
  { name: 'Copper', category: 'minerals', unit: 'mg', defaultRda: 0.9, defaultOptMin: 1.4, defaultTarget: 2.0, upperLimit: 10, mainActiveForm: 'Ceruloplasmin-Bound Cu' },
  { name: 'Selenium', category: 'minerals', unit: 'mcg', defaultRda: 55, defaultOptMin: 86.5, defaultTarget: 125, upperLimit: 400, mainActiveForm: 'Selenocysteine (GPx)' },
  { name: 'Iodine', category: 'minerals', unit: 'mcg', defaultRda: 150, defaultOptMin: 195.0, defaultTarget: 250, upperLimit: 1100, mainActiveForm: 'Thyroid T3/T4 Hormones' },
  { name: 'Manganese', category: 'minerals', unit: 'mg', defaultRda: 2.3, defaultOptMin: 2.61, defaultTarget: 3.0, upperLimit: 11, mainActiveForm: 'MnSOD Enzyme' },
  { name: 'Chromium', category: 'minerals', unit: 'mcg', defaultRda: 35, defaultOptMin: 73.25, defaultTarget: 120, upperLimit: 1000, mainActiveForm: 'Chromodulin Complex (Cr3+)' },
  { name: 'Molybdenum', category: 'minerals', unit: 'mcg', defaultRda: 45, defaultOptMin: 65.25, defaultTarget: 90, upperLimit: 2000, mainActiveForm: 'Molybdopterin (Sulfite Oxidase)' },

  // Zoochemicals & Bioactives
  { name: 'Creatine', category: 'minerals', unit: 'mg', defaultRda: 1500, defaultOptMin: 2175.0, defaultTarget: 3000, upperLimit: 10000, mainActiveForm: 'Phosphocreatine' },
  { name: 'Carnosine', category: 'minerals', unit: 'mg', defaultRda: 250, defaultOptMin: 362.5, defaultTarget: 500, upperLimit: 2000, mainActiveForm: 'Beta-alanyl-L-histidine' },
  { name: 'CoQ10', category: 'minerals', unit: 'mg', defaultRda: 30, defaultOptMin: 61.5, defaultTarget: 100, upperLimit: 500, mainActiveForm: 'Ubiquinol / Ubiquinone' },
  { name: 'Carnitine', category: 'minerals', unit: 'mg', defaultRda: 200, defaultOptMin: 335.0, defaultTarget: 500, upperLimit: 2000, mainActiveForm: 'L-Carnitine / ALCAR' },
  { name: 'Taurine', category: 'minerals', unit: 'mg', defaultRda: 500, defaultOptMin: 725.0, defaultTarget: 1000, upperLimit: 3000, mainActiveForm: '2-Aminoethanesulfonic acid' },
];

function getNutrientRank(rawName: string): number {
  const n = (rawName || '').toLowerCase().trim();

  if (n.includes('vitamin a') || n.includes('retinol')) return 10;
  if (n.includes('b12') || n.includes('cobalamin')) return 90;
  if (n.includes('b9') || n.includes('folat')) return 80;
  if (n.includes('b7') || n.includes('biotin')) return 70;
  if (n.includes('b6') || n.includes('pyridox')) return 60;
  if (n.includes('b5') || n.includes('pantothenic')) return 50;
  if (n.includes('b3') || n.includes('niacin')) return 40;
  if (n.includes('b2') || n.includes('riboflavin')) return 30;
  if (n.includes('b1') || n.includes('thiamin')) return 20;

  if (n.includes('vitamin c') || n.includes('ascorbic')) return 100;
  if (n.includes('vitamin d') || n.includes('cholecalciferol')) return 110;
  if (n.includes('vitamin e') || n.includes('tocopherol')) return 120;
  if (n.includes('vitamin k') || n.includes('menaquinone')) return 130;
  if (n.includes('choline')) return 140;

  if (n.includes('calcium')) return 200;
  if (n.includes('copper')) return 210;
  if (n.includes('iron')) return 220;
  if (n.includes('magnesium')) return 230;
  if (n.includes('manganese')) return 240;
  if (n.includes('phosphorus')) return 250;
  if (n.includes('potassium')) return 260;
  if (n.includes('selenium')) return 270;
  if (n.includes('sodium')) return 280;
  if (n.includes('chloride')) return 285;
  if (n.includes('sulfur')) return 288;
  if (n.includes('zinc')) return 290;
  if (n.includes('chromium')) return 295;
  if (n.includes('molybdenum')) return 296;
  if (n.includes('iodine')) return 297;
  if (n.includes('creatine')) return 300;
  if (n.includes('carnosine')) return 310;
  if (n.includes('coq10')) return 320;
  if (n.includes('carnitine')) return 330;
  if (n.includes('taurine')) return 340;

  return 500;
}

export default function MealBioavailabilityPage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<'en' | 'el'>('en');

  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [methods, setMethods] = useState<PreparationOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [items, setItems] = useState<MealItemInput[]>([
    { food_id: '71407a97-c99f-4820-99dc-dbd02b6cb980', food_name: 'Grass-Fed Ribeye Steak', preparation_method: 'Pan Fried / Tallow Seared', weight_grams: 350 },
    { food_id: '4fb61b17-e56b-45b5-b1ea-9597f0b4e61d', food_name: 'Pastured Egg Yolk (Raw)', preparation_method: 'Raw', weight_grams: 80 },
    { food_id: 'c349a3d4-55ad-4ad2-af3c-a0e013a17d5d', food_name: 'Beef Liver (Raw/Fresh)', preparation_method: 'Raw', weight_grams: 50 },
    { food_id: 'f7a74e1c-dc75-4c66-94c8-4adc42283c7c', food_name: 'Atlantic Sardines (Canned with Bones in Water/Oil)', preparation_method: 'Raw', weight_grams: 150 },
    { food_id: '642b1a39-2b02-4caa-8b50-504745420c18', food_name: 'Beef Bone Marrow', preparation_method: 'Oven Roasted / Baked', weight_grams: 80 },
  ]);

  const [supplementStack, setSupplementStack] = useState<SupplementEntryInput[]>([]);
  const [bloodMarkers, setBloodMarkers] = useState<BiomarkerInput[]>([]);

  const [dietType, setDietType] = useState<'carnivore' | 'keto' | 'paleo' | 'mediterranean' | 'high_carb' | 'vegetarian'>('carnivore');
  const [bodyWeightKg, setBodyWeightKg] = useState<number>(80);
  const [userSex, setUserSex] = useState<'male' | 'female'>('male');
  const [dailyCalories, setDailyCalories] = useState(2500);

  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);

  const [pathologyState, setPathologyState] = useState<ClinicalPathologyState>({
    gastricAcid: 'normochlorhydria',
    pathology: 'none',
    bileImpairment: false,
  });

  const [antinutrientConfig, setAntinutrientConfig] = useState<AntinutrientSensitivityConfig>({
    oxalateBindingFactor: 1.0,
    phytateChelationFactor: 1.0,
    thermalLeachingRetentionPct: 70,
    activePreset: 'standard',
  });

  const [rawResults, setRawResults] = useState<MealBioactiveOutput[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [viewMode, setViewMode] = useState<'consolidated' | 'analytical'>('consolidated');
  const [activeNutrientCategory, setActiveNutrientCategory] = useState<string>('all');
  const [expandedNutrients, setExpandedNutrients] = useState<Record<string, boolean>>({});

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCustomFoodOpen, setIsCustomFoodOpen] = useState(false);
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);
  const [isClinicalReportOpen, setIsClinicalReportOpen] = useState(false);
  const [isTrendsOpen, setIsTrendsOpen] = useState(false);
  const [isExclusionsOpen, setIsExclusionsOpen] = useState(false);
  const [isOverridesOpen, setIsOverridesOpen] = useState(false);
  const [isAntinutrientsOpen, setIsAntinutrientsOpen] = useState(false);
  const [isSupplementsOpen, setIsSupplementsOpen] = useState(false);
  const [isBloodWorkOpen, setIsBloodWorkOpen] = useState(false);

  const [estimatorState, setEstimatorState] = useState<{
    isOpen: boolean;
    rowIndex: number;
    foodName: string;
    category: string;
  }>({
    isOpen: false,
    rowIndex: -1,
    foodName: '',
    category: '',
  });

  const [exclusionRules, setExclusionRules] = useState<ExclusionRules>({
    excludeHighHistamine: false,
    excludeDairy: false,
    excludeNightshades: false,
    excludeOrganMeats: false,
    excludePork: false,
  });
  const [targetOverrides, setTargetOverrides] = useState<NutrientOverrides>({});

  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      const savedWeight = localStorage.getItem('user_body_weight');
      const savedDiet = localStorage.getItem('user_diet_type');
      const savedSex = localStorage.getItem('user_sex');
      const savedLang = localStorage.getItem('user_lang');
      const savedExclusions = localStorage.getItem('user_exclusions');
      const savedSupps = localStorage.getItem('user_supplement_stack');
      const savedBlood = localStorage.getItem('user_blood_markers');

      if (savedWeight) setBodyWeightKg(Number(savedWeight));
      if (savedDiet) setDietType(savedDiet as any);
      if (savedSex) setUserSex(savedSex as 'male' | 'female');
      if (savedLang) setLang(savedLang as 'en' | 'el');
      if (savedExclusions) {
        try { setExclusionRules(JSON.parse(savedExclusions)); } catch (e) {}
      }
      if (savedSupps) {
        try { setSupplementStack(JSON.parse(savedSupps)); } catch (e) {}
      }
      if (savedBlood) {
        try { setBloodMarkers(JSON.parse(savedBlood)); } catch (e) {}
      }
    }

    async function loadOptions() {
      setLoadingOptions(true);
      const res = await getMealBuilderOptionsAction();
      setFoods(res.foods || []);
      setMethods(res.methods || []);
      setLoadingOptions(false);
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (!foods.length) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.food_id && foods.some((f) => f.id === item.food_id)) return item;
        const match = foods.find((f) => f.name.toLowerCase() === item.food_name.toLowerCase());
        return match ? { ...item, food_id: match.id, food_name: match.name } : item;
      })
    );
  }, [foods]);

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          setCurrentUserEmail(session.user.email || null);

          const res = await getUserSettingsAction(session.user.id);
          if (res.success && res.data) {
            if (res.data.body_weight_kg) setBodyWeightKg(res.data.body_weight_kg);
            if (res.data.diet_type) setDietType(res.data.diet_type as any);
            if (res.data.exclusion_rules) setExclusionRules(res.data.exclusion_rules);
            if (res.data.target_overrides) setTargetOverrides(res.data.target_overrides);
            if (res.data.supplement_stack) setSupplementStack(res.data.supplement_stack);
            if (res.data.blood_markers) setBloodMarkers(res.data.blood_markers);
          }
        }
      } catch (err) {}
    }
    checkSession();
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('user_body_weight', String(bodyWeightKg));
      localStorage.setItem('user_diet_type', dietType);
      localStorage.setItem('user_sex', userSex);
      localStorage.setItem('user_lang', lang);
      localStorage.setItem('user_exclusions', JSON.stringify(exclusionRules));
      localStorage.setItem('user_supplement_stack', JSON.stringify(supplementStack));
      localStorage.setItem('user_blood_markers', JSON.stringify(bloodMarkers));

      if (userId) {
        saveUserSettingsAction(userId, {
          body_weight_kg: bodyWeightKg,
          diet_type: dietType,
          exclusion_rules: exclusionRules,
          target_overrides: targetOverrides,
          supplement_stack: supplementStack,
          blood_markers: bloodMarkers,
        });
      }
    }
  }, [bodyWeightKg, dietType, userSex, lang, exclusionRules, targetOverrides, supplementStack, bloodMarkers, mounted, userId]);

  const isPureAnimalMeal = useMemo(() => {
    return items.every((item) => {
      const n = (item.food_name || '').toLowerCase();
      return (
        n.includes('beef') ||
        n.includes('liver') ||
        n.includes('yolk') ||
        n.includes('marrow') ||
        n.includes('egg') ||
        n.includes('tallow') ||
        n.includes('cod') ||
        n.includes('salmon') ||
        n.includes('sardine') ||
        n.includes('oyster') ||
        n.includes('steak') ||
        n.includes('lamb') ||
        n.includes('pork')
      );
    });
  }, [items]);

  const calorieMalabsorption = useMemo(() => {
    return evaluateCalorieMalabsorption(pathologyState, isPureAnimalMeal);
  }, [pathologyState, isPureAnimalMeal]);

  const calculatedMacros = useMemo(() => {
    let totalWeight = 0;
    let rawProtein = 0;
    let rawFat = 0;
    let rawCarbs = 0;
    let rawPufa = 0;
    let totalCalories = 0;
    let totalOxalates = 0;
    let totalPhytates = 0;

    items.forEach((item) => {
      const grams = Number(item.weight_grams) || 0;
      if (grams <= 0) return;
      totalWeight += grams;

      const foodEntity = foods.find(
        (f) => f.name.toLowerCase().trim() === (item.food_name || '').toLowerCase().trim()
      );

      if (foodEntity) {
        const factor = grams / 100.0;
        const p = Number(foodEntity.protein_per_100g) || 0;
        const f = Number(foodEntity.fat_per_100g) || 0;
        const c = Number(foodEntity.carbs_per_100g) || 0;
        const pufa = Number(foodEntity.pufa_per_100g) || (f * 0.04);
        const kcal = Number(foodEntity.calories_per_100g) || (p * 4 + f * 9 + c * 4);
        const ox = Number((foodEntity as any).oxalate_mg_per_100g ?? (foodEntity as any).oxalate_content) || 0;
        const ph = Number((foodEntity as any).phytate_mg_per_100g ?? (foodEntity as any).phytate_content) || 0;

        rawProtein += p * factor;
        rawFat += f * factor;
        rawCarbs += c * factor;
        rawPufa += pufa * factor;
        totalCalories += kcal * factor;
        totalOxalates += ox * factor;
        totalPhytates += ph * factor;
      } else {
        const n = (item.food_name || '').toLowerCase();
        if (n.includes('liver')) {
          rawProtein += grams * 0.20;
          rawFat += grams * 0.05;
          rawCarbs += grams * 0.04;
          totalCalories += grams * 1.4;
        } else if (n.includes('marrow')) {
          rawFat += grams * 0.85;
          rawProtein += grams * 0.07;
          totalCalories += grams * 7.9;
        } else if (n.includes('yolk')) {
          rawFat += grams * 0.27;
          rawProtein += grams * 0.16;
          totalCalories += grams * 3.2;
        } else {
          rawProtein += grams * 0.22;
          rawFat += grams * 0.12;
          totalCalories += grams * 2.0;
        }
      }
    });

    const netKcalFloor = Math.round(totalCalories * calorieMalabsorption.netCalorieFactor * 0.95);
    const netKcalCeiling = Math.round(totalCalories * calorieMalabsorption.netCalorieFactor * 1.02);

    return {
      totalWeight,
      totalFat: Number(rawFat.toFixed(1)),
      rawCarbs: Number(rawCarbs.toFixed(1)),
      rawProtein: Number(rawProtein.toFixed(1)),
      rawPufa: Number(rawPufa.toFixed(2)),
      totalOxalates: Math.round(totalOxalates),
      totalPhytates: Math.round(totalPhytates),
      grossCalories: Math.round(totalCalories),
      netKcalFloor,
      netKcalCeiling,
      netCalories: `${netKcalFloor} – ${netKcalCeiling}`,
    };
  }, [items, foods, calorieMalabsorption]);

  const proteinMetrics = useMemo(() => {
    const weight = Math.max(30, Math.min(300, Number(bodyWeightKg) || (userSex === 'female' ? 60 : 70)));
    const optProteinMin = Math.round(weight * 1.6);
    const optProteinMax = Math.round(weight * 2.2);
    const minHormonalFatGrams = Math.max(40, Math.round(weight * 0.8));

    const proteinQualityStatus =
      calculatedMacros.rawProtein >= optProteinMin
        ? (lang === 'en' ? '✓ Optimal Protein Synthesis' : '✓ Επαρκής πρωτεϊνική σύνθεση')
        : (lang === 'en' ? '⚠️ Below DIAAS Floor' : '⚠️ Κάτω από το DIAAS Floor');

    return {
      optProteinMin,
      optProteinMax,
      minHormonalFatGrams,
      proteinQualityStatus,
    };
  }, [bodyWeightKg, userSex, calculatedMacros.rawProtein, lang]);

  const supplementImpact = useMemo(() => {
    return calculateSupplementImpact(supplementStack);
  }, [supplementStack]);

  const dynamicNutrientTargets = useMemo(() => {
    const safeW = Math.max(30, Math.min(300, Number(bodyWeightKg) || (userSex === 'female' ? 60 : 70)));
    const baseDynamic = calculateDynamicTargets(
      { diet: dietType, bodyWeightKg: safeW, sex: userSex },
      {
        proteinG: calculatedMacros.rawProtein,
        carbsG: calculatedMacros.rawCarbs,
        fatG: calculatedMacros.totalFat,
        pufaG: calculatedMacros.rawPufa,
        fiberG: 0,
        totalCalories: calculatedMacros.grossCalories,
      }
    );

    const result: Record<string, any> = {};
    Object.entries(baseDynamic).forEach(([key, val]) => {
      result[key] = { ...val };
    });

    Object.entries(supplementImpact.totalCofactorSurcharges).forEach(([canonKey, drain]) => {
      const matchKey = Object.keys(result).find(
        (k) => k === canonKey || k.includes(canonKey) || canonKey.includes(k)
      );

      if (matchKey && result[matchKey]) {
        const pureBase = baseDynamic[matchKey].baseOptimal;
        const existingSurcharge = baseDynamic[matchKey].surcharge || 0;
        const newOptimal = Number((pureBase + existingSurcharge + drain.amount).toFixed(1));

        result[matchKey] = {
          ...result[matchKey],
          effectiveOptimal: newOptimal,
          triggerReason: result[matchKey].triggerReason
            ? `${result[matchKey].triggerReason} | ${drain.reasons.join(', ')}`
            : drain.reasons.join(', '),
        };
      }
    });

    bloodMarkers.forEach((marker) => {
      const verdict = evaluateBiomarkerStatus(marker, bloodMarkers);
      if (!verdict) return;

      const targetKey = verdict.targetNutrient.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchKey = Object.keys(result).find(
        (k) => k === targetKey || k.includes(targetKey) || targetKey.includes(k)
      );

      if (matchKey && result[matchKey]) {
        if (verdict.status === 'deficient' || verdict.status === 'excess') {
          const currentOpt = result[matchKey].effectiveOptimal;
          const biasedOpt = Number((currentOpt * verdict.dynamicTargetMultiplier).toFixed(1));

          result[matchKey] = {
            ...result[matchKey],
            effectiveOptimal: biasedOpt,
            triggerReason: result[matchKey].triggerReason
              ? `${result[matchKey].triggerReason} | 🩸 ${verdict.clinicalInsight}`
              : `🩸 ${verdict.clinicalInsight}`,
          };
        }
      }
    });

    return result;
  }, [dietType, bodyWeightKg, userSex, calculatedMacros, supplementImpact, bloodMarkers]);

  const handleCalculateMeal = async () => {
    if (items.length === 0) {
      setRawResults([]);
      return;
    }
    setIsCalculating(true);
    const res = await calculateMealAction(items, dietType, dailyCalories, pathologyState);
    if (res.success && res.data) {
      setRawResults(res.data);
    }
    setIsCalculating(false);
  };

  useEffect(() => {
    if (mounted) {
      handleCalculateMeal();
    }
  }, [items, dietType, mounted]);

  const findGross = (name: string) => {
    const targetClean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = rawResults.find((r) => {
      const curClean = (r.nutrient_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return curClean === targetClean || curClean.includes(targetClean) || targetClean.includes(curClean);
    });
    return found ? Number(found.total_plate_gross) || 0 : 0;
  };

  const processedNutrientMatrix = useMemo(() => {
    const mealContext: MealContextState = {
      totalFatGrams: calculatedMacros.totalFat,
      totalCarbsGrams: calculatedMacros.rawCarbs,
      totalFiberGrams: 0,
      totalZincMg: findGross('Zinc'),
      totalCopperMg: findGross('Copper'),
      totalIronMg: findGross('Iron'),
      totalCalciumMg: findGross('Calcium'),
      totalVitaminCMg: findGross('Vitamin C'),
      totalOxalatesMg: calculatedMacros.totalOxalates,
      totalPhytatesMg: calculatedMacros.totalPhytates,
      isPureAnimalFood: isPureAnimalMeal,
      carotenoidMatrixCooked: (items || []).some((it: any) => {
        const p = String(it.preparation_method || 'raw').toLowerCase();
        return p !== 'raw' && !p.includes('supplement');
      }),
    };

    const evaluatedList = (rawResults || []).map((r) => {
      let usableMin = Number(r.useful_net_min);
      let usableMax = Number(r.useful_net_max);
      if (!Number.isFinite(usableMin)) usableMin = 0;
      if (!Number.isFinite(usableMax)) usableMax = usableMin;
      if (/b12|cobalamin/i.test(r.nutrient_name || '')) {
        usableMin = applyB12IfCap(usableMin);
        usableMax = applyB12IfCap(usableMax);
      }

      const absorbedMin = Number(r.bioavailable_min ?? r.absorbed_min ?? usableMin) || 0;
      const absorbedMax = Number(r.bioavailable_max ?? r.absorbed_max ?? usableMax) || 0;
      const notes = String(r.meal_matrix_status || '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      return {
        ...r,
        chemical_form: r.chemical_form,
        bioavailable_min: absorbedMin,
        bioavailable_max: absorbedMax,
        absorbed_min: absorbedMin,
        absorbed_max: absorbedMax,
        useful_net_min: usableMin,
        useful_net_max: usableMax,
        cellularUsabilityRate: Number(r.conversion_factor || 1),
        clinicalNotes: notes,
        isAnimalOrigin: isPureAnimalMeal,
      };
    });

    const grouped: Record<string, any> = {};

    evaluatedList.forEach((item) => {
      const key = item.nutrient_name?.trim();
      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = {
          ...item,
          total_plate_gross: 0,
          bioavailable_min: 0,
          bioavailable_max: 0,
          useful_net_min: 0,
          useful_net_max: 0,
          speciesBreakdown: [],
        };
      }

      grouped[key].total_plate_gross += item.total_plate_gross;
      grouped[key].bioavailable_min += item.bioavailable_min;
      grouped[key].bioavailable_max += item.bioavailable_max;
      grouped[key].useful_net_min += item.useful_net_min;
      grouped[key].useful_net_max += item.useful_net_max;

      grouped[key].speciesBreakdown.push({
        chemical_form: item.chemical_form,
        gross: item.total_plate_gross,
        absorbedMin: item.bioavailable_min,
        absorbedMax: item.bioavailable_max,
        netMin: item.useful_net_min,
        netMax: item.useful_net_max,
        isAnimal: item.isAnimalOrigin,
        conversionRate: item.cellularUsabilityRate || 1.0,
      });
    });

    ALL_CANONICAL_NUTRIENTS.forEach((canon) => {
      const existingKey = Object.keys(grouped).find((k) => {
        const cleanK = k.toLowerCase().trim();
        const cleanCanon = canon.name.toLowerCase().trim();

        if (cleanK === cleanCanon) return true;

        if (canon.name === 'Thiamine (B1)' && (/\bb1\b/.test(cleanK) || cleanK.includes('thiam'))) return true;
        if (canon.name === 'Riboflavin (B2)' && (/\bb2\b/.test(cleanK) || cleanK.includes('ribof'))) return true;
        if (canon.name === 'Niacin (B3)' && (/\bb3\b/.test(cleanK) || cleanK.includes('niac'))) return true;
        if (canon.name === 'Pantothenic Acid (B5)' && (/\bb5\b/.test(cleanK) || cleanK.includes('pantothen'))) return true;
        if (canon.name === 'Vitamin B6' && (/\bb6\b/.test(cleanK) || cleanK.includes('pyridox'))) return true;
        if (canon.name === 'Biotin (B7)' && (/\bb7\b/.test(cleanK) || cleanK.includes('biotin'))) return true;
        if (canon.name === 'Folate (B9)' && (/\bb9\b/.test(cleanK) || cleanK.includes('folat'))) return true;
        if (canon.name === 'Vitamin B12' && (/\bb12\b/.test(cleanK) || cleanK.includes('cobal'))) return true;

        if (canon.name === 'Chromium' && cleanK.includes('chrom')) return true;
        if (canon.name === 'Molybdenum' && cleanK.includes('molyb')) return true;
        if (canon.name === 'Iodine' && cleanK.includes('iodin')) return true;

        return false;
      });

      if (!existingKey) {
        grouped[canon.name] = {
          nutrient_name: canon.name,
          chemical_form: 'Tracing',
          nutrient_category: canon.category,
          unit: canon.unit,
          mainActiveForm: canon.mainActiveForm,
          total_plate_gross: 0,
          bioavailable_min: 0,
          bioavailable_max: 0,
          useful_net_min: 0,
          useful_net_max: 0,
          adjusted_daily_target: canon.defaultTarget,
          speciesBreakdown: [],
        };
      } else {
        grouped[existingKey].mainActiveForm = canon.mainActiveForm;
      }
    });

    Object.entries(supplementImpact.totalActiveNutrientYield).forEach(([canonKey, activeAmount]) => {
      const matchingKey = Object.keys(grouped).find((k) => {
        const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return clean === canonKey || clean.includes(canonKey) || canonKey.includes(clean);
      });

      if (matchingKey && grouped[matchingKey]) {
        grouped[matchingKey].useful_net_min += activeAmount;
        grouped[matchingKey].useful_net_max += activeAmount;
        grouped[matchingKey].total_plate_gross += activeAmount;

        grouped[matchingKey].speciesBreakdown.push({
          chemical_form: '💊 Pharmacokinetic Supplement Stack',
          gross: activeAmount,
          absorbedMin: activeAmount,
          absorbedMax: activeAmount,
          netMin: activeAmount,
          netMax: activeAmount,
          isAnimal: false,
          conversionRate: 1.0,
        });
      }
    });

    return Object.values(grouped).map((g: any) => ({
      ...g,
      total_plate_gross: Number(g.total_plate_gross.toFixed(2)),
      bioavailable_min: Number(g.bioavailable_min.toFixed(2)),
      bioavailable_max: Number(g.bioavailable_max.toFixed(2)),
      useful_net_min: Number(g.useful_net_min.toFixed(2)),
      useful_net_max: Number(g.useful_net_max.toFixed(2)),
    }));
  }, [rawResults, pathologyState, calculatedMacros, items, supplementImpact, isPureAnimalMeal]);

  const pralAnalysis = useMemo(() => {
    return calculatePRAL({
      proteinG: calculatedMacros.rawProtein,
      phosphorusMg: findGross('Phosphorus') || calculatedMacros.rawProtein * 12,
      potassiumMg: findGross('Potassium') || calculatedMacros.rawProtein * 14,
      magnesiumMg: findGross('Magnesium') || calculatedMacros.rawProtein * 1.1,
      calciumMg: findGross('Calcium'),
    });
  }, [calculatedMacros.rawProtein, rawResults]);

  const methylationAnalysis = useMemo(() => {
    return evaluateMethylationDemand(
      calculatedMacros.rawProtein,
      findGross('Choline'),
      findGross('Vitamin B6'),
      findGross('Vitamin B12')
    );
  }, [calculatedMacros.rawProtein, rawResults]);

  const sortedAndFilteredNutrients = useMemo(() => {
    const list = processedNutrientMatrix.filter((item) => {
      if (!item.nutrient_name || item.nutrient_name.trim() === '') return false;
      if (activeNutrientCategory === 'all') return true;
      if (activeNutrientCategory === 'minerals') {
        const r = getNutrientRank(item.nutrient_name);
        return r >= 200 && r < 400;
      }
      if (activeNutrientCategory === 'vitamins') {
        const r = getNutrientRank(item.nutrient_name);
        return r >= 10 && r < 200;
      }
      if (activeNutrientCategory === 'electrolytes') {
        const n = item.nutrient_name.toLowerCase();
        return (
          n.includes('sodium') ||
          n.includes('potassium') ||
          n.includes('magnesium') ||
          n.includes('calcium') ||
          n.includes('chloride')
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      const rankA = getNutrientRank(a.nutrient_name);
      const rankB = getNutrientRank(b.nutrient_name);

      if (rankA !== rankB) return rankA - rankB;
      return a.nutrient_name.localeCompare(b.nutrient_name);
    });
  }, [processedNutrientMatrix, activeNutrientCategory]);

  const toggleNutrientExpanded = (nutrientName: string) => {
    setExpandedNutrients((prev) => ({
      ...prev,
      [nutrientName]: !prev[nutrientName],
    }));
  };

  const handleAddItem = () => {
    const firstFood = foods[0];
    const firstMethod = methods[0]?.method_name || 'Raw';
    setItems((prev) => [
      ...prev,
      {
        food_id: firstFood?.id,
        food_name: firstFood?.name || 'Pastured Egg Yolk (Raw)',
        preparation_method: firstMethod,
        weight_grams: 100,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof MealItemInput, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // PRESET HANDLER FOR PERFECT DAYS OF EATING
  const handleLoadPreset = (presetKey: string) => {
    if (presetKey === 'master') {
      // 1. MASTER ANCESTRAL (Organs + Seafood + Yolks + Steak + Marrow)
      setDietType('carnivore');
      setItems([
        { food_name: 'Grass-Fed Ribeye Steak', preparation_method: 'Pan Fried / Tallow Seared', weight_grams: 350 },
        { food_name: 'Pastured Egg Yolk (Raw)', preparation_method: 'Raw', weight_grams: 80 },
        { food_name: 'Beef Liver (Raw/Fresh)', preparation_method: 'Raw', weight_grams: 50 },
        { food_name: 'Atlantic Sardines (Canned with Bones in Water/Oil)', preparation_method: 'Raw', weight_grams: 150 },
        { food_name: 'Beef Bone Marrow', preparation_method: 'Oven Roasted / Baked', weight_grams: 80 },
      ]);
    } else if (presetKey === 'no_organs') {
      // 2. NO ORGANS (Liver-Free / Seafood & Yolks Enhanced)
      setDietType('carnivore');
      setItems([
        { food_name: 'Grass-Fed Ribeye Steak', preparation_method: 'Pan Fried / Tallow Seared', weight_grams: 400 },
        { food_name: 'Pastured Egg Yolk (Raw)', preparation_method: 'Raw', weight_grams: 100 },
        { food_name: 'Atlantic Sardines (Canned with Bones in Water/Oil)', preparation_method: 'Raw', weight_grams: 200 },
        { food_name: 'Beef Bone Marrow', preparation_method: 'Oven Roasted / Baked', weight_grams: 100 },
      ]);
    } else if (presetKey === 'no_seafood') {
      // 3. NO SEAFOOD (Fish-Free / Ruminant & Egg Focus)
      setDietType('carnivore');
      setItems([
        { food_name: 'Grass-Fed Ribeye Steak', preparation_method: 'Pan Fried / Tallow Seared', weight_grams: 450 },
        { food_name: 'Pastured Egg Yolk (Raw)', preparation_method: 'Raw', weight_grams: 80 },
        { food_name: 'Beef Liver (Raw/Fresh)', preparation_method: 'Raw', weight_grams: 60 },
        { food_name: 'Beef Bone Marrow', preparation_method: 'Oven Roasted / Baked', weight_grams: 120 },
      ]);
    } else if (presetKey === 'omnivore') {
      // 4. ANCESTRAL WHOLE FOOD (Meat + Eggs + Liver + Almonds + Sardines)
      setDietType('paleo');
      setItems([
        { food_name: 'Grass-Fed Ribeye Steak', preparation_method: 'Pan Fried / Tallow Seared', weight_grams: 350 },
        { food_name: 'Pastured Egg Yolk (Raw)', preparation_method: 'Raw', weight_grams: 80 },
        { food_name: 'Beef Liver (Raw/Fresh)', preparation_method: 'Raw', weight_grams: 40 },
        { food_name: 'Almonds (Raw)', preparation_method: 'Raw', weight_grams: 60 },
        { food_name: 'Atlantic Sardines (Canned with Bones in Water/Oil)', preparation_method: 'Raw', weight_grams: 100 },
      ]);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="animate-spin text-emerald-400 text-base">⚡</span>
          <span>Initializing Clinical Enteric Telemetry...</span>
        </div>
      </main>
    );
  }

  const calorieFillPct = Math.min(100, Math.round((calculatedMacros.grossCalories / dailyCalories) * 100));
  const isCarnivoreMode = dietType === 'carnivore' || dietType === 'keto';
  const carbDisplayLimit = isCarnivoreMode ? 10 : 25;
  const carbFillPct = Math.min(100, Math.round((calculatedMacros.rawCarbs / carbDisplayLimit) * 100));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6" suppressHydrationWarning>
      
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              BIOAVAILABILITY & ENTERIC MATRIX ENGINE
            </h1>
            <span className="text-xs bg-slate-900 border border-slate-700 text-emerald-400 font-mono px-2 py-0.5 rounded-md">
              v2.9 Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {lang === 'en' 
              ? 'Evidence-based enteric absorption, chelation mechanics & cellular telemetry'
              : 'Υπολογισμός εντερικής απορρόφησης, οξαλικών, τανινών και ενζυμικών μετατροπών'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'el' : 'en')}
            className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-cyan-300 font-bold font-mono transition-colors"
          >
            🌐 {lang.toUpperCase()}
          </button>

          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-400 mr-2 font-mono">SEX:</span>
            <select
              value={userSex}
              onChange={(e) => setUserSex(e.target.value as 'male' | 'female')}
              className="bg-transparent text-cyan-400 font-bold font-mono focus:outline-none cursor-pointer"
            >
              <option value="male" className="bg-slate-900 text-white">♂ Male</option>
              <option value="female" className="bg-slate-900 text-white">♀ Female</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-400 mr-2 font-mono">DIET:</span>
            <select
              value={dietType}
              onChange={(e) => setDietType(e.target.value as any)}
              className="bg-transparent text-emerald-400 font-bold font-mono focus:outline-none cursor-pointer"
            >
              <option value="carnivore" className="bg-slate-900 text-white">🥩 Carnivore (Zero Plant)</option>
              <option value="keto" className="bg-slate-900 text-white">🥑 Ketogenic (&lt;30g Carbs)</option>
              <option value="paleo" className="bg-slate-900 text-white">🦴 Paleolithic Ancestral</option>
              <option value="mediterranean" className="bg-slate-900 text-white">🫒 Mediterranean Whole Food</option>
              <option value="high_carb" className="bg-slate-900 text-white">🍚 High Carb / Glycolytic</option>
              <option value="vegetarian" className="bg-slate-900 text-white">🌱 Plant-Dominant</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-400 mr-2 font-mono">WEIGHT:</span>
            <input
              type="number"
              min="30"
              max="250"
              value={bodyWeightKg}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                setBodyWeightKg(isNaN(parsed) ? 80 : parsed);
              }}
              className="w-12 bg-transparent text-white font-mono font-bold focus:outline-none"
            />
            <span className="text-slate-500 font-mono">kg</span>
          </div>

          <button
            type="button"
            onClick={() => setIsBloodWorkOpen(true)}
            className="text-xs bg-slate-900 hover:bg-slate-800 border border-rose-600/80 px-3 py-1.5 rounded-xl text-rose-300 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>🩸</span> Blood Work ({bloodMarkers.length})
          </button>

          <button
            type="button"
            onClick={() => setIsSupplementsOpen(true)}
            className="text-xs bg-slate-900 hover:bg-slate-800 border border-emerald-600/80 px-3 py-1.5 rounded-xl text-emerald-300 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>💊</span> Supplements ({supplementStack.length})
          </button>

          <button
            type="button"
            onClick={() => setIsClinicalReportOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow transition-colors"
          >
            <span>📄</span> Report PDF
          </button>
        </div>
      </header>

      {/* Top Telemetry & Macros Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5 shadow-sm">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold">
            <span>Net Calories</span>
            <span className="text-cyan-400 cursor-help" title="Absorbed net energy accounting for malabsorption factors.">[?]</span>
          </div>
          <div className="text-sm font-black text-white font-mono">
            {calculatedMacros.netCalories} <span className="text-[10px] text-slate-500 font-sans">kcal</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div style={{ width: `${calorieFillPct}%` }} className="bg-emerald-500 h-full rounded-full transition-all" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5 shadow-sm">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold">
            <span>Protein (Net DIAAS)</span>
            <span className="text-cyan-400 cursor-help" title="Target optimized for lean muscle and hormone synthesis.">[?]</span>
          </div>
          <div className="text-sm font-black text-white font-mono">
            {calculatedMacros.rawProtein}g <span className="text-[10px] text-emerald-400 font-sans">/ min {proteinMetrics.optProteinMin}g</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono truncate">{proteinMetrics.proteinQualityStatus}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5 shadow-sm">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold">
            <span>Fat (Steroidogenesis)</span>
            <span className="text-cyan-400 cursor-help" title="Minimum fat needed for bile release and hormone production.">[?]</span>
          </div>
          <div className="text-sm font-black text-white font-mono">
            {calculatedMacros.totalFat}g <span className="text-[10px] text-emerald-400 font-sans">/ min {proteinMetrics.minHormonalFatGrams}g</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">✓ Adequate for CCK & micelles</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5 shadow-sm">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold">
            <span>Carbohydrates</span>
            <span className="text-cyan-400 cursor-help" title="Total carbohydrate load from selected sources.">[?]</span>
          </div>
          <div className="text-sm font-black text-white font-mono">
            {calculatedMacros.rawCarbs}g <span className="text-[10px] text-slate-500 font-sans">{isCarnivoreMode ? '/ Zero Plant Optimal' : '/ Limit 25g'}</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div style={{ width: `${carbFillPct}%` }} className={`h-full rounded-full transition-all ${calculatedMacros.rawCarbs > carbDisplayLimit && !isCarnivoreMode ? 'bg-rose-500' : 'bg-cyan-500'}`} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5 shadow-sm">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold">
            <span>PUFA Oxidative Load</span>
            <span className="text-cyan-400 cursor-help" title="Polyunsaturated fatty acid load. High PUFA increases lipid peroxidation risk.">[?]</span>
          </div>
          <div className={`text-sm font-black font-mono ${calculatedMacros.rawPufa > 8 ? 'text-rose-400' : 'text-cyan-400'}`}>
            {calculatedMacros.rawPufa}g <span className="text-[10px] text-slate-500 font-sans">/ max 8g safe</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {calculatedMacros.rawPufa > 8 ? '⚠️ High Peroxidation Risk' : '✓ Low Oxidative Stress'}
          </div>
        </div>
      </section>

      {/* Symptom-Based Gut & Digestion Selectors (Side-by-Side) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center gap-1.5">
              <span>🩺</span> Stomach Acid & Digestion Symptoms
            </label>
            <span className="text-[10px] text-cyan-400 font-mono cursor-help" title="Low stomach acid impairs protein cleavage and mineral ionization.">[?]</span>
          </div>
          <select
            value={pathologyState.gastricAcid}
            onChange={(e) =>
              setPathologyState((prev) => ({ ...prev, gastricAcid: e.target.value as GastricAcidStatus }))
            }
            className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-3 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="normochlorhydria">✨ Normal Acid (Smooth digestion, no bloating)</option>
            <option value="hypochlorhydria">⚠️ Low Acid / PPI Use (Bloating, heavy digestion after meat)</option>
            <option value="achlorhydria">❌ Achlorhydria / Severe Malabsorption</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center gap-1.5">
              <span>🦠</span> Intestinal Mucosa & Gut Integrity
            </label>
            <span className="text-[10px] text-cyan-400 font-mono cursor-help" title="Bacterial overgrowth or villous damage reduces overall absorption capacity.">[?]</span>
          </div>
          <select
            value={pathologyState.pathology}
            onChange={(e) =>
              setPathologyState((prev) => ({ ...prev, pathology: e.target.value as GutPathology }))
            }
            className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-3 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="none">🌿 Healthy Gut / Normal Epithelium</option>
            <option value="sibo">🦠 SIBO / Gas / Bacterial Overgrowth</option>
            <option value="crohns_celiac">⚡ Celiac / Crohn's / Villous Atrophy</option>
          </select>
        </div>
      </section>

      {/* Main Grid: Meal Builder & Bioactive Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Meal Builder */}
        <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🍽️</span> Meal Builder
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {items.length} items | {calculatedMacros.totalWeight}g total
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Perfect Day Preset Loader */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleLoadPreset(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="text-[11px] bg-emerald-950/90 border border-emerald-600 text-emerald-300 font-bold px-2.5 py-1 rounded-lg focus:outline-none cursor-pointer shadow-sm"
              >
                <option value="" disabled>✨ Load Perfect Day Preset...</option>
                <option value="master">🌟 1. Master Ancestral (Organs + Seafood)</option>
                <option value="no_organs">🥩 2. No Organs (Liver-Free)</option>
                <option value="no_seafood">🍖 3. No Seafood (Fish-Free)</option>
                <option value="omnivore">🥑 4. Ancestral Whole Food (Meat + Eggs + Almonds)</option>
              </select>

              <button
                type="button"
                onClick={() => setIsExclusionsOpen(true)}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
              >
                🛡️ Exclusions
              </button>
              <button
                type="button"
                onClick={() => setIsOverridesOpen(true)}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
              >
                🎯 Targets (33)
              </button>
              <button
                type="button"
                onClick={() => setIsCustomFoodOpen(true)}
                className="text-[11px] bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg transition-colors"
              >
                + Custom Food
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const selectedFoodEntity = foods.find((f) => f.name === item.food_name);
              return (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 font-mono">#{idx + 1} Item</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-500 hover:text-rose-400 text-xs px-1.5 py-0.5"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <FoodSelect
                    foods={foods}
                    selectedFoodName={item.food_name}
                    selectedFoodId={item.food_id}
                    onSelect={(food) => {
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], food_id: food.id, food_name: food.name };
                        return copy;
                      });
                    }}
                  />

                  <CookingMethodSelect
                    methods={methods}
                    selectedMethod={item.preparation_method}
                    onSelect={(method) => handleUpdateItem(idx, 'preparation_method', method)}
                  />

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Weight (g)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.weight_grams}
                        onChange={(e) => handleUpdateItem(idx, 'weight_grams', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setEstimatorState({
                            isOpen: true,
                            rowIndex: idx,
                            foodName: item.food_name,
                            category: selectedFoodEntity?.category || 'meat',
                          })
                        }
                        className="text-[11px] text-slate-400 hover:text-white bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <span>⚖️</span> Cooked ➔ Raw
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 transition-colors"
            >
              + Add Item
            </button>
            <button
              type="button"
              onClick={handleCalculateMeal}
              disabled={isCalculating}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Bioavailability'}
            </button>
            <button
              type="button"
              disabled={isLoggingMeal}
              onClick={async () => {
                setIsLoggingMeal(true);
                const res = await logCurrentMealAction(items, dietType, userId);
                setIsLoggingMeal(false);
                if (res.success) {
                  alert('Meal logged successfully to telemetry ledger!');
                } else {
                  alert('Error logging meal: ' + res.error);
                }
              }}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center gap-1"
            >
              <span>💾</span> {isLoggingMeal ? 'Logging...' : 'Log Meal'}
            </button>
          </div>
        </section>

        {/* Right Column: Bioactive Profile & Analytical Waterfall */}
        <section className="lg:col-span-7 space-y-4">
          <MealMatrixInsights results={rawResults} itemsCount={items.length} />

          <MetabolicHealthCard pral={pralAnalysis} methylation={methylationAnalysis} />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('consolidated')}
                  className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${viewMode === 'consolidated' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  {lang === 'en' ? 'Consolidated (33)' : 'Συγκεντρωτική (33)'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('analytical')}
                  className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${viewMode === 'analytical' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  {lang === 'en' ? 'Analytical (Species)' : 'Αναλυτική (Species)'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: lang === 'en' ? 'All' : 'Όλα' },
                  { id: 'vitamins', label: lang === 'en' ? 'Vitamins' : 'Βιταμίνες' },
                  { id: 'minerals', label: lang === 'en' ? 'Minerals' : 'Μέταλλα' },
                  { id: 'electrolytes', label: lang === 'en' ? 'Electrolytes' : 'Ηλεκτρολύτες' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveNutrientCategory(chip.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg transition-all ${activeNutrientCategory === chip.id ? 'bg-slate-800 text-white font-bold border border-slate-600' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {sortedAndFilteredNutrients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No active nutrient results. Add items and click «Calculate Bioavailability».
              </div>
            ) : (
              <div className="space-y-4 max-h-[660px] overflow-y-auto pr-1">
                {sortedAndFilteredNutrients.map((r: any, idx: number) => {
                  const isExpanded = viewMode === 'analytical' || !!expandedNutrients[r.nutrient_name];
                  const sanitizedKey = (r.nutrient_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  const customTarget = targetOverrides[r.nutrient_name];
                  
                  // Search dynamic targets with fuzzy fallback
                  const dynamicInfo =
                    dynamicNutrientTargets[sanitizedKey] ||
                    dynamicNutrientTargets[sanitizedKey.replace('b1', '')] ||
                    dynamicNutrientTargets[sanitizedKey.replace('b2', '')] ||
                    dynamicNutrientTargets[sanitizedKey.replace('b3', '')] ||
                    dynamicNutrientTargets[sanitizedKey.replace('b5', '')] ||
                    dynamicNutrientTargets[sanitizedKey.replace('b6', '')] ||
                    dynamicNutrientTargets[sanitizedKey.replace('b7', '')] ||
                    dynamicNutrientTargets[sanitizedKey.replace('b9', '')] ||
                    dynamicNutrientTargets[sanitizedKey.replace('b12', '')] ||
                    dynamicNutrientTargets[sanitizedKey.replace('vitamin', 'vit')];

                  // Canonical ground truth to prevent any database-corrupted numbers
                  const canonDef = ALL_CANONICAL_NUTRIENTS.find(
                    (c) => c.name.toLowerCase().trim() === (r.nutrient_name || '').toLowerCase().trim() ||
                           c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === sanitizedKey
                  );

                  const fallbackOptimal = canonDef ? canonDef.defaultTarget : (Number(r.adjusted_daily_target) || 1.0);

                  const intakeOpt = customTarget !== undefined
                    ? customTarget
                    : dynamicInfo
                    ? dynamicInfo.effectiveOptimal
                    : fallbackOptimal;

                  const intakeRda = dynamicInfo
                    ? dynamicInfo.effectiveRda
                    : (canonDef ? canonDef.defaultRda : Number((intakeOpt * 0.65).toFixed(1)));

                  const intakeOptMin =
                    dynamicInfo?.baseOptimal ??
                    canonDef?.defaultOptMin ??
                    Number((intakeRda * 1.3).toFixed(2));

                  const intakeUl = dynamicInfo?.upperTolerableLimit ?? canonDef?.upperLimit;

                  // RDA on bar 1 never moves. Optimal on bar 1 moves with macros + blood.
                  // Bar 2 markers = those intake numbers × healthy-adult abs × Φ only.
                  const tissueRda = scaleIntakeToTissue(intakeRda, r.nutrient_name, 'mid');
                  const tissueOptMin = scaleIntakeToTissue(intakeOptMin, r.nutrient_name, 'mid');
                  const tissueOpt = scaleIntakeToTissue(intakeOpt, r.nutrient_name, 'mid');
                  const tissueUl =
                    intakeUl != null ? scaleIntakeToTissue(Number(intakeUl), r.nutrient_name, 'mid') : undefined;

                  const plateGross = Number(r.total_plate_gross) || 0;
                  const bioMin = Number(r.bioavailable_min) || 0;
                  const bioMax = Number(r.bioavailable_max) || 0;
                  const netUsableMin = Number(r.useful_net_min) || 0;
                  const netUsableMax = Number(r.useful_net_max) || 0;
                  const animalGross = (r.speciesBreakdown || [])
                    .filter((sp: any) => sp.isAnimal)
                    .reduce((s: number, sp: any) => s + Number(sp.gross || 0), 0);
                  const plantGross = (r.speciesBreakdown || [])
                    .filter((sp: any) => !sp.isAnimal)
                    .reduce((s: number, sp: any) => s + Number(sp.gross || 0), 0);
                  const absorbRda = scaleIntakeToAbsorbed(intakeRda, r.nutrient_name, 'mid');
                  const absorbOptMin = scaleIntakeToAbsorbed(intakeOptMin, r.nutrient_name, 'mid');
                  const absorbOpt = scaleIntakeToAbsorbed(intakeOpt, r.nutrient_name, 'mid');
                  const absorbUl =
                    intakeUl != null ? scaleIntakeToAbsorbed(Number(intakeUl), r.nutrient_name, 'mid') : undefined;
                  const mealTips = tipsForNutrient({
                    nutrient: r.nutrient_name,
                    plantGross,
                    animalGross,
                    fatGrams: Number(r.total_fat_grams || calculatedMacros.totalFat || 0),
                    cooked: (items || []).some((it: any) => {
                      const p = String(it.preparation_method || 'raw').toLowerCase();
                      return p !== 'raw' && !p.includes('supplement');
                    }),
                  });

                  return (
                    <div key={r.nutrient_name || idx} className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-3 transition-all shadow-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white tracking-wide">{r.nutrient_name}</span>
                            {dynamicInfo?.triggerReason && (
                              <span className="text-[10px] bg-amber-950/90 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono">
                                Model Adjustment
                              </span>
                            )}
                            {dynamicInfo?.evidenceType && (
                              <span
                                className="text-[10px] bg-slate-900 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono"
                                title={dynamicInfo.evidenceNote || 'Evidence classification for this target model.'}
                              >
                                {dynamicInfo.evidenceType.replaceAll('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1 space-y-0.5">
                            <div>
                              Active Target Form: <strong className="text-cyan-300 font-bold">{r.mainActiveForm || r.chemical_form}</strong>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Plate gross: <span className="text-slate-300">{plateGross.toFixed(1)} {r.unit}</span>
                              {r.intake_optimal != null && (
                                <span> · intake target {Number(r.intake_rda || intakeRda).toFixed(1)}–{Number(r.intake_optimal).toFixed(1)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-mono font-bold text-emerald-400 block tracking-tight">
                            {netUsableMin.toFixed(1)} – {netUsableMax.toFixed(1)} {r.unit}
                          </span>
                          <span className="text-xs text-slate-400 font-mono block mt-0.5">Net Cellular Yield</span>
                        </div>
                      </div>

                      <DualRangeProgressBar
                        unit={r.unit}
                        chemicalForm={r.chemical_form}
                        conversionRate={Number(r.conversion_factor || r.cellularUsabilityRate || 1)}
                        grossInput={plateGross}
                        animalGross={animalGross}
                        plantGross={plantGross}
                        intakeRda={intakeRda}
                        intakeOptimalMin={intakeOptMin}
                        intakeOptimalMax={intakeOpt}
                        intakeUl={intakeUl != null ? Number(intakeUl) : undefined}
                        absorbedMin={bioMin || netUsableMin}
                        absorbedMax={bioMax || netUsableMax}
                        absorbRda={absorbRda}
                        absorbOptimalMin={absorbOptMin}
                        absorbOptimalMax={absorbOpt}
                        absorbUl={absorbUl}
                        currentMin={netUsableMin}
                        currentMax={netUsableMax}
                        tissueRda={tissueRda}
                        tissueOptimalMin={tissueOptMin}
                        tissueOptimalMax={tissueOpt}
                        tissueUl={tissueUl}
                      />

                      {mealTips.length > 0 && (
                        <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-2.5 text-xs text-amber-200 space-y-1 font-mono">
                          {mealTips.map((tip, tIdx) => (
                            <div key={tIdx}>💡 {tip}</div>
                          ))}
                        </div>
                      )}

                      {r.clinicalNotes && r.clinicalNotes.length > 0 && (
                        <div className="bg-rose-950/40 border border-rose-900/60 rounded-lg p-2.5 text-xs text-rose-300 space-y-1 font-mono">
                          {r.clinicalNotes.map((note: string, nIdx: number) => (
                            <div key={nIdx}>⚠️ {note}</div>
                          ))}
                        </div>
                      )}

                      {/* Analytical Waterfall Breakdown */}
                      {(viewMode === 'analytical' || (viewMode === 'consolidated' && isExpanded)) && (
                        <div className="pt-3 border-t border-slate-900 space-y-2">
                          {viewMode === 'consolidated' && (
                            <button
                              type="button"
                              onClick={() => toggleNutrientExpanded(r.nutrient_name)}
                              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-mono transition-colors"
                            >
                              <span>{isExpanded ? '▲ Hide Breakdown' : '▼ View Chemical Form Breakdown'}</span>
                            </button>
                          )}

                          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase border-b border-slate-800 pb-1.5 font-mono">
                              <span>Chemical Form / Source</span>
                              <span>1. Gross ➔ 2. Enteric ➔ 3. Conversion</span>
                            </div>

                            {r.speciesBreakdown && r.speciesBreakdown.length > 0 ? (
                              r.speciesBreakdown.map((sp: any, sIdx: number) => (
                                <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 border-b border-slate-800/60 last:border-none text-xs font-mono gap-1">
                                  <div>
                                    <span className={sp.isAnimal ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                      {sp.isAnimal ? '🥩 Preformed (Animal)' : '🌱 Precursor (Plant/Synthetic)'}:
                                    </span>{' '}
                                    <span className="text-white font-semibold">{sp.chemical_form}</span>
                                  </div>

                                  <div className="text-right text-slate-300 text-xs">
                                    <span className="text-slate-400">{sp.gross} {r.unit}</span>
                                    <span className="text-slate-500 mx-1">➔</span>
                                    <span className="text-cyan-300">{sp.absorbedMin}–{sp.absorbedMax} {r.unit}</span>
                                    <span className="text-slate-500 mx-1">➔</span>
                                    <span className="text-emerald-400 font-bold">+{sp.netMin}–{sp.netMax} {r.unit} Active Pool</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-slate-500 italic">No specific chemical forms detected in current meal.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modals */}
      <BloodWorkModal isOpen={isBloodWorkOpen} onClose={() => setIsBloodWorkOpen(false)} currentMarkers={bloodMarkers} onSaveMarkers={(m) => setBloodMarkers(m)} />
      <SupplementStackModal isOpen={isSupplementsOpen} onClose={() => setIsSupplementsOpen(false)} currentStack={supplementStack} onSaveStack={(s) => setSupplementStack(s)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} currentUserEmail={currentUserEmail} onAuthStateChange={async () => { const { data: { session } } = await supabase.auth.getSession(); if (session?.user) { setUserId(session.user.id); setCurrentUserEmail(session.user.email || null); } else { setUserId(null); setCurrentUserEmail(null); } }} />
      <CustomFoodModal isOpen={isCustomFoodOpen} onClose={() => setIsCustomFoodOpen(false)} onFoodCreated={(f) => setFoods((prev) => [...prev, f])} />
      <CSVUploadModal isOpen={isCSVUploadOpen} onClose={() => setIsCSVUploadOpen(false)} onUploadSuccess={() => handleCalculateMeal()} />
      <ClinicalReportModal isOpen={isClinicalReportOpen} onClose={() => setIsClinicalReportOpen(false)} dietType={dietType} dailyCalories={dailyCalories} bodyWeightKg={bodyWeightKg} proteinMetrics={proteinMetrics} results={rawResults} itemsCount={items.length} totalGrams={calculatedMacros.totalWeight} pral={pralAnalysis} methylation={methylationAnalysis} />
      <AnalyticsTrendsModal isOpen={isTrendsOpen} onClose={() => setIsTrendsOpen(false)} bodyWeightKg={bodyWeightKg} />
      <FoodExclusionsModal isOpen={isExclusionsOpen} onClose={() => setIsExclusionsOpen(false)} currentRules={exclusionRules} onSaveRules={(r) => setExclusionRules(r)} />
      <TargetOverridesModal isOpen={isOverridesOpen} onClose={() => setIsOverridesOpen(false)} currentOverrides={targetOverrides} onSaveOverrides={(o) => setTargetOverrides(o)} />
      <AntinutrientSensitivityModal isOpen={isAntinutrientsOpen} onClose={() => setIsAntinutrientsOpen(false)} currentConfig={antinutrientConfig} onSaveConfig={(c) => setAntinutrientConfig(c)} />
      <WeightEstimatorModal isOpen={estimatorState.isOpen} foodName={estimatorState.foodName} category={estimatorState.category} onClose={() => setEstimatorState((p) => ({ ...p, isOpen: false, rowIndex: -1 }))} onApplyRawWeight={(w) => { if (estimatorState.rowIndex >= 0) handleUpdateItem(estimatorState.rowIndex, 'weight_grams', w); }} />
    </main>
  );
}
