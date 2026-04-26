// ============================================================
// lib/alertEngine.ts — Health alert evaluation engine
// Sources: Mountjoy 2023 IOC REDs, Loucks 2011,
//          De Souza 2014, Meeusen 2013, Val Data Master §10
// ============================================================

import type {
  AlertEvaluation,
  AlertLevel,
  SymptomReport,
  DailyLog,
} from './types';

// ── Alert Rule Definitions ──

interface AlertRule {
  id: string;
  symptom: string;
  check: (report: SymptomReport) => boolean;
  score: number;
  severity: 'red' | 'yellow';
  flag: string;
  nutritionChange: string | null;
  trainingChange: string | null;
  medicalReferral: boolean;
}

const ALERT_RULES: AlertRule[] = [
  // ── PRIMARY INDICATORS (high weight) ──
  {
    id: 'ALERT_001',
    symptom: 'Amenorrhea >45 days',
    check: (r) =>
      r.cycleLengthTrend === 'absent' ||
      (r.cycleLength !== undefined && r.cycleLength > 45),
    score: 10,
    severity: 'red',
    flag: 'AMENORRHEA: Cycle absent or >45 days. Immediate medical review required.',
    nutritionChange:
      'STOP deficit. Return to TDEE (2070 kcal). Add 100g carbs/day.',
    trainingChange: 'Reduce to 2 sessions/week. No high intensity.',
    medicalReferral: true,
  },
  {
    id: 'ALERT_005',
    symptom: 'Palpitations or dizziness',
    check: (r) => r.palpitations === true,
    score: 10,
    severity: 'red',
    flag: 'PALPITATIONS/DIZZINESS: Stop exercise. GP referral URGENT.',
    nutritionChange: null,
    trainingChange: 'STOP all training until medical clearance.',
    medicalReferral: true,
  },
  {
    id: 'ALERT_007',
    symptom: 'Obsessive thoughts about food/body',
    check: (r) => r.obsessiveThoughts === true,
    score: 10,
    severity: 'red',
    flag: 'OBSESSIVE THOUGHTS: Stop deficit. Return to TDEE. Seek psychological support.',
    nutritionChange: 'Return to TDEE (2070 kcal) immediately.',
    trainingChange: 'Enjoyable movement only.',
    medicalReferral: true,
  },
  {
    id: 'ALERT_004',
    symptom: 'Extreme fatigue 3+ days',
    check: (r) =>
      r.consecutiveFatigueDays !== undefined && r.consecutiveFatigueDays >= 3,
    score: 8,
    severity: 'red',
    flag: 'EXTREME FATIGUE: Possible anemia progression. Bring forward ferritin recheck.',
    nutritionChange: 'Return to TDEE (2070 kcal).',
    trainingChange: 'Light sessions only. No heavy compounds.',
    medicalReferral: true,
  },
  {
    id: 'ALERT_CYCLE_LONG',
    symptom: 'Cycle lengthening >35 days',
    check: (r) =>
      r.cycleLength !== undefined && r.cycleLength > 35 && r.cycleLength <= 45,
    score: 4,
    severity: 'yellow',
    flag: 'Cycle lengthening beyond 35 days. Early warning sign of hypothalamic suppression.',
    nutritionChange: 'Add 100 kcal/day. Monitor next cycle.',
    trainingChange: 'Maintain but no PRs.',
    medicalReferral: false,
  },
  {
    id: 'ALERT_WEIGHT_FAST',
    symptom: 'Weight loss too rapid >1%/week',
    check: (r) =>
      r.weightLossRatePercent !== undefined && r.weightLossRatePercent > 1.0,
    score: 5,
    severity: 'yellow',
    flag: 'Weight loss too rapid (>1%/week). Increase calories to preserve muscle.',
    nutritionChange: 'Add 150-200 kcal/day.',
    trainingChange: null,
    medicalReferral: false,
  },

  // ── SECONDARY INDICATORS (moderate weight) ──
  {
    id: 'ALERT_003',
    symptom: 'Strength declining 2+ weeks',
    check: (r) => r.strengthTrend === 'declining',
    score: 3,
    severity: 'yellow',
    flag: 'Strength declining. Check: sleep, deficit duration, iron status.',
    nutritionChange: '+100-150 kcal/day from carbs.',
    trainingChange: 'Mini-deload 1 week: -30% volume.',
    medicalReferral: false,
  },
  {
    id: 'ALERT_002',
    symptom: 'Spotting worsened',
    check: (r) =>
      r.premenstrualSpotting !== undefined && r.premenstrualSpotting > 5,
    score: 2,
    severity: 'yellow',
    flag: 'Prolonged premenstrual spotting. Check progesterone/luteal function, iron status.',
    nutritionChange: 'Increase to 1900 kcal/day for 2 weeks.',
    trainingChange: 'Maintain but no PRs until resolved.',
    medicalReferral: false,
  },
  {
    id: 'ALERT_006',
    symptom: 'Hair loss 3+ weeks',
    check: (r) => r.hairLoss === true,
    score: 3,
    severity: 'yellow',
    flag: 'Hair loss: common sign of LEA or iron deficiency.',
    nutritionChange: 'Return to TDEE. Prioritize iron-rich foods.',
    trainingChange: 'Maintain current level.',
    medicalReferral: false,
  },
  {
    id: 'ALERT_SLEEP',
    symptom: 'Sleep quality poor',
    check: (r) => r.sleepQuality !== undefined && r.sleepQuality < 4,
    score: 2,
    severity: 'yellow',
    flag: 'Sleep quality poor. Address before increasing training.',
    nutritionChange: null,
    trainingChange: 'Reduce volume 20%. Check magnesium and bupropion timing.',
    medicalReferral: false,
  },
  {
    id: 'ALERT_ENERGY',
    symptom: 'Low energy',
    check: (r) => r.energyLevel !== undefined && r.energyLevel < 4,
    score: 2,
    severity: 'yellow',
    flag: 'Low energy. Potential LEA or overtraining.',
    nutritionChange: 'Consider adding 100 kcal/day.',
    trainingChange: null,
    medicalReferral: false,
  },
  {
    id: 'ALERT_MOOD',
    symptom: 'Mood disturbance',
    check: (r) => r.moodStability !== undefined && r.moodStability < 4,
    score: 2,
    severity: 'yellow',
    flag: 'Mood disturbance. Common in RED-S. Also check bupropion effectiveness.',
    nutritionChange: null,
    trainingChange: null,
    medicalReferral: false,
  },
  {
    id: 'ALERT_HR',
    symptom: 'Resting HR elevated >5 bpm',
    check: (r) =>
      r.restingHR !== undefined &&
      r.restingHRBaseline !== undefined &&
      r.restingHR > r.restingHRBaseline + 5,
    score: 3,
    severity: 'yellow',
    flag: 'Resting HR elevated. Recovery compromised.',
    nutritionChange: null,
    trainingChange: 'Deload: -50% volume for 1 week.',
    medicalReferral: false,
  },
  {
    id: 'ALERT_APPETITE',
    symptom: 'Paradoxical appetite decrease',
    check: (r) => r.appetiteChange === 'decreased_paradoxical',
    score: 3,
    severity: 'yellow',
    flag: 'Paradoxical appetite decrease. Classic overtraining/RED-S sign.',
    nutritionChange: 'Increase calories even if not hungry.',
    trainingChange: 'Deload this week.',
    medicalReferral: false,
  },
  {
    id: 'ALERT_ILLNESS',
    symptom: 'Increased illness frequency',
    check: (r) => r.illnessFrequency === 'increased',
    score: 2,
    severity: 'yellow',
    flag: 'Increased illness frequency. Immune suppression from LEA.',
    nutritionChange: '+200 kcal/day. Increase fruits/vegetables.',
    trainingChange: 'Reduce intensity until recovered.',
    medicalReferral: false,
  },
  {
    id: 'ALERT_INJURY',
    symptom: 'Recurring injuries',
    check: (r) => r.injuryRecurrence === true,
    score: 3,
    severity: 'yellow',
    flag: 'Recurring injuries. Potential bone health or recovery issue.',
    nutritionChange: 'Check calcium and vitamin D intake.',
    trainingChange: 'Reduce intensity. Focus on rehabilitation.',
    medicalReferral: false,
  },

  // ── IRON-SPECIFIC ──
  {
    id: 'ALERT_FERRITIN_CRITICAL',
    symptom: 'Ferritin <15',
    check: (r) => r.ferritinLevel !== undefined && r.ferritinLevel < 15,
    score: 4,
    severity: 'red',
    flag: 'Ferritin <15 ng/mL. Medical iron repletion needed. Reduce training volume.',
    nutritionChange:
      'Maximize iron-rich foods. Ensure vitamin C with every iron dose.',
    trainingChange: 'Reduce volume 25%. Allow 96h between heavy sessions.',
    medicalReferral: true,
  },
  {
    id: 'ALERT_FERRITIN_LOW',
    symptom: 'Ferritin <30',
    check: (r) =>
      r.ferritinLevel !== undefined &&
      r.ferritinLevel >= 15 &&
      r.ferritinLevel < 30,
    score: 2,
    severity: 'yellow',
    flag: 'Ferritin <30 ng/mL. Active supplementation protocol. Monitor performance.',
    nutritionChange: 'Ensure alternate-day iron supplementation.',
    trainingChange: 'Allow 72h between heavy lower body sessions.',
    medicalReferral: false,
  },
];

