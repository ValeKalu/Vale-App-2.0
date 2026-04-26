// ============================================================
// lib/progressionEngine.ts — Progression decision engine
// Sources: Helms 2014/2020, Barakat 2020, Garthe 2011
//          Val Data Master §4
// ============================================================

import type {
  CyclePhase,
  ExerciseCategory,
  ProgressionInput,
  ProgressionDecision,
  ExerciseLog,
} from './types';

// ── Constants ──

const DELOAD_PHASES: CyclePhase[] = ['luteal_late'];
const PR_PHASES: CyclePhase[] = ['ovulatory'];
const NO_PR_PHASES: CyclePhase[] = ['luteal_late', 'menstrual'];

interface CategoryRules {
  repRange: [number, number];
  targetRIR: number;
  weightIncrement: number;
  stallThresholdWeeks: number;
  deloadVolumeFactor: number;
  deloadIntensityFactor: number;
}

const CATEGORY_RULES: Record<ExerciseCategory, CategoryRules> = {
  heavy_compound: {
    repRange: [8, 10],
    targetRIR: 2,
    weightIncrement: 2.5,
    stallThresholdWeeks: 3,
    deloadVolumeFactor: 0.5,
    deloadIntensityFactor: 0.85,
  },
  light_compound: {
    repRange: [10, 12],
    targetRIR: 2,
    weightIncrement: 1.25,
    stallThresholdWeeks: 3,
    deloadVolumeFactor: 0.5,
    deloadIntensityFactor: 0.85,
  },
  isolation: {
    repRange: [12, 15],
    targetRIR: 1,
    weightIncrement: 1.0,
    stallThresholdWeeks: 4,
    deloadVolumeFactor: 0.6,
    deloadIntensityFactor: 0.9,
  },
};

/**
 * Main progression decision function.
 * Takes current performance data + context and returns what to do next.
 */
export function getProgressionTarget(
  input: ProgressionInput
): ProgressionDecision {
  const rules = CATEGORY_RULES[input.category];
  const warnings: string[] = [];

  // ── Priority 1: Deload phase override ──
  if (DELOAD_PHASES.includes(input.cyclePhase)) {
    return buildDeload(
      input,
      rules,
      'Cycle phase: luteal late → programmed deload.'
    );
  }

  // ── Priority 2: Sleep check ──
  if (input.sleepHoursAvg < 5) {
    return {
      action: 'maintain',
      targetWeightKg: input.currentWeightKg,
      targetReps: `${rules.repRange[0]}`,
      targetSets: '2',
      reason: 'Sleep <5h avg. Skip or minimal session.',
      warnings: ['Sleep critically low. Prioritize rest over training.'],
      isAutoregulated: true,
    };
  }
  if (input.sleepHoursAvg < 6) {
    warnings.push('Sleep 5-6h: reduced volume, no PRs.');
  }

  // ── Priority 3: Deficit duration check ──
  if (input.deficitWeeks > 12) {
    warnings.push('Deficit >12 weeks. Consider diet break (Byrne 2018).');
  }

  // ── Priority 4: Stall detection ──
  if (input.consecutiveSessionsStalled >= rules.stallThresholdWeeks) {
    // Stalled long enough → mini-deload then retry
    return {
      action: 'deload',
      targetWeightKg:
        Math.round(input.currentWeightKg * rules.deloadIntensityFactor * 10) /
        10,
      targetReps: `${rules.repRange[0]}`,
      targetSets: input.category === 'isolation' ? '2' : '3',
      reason: `Stalled ${input.consecutiveSessionsStalled} sessions. Mini-deload then retry. If persistent: accept maintenance as success in deficit.`,
      warnings: [
        'Check: sleep quality, caloric intake, iron status.',
        ...warnings,
      ],
      isAutoregulated: true,
    };
  }

  // ── Priority 5: PR window ──
  if (PR_PHASES.includes(input.cyclePhase) && input.category !== 'isolation') {
    // Ovulatory phase: attempt PR if performance supports it
    if (input.currentRPE <= 8 && input.currentReps >= rules.repRange[1]) {
      const newWeight = roundToIncrement(
        input.currentWeightKg + input.weightIncrementKg,
        input.weightIncrementKg
      );
      return {
        action: 'pr_attempt',
        targetWeightKg: newWeight,
        targetReps: `${rules.repRange[0]}-${rules.repRange[1]}`,
        targetSets: input.category === 'heavy_compound' ? '4' : '3',
        reason: `PR window (ovulatory phase). RPE ${input.currentRPE} at top of range → increase weight.`,
        warnings,
        isAutoregulated: false,
      };
    }
  }

  // ── Priority 6: No-PR phases ──
  if (NO_PR_PHASES.includes(input.cyclePhase)) {
    return {
      action: 'maintain',
      targetWeightKg: input.currentWeightKg,
      targetReps: `${input.currentReps}`,
      targetSets: input.category === 'heavy_compound' ? '4' : '3',
      reason: `Phase ${input.cyclePhase}: maintain weight, focus on form. No PR attempts.`,
      warnings:
        input.cyclePhase === 'luteal_late'
          ? ['Volume reduced 30% per phase config.', ...warnings]
          : warnings,
      isAutoregulated: false,
    };
  }

  // ── Priority 7: Double progression logic ──
  return applyDoubleProgression(input, rules, warnings);
}

