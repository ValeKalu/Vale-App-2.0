// Deployment trigger v2
// ============================================================
// App.tsx — Val Health App v2 — Integration shell
// Connects: useCycleSync → TodayView, TrainingView, CycleView,
//           InsightsView, SettingsView
// Persistence: localStorage (Supabase-ready via lib/supabase.ts)
// ============================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useCycleSync } from './hooks/useCycleSync';
import { TodayView } from './components/TodayView';
import { TrainingView } from './components/TrainingView';
import { CycleView } from './components/CycleView';
import { InsightsView } from './components/InsightsView';
import { SettingsView } from './components/SettingsView';
import type { ExerciseCategory, DailyLog } from './lib/types';

// ── Types ──

type Meal = {
  key: string;
  day?: string;
  time: string;
  label: string;
  detail: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  micronote?: string;
  category?: 'template' | 'option' | 'custom';
};

type WorkoutItem = {
  name: string;
  sets: string;
  target: string;
  note?: string;
  kcal?: number;
  category: ExerciseCategory;
  supersetWith?: string;
  weekTargets?: Record<string, string>;
  weightIncrementKg: number;
  repRangeMin: number;
  repRangeMax: number;
};

type TabId = 'today' | 'training' | 'cycle' | 'insights' | 'settings';

// ── Constants ──

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const WORKOUT_DAYS = ['Monday', 'Wednesday', 'Friday'];
const STORAGE_KEY = 'val-health-app-v5';

const TAB_CONFIG: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'today', label: 'Hoy', emoji: '📋' },
  { id: 'training', label: 'Training', emoji: '🏋️' },
  { id: 'cycle', label: 'Ciclo', emoji: '🔴' },
  { id: 'insights', label: 'Insights', emoji: '📊' },
  { id: 'settings', label: 'Config', emoji: '⚙️' },
];

// ════════════════════════════════════════════════════
// MEAL DATA (from weeklyPlan — existing app data)
// ════════════════════════════════════════════════════

