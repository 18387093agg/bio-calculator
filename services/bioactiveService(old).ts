import { SupabaseClient } from '@supabase/supabase-js';
import { MealItemInput, MealBioactiveOutput } from '@/types/bioavailability';

export async function calculateMealBioactiveProfile(
  supabase: SupabaseClient | any,
  items: MealItemInput[]
): Promise<MealBioactiveOutput[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const sanitizedItems: MealItemInput[] = items.map((item) => ({
    food_name: item.food_name.trim(),
    preparation_method: item.preparation_method.trim(),
    weight_grams: Number(item.weight_grams) || 0,
  }));

  const { data, error } = await supabase.rpc(
    'calculate_meal_bioactive_profile',
    { p_items: sanitizedItems } as any
  );

  if (error) {
    console.error('Error executing calculate_meal_bioactive_profile RPC:', error);
    throw new Error(`Failed to calculate bioactive profile: ${error.message}`);
  }

  return (data as MealBioactiveOutput[]) ?? [];
}