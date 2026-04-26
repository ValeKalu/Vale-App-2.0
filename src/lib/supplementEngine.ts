// ============================================================
// lib/supplementEngine.ts — Phase-aware supplement scheduling
// Sources: Stoffel 2017/2020, Smith-Ryan 2021, Abbasi 2012,
//          Liao 2019, Pilz 2019, Val Data Master §7
// ============================================================

import type { CyclePhase, SupplementScheduleItem } from './types';

// ── Raw supplement data ──

interface SupplementDef {
  name: string;
  dose: string;
  timing: string;
  withFood: boolean;
  daysOfWeek: string[];
  interactions: string[];
  phaseAdjustments: Partial<
    Record<
      CyclePhase,
      {
        doseOverride?: string;
        timingOverride?: string;
        note: string;
        priority?: 'critical' | 'important' | 'standard';
      }
    >
  >;
  defaultPriority: 'critical' | 'important' | 'standard';
}

const SUPPLEMENTS: SupplementDef[] = [
  {
    name: 'Iron (ferrous sulfate, Rx)',
    dose: 'As prescribed (~65mg elemental)',
    timing: '07:30',
    withFood: false,
    daysOfWeek: ['Monday', 'Wednesday', 'Friday', 'Sunday'],
    interactions: [
      'SEPARATE 2h from: café, té, lácteos, calcio',
      'SEPARATE 4h from: zinc, magnesio',
      'TAKE WITH: vitamina C 100mg (+67% absorción)',
      'Post-exercise: wait 3-6h (hepcidin elevation, McKay 2024)',
    ],
    phaseAdjustments: {
      menstrual: {
        note: 'PRIORIDAD MÁXIMA. Pérdida de hierro activa por menstruación.',
        priority: 'critical',
      },
      follicular: {
        note: 'Post-menstrual repletion. Ventana óptima de absorción.',
        priority: 'important',
      },
    },
    defaultPriority: 'important',
  },
  {
    name: 'Vitamin C',
    dose: '100mg',
    timing: '07:30',
    withFood: false,
    daysOfWeek: ['Monday', 'Wednesday', 'Friday', 'Sunday'],
    interactions: ['Potencia absorción hierro no-hemo +67% (Hallberg 1989)'],
    phaseAdjustments: {
      menstrual: {
        note: 'Tomar siempre con hierro. Prioridad alta durante menstruación.',
        priority: 'critical',
      },
    },
    defaultPriority: 'standard',
  },
  {
    name: 'Creatine monohydrate',
    dose: '3g',
    timing: '10:00',
    withFood: true,
    daysOfWeek: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    interactions: ['Sin interacciones significativas', 'OK con bupropion'],
    phaseAdjustments: {},
    defaultPriority: 'important',
  },
  {
    name: 'Vitamin D3',
    dose: '1000-2000 IU',
    timing: '12:30',
    withFood: true,
    daysOfWeek: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    interactions: [
      'Con comida con grasa para absorción',
      'Synergy con calcio y magnesio',
    ],
    phaseAdjustments: {},
    defaultPriority: 'standard',
  },
  {
    name: 'B12 (methylcobalamin)',
    dose: '250-500 µg',
    timing: '10:00',
    withFood: true,
    daysOfWeek: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    interactions: [
      'Esencial para pescatarianas',
      'Deficiencia puede mimetizar fatiga por hierro bajo',
    ],
    phaseAdjustments: {},
    defaultPriority: 'standard',
  },
  {
    name: 'Omega-3 (EPA+DHA)',
    dose: '1-2g EPA+DHA combined',
    timing: '18:30',
    withFood: true,
    daysOfWeek: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    interactions: [
      'Efecto antiinflamatorio + mood complementario a bupropion',
      'Sin interacción farmacológica con bupropion',
    ],
    phaseAdjustments: {
      menstrual: {
        note: 'Anti-inflamatorio para calambres menstruales.',
        priority: 'important',
      },
      luteal_late: {
        note: 'Mantener. Puede ayudar con inflamación premenstrual.',
        priority: 'important',
      },
    },
    defaultPriority: 'standard',
  },
  {
    name: 'Magnesium glycinate',
    dose: '200-300mg elemental',
    timing: '21:00',
    withFood: false,
    daysOfWeek: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    interactions: [
      'SEPARATE 4h from iron',
      'Glycinate: efecto sedante via glycine (Bannai 2012)',
      'Can help offset bupropion-induced insomnia',
    ],
    phaseAdjustments: {
      menstrual: {
        doseOverride: '300mg elemental',
        note: 'Aumentar a 300mg para calambres y sueño.',
        priority: 'important',
      },
      luteal_late: {
        doseOverride: '300mg elemental',
        note: 'Aumentar a 300mg. PMS: calambres, sueño, mood.',
        priority: 'important',
      },
    },
    defaultPriority: 'important',
  },
];

/**
 * Get today's supplement schedule, adjusted for cycle phase.
 */