const weeklyMeals: Record<string, Meal[]> = {
  Monday: [
    {
      key: 'mon-brunch',
      time: '10:00',
      label: 'Bowl yogurt + banana',
      detail:
        '200g high-protein Greek yogurt + 35g oats + 10g pumpkin seeds + 10g almonds + 10g peanut butter + 60g banana',
      calories: 497,
      protein: 33,
      carbs: 49,
      fats: 19,
      micronote: 'Protein + fiber',
      category: 'template',
    },
    {
      key: 'mon-lunch',
      time: '12:30',
      label: 'Wrap 1 · Tofu + palta',
      detail:
        'Wrap 60g + tofu 130g + palta 40g + nutritional yeast 10g + tomato 50g + spinach 30g + grated carrot 30g',
      calories: 502,
      protein: 35,
      carbs: 42,
      fats: 22,
      micronote: 'Protein + healthy fats',
      category: 'template',
    },
    {
      key: 'mon-snack',
      time: '15:45',
      label: 'Whey + manzana',
      detail: '30g whey in water + 1 apple 130g',
      calories: 181,
      protein: 25,
      carbs: 18,
      fats: 1,
      category: 'template',
    },
    {
      key: 'mon-dinner',
      time: '18:30',
      label: 'Cena 1 · Stir-fry con arroz',
      detail:
        'Tofu 130g + cooked rice 140g + broccoli 100g + mushrooms 80g + carrot 50g + sesame 5g + nutritional yeast 8g',
      calories: 561,
      protein: 37,
      carbs: 53,
      fats: 22,
      micronote: 'Post-gym higher carb',
      category: 'template',
    },
  ],
  Tuesday: [
    {
      key: 'tue-brunch',
      time: '10:00',
      label: 'Bowl yogurt + berries + oat coffee',
      detail:
        '200g high-protein Greek yogurt + 35g oats + 10g pumpkin seeds + 5g peanut butter + 60g berries + 1 oat milk coffee',
      calories: 450,
      protein: 30,
      carbs: 40,
      fats: 16,
      category: 'template',
    },
    {
      key: 'tue-lunch',
      time: '12:30',
      label: 'Wrap 4 · Tofu + champiñones',
      detail:
        'Wrap 60g + tofu 120g + mushrooms 80g + onion 30g + sesame 8g + soy sauce + spinach 30g + nutritional yeast 10g',
      calories: 448,
      protein: 33,
      carbs: 39,
      fats: 18,
      category: 'template',
    },
    {
      key: 'tue-snack',
      time: '15:00',
      label: 'Whey + zanahoria + hummus',
      detail: '25g whey + carrots + hummus',
      calories: 210,
      protein: 25,
      carbs: 12,
      fats: 6,
      category: 'template',
    },
    {
      key: 'tue-dinner',
      time: '18:30',
      label: 'Cena 2 · Curry de lentejas',
      detail:
        'Red lentils 50g dry + pumpkin 150g + cooked rice 110g + parmesan 15g + nutritional yeast 10g',
      calories: 478,
      protein: 32,
      carbs: 55,
      fats: 14,
      micronote: 'Fiber + plant iron',
      category: 'template',
    },
  ],
  Wednesday: [
    {
      key: 'wed-breakfast',
      time: '08:00',
      label: 'Huevos + tostada + queso',
      detail:
        '2 eggs + 1 toast 35g + cheddar 20g + nutritional yeast 8g + tomato',
      calories: 300,
      protein: 25,
      carbs: 22,
      fats: 23,
      category: 'template',
    },
    {
      key: 'wed-post',
      time: '10:15',
      label: 'Whey + banana',
      detail: '30g whey + 1 banana',
      calories: 220,
      protein: 25,
      carbs: 24,
      fats: 1,
      category: 'template',
    },
    {
      key: 'wed-lunch',
      time: '12:30',
      label: 'Quinoa bowl post-gym',
      detail:
        'Tofu 130g + cooked quinoa 110g + edamame 60g + broccoli 80g + carrot 40g + nutritional yeast 10g',
      calories: 525,
      protein: 42,
      carbs: 43,
      fats: 21,
      category: 'template',
    },
    {
      key: 'wed-snack',
      time: '16:00',
      label: 'Cottage + berries + almendras',
      detail: 'Cottage cheese + berries + almonds',
      calories: 220,
      protein: 18,
      carbs: 14,
      fats: 10,
      category: 'template',
    },
    {
      key: 'wed-dinner',
      time: '18:30',
      label: 'Pasta con berenjena',
      detail:
        'Pasta 80g dry + tofu 120g + eggplant 150g + crushed tomato 150g + nutritional yeast 10g',
      calories: 564,
      protein: 38,
      carbs: 68,
      fats: 16,
      micronote: 'Pasta option',
      category: 'template',
    },
  ],
  Thursday: [
    {
      key: 'thu-brunch',
      time: '10:00',
      label: 'Bowl yogurt + berries + oat coffee',
      detail:
        '200g high-protein Greek yogurt + 35g oats + 10g pumpkin seeds + 5g peanut butter + 60g berries + 1 oat milk coffee',
      calories: 450,
      protein: 30,
      carbs: 40,
      fats: 16,
      category: 'template',
    },
    {
      key: 'thu-lunch',
      time: '12:30',
      label: 'Wrap 2 · Huevo + queso + hummus',
      detail:
        'Wrap 60g + 2 eggs + cheddar 25g + hummus 20g + tomato 50g + lettuce 30g + nutritional yeast 8g',
      calories: 504,
      protein: 33,
      carbs: 40,
      fats: 24,
      category: 'template',
    },
    {
      key: 'thu-snack',
      time: '15:00',
      label: 'Whey + zanahoria + hummus',
      detail: '25g whey + carrots + hummus',
      calories: 210,
      protein: 25,
      carbs: 12,
      fats: 6,
      category: 'template',
    },
    {
      key: 'thu-dinner',
      time: '18:30',
      label: 'Cena 4 · Ceviche / pescado',
      detail:
        'Fresh fish 150g + kumara 100g + palta 40g + corn 80g + tomato + red onion + cilantro + lemon',
      calories: 428,
      protein: 36,
      carbs: 49,
      fats: 10,
      micronote: 'Omega-3',
      category: 'template',
    },
  ],
  Friday: [
    {
      key: 'fri-brunch',
      time: '10:00',
      label: 'Bowl yogurt ajustado + oat coffee',
      detail:
        '200g high-protein Greek yogurt + 35g oats + 10g pumpkin seeds + 5g peanut butter + 60g berries + 1 oat milk coffee',
      calories: 430,
      protein: 30,
      carbs: 38,
      fats: 14,
      category: 'template',
    },
    {
      key: 'fri-lunch',
      time: '12:30',
      label: 'Wrap · Tofu + palta',
      detail:
        'Wrap 60g + tofu 130g + palta 40g + nutritional yeast 10g + tomato 50g + spinach 30g + carrot 30g',
      calories: 502,
      protein: 35,
      carbs: 42,
      fats: 22,
      category: 'template',
    },
    {
      key: 'fri-snack',
      time: '15:45',
      label: 'Whey + fruta pre-gym',
      detail: '30g whey + fruit',
      calories: 181,
      protein: 25,
      carbs: 18,
      fats: 1,
      category: 'template',
    },
    {
      key: 'fri-dinner',
      time: '18:30',
      label: 'Curry tailandés',
      detail:
        'Tofu 130g + rice 120g + pumpkin/kumara 100g + broccoli 60g + light coconut milk 60ml + red curry paste',
      calories: 480,
      protein: 32,
      carbs: 52,
      fats: 16,
      micronote: 'Post-gym',
      category: 'template',
    },
  ],
  Saturday: [
    {
      key: 'sat-breakfast',
      time: '08:00',
      label: 'Huevos + palta + tostada',
      detail:
        '2 eggs + bread 35g + tomato 50g + cheddar 20g + nutritional yeast 8g + palta 30g',
      calories: 300,
      protein: 25,
      carbs: 22,
      fats: 23,
      category: 'template',
    },
    {
      key: 'sat-lunch',
      time: '12:30',
      label: 'Leftovers or wrap',
      detail:
        'Use leftovers matching macros from prior dinner or standard wrap',
      calories: 450,
      protein: 30,
      carbs: 40,
      fats: 18,
      category: 'template',
    },
    {
      key: 'sat-snack',
      time: '15:00',
      label: 'Whey + zanahoria + hummus',
      detail: '25g whey + carrots + hummus',
      calories: 210,
      protein: 25,
      carbs: 12,
      fats: 6,
      category: 'template',
    },
    {
      key: 'sat-dinner',
      time: '18:30',
      label: 'Pizza casera',
      detail:
        'Homemade dough 100g + tomato sauce 80g + mozzarella 50g + mushrooms + spinach + olives + nutritional yeast',
      calories: 520,
      protein: 25,
      carbs: 58,
      fats: 20,
      micronote: 'Weekend treat',
      category: 'template',
    },
  ],
  Sunday: [
    {
      key: 'sun-breakfast',
      time: '08:00',
      label: 'Yogurt bowl completo',
      detail:
        '200g high-protein Greek yogurt + 35g oats + 10g pumpkin seeds + 10g almonds + 10g peanut butter + berries',
      calories: 430,
      protein: 30,
      carbs: 38,
      fats: 16,
      category: 'template',
    },
    {
      key: 'sun-lunch',
      time: '12:30',
      label: 'Wrap tofu + palta',
      detail:
        'Wrap 60g + tofu 130g + palta 40g + nutritional yeast 10g + tomato 50g + spinach 30g + carrot 30g',
      calories: 502,
      protein: 35,
      carbs: 42,
      fats: 22,
      category: 'template',
    },
    {
      key: 'sun-snack',
      time: '15:30',
      label: 'Cottage + berries',
      detail: 'Cottage cheese + berries',
      calories: 180,
      protein: 18,
      carbs: 10,
      fats: 6,
      category: 'template',
    },
    {
      key: 'sun-dinner',
      time: '18:30',
      label: 'Quinoa bowl',
      detail:
        'Tofu 130g + cooked quinoa 110g + edamame 60g + broccoli 80g + carrot 40g + nutritional yeast 10g',
      calories: 525,
      protein: 42,
      carbs: 43,
      fats: 21,
      category: 'template',
    },
  ],
};

