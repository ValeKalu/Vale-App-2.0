// ============================================================
// lib/types.ts — Shared types for Val Health App
// ============================================================

export type CyclePhase =
  | 'menstrual'
  | 'follicular'
  | 'ovulatory'
  | 'luteal_early'
  | 'luteal_late';

export type ExerciseCategory =
  | 'heavy_compound'
  | 'light_compound'
  | 'isolation';

export type AlertSeverity = 'red' | 'yellow' | 'green';
export type AlertLevel = 'red' | 'orange' | 'yellow' | 'green';
export type AdherenceLevel = 'green' | 'yellow' | 'red';

export interface PhaseConfig {
  phase: CyclePhase;
  dayStart: number;
  dayEnd: number;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ironPriority: 'high' | 'moderate' | 'low';
  magnesiumBoost: boolean;
  trainingStrategy: string;
  volumeMultiplier: number;
  intensityMultiplier: number;
  cravingStrategy: string;
  nutritionNotes: string;
}

export interface DailyTargets {
  cycleDay: number;
  phase: CyclePhase;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  trainingStrategy: string;
  volumeMultiplier: number;
  intensityMultiplier: number;
  isDeloadPhase: boolean;
  isPRWindow: boolean;
  nutritionNotes: string;
  cravingStrategy: string;
  ironPriority: 'high' | 'moderate' | 'low';
  magnesiumBoost: boolean;
}

export interface ProgressionInput {
  exerciseName: string;
  category: ExerciseCategory;
  currentWeightKg: number;
  currentReps: number;
  currentRPE: number;
  repRangeMin: number;
  repRangeMax: number;
  weightIncrementKg: number;
  weekNumber: number;
  cyclePhase: CyclePhase;
  consecutiveSessionsAtTop: number;
  consecutiveSessionsStalled: number;
  sleepHoursAvg: number;
  deficitWeeks: number;
}

export interface ProgressionDecision {
  action:
    | 'increase_weight'
    | 'hold'
    | 'drop_weight'
    | 'deload'
    | 'maintain'
    | 'pr_attempt';
  targetWeightKg: number;
  targetReps: string;
  targetSets: string;
  reason: string;
  warnings: string[];
  isAutoregulated: boolean;
}

export interface SupplementScheduleItem {
  name: string;
  dose: string;
  timing: string;
  withFood: boolean;
  isToday: boolean;
  phaseNote: string | null;
  interactions: string[];
  priority: 'critical' | 'important' | 'standard';
}

export interface AlertEvaluation {
  level: AlertLevel;
  score: number;
  flags: string[];
  actions: string[];
  nutritionChange: string | null;
  trainingChange: string | null;
  medicalReferral: boolean;
}

export interface SymptomReport {
  cycleLength?: number;
  cycleLengthTrend?: 'stable' | 'lengthening' | 'absent';
  premenstrualSpotting?: number;
  weightLossRatePercent?: number;
  strengthTrend?: 'gaining' | 'stable' | 'declining';
  sleepQuality?: number;
  energyLevel?: number;
  moodStability?: number;
  illnessFrequency?: 'normal' | 'increased';
  restingHR?: number;
  restingHRBaseline?: number;
  appetiteChange?: 'normal' | 'increased' | 'decreased_paradoxical';
  injuryRecurrence?: boolean;
  ferritinLevel?: number;
  hairLoss?: boolean;
  obsessiveThoughts?: boolean;
  palpitations?: boolean;
  consecutiveFatigueDays?: number;
}

export interface ExerciseLog {
  exerciseName: string;
  weightKg: number;
  reps: number;
  rpe: number;
  date: string;
}

export interface DailyLog {
  date: string;
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  weightKg?: number;
  sleepHours?: number;
  sleepQuality?: number;
  energyLevel?: number;
  moodScore?: number;
  waterMl: number;
  symptoms: string[];
  cycleDay: number;
  cyclePhase: CyclePhase;
}
