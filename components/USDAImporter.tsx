'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

interface DbFood {
  id: string;
  name: string;
}

interface UsdaFood {
  fdc_id: string;
  description: string;
}

interface UsdaNutrientMeta {
  id: string;
  name: string;
  unit_name?: string;
}

interface UsdaFoodNutrient {
  fdc_id: string;
  nutrient_id: string;
  amount: string;
}

interface NutrientMeta {
  name: string;
  unit: string;
}

interface UsdaCandidate {
  fdcId: string;
  description: string;
  nutrientCount: number;
  score: number;
}

interface MatchRow {
  dbFood: DbFood;
  candidates: UsdaCandidate[];
  selectedFdcId: string;
  status: 'pending' | 'saved' | 'skipped' | 'error';
}

interface MicronutrientInsert {
  food_id: string;
  nutrient_name: string;
  chemical_form: string;
  nutrient_category: string;
  amount_per_100g: number;
  unit: string;
}

export default function USDAImporter() {
  const [foodFile, setFoodFile] = useState<File | null>(null);
  const [nutrientMetaFile, setNutrientMetaFile] = useState<File | null>(null);
  const [foodNutrientFile, setFoodNutrientFile] = useState<File | null>(null);

  const [matchRows, setMatchRows] = useState<MatchRow[]>([]);

  const [nutrientLookup, setNutrientLookup] = useState<
    Map<string, UsdaFoodNutrient[]>
  >(new Map());

  const [nutrientMap, setNutrientMap] = useState<
    Map<string, NutrientMeta>
  >(new Map());

  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusLog, setStatusLog] = useState('');

  /**
   * Parse a USDA CSV file.
   */
  const parseCsvFile = <T,>(file: File): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse<T>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  /**
   * Categorize USDA nutrients into the application's categories.
   */
  const categorizeNutrient = (name: string): string => {
    const n = name.toLowerCase();

    if (
      ['energy', 'protein', 'total lipid', 'carbohydrate'].some((m) =>
        n.includes(m)
      )
    ) {
      return 'macro';
    }

    if (
      ['vitamin a', 'vitamin d', 'vitamin e', 'vitamin k'].some((m) =>
        n.includes(m)
      )
    ) {
      return 'fat_soluble_vitamin';
    }

    if (
      [
        'thiamin',
        'riboflavin',
        'niacin',
        'pantothenic',
        'vitamin b',
        'folate',
        'choline',
        'vitamin c',
        'biotin',
      ].some((m) => n.includes(m))
    ) {
      return 'water_soluble_vitamin';
    }

    if (
      ['calcium', 'magnesium', 'phosphorus', 'potassium', 'sodium'].some(
        (m) => n.includes(m)
      )
    ) {
      return 'macro_mineral';
    }

    return 'trace_mineral';
  };

  /**
   * Normalize food names before matching.
   */
  const tokenizeFoodName = (name: string): string[] => {
    return name
      .toLowerCase()
      .replace(/[\(\)\/\,\%\d\-\_]/g, ' ')
      .split(/\s+/)
      .filter(
        (token) =>
          token.length > 2 &&
          ![
            'raw',
            'fresh',
            'canned',
            'cooked',
            'frozen',
            'with',
            'and',
            'the',
          ].includes(token)
      );
  };

  /**
   * Analyze database foods and find the best USDA candidates.
   */
  const handleAnalyze = async () => {
    if (!foodFile || !nutrientMetaFile || !foodNutrientFile) {
      alert('Please upload all 3 files first.');
      return;
    }

    setIsParsing(true);
    setStatusLog('Reading database foods and indexing USDA CSVs...');

    try {
      // ------------------------------------------------------------
      // 1. Load existing application foods
      // ------------------------------------------------------------

      const { data: dbFoods, error: dbError } = await supabase
        .from('foods')
        .select('id, name');

      if (dbError) {
        throw new Error(dbError.message);
      }

      if (!dbFoods) {
        throw new Error('Failed to fetch foods.');
      }

      // ------------------------------------------------------------
      // 2. Parse USDA CSV files
      // ------------------------------------------------------------

      setStatusLog('Parsing USDA food.csv...');

      const usdaFoods = await parseCsvFile<UsdaFood>(foodFile);

      setStatusLog(
        `Parsed ${usdaFoods.length.toLocaleString()} USDA foods. Parsing nutrient metadata...`
      );

      const usdaNutrientMeta =
        await parseCsvFile<UsdaNutrientMeta>(nutrientMetaFile);

      setStatusLog(
        `Parsed ${usdaNutrientMeta.length.toLocaleString()} nutrient definitions. Parsing food nutrients...`
      );

      const usdaFoodNutrients =
        await parseCsvFile<UsdaFoodNutrient>(foodNutrientFile);

      // ------------------------------------------------------------
      // 3. Build nutrient metadata lookup
      // ------------------------------------------------------------

      const nMap = new Map<string, NutrientMeta>();

      for (const n of usdaNutrientMeta) {
        if (!n.id) continue;

        nMap.set(String(n.id).trim(), {
          name: String(n.name || '').trim(),
          unit: String(n.unit_name || 'mg').trim().toLowerCase(),
        });
      }

      setNutrientMap(nMap);

      // ------------------------------------------------------------
      // 4. Build FDC ID -> nutrients lookup
      // ------------------------------------------------------------

      const nLookup = new Map<string, UsdaFoodNutrient[]>();

      for (const row of usdaFoodNutrients) {
        const fdcId = String(row.fdc_id || '').trim();

        if (!fdcId) continue;

        if (!nLookup.has(fdcId)) {
          nLookup.set(fdcId, []);
        }

        nLookup.get(fdcId)!.push(row);
      }

      setNutrientLookup(nLookup);

      // ------------------------------------------------------------
      // 5. Only keep USDA foods that actually have nutrients
      // ------------------------------------------------------------

      const validUsda = usdaFoods.filter((u) => {
        const id = String(u.fdc_id || '').trim();

        return (nLookup.get(id)?.length || 0) > 0;
      });

      // ------------------------------------------------------------
      // 6. Match each database food against USDA foods
      // ------------------------------------------------------------

      const rows: MatchRow[] = dbFoods.map((food) => {
        const tokens = tokenizeFoodName(food.name);

        const scored: UsdaCandidate[] = validUsda
          .map((u) => {
            const fdcId = String(u.fdc_id).trim();
            const description = String(u.description || '');
            const desc = description.toLowerCase();

            const hits = tokens.filter((token) =>
              desc.includes(token)
            ).length;

            const nutrientCount = nLookup.get(fdcId)?.length || 0;

            /**
             * Matching score:
             *
             * - 30 points per matching word
             * - Up to 30 points for nutrient completeness
             * - Small penalty for excessively long descriptions
             */
            const score =
              hits * 30 +
              Math.min(nutrientCount, 30) -
              desc.length * 0.1;

            return {
              fdcId,
              description,
              nutrientCount,
              score,
            };
          })
          .filter((candidate) => candidate.score > 10)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        return {
          dbFood: food,
          candidates: scored,
          selectedFdcId: scored[0]?.fdcId || '',
          status: 'pending',
        };
      });

      setMatchRows(rows);

      setStatusLog(
        `Indexed ${dbFoods.length.toLocaleString()} foods. Review the matches below, then click "Save Confirmed Foods".`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';

      setStatusLog(`Error: ${message}`);
    } finally {
      setIsParsing(false);
    }
  };

  /**
   * Change the selected USDA candidate.
   */
  const handleSelectionChange = (
    foodId: string,
    fdcId: string
  ) => {
    setMatchRows((prev) =>
      prev.map((row) => {
        if (row.dbFood.id !== foodId) {
          return row;
        }

        return {
          ...row,
          selectedFdcId: fdcId,
          status: fdcId === 'skip' ? 'skipped' : 'pending',
        };
      })
    );
  };

  /**
   * Save all confirmed foods to Supabase.
   */
  const handleSaveAll = async () => {
    if (matchRows.length === 0) {
      return;
    }

    setIsSaving(true);

    let savedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      for (const row of matchRows) {
        // ----------------------------------------------------------
        // Skip rows explicitly marked as skip
        // ----------------------------------------------------------

        if (!row.selectedFdcId || row.selectedFdcId === 'skip') {
          skippedCount++;

          setMatchRows((prev) =>
            prev.map((r) =>
              r.dbFood.id === row.dbFood.id
                ? { ...r, status: 'skipped' }
                : r
            )
          );

          continue;
        }

        try {
          // --------------------------------------------------------
          // Get all USDA nutrients for selected food
          // --------------------------------------------------------

          const nutrs =
            nutrientLookup.get(row.selectedFdcId) || [];

          if (nutrs.length === 0) {
            throw new Error(
              `No nutrients found for USDA FDC ID ${row.selectedFdcId}`
            );
          }

          const insertsByName = new Map<
            string,
            MicronutrientInsert
          >();

          let kcal = 0;
          let prot = 0;
          let fat = 0;
          let carbs = 0;

          // --------------------------------------------------------
          // Convert USDA nutrient rows into application rows
          // --------------------------------------------------------

          for (const nRow of nutrs) {
            const meta = nutrientMap.get(
              String(nRow.nutrient_id).trim()
            );

            const amount = Number.parseFloat(
              String(nRow.amount)
            );

            if (!meta || Number.isNaN(amount)) {
              continue;
            }

            const nNameLower = meta.name.toLowerCase();

            // ------------------------------------------------------
            // Macros
            // ------------------------------------------------------

            if (
              nNameLower.includes('energy') &&
              meta.unit === 'kcal'
            ) {
              kcal = amount;
            }

            if (nNameLower === 'protein') {
              prot = amount;
            }

            if (nNameLower.includes('total lipid')) {
              fat = amount;
            }

            if (
              nNameLower.includes(
                'carbohydrate, by difference'
              )
            ) {
              carbs = amount;
            }

            // ------------------------------------------------------
            // Micronutrients
            // ------------------------------------------------------

            if (!insertsByName.has(meta.name)) {
              insertsByName.set(meta.name, {
                food_id: row.dbFood.id,
                nutrient_name: meta.name,
                chemical_form: 'USDA FoodData Central',
                nutrient_category: categorizeNutrient(
                  meta.name
                ),
                amount_per_100g: amount,
                unit: meta.unit,
              });
            }
          }

          // --------------------------------------------------------
          // Update macro values on foods table
          // --------------------------------------------------------

          const { error: foodUpdateError } = await supabase
            .from('foods')
            .update({
              calories_per_100g: kcal,
              protein_per_100g: prot,
              fat_per_100g: fat,
              carbs_per_100g: carbs,
            })
            .eq('id', row.dbFood.id);

          if (foodUpdateError) {
            throw new Error(
              `Failed updating ${row.dbFood.name}: ${foodUpdateError.message}`
            );
          }

          // --------------------------------------------------------
          // Replace micronutrient profile
          // --------------------------------------------------------

          const { error: deleteError } = await supabase
            .from('food_micronutrients')
            .delete()
            .eq('food_id', row.dbFood.id);

          if (deleteError) {
            throw new Error(
              `Failed deleting old micronutrients for ${row.dbFood.name}: ${deleteError.message}`
            );
          }

          const payload = Array.from(
            insertsByName.values()
          );

          if (payload.length > 0) {
            const { error: insertError } = await supabase
              .from('food_micronutrients')
              .insert(payload);

            if (insertError) {
              throw new Error(
                `Failed inserting micronutrients for ${row.dbFood.name}: ${insertError.message}`
              );
            }
          }

          // --------------------------------------------------------
          // Mark saved
          // --------------------------------------------------------

          savedCount++;

          setMatchRows((prev) =>
            prev.map((r) =>
              r.dbFood.id === row.dbFood.id
                ? { ...r, status: 'saved' }
                : r
            )
          );
        } catch (error) {
          errorCount++;

          setMatchRows((prev) =>
            prev.map((r) =>
              r.dbFood.id === row.dbFood.id
                ? { ...r, status: 'error' }
                : r
            )
          );

          console.error(
            `Failed saving ${row.dbFood.name}:`,
            error
          );
        }
      }

      setStatusLog(
        `Finished. Saved: ${savedCount} | Skipped: ${skippedCount} | Errors: ${errorCount}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-slate-800 bg-slate-950 p-6 text-white">
      {/* ---------------------------------------------------------- */}
      {/* Header                                                     */}
      {/* ---------------------------------------------------------- */}

      <div>
        <h2 className="text-xl font-semibold">
          Interactive USDA Ingestion Reviewer
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Load the 3 USDA CSVs to review and confirm the
          exact match for each of your database foods.
        </p>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* File uploads                                                */}
      {/* ---------------------------------------------------------- */}

      <div className="grid gap-4 md:grid-cols-3">
        {/* food.csv */}

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <label className="mb-2 block text-sm font-medium">
            1. food.csv
          </label>

          <input
            type="file"
            accept=".csv"
            onChange={(e) =>
              setFoodFile(e.target.files?.[0] || null)
            }
            className="w-full text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-white"
          />

          {foodFile && (
            <p className="mt-2 truncate text-xs text-green-400">
              {foodFile.name}
            </p>
          )}
        </div>

        {/* nutrient.csv */}

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <label className="mb-2 block text-sm font-medium">
            2. nutrient.csv
          </label>

          <input
            type="file"
            accept=".csv"
            onChange={(e) =>
              setNutrientMetaFile(
                e.target.files?.[0] || null
              )
            }
            className="w-full text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-white"
          />

          {nutrientMetaFile && (
            <p className="mt-2 truncate text-xs text-green-400">
              {nutrientMetaFile.name}
            </p>
          )}
        </div>

        {/* food_nutrient.csv */}

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <label className="mb-2 block text-sm font-medium">
            3. food_nutrient.csv
          </label>

          <input
            type="file"
            accept=".csv"
            onChange={(e) =>
              setFoodNutrientFile(
                e.target.files?.[0] || null
              )
            }
            className="w-full text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-white"
          />

          {foodNutrientFile && (
            <p className="mt-2 truncate text-xs text-green-400">
              {foodNutrientFile.name}
            </p>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Analyze button                                              */}
      {/* ---------------------------------------------------------- */}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={
          isParsing ||
          isSaving ||
          !foodFile ||
          !nutrientMetaFile ||
          !foodNutrientFile
        }
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isParsing
          ? 'Analyzing CSVs...'
          : 'Scan & Prepare Matches'}
      </button>

      {/* ---------------------------------------------------------- */}
      {/* Status                                                      */}
      {/* ---------------------------------------------------------- */}

      {statusLog && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          {statusLog}
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Save button                                                 */}
      {/* ---------------------------------------------------------- */}

      {matchRows.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-400">
            {matchRows.length.toLocaleString()} foods found
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? 'Writing to Database...'
              : 'Save Confirmed Foods to Supabase'}
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Matching table                                              */}
      {/* ---------------------------------------------------------- */}

      {matchRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  Your Database Food
                </th>

                <th className="px-4 py-3 font-semibold">
                  Matched USDA Reference
                </th>

                <th className="px-4 py-3 font-semibold">
                  Nutrients
                </th>

                <th className="px-4 py-3 font-semibold">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {matchRows.map((row) => (
                <tr
                  key={row.dbFood.id}
                  className="bg-slate-950 hover:bg-slate-900"
                >
                  {/* Database food */}

                  <td className="px-4 py-4 align-top">
                    <div className="font-medium text-white">
                      {row.dbFood.name}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      ID: {row.dbFood.id}
                    </div>
                  </td>

                  {/* Candidate selector */}

                  <td className="px-4 py-4 align-top">
                    {row.candidates.length > 0 ? (
                      <select
                        value={row.selectedFdcId}
                        onChange={(e) =>
                          handleSelectionChange(
                            row.dbFood.id,
                            e.target.value
                          )
                        }
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                      >
                        <option value="skip">
                          -- Skip this food --
                        </option>

                        {row.candidates.map(
                          (candidate) => (
                            <option
                              key={candidate.fdcId}
                              value={candidate.fdcId}
                            >
                              {candidate.description} —{' '}
                              {candidate.nutrientCount}{' '}
                              nutrients
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <div className="text-sm text-red-400">
                        No close candidate found in dataset.
                      </div>
                    )}
                  </td>

                  {/* Nutrient count */}

                  <td className="px-4 py-4 align-top">
                    {row.selectedFdcId &&
                    row.selectedFdcId !== 'skip' ? (
                      <span className="text-slate-300">
                        {row.candidates.find(
                          (candidate) =>
                            candidate.fdcId ===
                            row.selectedFdcId
                        )?.nutrientCount ?? 0}
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        —
                      </span>
                    )}
                  </td>

                  {/* Status */}

                  <td className="px-4 py-4 align-top">
                    {row.status === 'pending' && (
                      <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-400">
                        Pending
                      </span>
                    )}

                    {row.status === 'saved' && (
                      <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
                        Saved
                      </span>
                    )}

                    {row.status === 'skipped' && (
                      <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-xs text-slate-400">
                        Skipped
                      </span>
                    )}

                    {row.status === 'error' && (
                      <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-400">
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}