// ════════════════════════════════════════════════════
// EXERCISE DATA (from workoutTemplates — with engine metadata)
// ════════════════════════════════════════════════════

const workoutExercises: Record<string, WorkoutItem[]> = {
  Monday: [
    {
      name: 'Back Squat',
      sets: '4x8-10',
      target: '35 kg',
      kcal: 45,
      category: 'heavy_compound',
      weightIncrementKg: 2.5,
      repRangeMin: 8,
      repRangeMax: 10,
      note: 'RIR 2-3',
      weekTargets: {
        'Week 1': '35 kg',
        'Week 2': '35×6 DELOAD',
        'Week 3': '35-37.5 kg',
        'Week 4': '37.5 kg',
        'Week 5': '40 kg PR',
        'Week 6': '40×10',
      },
    },
    {
      name: 'Romanian Deadlift',
      sets: '3x10',
      target: '35 kg',
      kcal: 35,
      category: 'heavy_compound',
      weightIncrementKg: 2.5,
      repRangeMin: 8,
      repRangeMax: 10,
      note: 'Hip hinge',
      weekTargets: {
        'Week 1': '35 kg',
        'Week 2': '35×8 DELOAD',
        'Week 3': '35 kg',
        'Week 4': '37.5 kg',
        'Week 5': '40 kg PR',
        'Week 6': '40×10',
      },
    },
    {
      name: 'Bulgarian Split Squat',
      sets: '3x10/l',
      target: '8 kg/m',
      kcal: 28,
      category: 'light_compound',
      supersetWith: 'Standing Calf Raise',
      weightIncrementKg: 1.0,
      repRangeMin: 10,
      repRangeMax: 12,
      weekTargets: {
        'Week 1': '8 kg/m',
        'Week 2': '8×10 DL',
        'Week 3': '8 kg',
        'Week 4': '9 kg/m',
        'Week 5': '10 kg/m',
        'Week 6': '10×12',
      },
    },
    {
      name: 'Standing Calf Raise',
      sets: '3x15',
      target: '20 kg',
      kcal: 18,
      category: 'isolation',
      supersetWith: 'Bulgarian Split Squat',
      weightIncrementKg: 5.0,
      repRangeMin: 12,
      repRangeMax: 15,
      weekTargets: {
        'Week 1': '20 kg',
        'Week 2': '20×12 DL',
        'Week 3': '20 kg',
        'Week 4': '25 kg',
        'Week 5': '30 kg',
        'Week 6': '30-35 kg',
      },
    },
    {
      name: 'DB Bicep Curl',
      sets: '3x12',
      target: '8 kg',
      kcal: 15,
      category: 'isolation',
      supersetWith: 'Tricep Pushdown',
      weightIncrementKg: 1.0,
      repRangeMin: 12,
      repRangeMax: 15,
      weekTargets: {
        'Week 1': '8×12',
        'Week 2': '8×10 DL',
        'Week 3': '8×12',
        'Week 4': '8×14',
        'Week 5': '8×15',
        'Week 6': '9×12',
      },
    },
    {
      name: 'Tricep Pushdown',
      sets: '3x12',
      target: '15 kg',
      kcal: 15,
      category: 'isolation',
      supersetWith: 'DB Bicep Curl',
      weightIncrementKg: 2.5,
      repRangeMin: 12,
      repRangeMax: 15,
      weekTargets: {
        'Week 1': '15 kg',
        'Week 2': '15×10 DL',
        'Week 3': '15 kg',
        'Week 4': '17.5 kg',
        'Week 5': '17.5-20 kg',
        'Week 6': '20 kg',
      },
    },
    {
      name: 'Lateral Raise',
      sets: '3x15',
      target: '4 kg',
      kcal: 12,
      category: 'isolation',
      supersetWith: 'Face Pull',
      weightIncrementKg: 1.0,
      repRangeMin: 15,
      repRangeMax: 18,
      weekTargets: {
        'Week 1': '4×15',
        'Week 2': '4×12 DL',
        'Week 3': '4×15',
        'Week 4': '4×17',
        'Week 5': '4×18',
        'Week 6': '5×15',
      },
    },
    {
      name: 'Face Pull',
      sets: '3x15',
      target: '15 kg',
      kcal: 12,
      category: 'isolation',
      supersetWith: 'Lateral Raise',
      weightIncrementKg: 2.5,
      repRangeMin: 12,
      repRangeMax: 15,
      weekTargets: {
        'Week 1': '15 kg',
        'Week 2': '15×12 DL',
        'Week 3': '15 kg',
        'Week 4': '17.5 kg',
        'Week 5': '17.5 kg',
        'Week 6': '20 kg',
      },
    },
    {
      name: 'Ab Wheel Rollout',
      sets: '3x8-10',
      target: 'BW',
      kcal: 10,
      category: 'isolation',
      weightIncrementKg: 0,
      repRangeMin: 8,
      repRangeMax: 12,
      note: 'From knees',
      weekTargets: {
        'Week 1': 'BW×8-10',
        'Week 2': 'BW×6 DL',
        'Week 3': 'BW×10',
        'Week 4': 'BW×12',
        'Week 5': 'BW×12',
        'Week 6': '+2.5 kg',
      },
    },
  ],
  Wednesday: [
    {
      name: 'Lat Pulldown',
      sets: '3x10',
      target: '30 kg',
      kcal: 24,
      category: 'light_compound',
      weightIncrementKg: 2.5,
      repRangeMin: 10,
      repRangeMax: 12,
      weekTargets: {
        'Week 1': '30 kg',
        'Week 2': '30×8 DL',
        'Week 3': '30 kg',
        'Week 4': '32.5 kg',
        'Week 5': '32.5-35 kg PR',
        'Week 6': '35 kg',
      },
    },
    {
      name: 'DB Incline Press',
      sets: '3x10',
      target: '8 kg/m',
      kcal: 22,
      category: 'light_compound',
      weightIncrementKg: 1.0,
      repRangeMin: 10,
      repRangeMax: 12,
      weekTargets: {
        'Week 1': '8 kg/m',
        'Week 2': '8×8 DL',
        'Week 3': '8-9 kg/m',
        'Week 4': '9 kg/m',
        'Week 5': '10 kg PR',
        'Week 6': '10 kg',
      },
    },
    {
      name: 'Cable Row',
      sets: '3x12',
      target: '20 kg',
      kcal: 20,
      category: 'light_compound',
      supersetWith: 'Rear Delt Fly',
      weightIncrementKg: 2.5,
      repRangeMin: 10,
      repRangeMax: 12,
      weekTargets: {
        'Week 1': '20 kg',
        'Week 2': '20×10 DL',
        'Week 3': '20 kg',
        'Week 4': '22.5 kg',
        'Week 5': '25 kg PR',
        'Week 6': '25 kg',
      },
    },
    {
      name: 'Rear Delt Fly',
      sets: '3x15',
      target: '3 kg/m',
      kcal: 10,
      category: 'isolation',
      supersetWith: 'Cable Row',
      weightIncrementKg: 1.0,
      repRangeMin: 12,
      repRangeMax: 15,
    },
    {
      name: 'OH Press',
      sets: '3x10',
      target: '10 kg/m',
      kcal: 18,
      category: 'light_compound',
      weightIncrementKg: 1.0,
      repRangeMin: 10,
      repRangeMax: 12,
      note: 'Seated',
      weekTargets: {
        'Week 1': '10 kg/m',
        'Week 2': '10×8 DL',
        'Week 3': '10 kg',
        'Week 4': '10×12',
        'Week 5': '11 kg PR',
        'Week 6': '11 kg',
      },
    },
    {
      name: 'Hip Thrust',
      sets: '4x12',
      target: '30 kg',
      kcal: 32,
      category: 'heavy_compound',
      weightIncrementKg: 2.5,
      repRangeMin: 10,
      repRangeMax: 12,
      note: 'Pause at top',
      weekTargets: {
        'Week 1': '30 kg',
        'Week 2': '30×10 DL',
        'Week 3': '30-32.5 kg',
        'Week 4': '35 kg',
        'Week 5': '40-42.5 PR',
        'Week 6': '42.5 kg',
      },
    },
    {
      name: 'Hammer Curl',
      sets: '3x12',
      target: '8 kg/m',
      kcal: 14,
      category: 'isolation',
      supersetWith: 'OH Tricep Extension',
      weightIncrementKg: 1.0,
      repRangeMin: 12,
      repRangeMax: 15,
    },
    {
      name: 'OH Tricep Extension',
      sets: '3x12',
      target: '8 kg',
      kcal: 14,
      category: 'isolation',
      supersetWith: 'Hammer Curl',
      weightIncrementKg: 1.0,
      repRangeMin: 12,
      repRangeMax: 15,
    },
    {
      name: 'Pallof Press',
      sets: '2x10/l',
      target: '10 kg',
      kcal: 8,
      category: 'isolation',
      weightIncrementKg: 0,
      repRangeMin: 10,
      repRangeMax: 12,
      note: 'Anti-rotation',
    },
  ],
  Friday: [
    {
      name: 'Trap Bar Deadlift',
      sets: '3x8',
      target: '45 kg',
      kcal: 42,
      category: 'heavy_compound',
      weightIncrementKg: 2.5,
      repRangeMin: 6,
      repRangeMax: 8,
      weekTargets: {
        'Week 1': '45 kg',
        'Week 2': '45×6 DL',
        'Week 3': '45 kg',
        'Week 4': '47.5 kg',
        'Week 5': '50 kg PR',
        'Week 6': '50 kg',
      },
    },
    {
      name: 'Leg Press',
      sets: '3x12',
      target: '60 kg',
      kcal: 30,
      category: 'light_compound',
      weightIncrementKg: 5.0,
      repRangeMin: 10,
      repRangeMax: 12,
      weekTargets: {
        'Week 1': '60 kg',
        'Week 2': '60×10 DL',
        'Week 3': '60 kg',
        'Week 4': '70 kg',
        'Week 5': '80 kg PR',
        'Week 6': '80-90 kg',
      },
    },
    {
      name: 'DB Row Unilateral',
      sets: '3x10/l',
      target: '10 kg',
      kcal: 20,
      category: 'light_compound',
      supersetWith: 'Push-up',
      weightIncrementKg: 1.0,
      repRangeMin: 10,
      repRangeMax: 12,
    },
    {
      name: 'Push-up',
      sets: '3xmax',
      target: 'BW',
      kcal: 16,
      category: 'light_compound',
      supersetWith: 'DB Row Unilateral',
      weightIncrementKg: 0,
      repRangeMin: 0,
      repRangeMax: 0,
      note: 'Log real reps',
    },
    {
      name: 'Lateral Raise (Fri)',
      sets: '3x15',
      target: '4 kg',
      kcal: 12,
      category: 'isolation',
      weightIncrementKg: 1.0,
      repRangeMin: 15,
      repRangeMax: 18,
    },
    {
      name: 'Seated Calf Raise',
      sets: '3x15',
      target: '20 kg',
      kcal: 16,
      category: 'isolation',
      weightIncrementKg: 5.0,
      repRangeMin: 12,
      repRangeMax: 15,
    },
    {
      name: 'EZ Curl',
      sets: '3x12',
      target: '15 kg',
      kcal: 14,
      category: 'isolation',
      supersetWith: 'Tricep Dip',
      weightIncrementKg: 2.5,
      repRangeMin: 12,
      repRangeMax: 15,
    },
    {
      name: 'Tricep Dip Assisted',
      sets: '3x10',
      target: 'BW',
      kcal: 14,
      category: 'isolation',
      supersetWith: 'EZ Curl',
      weightIncrementKg: 0,
      repRangeMin: 10,
      repRangeMax: 12,
    },
    {
      name: 'Face Pull (Fri)',
      sets: '3x15',
      target: '15 kg',
      kcal: 12,
      category: 'isolation',
      weightIncrementKg: 2.5,
      repRangeMin: 12,
      repRangeMax: 15,
    },
    {
      name: 'Hanging Knee Raise',
      sets: '3x12',
      target: 'BW',
      kcal: 10,
      category: 'isolation',
      weightIncrementKg: 0,
      repRangeMin: 10,
      repRangeMax: 15,
      note: 'Or cable crunch',
    },
  ],
};