/**
 * Core double progression algorithm.
 * Step 1: If at top of rep range with RPE ≤ targetRIR+6 for 2+ sessions → increase weight
 * Step 2: If at top but RPE high → hold
 * Step 3: If cannot hit bottom of range for 2 sessions → drop weight
 * Step 4: Otherwise → add reps
 */
function applyDoubleProgression(
  input: ProgressionInput,
  rules: CategoryRules,
  warnings: string[]
): ProgressionDecision {
  const atTopOfRange = input.currentReps >= rules.repRange[1];
  const atBottomOrBelow = input.currentReps < rules.repRange[0];
  const rpeOk = input.currentRPE <= rules.targetRIR + 6; // RIR 2 → RPE 8
  const rpeTooHigh = input.currentRPE >= 9;

  // Case A: At top of range, RPE manageable, sustained → INCREASE WEIGHT
  if (atTopOfRange && rpeOk && input.consecutiveSessionsAtTop >= 2) {
    const newWeight = roundToIncrement(
      input.currentWeightKg + input.weightIncrementKg,
      input.weightIncrementKg
    );
    return {
      action: 'increase_weight',
      targetWeightKg: newWeight,
      targetReps: `${rules.repRange[0]}`,
      targetSets: input.category === 'heavy_compound' ? '4' : '3',
      reason: `${input.currentReps} reps at RPE ${input.currentRPE} for ${input.consecutiveSessionsAtTop} sessions → increase to ${newWeight} kg.`,
      warnings,
      isAutoregulated: false,
    };
  }

  // Case B: At top of range but RPE too high → HOLD
  if (atTopOfRange && rpeTooHigh) {
    return {
      action: 'hold',
      targetWeightKg: input.currentWeightKg,
      targetReps: `${rules.repRange[1]}`,
      targetSets: input.category === 'heavy_compound' ? '4' : '3',
      reason: `Top of range but RPE ${
        input.currentRPE
      }. Hold and retry. Progress when RPE drops to ${rules.targetRIR + 6}.`,
      warnings,
      isAutoregulated: true,
    };
  }

  // Case C: Cannot hit bottom of range → DROP WEIGHT
  if (atBottomOrBelow && input.consecutiveSessionsStalled >= 2) {
    const droppedWeight = roundToIncrement(
      input.currentWeightKg - input.weightIncrementKg,
      input.weightIncrementKg
    );
    return {
      action: 'drop_weight',
      targetWeightKg: Math.max(0, droppedWeight),
      targetReps: `${rules.repRange[0]}-${rules.repRange[1]}`,
      targetSets: input.category === 'heavy_compound' ? '4' : '3',
      reason: `Cannot hit ${rules.repRange[0]} reps for 2 sessions. Drop to ${droppedWeight} kg and rebuild.`,
      warnings: ['Check: sleep, nutrition, cycle phase.', ...warnings],
      isAutoregulated: true,
    };
  }

  // Case D: Default → HOLD weight, aim for +1 rep
  const targetReps = Math.min(input.currentReps + 1, rules.repRange[1]);
  return {
    action: 'hold',
    targetWeightKg: input.currentWeightKg,
    targetReps: `${targetReps}`,
    targetSets: input.category === 'heavy_compound' ? '4' : '3',
    reason: `Building reps: ${input.currentReps} → ${targetReps} at ${input.currentWeightKg} kg.`,
    warnings,
    isAutoregulated: false,
  };
}