/**
 * Main alert evaluation function.
 * Takes a symptom report and returns alert level + actions.
 */
export function evaluateAlerts(report: SymptomReport): AlertEvaluation {
  let totalScore = 0;
  const flags: string[] = [];
  const actions: string[] = [];
  let nutritionChange: string | null = null;
  let trainingChange: string | null = null;
  let medicalReferral = false;

  for (const rule of ALERT_RULES) {
    if (rule.check(report)) {
      totalScore += rule.score;
      flags.push(rule.flag);

      if (rule.nutritionChange) nutritionChange = rule.nutritionChange;
      if (rule.trainingChange) trainingChange = rule.trainingChange;
      if (rule.medicalReferral) medicalReferral = true;
    }
  }

  // Determine level
  let level: AlertLevel;

  if (totalScore >= 10) {
    level = 'red';
    actions.push(
      'STOP deficit immediately. Return to maintenance calories.',
      'Medical review within 1 week.',
      'Reduce training to 50% volume, no high-intensity.',
      'Prioritize sleep above all else.',
      'Do NOT resume deficit without medical clearance.'
    );
  } else if (totalScore >= 6) {
    level = 'orange';
    actions.push(
      'Implement diet break (1-2 weeks at maintenance).',
      'Deload training this week.',
      'Schedule blood work if not done in last 8 weeks.',
      'Re-evaluate in 2 weeks. If no improvement → escalate.'
    );
  } else if (totalScore >= 3) {
    level = 'yellow';
    actions.push(
      'Monitor closely for 2 weeks.',
      'Consider adding 100-150 kcal/day.',
      'Ensure sleep is prioritized.',
      'If any primary indicator appears → escalate.'
    );
  } else {
    level = 'green';
    actions.push(
      'Continue current protocol.',
      'Regular monitoring every 2 weeks.'
    );
  }

  return {
    level,
    score: totalScore,
    flags,
    actions,
    nutritionChange,
    trainingChange,
    medicalReferral,
  };
}