// ════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f6f7fb',
    padding: '0 0 80px 0',
    color: '#1f2937',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '12px',
    display: 'grid',
    gap: '0',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0 12px',
  } as React.CSSProperties,
  bottomNav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '6px 0 env(safe-area-inset-bottom, 8px)',
    zIndex: 100,
  } as React.CSSProperties,
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
    cursor: 'pointer',
    padding: '4px 8px',
    border: 'none',
    background: 'none',
    fontSize: '10px',
    fontWeight: 600,
    color: '#9ca3af',
    transition: 'color 0.15s',
  } as React.CSSProperties,
  navItemActive: {
    color: '#111827',
  } as React.CSSProperties,
  daySelector: {
    display: 'flex',
    gap: '4px',
    overflowX: 'auto' as const,
    padding: '0 0 8px',
    WebkitOverflowScrolling: 'touch' as const,
  } as React.CSSProperties,
  dayButton: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '6px 12px',
    background: 'white',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  } as React.CSSProperties,
};

// ════════════════════════════════════════════════════
// APP COMPONENT
// ════════════════════════════════════════════════════

interface AppState {
  periodStartDate: string;
  periodEndDate: string;
  spottingStartDate: string;
  cycleLength: number;
  deficitStartDate: string;
  mealChecks: Record<string, boolean>;
  supplementChecks: Record<string, boolean>;
  exerciseChecks: Record<string, boolean>;
  exerciseLogs: Record<string, string>;
  flexUsed: number;
  waterIntake: Record<string, number>;
  moodLog: Record<string, { score: number; note: string }>;
  symptomLog: Record<string, string[]>;
  weightLog: Record<string, string>;
  sleepLog: Record<string, string>;
  dailyLogs: DailyLog[];
  supplementCompletionLogs: Array<{
    name: string;
    date: string;
    completed: boolean;
  }>;
}

