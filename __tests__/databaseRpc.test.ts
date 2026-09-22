import { describe, it, expect } from 'vitest';
import { calculateMealAction } from '../app/actions/meal-actions';

describe('Database RPC Live Integration Test', () => {
  it('successfully executes calculate_meal_bioactive_profile on live Supabase', async () => {
    const meal = [
      { food_name: 'Pastured Egg Yolk (Raw)', preparation_method: 'Raw', weight_grams: 40 },
      { food_name: 'Beef Liver (Raw/Fresh)', preparation_method: 'Raw', weight_grams: 20 },
    ];

    const result = await calculateMealAction(meal, 'carnivore', 2500);

    // Επαλήθευση ότι το RPC απαντά επιτυχώς
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data!.length).toBeGreaterThan(0);

    // Επαλήθευση ότι επιστρέφονται κρίσιμα θρεπτικά συστατικά
    const nutrientNames = result.data!.map((n) => n.nutrient_name.toLowerCase());
    const hasKeyNutrient = nutrientNames.some((n) => n.includes('vitamin a') || n.includes('iron') || n.includes('zinc'));
    expect(hasKeyNutrient).toBe(true);
  });
});