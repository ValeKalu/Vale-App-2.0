// ============================================================
// lib/mealEngine.ts — Meal selection & swap engine
// Sources: Val Data Master §3, Research Doc Bloque 6
// ============================================================

import type { CyclePhase } from './types';

export interface MealTemplate {
  id?: string;
  mealKey: string;
  dayOfWeek: string;
  timeSlot: string;
  label: string;
  detail: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  micronote?: string;
  category: 'template' | 'option' | 'custom';
  sortOrder: number;
}

export interface DayMealPlan {
  dayOfWeek: string;
  isGymDay: boolean;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: MealTemplate[];
  selectedMeals: MealTemplate[]; // after resolving options
  totals: MacroTotals;
  deficit: number;
  phaseNote: string;
}

interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const GYM_DAYS = ['Monday', 'Wednesday', 'Friday'];

/**
 * Resolve meal options for a day.
 * For each time slot that has multiple options, pick the first template
 * or the specified selection. Returns the resolved meal list.
 */
export function resolveMealSelections(
  allMeals: MealTemplate[],
  selections: Record<string, string> // timeSlot → selected mealKey
): MealTemplate[] {
  // Group by time slot
  const byTime: Record<string, MealTemplate[]> = {};
  for (const meal of allMeals) {
    const key = meal.timeSlot;
    if (!byTime[key]) byTime[key] = [];
    byTime[key].push(meal);
  }

  const resolved: MealTemplate[] = [];

  for (const [timeSlot, meals] of Object.entries(byTime)) {
    const templates = meals.filter((m) => m.category === 'template');
    const options = meals.filter((m) => m.category === 'option');
    const customs = meals.filter((m) => m.category === 'custom');

    // Templates are always included
    resolved.push(...templates);
    resolved.push(...customs);

    // For options: pick the selected one, or the first if none selected
    if (options.length > 0) {
      const selectedKey = selections[timeSlot];
      const selected =
        options.find((o) => o.mealKey === selectedKey) ?? options[0];
      resolved.push(selected);
    }
  }

  return resolved.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Calculate macro totals for a list of meals.
 */
export function calculateTotals(meals: MealTemplate[]): MacroTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.proteinG,
      carbs: acc.carbs + m.carbsG,
      fat: acc.fat + m.fatG,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Check if a meal swap is macro-compatible.
 * Allows ±15% calorie difference and ±10g protein.
 */
export function canSwapMeals(
  mealA: MealTemplate,
  mealB: MealTemplate
): { compatible: boolean; reason: string } {
  const calDiff = Math.abs(mealA.calories - mealB.calories);
  const protDiff = Math.abs(mealA.proteinG - mealB.proteinG);
  const calThreshold = Math.max(mealA.calories, mealB.calories) * 0.15;

  if (calDiff > calThreshold) {
    return {
      compatible: false,
      reason: `Calorie difference ${calDiff} kcal exceeds 15% threshold (${Math.round(
        calThreshold
      )}).`,
    };
  }
  if (protDiff > 10) {
    return {
      compatible: false,
      reason: `Protein difference ${protDiff}g exceeds 10g threshold.`,
    };
  }
  return { compatible: true, reason: 'Macro-compatible swap.' };
}

/**
 * Suggest meal swaps for a given meal from other days.
 * Returns compatible alternatives sorted by calorie similarity.
 */
export function suggestSwaps(
  targetMeal: MealTemplate,
  allMeals: MealTemplate[],
  excludeDay: string
): MealTemplate[] {
  return allMeals
    .filter(
      (m) => m.dayOfWeek !== excludeDay && m.mealKey !== targetMeal.mealKey
    )
    .filter((m) => canSwapMeals(targetMeal, m).compatible)
    .sort(
      (a, b) =>
        Math.abs(a.calories - targetMeal.calories) -
        Math.abs(b.calories - targetMeal.calories)
    )
    .slice(0, 5);
}

/**
 * Get phase-specific meal notes/recommendations.
 */
export function getPhaseMealNotes(phase: CyclePhase): {
  note: string;
  priorityFoods: string[];
  avoidOrLimit: string[];
} {
  switch (phase) {
    case 'menstrual':
      return {
        note: 'Iron-rich foods prioritized. Anti-inflammatory meals. Warm food may help cramps.',
        priorityFoods: [
          'lentils',
          'spinach',
          'tofu',
          'pumpkin seeds',
          'dark chocolate',
        ],
        avoidOrLimit: ['excessive caffeine (max before 14:00)'],
      };
    case 'follicular':
      return {
        note: 'Best insulin sensitivity. Higher carb tolerance. Good time to batch-prep.',
        priorityFoods: ['complex carbs pre-workout', 'quinoa', 'sweet potato'],
        avoidOrLimit: [],
      };
    case 'ovulatory':
      return {
        note: 'Peak energy. +5g protein. Extra hydration. Do not under-eat.',
        priorityFoods: ['high-protein options', 'hydrating foods'],
        avoidOrLimit: [],
      };
    case 'luteal_early':
      return {
        note: 'Distribute carbs evenly. Avoid glucose spikes. Pre-approved snacks ready.',
        priorityFoods: ['yogurt + fruit', 'nuts', 'complex carbs'],
        avoidOrLimit: ['simple sugars on empty stomach'],
      };
    case 'luteal_late':
      return {
        note: 'FLEX COMPLETO. +80 kcal justified by RMR increase. Cravings are physiological. NO CULPA.',
        priorityFoods: [
          'complex carbs',
          'chocolate (within flex)',
          'magnesium-rich foods',
        ],
        avoidOrLimit: [],
      };
  }
}

/**
 * Check protein compliance for the day.
 * Source: Morton 2018 — minimum 1.6 g/kg for MPS in deficit.
 */
export function checkProteinCompliance(
  consumedG: number,
  targetG: number,
  weightKg: number
): {
  hit: boolean;
  percent: number;
  message: string;
  severity: 'green' | 'yellow' | 'red';
} {
  const percent = Math.round((consumedG / targetG) * 100);
  const minimumG = Math.round(weightKg * 1.6); // absolute floor

  if (consumedG >= targetG) {
    return {
      hit: true,
      percent,
      message: `${consumedG}g ✓`,
      severity: 'green',
    };
  }
  if (consumedG >= minimumG) {
    return {
      hit: false,
      percent,
      message: `${consumedG}g / ${targetG}g (${percent}%). Above minimum ${minimumG}g.`,
      severity: 'yellow',
    };
  }
  return {
    hit: false,
    percent,
    message: `${consumedG}g / ${targetG}g (${percent}%). BELOW minimum ${minimumG}g. Add whey shake.`,
    severity: 'red',
  };
}

/**
 * Calculate how much flex budget remains for the week.
 * Val's flex: phase-dependent. Luteal late gets automatic +150 kcal/day.
 */
export function getFlexBudget(
  phase: CyclePhase,
  usedThisWeek: number
): { remaining: number; weeklyTotal: number; note: string } {
  let weeklyFlex: number;
  let note: string;

  switch (phase) {
    case 'luteal_late':
      weeklyFlex = 1050; // 150/day × 7
      note =
        'Luteal late: +150 kcal/day flex built into targets. Extra flex for cravings.';
      break;
    case 'luteal_early':
      weeklyFlex = 500;
      note = 'Moderate flex. Antojos may start.';
      break;
    default:
      weeklyFlex = 350; // ~50/day
      note = 'Standard flex allowance.';
  }

  return {
    remaining: Math.max(0, weeklyFlex - usedThisWeek),
    weeklyTotal: weeklyFlex,
    note,
  };
}