const DEFAULT_STATE: AppState = {
  periodStartDate: '2026-04-03',
  periodEndDate: '2026-04-10',
  spottingStartDate: '2026-04-03',
  cycleLength: 31,
  deficitStartDate: '2026-04-20',
  mealChecks: {},
  supplementChecks: {},
  exerciseChecks: {},
  exerciseLogs: {},
  flexUsed: 0,
  waterIntake: {},
  moodLog: {},
  symptomLog: {},
  weightLog: {},
  sleepLog: {},
  dailyLogs: [],
  supplementCompletionLogs: [],
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Try migrating from v4
      const v4 = localStorage.getItem('val-health-app-v4');
      if (v4) {
        const parsed = JSON.parse(v4);
        return {
          ...DEFAULT_STATE,
          periodStartDate:
            parsed.periodStartDate || DEFAULT_STATE.periodStartDate,
          periodEndDate: parsed.periodEndDate || DEFAULT_STATE.periodEndDate,
          spottingStartDate:
            parsed.spottingStartDate || DEFAULT_STATE.spottingStartDate,
          mealChecks: parsed.mealChecks || {},
          supplementChecks: parsed.supplementChecks || {},
          exerciseChecks: parsed.exerciseChecks || {},
          exerciseLogs: parsed.exerciseLogs || {},
          flexUsed: parsed.flexUsed || 0,
          waterIntake: parsed.waterIntake || {},
          moodLog: parsed.moodLog || {},
          symptomLog: parsed.symptomLog || {},
          weightLog: parsed.weeklyMetrics?.weight
            ? { today: parsed.weeklyMetrics.weight }
            : {},
          sleepLog: parsed.weeklyMetrics?.sleep
            ? { today: parsed.weeklyMetrics.sleep }
            : {},
        };
      }
      return DEFAULT_STATE;
    }
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

