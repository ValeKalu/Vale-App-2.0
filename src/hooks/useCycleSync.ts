// ============================================================
// hooks/useCycleSync.ts — Master hook that derives all daily
// state from period start date. Connects all engines.
// ============================================================

import { useMemo } from 'react';
import {
  getCycleDay,
  getPhase,
  getDailyTargets,
  getTrainingWeek,
  predictNextPeriod,
  isGymDay,
  getAdjustedCalories,
  getSleepAdjustment,
  getEffectiveVolumeMultiplier,
} from '../lib/cycleEngine';
import {
  getSupplementSchedule,
  getFullDaySupplements,
  checkInteractionConflicts,
} from '../lib/supplementEngine';
import { getPhaseMealNotes, getFlexBudget } from '../lib/mealEngine';
import type {
  CyclePhase,
  DailyTargets,
  SupplementScheduleItem,
} from '../lib/types';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface CycleSyncState {
  // Cycle
  cycleDay: number;
  phase: CyclePhase;
  phaseLabel: string;
  phaseEmoji: string;
  daysUntilNextPeriod: number;
  nextPeriodDate: string;

  // Nutrition targets (phase + day-type adjusted)
  targets: DailyTargets;
  adjustedCalories: number;
  calorieNote: string;

  // Training
  trainingWeek: {
    weekNumber: number;
    weekLabel: string;
    strategy: string;
    note: string;
  };
  isTrainingDay: boolean;
  dayOfWeek: string;

  // Supplements
  supplements: SupplementScheduleItem[];
  supplementWarnings: string[];
  ironDay: boolean;
  criticalSupplementCount: number;

  // Meal context
  mealNotes: {
    note: string;
    priorityFoods: string[];
    avoidOrLimit: string[];
  };
  flexBudget: {
    remaining: number;
    weeklyTotal: number;
    note: string;
  };

  // Sleep adjustment (needs sleep input)
  getSleepAdjustedVolume: (sleepHours: number) => {
    multiplier: number;
    components: string;
    skipTraining: boolean;
    note: string;
  };
}

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Folicular',
  ovulatory: 'Ovulatoria',
  luteal_early: 'Lútea temprana',
  luteal_late: 'Lútea tardía',
};

const PHASE_EMOJIS: Record<CyclePhase, string> = {
  menstrual: '🔴',
  follicular: '🌱',
  ovulatory: '⚡',
  luteal_early: '🌙',
  luteal_late: '🌊',
};

/**
 * Master hook: derives all daily state from a single input (period start date).
 * Every tab in the app reads from this hook.
 */
export function useCycleSync(
  periodStartDate: string,
  cycleLength: number = 31,
  flexUsedThisWeek: number = 0,
  referenceDate?: Date
): CycleSyncState {
  return useMemo(() => {
    const today = referenceDate ?? new Date();
    const dayOfWeek = DAY_NAMES[today.getDay()];
    const dateStr = today.toISOString().split('T')[0];

    // ── Cycle ──
    const cycleDay = getCycleDay(periodStartDate, dateStr);
    const phase = getPhase(cycleDay);
    const nextPeriod = predictNextPeriod(periodStartDate, cycleLength);

    // ── Nutrition ──
    const targets = getDailyTargets(cycleDay);
    const training = isGymDay(today);
    const adjusted = getAdjustedCalories(cycleDay, training);

    // ── Training ──
    const trainingWeek = getTrainingWeek(cycleDay);

    // ── Supplements ──
    const fullSupplements = getFullDaySupplements(phase, dayOfWeek);
    const supplementWarnings = checkInteractionConflicts(
      fullSupplements.scheduled
    );

    // ── Meals ──
    const mealNotes = getPhaseMealNotes(phase);
    const flexBudget = getFlexBudget(phase, flexUsedThisWeek);

    // ── Sleep-adjusted volume (closure) ──
    const getSleepAdjustedVolume = (sleepHours: number) => {
      const sleep = getSleepAdjustment(sleepHours);
      const effective = getEffectiveVolumeMultiplier(cycleDay, sleepHours);
      return {
        multiplier: effective.multiplier,
        components: effective.components,
        skipTraining: sleep.skipTraining,
        note: sleep.note,
      };
    };

    return {
      cycleDay,
      phase,
      phaseLabel: PHASE_LABELS[phase],
      phaseEmoji: PHASE_EMOJIS[phase],
      daysUntilNextPeriod: nextPeriod.daysUntil,
      nextPeriodDate: nextPeriod.date,
      targets,
      adjustedCalories: adjusted.kcal,
      calorieNote: adjusted.note,
      trainingWeek,
      isTrainingDay: training,
      dayOfWeek,
      supplements: fullSupplements.scheduled,
      supplementWarnings,
      ironDay: fullSupplements.ironDay,
      criticalSupplementCount: fullSupplements.criticalCount,
      mealNotes,
      flexBudget,
      getSleepAdjustedVolume,
    };
  }, [periodStartDate, cycleLength, flexUsedThisWeek, referenceDate]);
}