export function getSupplementSchedule(
  phase: CyclePhase,
  dayOfWeek: string
): SupplementScheduleItem[] {
  return SUPPLEMENTS.filter((s) => s.daysOfWeek.includes(dayOfWeek))
    .map((s) => {
      const phaseAdj = s.phaseAdjustments[phase];

      return {
        name: s.name,
        dose: phaseAdj?.doseOverride ?? s.dose,
        timing: phaseAdj?.timingOverride ?? s.timing,
        withFood: s.withFood,
        isToday: true,
        phaseNote: phaseAdj?.note ?? null,
        interactions: s.interactions,
        priority: phaseAdj?.priority ?? s.defaultPriority,
      };
    })
    .sort(compareTiming);
}

/**
 * Get all supplements for a given day (regardless of phase),
 * with phase info layered on top.
 */
export function getFullDaySupplements(
  phase: CyclePhase,
  dayOfWeek: string
): {
  scheduled: SupplementScheduleItem[];
  notToday: SupplementScheduleItem[];
  ironDay: boolean;
  criticalCount: number;
} {
  const scheduled = getSupplementSchedule(phase, dayOfWeek);
  const notToday = SUPPLEMENTS.filter(
    (s) => !s.daysOfWeek.includes(dayOfWeek)
  ).map((s) => ({
    name: s.name,
    dose: s.dose,
    timing: s.timing,
    withFood: s.withFood,
    isToday: false,
    phaseNote: null,
    interactions: s.interactions,
    priority: s.defaultPriority,
  }));

  const ironDay = scheduled.some((s) => s.name.toLowerCase().includes('iron'));
  const criticalCount = scheduled.filter(
    (s) => s.priority === 'critical'
  ).length;

  return { scheduled, notToday, ironDay, criticalCount };
}

/**
 * Check for timing conflicts between supplements.
 * Returns warnings if any supplements are too close together
 * and have known interactions.
 */
export function checkInteractionConflicts(
  schedule: SupplementScheduleItem[]
): string[] {
  const warnings: string[] = [];

  const ironItem = schedule.find((s) => s.name.toLowerCase().includes('iron'));
  const magItem = schedule.find((s) =>
    s.name.toLowerCase().includes('magnesium')
  );

  if (ironItem && magItem) {
    const ironTime = parseTime(ironItem.timing);
    const magTime = parseTime(magItem.timing);
    const diffHours = Math.abs(magTime - ironTime) / 60;

    if (diffHours < 4) {
      warnings.push(
        `⚠️ Iron and Magnesium are ${diffHours.toFixed(
          1
        )}h apart. Need 4h+ separation for optimal absorption.`
      );
    }
  }

  // Check iron + coffee timing (if we had coffee data)
  if (ironItem) {
    const ironTime = parseTime(ironItem.timing);
    // Assume coffee at ~10:00 for gym days, ~09:00 for rest
    const coffeeTime = 10 * 60; // 10:00
    const diffHours = Math.abs(coffeeTime - ironTime) / 60;
    if (diffHours < 2) {
      warnings.push(
        `⚠️ Iron taken at ${ironItem.timing}. Café should be 2h+ after iron for absorption.`
      );
    }
  }

  return warnings;
}

/**
 * Get supplement adherence summary for a date range.
 */
export function getSupplementAdherence(
  completedLogs: Array<{ name: string; date: string; completed: boolean }>,
  totalDays: number
): {
  overall: number;
  bySupplementPercent: Record<string, number>;
  worstAdherence: string;
  bestAdherence: string;
} {
  if (totalDays === 0 || completedLogs.length === 0) {
    return {
      overall: 0,
      bySupplementPercent: {},
      worstAdherence: 'N/A',
      bestAdherence: 'N/A',
    };
  }

  const byName: Record<string, { completed: number; total: number }> = {};

  for (const log of completedLogs) {
    if (!byName[log.name]) {
      byName[log.name] = { completed: 0, total: 0 };
    }
    byName[log.name].total++;
    if (log.completed) byName[log.name].completed++;
  }

  const bySupplementPercent: Record<string, number> = {};
  let totalCompleted = 0;
  let totalExpected = 0;

  for (const [name, data] of Object.entries(byName)) {
    bySupplementPercent[name] = Math.round((data.completed / data.total) * 100);
    totalCompleted += data.completed;
    totalExpected += data.total;
  }

  const entries = Object.entries(bySupplementPercent);
  const sorted = entries.sort((a, b) => a[1] - b[1]);

  return {
    overall:
      totalExpected > 0
        ? Math.round((totalCompleted / totalExpected) * 100)
        : 0,
    bySupplementPercent,
    worstAdherence: sorted[0]?.[0] ?? 'N/A',
    bestAdherence: sorted[sorted.length - 1]?.[0] ?? 'N/A',
  };
}

// ── Helpers ──

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function compareTiming(
  a: SupplementScheduleItem,
  b: SupplementScheduleItem
): number {
  return parseTime(a.timing) - parseTime(b.timing);
}