export default function App() {
  // ── State ──
  const [state, setState] = useState<AppState>(loadState);
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return DAY_ORDER[d === 0 ? 6 : d - 1]; // Sunday = index 6
  });

  // ── Persistence ──
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // ── Updater helpers ──
  const update = useCallback(
    <K extends keyof AppState>(key: K, value: AppState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateNested = useCallback(
    <K extends keyof AppState>(key: K, subKey: string, value: unknown) => {
      setState((prev) => ({
        ...prev,
        [key]: { ...(prev[key] as Record<string, unknown>), [subKey]: value },
      }));
    },
    []
  );

  // ── Cycle sync (master hook) ──
  const sync = useCycleSync(
    state.periodStartDate,
    state.cycleLength,
    state.flexUsed
  );

  // ── Derived data for selected day ──
  const todayKey = new Date().toISOString().split('T')[0];
  const selectedDayMeals = weeklyMeals[selectedDay] || [];
  const selectedDayExercises = workoutExercises[selectedDay] || [];

  const waterToday = state.waterIntake[selectedDay] || 0;
  const moodToday = state.moodLog[selectedDay] || null;
  const symptomsToday = state.symptomLog[selectedDay] || [];
  const weightToday =
    state.weightLog[todayKey] || state.weightLog['today'] || '';
  const sleepToday = parseFloat(state.sleepLog[todayKey] || '7.5');

  // ── Build recent DailyLogs for alerts/insights ──
  const recentLogs = useMemo<DailyLog[]>(() => {
    // Build from state data (lightweight — real app would query Supabase)
    const logs: DailyLog[] = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = DAY_ORDER[d.getDay() === 0 ? 6 : d.getDay() - 1];

      const dayMeals = weeklyMeals[dayName] || [];
      const checked = dayMeals.filter(
        (m) => state.mealChecks[`meal-${dayName}-${m.key}`]
      );

      const mood = state.moodLog[dayName];
      const symptoms = state.symptomLog[dayName] || [];
      const water = state.waterIntake[dayName] || 0;
      const weight = state.weightLog[dateStr];

      logs.push({
        date: dateStr,
        caloriesConsumed: checked.reduce((a, m) => a + m.calories, 0),
        proteinConsumed: checked.reduce((a, m) => a + m.protein, 0),
        carbsConsumed: checked.reduce((a, m) => a + m.carbs, 0),
        fatConsumed: checked.reduce((a, m) => a + m.fats, 0),
        weightKg: weight ? parseFloat(weight) : undefined,
        sleepHours: state.sleepLog[dateStr]
          ? parseFloat(state.sleepLog[dateStr])
          : undefined,
        sleepQuality: undefined,
        energyLevel: undefined,
        moodScore: mood?.score,
        waterMl: water,
        symptoms,
        cycleDay: sync.cycleDay - i,
        cyclePhase: sync.phase,
      });
    }
    return logs;
  }, [state, sync.cycleDay, sync.phase]);

  // ── Computed exercise kcal for today ──
  const todayExerciseKcal = useMemo(() => {
    const exercises = workoutExercises[selectedDay] || [];
    return exercises
      .filter(
        (ex) =>
          state.exerciseChecks[
            `ex-${selectedDay}-planned-${selectedDay}-${ex.name}`
          ]
      )
      .reduce((a, ex) => a + (ex.kcal ?? 0), 0);
  }, [selectedDay, state.exerciseChecks]);

  const todayCalories = useMemo(() => {
    const meals = weeklyMeals[selectedDay] || [];
    return meals
      .filter((m) => state.mealChecks[`meal-${selectedDay}-${m.key}`])
      .reduce((a, m) => a + m.calories, 0);
  }, [selectedDay, state.mealChecks]);

  // ════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>Val Health</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {sync.phaseEmoji} {sync.phaseLabel} · Día {sync.cycleDay} ·{' '}
              {sync.trainingWeek.weekLabel}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {new Date().toLocaleDateString('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </div>
          </div>
        </div>

        {/* ── Day selector (for Today + Training tabs) ── */}
        {(activeTab === 'today' || activeTab === 'training') && (
          <div style={styles.daySelector}>
            {DAY_ORDER.map((day) => {
              const isToday =
                day ===
                DAY_ORDER[
                  new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
                ];
              const isSelected = day === selectedDay;
              const isGym = WORKOUT_DAYS.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    ...styles.dayButton,
                    background: isSelected ? '#111827' : 'white',
                    color: isSelected ? 'white' : '#1f2937',
                    borderColor: isSelected
                      ? '#111827'
                      : isToday
                      ? '#3b82f6'
                      : '#e5e7eb',
                  }}
                >
                  {day.slice(0, 3)}
                  {isGym && (
                    <span style={{ marginLeft: '2px', fontSize: '10px' }}>
                      🏋️
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Tab Content ── */}
        {activeTab === 'today' && (
          <TodayView
            sync={sync}
            meals={selectedDayMeals}
            mealChecks={state.mealChecks}
            onMealCheck={(key) => {
              update('mealChecks', {
                ...state.mealChecks,
                [key]: !state.mealChecks[key],
              });
            }}
            supplementChecks={state.supplementChecks}
            onSupplementCheck={(key) => {
              update('supplementChecks', {
                ...state.supplementChecks,
                [key]: !state.supplementChecks[key],
              });
              // Track for insights
              const suppName = key.replace(`supp-${selectedDay}-`, '');
              const newLog = {
                name: suppName,
                date: todayKey,
                completed: !state.supplementChecks[key],
              };
              update('supplementCompletionLogs', [
                ...state.supplementCompletionLogs,
                newLog,
              ]);
            }}
            waterMl={waterToday}
            onWaterAdd={(ml) => {
              updateNested('waterIntake', selectedDay, waterToday + ml);
            }}
            moodScore={moodToday?.score ?? null}
            moodNote={moodToday?.note ?? ''}
            onMoodChange={(score, note) => {
              updateNested('moodLog', selectedDay, { score, note });
            }}
            symptoms={symptomsToday}
            onSymptomsChange={(syms) => {
              updateNested('symptomLog', selectedDay, syms);
            }}
            weightKg={weightToday}
            onWeightChange={(val) => {
              updateNested('weightLog', todayKey, val);
            }}
          />
        )}

        {activeTab === 'training' && (
          <TrainingView
            sync={sync}
            exercises={selectedDayExercises}
            exerciseChecks={state.exerciseChecks}
            exerciseLogs={state.exerciseLogs}
            onExerciseCheck={(key) => {
              update('exerciseChecks', {
                ...state.exerciseChecks,
                [key]: !state.exerciseChecks[key],
              });
            }}
            onExerciseLog={(key, value) => {
              update('exerciseLogs', { ...state.exerciseLogs, [key]: value });
            }}
            sleepHours={sleepToday}
            deficitWeeks={Math.floor(
              (Date.now() - new Date(state.deficitStartDate).getTime()) /
                (7 * 86_400_000)
            )}
            onMoveWorkout={() => {}}
            movedWorkouts={{}}
          />
        )}

        {activeTab === 'cycle' && (
          <CycleView
            sync={sync}
            periodStartDate={state.periodStartDate}
            onPeriodStartChange={(date) => update('periodStartDate', date)}
            periodEndDate={state.periodEndDate}
            spottingStartDate={state.spottingStartDate}
            recentLogs={recentLogs}
            deficitStartDate={state.deficitStartDate}
            ferritinLevel={18}
            todayCalories={todayCalories}
            todayExerciseKcal={todayExerciseKcal}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView
            recentLogs={recentLogs}
            supplementLogs={state.supplementCompletionLogs}
            targetWeight={60}
            targetProtein={sync.targets.proteinG}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            sync={sync}
            periodStartDate={state.periodStartDate}
            onPeriodStartChange={(date) => update('periodStartDate', date)}
            periodEndDate={state.periodEndDate}
            onPeriodEndChange={(date) => update('periodEndDate', date)}
            spottingStartDate={state.spottingStartDate}
            onSpottingStartChange={(date) => update('spottingStartDate', date)}
            cycleLength={state.cycleLength}
            onCycleLengthChange={(len) => update('cycleLength', len)}
            deficitStartDate={state.deficitStartDate}
            onDeficitStartChange={(date) => update('deficitStartDate', date)}
            currentWeight={weightToday || '73'}
            targetWeight={60}
            onExportData={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `val-health-export-${todayKey}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            onResetData={() => {
              setState(DEFAULT_STATE);
              localStorage.removeItem(STORAGE_KEY);
            }}
          />
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <div style={styles.bottomNav}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.navItem,
              ...(activeTab === tab.id ? styles.navItemActive : {}),
            }}
          >
            <span style={{ fontSize: '20px' }}>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