/**
 * Build a symptom report from recent daily logs.
 * Extracts trends from the last N days of logging.
 */
export function buildSymptomReport(
  recentLogs: DailyLog[],
  ferritinLevel?: number
): SymptomReport {
  if (recentLogs.length === 0) {
    return {};
  }

  const sorted = [...recentLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Sleep quality: average of last 7 days
  const sleepLogs = sorted.filter((l) => l.sleepQuality != null).slice(0, 7);
  const avgSleep =
    sleepLogs.length > 0
      ? sleepLogs.reduce((s, l) => s + (l.sleepQuality ?? 0), 0) /
        sleepLogs.length
      : undefined;

  // Energy: average of last 7 days
  const energyLogs = sorted.filter((l) => l.energyLevel != null).slice(0, 7);
  const avgEnergy =
    energyLogs.length > 0
      ? energyLogs.reduce((s, l) => s + (l.energyLevel ?? 0), 0) /
        energyLogs.length
      : undefined;

  // Mood: average of last 7 days
  const moodLogs = sorted.filter((l) => l.moodScore != null).slice(0, 7);
  const avgMood =
    moodLogs.length > 0
      ? moodLogs.reduce((s, l) => s + (l.moodScore ?? 0), 0) / moodLogs.length
      : undefined;

  // Weight loss rate: compare last 2 weeks
  const weightLogs = sorted.filter((l) => l.weightKg != null);
  let weightLossRate: number | undefined;
  if (weightLogs.length >= 2) {
    const recent = weightLogs[0].weightKg!;
    const twoWeeksAgo = weightLogs.find((l) => {
      const diff =
        new Date(weightLogs[0].date).getTime() - new Date(l.date).getTime();
      return diff >= 12 * 86_400_000; // at least 12 days apart
    });
    if (twoWeeksAgo?.weightKg) {
      const weeksDiff =
        (new Date(weightLogs[0].date).getTime() -
          new Date(twoWeeksAgo.date).getTime()) /
        (7 * 86_400_000);
      if (weeksDiff > 0) {
        weightLossRate =
          (((twoWeeksAgo.weightKg - recent) / twoWeeksAgo.weightKg) * 100) /
          weeksDiff;
      }
    }
  }

  // Consecutive fatigue days
  let consecutiveFatigue = 0;
  for (const log of sorted) {
    if (
      log.symptoms.includes('Fatigue') ||
      log.symptoms.includes('Low energy')
    ) {
      consecutiveFatigue++;
    } else {
      break;
    }
  }

  // Hair loss: check if reported in recent symptoms
  const hairLoss = sorted.some((l) => l.symptoms.includes('Hair loss'));

  // Spotting days
  const spottingDays = sorted.filter((l) =>
    l.symptoms.includes('Spotting')
  ).length;

  return {
    sleepQuality: avgSleep !== undefined ? Math.round(avgSleep) : undefined,
    energyLevel: avgEnergy !== undefined ? Math.round(avgEnergy) : undefined,
    moodStability: avgMood !== undefined ? Math.round(avgMood) : undefined,
    weightLossRatePercent: weightLossRate,
    consecutiveFatigueDays:
      consecutiveFatigue > 0 ? consecutiveFatigue : undefined,
    hairLoss,
    premenstrualSpotting: spottingDays > 0 ? spottingDays : undefined,
    ferritinLevel,
    palpitations: sorted.some(
      (l) =>
        l.symptoms.includes('Palpitations') || l.symptoms.includes('Dizziness')
    ),
    obsessiveThoughts: sorted.some((l) =>
      l.symptoms.includes('Obsessive thoughts')
    ),
  };
}

/**
 * Quick check: is deficit duration safe?
 * Returns warning if >6 weeks continuous.
 */
export function checkDeficitDuration(startDate: string): {
  weeks: number;
  needsDietBreak: boolean;
  message: string;
} {
  const start = new Date(startDate);
  const now = new Date();
  const weeks = Math.floor(
    (now.getTime() - start.getTime()) / (7 * 86_400_000)
  );

  if (weeks >= 12) {
    return {
      weeks,
      needsDietBreak: true,
      message: `${weeks} weeks in deficit. MANDATORY diet break. Return to TDEE for 1-2 weeks. (Byrne 2018)`,
    };
  }
  if (weeks >= 8) {
    return {
      weeks,
      needsDietBreak: true,
      message: `${weeks} weeks in deficit. Recommended diet break 5-7 days at TDEE. Ideally during luteal late phase.`,
    };
  }
  if (weeks >= 6) {
    return {
      weeks,
      needsDietBreak: false,
      message: `${weeks} weeks in deficit. Monitor closely. Plan diet break within next 2 weeks.`,
    };
  }

  return {
    weeks,
    needsDietBreak: false,
    message: `${weeks} weeks in deficit. On track.`,
  };
}

/**
 * Calculate LEA (Low Energy Availability).
 * Val's FFM estimated at ~45 kg (73 kg, ~25% BF initially; updates as weight changes).
 */
export function calculateLEA(
  caloriesConsumed: number,
  exerciseCaloriesBurned: number,
  fatFreeMassKg: number = 45
): {
  lea: number;
  level: 'safe' | 'adaptable' | 'problematic' | 'dangerous';
  message: string;
} {
  const lea = (caloriesConsumed - exerciseCaloriesBurned) / fatFreeMassKg;
  const rounded = Math.round(lea * 10) / 10;

  if (rounded >= 45) {
    return {
      lea: rounded,
      level: 'safe',
      message: `LEA ${rounded} kcal/kg FFM — optimal.`,
    };
  }
  if (rounded >= 30) {
    return {
      lea: rounded,
      level: 'adaptable',
      message: `LEA ${rounded} kcal/kg FFM — adequate, short-term safe.`,
    };
  }
  if (rounded >= 25) {
    return {
      lea: rounded,
      level: 'problematic',
      message: `LEA ${rounded} kcal/kg FFM — borderline. Monitor menstrual function closely.`,
    };
  }
  return {
    lea: rounded,
    level: 'dangerous',
    message: `LEA ${rounded} kcal/kg FFM — BELOW SAFE THRESHOLD. Risk of REDs. Increase intake.`,
  };
}
