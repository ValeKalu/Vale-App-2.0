// ============================================================
// lib/cycleEngine.ts — Cycle-aware decision engine
// Sources: Niering 2024, Colenso-Semple 2024, Benton 2020,
//          McNulty 2020, Val Data Master §8
// ============================================================

import type { CyclePhase, DailyTargets, PhaseConfig } from './types';

// ── Phase configuration (from seed data / cycle_phase_config table) ──
// Hardcoded fallback for offline/local use. Supabase is source of truth.
const PHASE_CONFIG: PhaseConfig[] = [
  {
    phase: 'menstrual',
    dayStart: 1,
    dayEnd: 7,
    kcalTarget: 1650,
    proteinG: 130,
    carbsG: 150,
    fatG: 55,
    ironPriority: 'high',
    magnesiumBoost: true,
    trainingStrategy: 'Reinicio vol completo, RPE 7',
    volumeMultiplier: 0.9,
    intensityMultiplier: 0.95,
    cravingStrategy: 'Anti-inflammatory foods. Warm meals. Chocolate ok.',
    nutritionNotes: 'Iron priority, magnesio para calambres.',
  },
  {
    phase: 'follicular',
    dayStart: 8,
    dayEnd: 14,
    kcalTarget: 1750,
    proteinG: 130,
    carbsG: 182,
    fatG: 53,
    ironPriority: 'moderate',
    magnesiumBoost: false,
    trainingStrategy: 'EMPUJAR, +1 serie compuestos',
    volumeMultiplier: 1.1,
    intensityMultiplier: 1.05,
    cravingStrategy: 'Menor apetito típico. Easiest phase for adherence.',
    nutritionNotes:
      'Energía subiendo, carbs pre-workout. Best insulin sensitivity.',
  },
  {
    phase: 'ovulatory',
    dayStart: 15,
    dayEnd: 17,
    kcalTarget: 1750,
    proteinG: 135,
    carbsG: 190,
    fatG: 50,
    ironPriority: 'low',
    magnesiumBoost: false,
    trainingStrategy: 'PR WEEK, máxima fuerza',
    volumeMultiplier: 1.05,
    intensityMultiplier: 1.05,
    cravingStrategy:
      'NO reducir ingesta por debajo de target pese a menor apetito.',
    nutritionNotes: 'Pico energía, hidratación extra. +5g proteína.',
  },
  {
    phase: 'luteal_early',
    dayStart: 18,
    dayEnd: 24,
    kcalTarget: 1720,
    proteinG: 130,
    carbsG: 175,
    fatG: 55,
    ironPriority: 'moderate',
    magnesiumBoost: false,
    trainingStrategy: 'Establecer/mantener, RPE 7-8',
    volumeMultiplier: 1.0,
    intensityMultiplier: 1.0,
    cravingStrategy:
      'Antojos pueden empezar. Snacks pre-aprobados: fruta + yogurt.',
    nutritionNotes: 'Distribuir carbs uniformemente. Evitar picos glucémicos.',
  },
  {
    phase: 'luteal_late',
    dayStart: 25,
    dayEnd: 31,
    kcalTarget: 1800,
    proteinG: 130,
    carbsG: 200,
    fatG: 58,
    ironPriority: 'moderate',
    magnesiumBoost: true,
    trainingStrategy: 'DELOAD, vol -30%',
    volumeMultiplier: 0.7,
    intensityMultiplier: 0.95,
    cravingStrategy:
      'FLEX COMPLETO. Antojos fisiológicos. 1800 kcal is still deficit. NO CULPA.',
    nutritionNotes:
      '+carbs justificado. RMR incrementado ~40-90 kcal (Benton 2020).',
  },
];

/**
 * Calculate current cycle day from period start date.
 * Returns 1-based day within the cycle.
 */
export function getCycleDay(
  periodStartDate: string,
  referenceDate?: string
): number {
  const start = new Date(periodStartDate);
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  start.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  const diffMs = ref.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  // Wrap around cycle length (31 days)
  const cycleDay = (((diffDays % 31) + 31) % 31) + 1;
  return cycleDay;
}

/**
 * Get current cycle phase from cycle day.
 */
export function getPhase(cycleDay: number): CyclePhase {
  const config = PHASE_CONFIG.find(
    (p) => cycleDay >= p.dayStart && cycleDay <= p.dayEnd
  );
  return config?.phase ?? 'luteal_early';
}

/**
 * Get phase configuration (full object).
 */
export function getPhaseConfig(cycleDay: number): PhaseConfig {
  const config = PHASE_CONFIG.find(
    (p) => cycleDay >= p.dayStart && cycleDay <= p.dayEnd
  );
  return config ?? PHASE_CONFIG[3]; // fallback to luteal_early
}

/**
 * Get all daily targets for a given cycle day.
 * This is the main entry point for the UI.
 */
export function getDailyTargets(cycleDay: number): DailyTargets {
  const config = getPhaseConfig(cycleDay);

  return {
    cycleDay,
    phase: config.phase,
    kcalTarget: config.kcalTarget,
    proteinG: config.proteinG,
    carbsG: config.carbsG,
    fatG: config.fatG,
    trainingStrategy: config.trainingStrategy,
    volumeMultiplier: config.volumeMultiplier,
    intensityMultiplier: config.intensityMultiplier,
    isDeloadPhase: config.phase === 'luteal_late',
    isPRWindow: config.phase === 'ovulatory',
    nutritionNotes: config.nutritionNotes,
    cravingStrategy: config.cravingStrategy,
    ironPriority: config.ironPriority,
    magnesiumBoost: config.magnesiumBoost,
  };
}