/**
 * Build a deload decision.
 */
function buildDeload(
  input: ProgressionInput,
  rules: CategoryRules,
  reason: string
): ProgressionDecision {
  const deloadWeight = roundToIncrement(
    input.currentWeightKg * rules.deloadIntensityFactor,
    input.weightIncrementKg
  );

  // Isolation during deload: keep it very light
  const sets = input.category === 'isolation' ? '2' : '3';
  const reps =
    input.category === 'isolation'
      ? `${rules.repRange[0]}`
      : `${Math.max(rules.repRange[0] - 2, 4)}-${rules.repRange[0]}`;

  return {
    action: 'deload',
    targetWeightKg: deloadWeight,
    targetReps: reps,
    targetSets: sets,
    reason,
    warnings: [],
    isAutoregulated: false,
  };
}

/**
 * Analyze exercise history to detect trends.
 * Returns number of consecutive sessions at top of range, stalled sessions, etc.
 */
export function analyzeExerciseHistory(
  logs: ExerciseLog[],
  category: ExerciseCategory
): {
  consecutiveAtTop: number;
  consecutiveStalled: number;
  trend: 'improving' | 'stable' | 'declining';
  peakWeightKg: number;
  currentWeightKg: number;
} {
  if (logs.length === 0) {
    return {
      consecutiveAtTop: 0,
      consecutiveStalled: 0,
      trend: 'stable',
      peakWeightKg: 0,
      currentWeightKg: 0,
    };
  }

  const rules = CATEGORY_RULES[category];
  const sorted = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latest = sorted[0];
  const peakWeight = Math.max(...sorted.map((l) => l.weightKg));

  // Count consecutive sessions at top of rep range
  let consecutiveAtTop = 0;
  for (const log of sorted) {
    if (log.reps >= rules.repRange[1] && log.weightKg === latest.weightKg) {
      consecutiveAtTop++;
    } else {
      break;
    }
  }

  // Count consecutive stalled sessions (same weight, same or fewer reps)
  let consecutiveStalled = 0;
  if (sorted.length >= 2) {
    const recentWeight = sorted[0].weightKg;
    const recentReps = sorted[0].reps;
    for (const log of sorted) {
      if (log.weightKg === recentWeight && log.reps <= recentReps) {
        consecutiveStalled++;
      } else {
        break;
      }
    }
    // Only count as stalled if 2+ sessions
    if (consecutiveStalled < 2) consecutiveStalled = 0;
  }

  // Trend: compare last 3 sessions
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (sorted.length >= 3) {
    const recent3 = sorted.slice(0, 3);
    const weights = recent3.map((l) => l.weightKg * l.reps); // volume load proxy
    if (weights[0] > weights[2]) trend = 'improving';
    else if (weights[0] < weights[2] * 0.9) trend = 'declining';
  }

  // Check for significant strength loss (>10% from peak)
  if (latest.weightKg < peakWeight * 0.9) {
    trend = 'declining';
  }

  return {
    consecutiveAtTop,
    consecutiveStalled,
    trend,
    peakWeightKg: peakWeight,
    currentWeightKg: latest.weightKg,
  };
}

/**
 * Get the pre-planned target for a specific exercise and week.
 * Falls back to the progression logic if no pre-planned target exists.
 */
export function getWeekTarget(
  exerciseName: string,
  weekNumber: number,
  weekTargets: Record<string, string>
): { label: string; isDeload: boolean; isPR: boolean } {
  const weekKey = `Week ${weekNumber}`;
  const label = weekTargets[weekKey] ?? 'maintain';

  return {
    label,
    isDeload:
      label.toLowerCase().includes('deload') ||
      label.toLowerCase().includes('reduced') ||
      label.toLowerCase().includes('rpe 6'),
    isPR: label.toLowerCase().includes('pr') || label.includes('**'),
  };
}

// ── Helpers ──

function roundToIncrement(value: number, increment: number): number {
  if (increment === 0) return value;
  return Math.round(value / increment) * increment;
}
