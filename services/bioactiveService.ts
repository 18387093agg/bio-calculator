import { SupabaseClient } from '@supabase/supabase-js';
import { MealItemInput, MealBioactiveOutput } from '@/types/bioavailability';
import { calculateMealAction } from '@/app/actions/meal-actions';

export async function calculateMealBioactiveProfile(
  _supabase: SupabaseClient<any> | any,
  items: MealItemInput[]
): Promise<MealBioactiveOutput[]> {
  const result = await calculateMealAction(items);
  if (!result.success) {
    throw new Error(result.error || 'Failed to calculate bioactive profile');
  }
  return result.data ?? [];
}