/**
 * Map cycle day to training week number (1-6).
 * Based on Val's 6-week periodization starting April 20, 2026.
 *
 * S1 (days 18-24) = Lútea temprana → Establish loads
 * S2 (days 25-31) = Premenstrual → DELOAD
 * S3 (days 1-7)   = Menstruación → Restart volume
 * S4 (days 8-14)  = Folicular media → Push
 * S5 (days 15-21) = Ovulatoria → PR week
 * S6 (days 22-28) = Lútea media → Maintain
 */
export function getTrainingWeek(cycleDay: number): {
  weekNumber: number;
  weekLabel: string;
  strategy: string;
  note: string;
} {
  // Map cycle day ranges to training weeks
  if (cycleDay >= 18 && cycleDay <= 24) {
    return {
      weekNumber: 1,
      weekLabel: 'S1 · Establecer',
      strategy: 'base',
      note: 'Establish loads. RPE 7. Get comfortable with movements.',
    };
  }
  if (cycleDay >= 25 && cycleDay <= 31) {
    return {
      weekNumber: 2,
      weekLabel: 'S2 · DELOAD',
      strategy: 'deload',
      note: 'Volume -30%, maintain loads. Respect energy. Premenstrual phase.',
    };
  }
  if (cycleDay >= 1 && cycleDay <= 7) {
    return {
      weekNumber: 3,
      weekLabel: 'S3 · Reiniciar',
      strategy: 'restart',
      note: 'Restart full volume. Use S1 weights. Menstruation — autoregulate.',
    };
  }
  if (cycleDay >= 8 && cycleDay <= 14) {
    return {
      weekNumber: 4,
      weekLabel: 'S4 · EMPUJAR',
      strategy: 'push',
      note: 'Push loads and volume. +1 serie compuestos. Best insulin sensitivity.',
    };
  }
  if (cycleDay >= 15 && cycleDay <= 21) {
    return {
      weekNumber: 5,
      weekLabel: 'S5 · PR WEEK',
      strategy: 'pr',
      note: 'PR attempts on all compounds. Peak estrogen window.',
    };
  }
  // days 22-28 (overlap with luteal_early end / luteal_late start is handled by cycleDay >= 18 above)
  return {
    weekNumber: 6,
    weekLabel: 'S6 · Mantener',
    strategy: 'maintain',
    note: 'Consolidate PRs. Maintain loads. Lútea media.',
  };
}

/**
 * Predict next period start date from last period.
 */
export function predictNextPeriod(
  lastPeriodStart: string,
  cycleLength: number = 31
): { date: string; daysUntil: number; confidence: string } {
  const start = new Date(lastPeriodStart);
  const nextStart = new Date(start);
  nextStart.setDate(nextStart.getDate() + cycleLength);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextStart.setHours(0, 0, 0, 0);

  const daysUntil = Math.floor(
    (nextStart.getTime() - today.getTime()) / 86_400_000
  );

  return {
    date: nextStart.toISOString().split('T')[0],
    daysUntil,
    confidence: 'moderate', // single cycle reference
  };
}

/**
 * Check if today is a gym day (Mon/Wed/Fri).
 */
export function isGymDay(date?: Date): boolean {
  const d = date ?? new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  return day === 1 || day === 3 || day === 5;
}

/**
 * Get day-type adjusted calorie target.
 * Gym days get the phase target; rest days get ~100 less.
 */
export function getAdjustedCalories(
  cycleDay: number,
  isTrainingDay: boolean
): { kcal: number; note: string } {
  const config = getPhaseConfig(cycleDay);

  if (isTrainingDay) {
    return { kcal: config.kcalTarget, note: 'Training day target' };
  }

  // Rest day: reduce by 100 kcal (from carbs), floor at 1600
  const restKcal = Math.max(1600, config.kcalTarget - 100);
  return { kcal: restKcal, note: 'Rest day (−100 kcal from carbs)' };
}

/**
 * Get sleep-adjusted training recommendation.
 * Source: Research Doc Bloque 5, sleepDeprivationTrainingRules
 */
export function getSleepAdjustment(sleepHours: number): {
  volumeMultiplier: number;
  note: string;
  skipTraining: boolean;
} {
  if (sleepHours < 5) {
    return {
      volumeMultiplier: 0,
      note: 'Skip training. 20 min walk max. Prioritize sleep tonight.',
      skipTraining: true,
    };
  }
  if (sleepHours < 6) {
    return {
      volumeMultiplier: 0.5,
      note: 'Compounds only, 2 sets each. Skip accessories.',
      skipTraining: false,
    };
  }
  if (sleepHours < 7) {
    return {
      volumeMultiplier: 0.8,
      note: 'Train normally with autoregulation. No new PRs.',
      skipTraining: false,
    };
  }
  return {
    volumeMultiplier: 1.0,
    note: 'Full training capacity.',
    skipTraining: false,
  };
}

/**
 * Get the effective volume multiplier combining cycle phase + sleep.
 */
export function getEffectiveVolumeMultiplier(
  cycleDay: number,
  sleepHours: number
): { multiplier: number; components: string } {
  const phase = getPhaseConfig(cycleDay);
  const sleep = getSleepAdjustment(sleepHours);

  const combined = phase.volumeMultiplier * sleep.volumeMultiplier;
  const rounded = Math.round(combined * 100) / 100;

  return {
    multiplier: rounded,
    components: `Phase ${phase.volumeMultiplier} × Sleep ${sleep.volumeMultiplier} = ${rounded}`,
  };
}
