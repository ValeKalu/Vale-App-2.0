// ============================================================
// components/TrainingView.tsx — Training session view
// Consumes: progressionEngine, cycleEngine
// ============================================================

import React, { useState } from 'react';
import type { CyclePhase, ExerciseCategory } from '../lib/types';
import type { CycleSyncState } from '../hooks/useCycleSync';
import { getProgressionTarget } from '../lib/progressionEngine';

const s = {
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '14px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '8px',
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
  } as React.CSSProperties,
};

interface ExerciseData {
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
}

interface TrainingViewProps {
  sync: CycleSyncState;
  exercises: ExerciseData[];
  exerciseChecks: Record<string, boolean>;
  exerciseLogs: Record<string, string>;
  onExerciseCheck: (key: string) => void;
  onExerciseLog: (key: string, value: string) => void;
  sleepHours: number;
  deficitWeeks: number;
  // Move/extra workout
  onMoveWorkout: (fromDay: string, toDay: string) => void;
  movedWorkouts: Record<string, string>;
}

export function TrainingView({
  sync,
  exercises,
  exerciseChecks,
  exerciseLogs,
  onExerciseCheck,
  onExerciseLog,
  sleepHours,
  deficitWeeks,
}: TrainingViewProps) {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const weekKey = `Week ${sync.trainingWeek.weekNumber}`;
  const sleepAdj = sync.getSleepAdjustedVolume(sleepHours);

  const completedCount = exercises.filter(
    (ex) =>
      exerciseChecks[
        `ex-${sync.dayOfWeek}-planned-${sync.dayOfWeek}-${ex.name}`
      ]
  ).length;
  const totalKcal = exercises.reduce((a, ex) => a + (ex.kcal ?? 0), 0);
  const completedKcal = exercises
    .filter(
      (ex) =>
        exerciseChecks[
          `ex-${sync.dayOfWeek}-planned-${sync.dayOfWeek}-${ex.name}`
        ]
    )
    .reduce((a, ex) => a + (ex.kcal ?? 0), 0);

  if (!sync.isTrainingDay) {
    return (
      <div style={s.card}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>😌</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
            Rest Day
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            {sync.dayOfWeek} · Recovery · Walk + stretch
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            {sync.trainingWeek.note}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* ── Session Header ── */}
      <div style={s.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              {sync.dayOfWeek} Training
            </div>
            <div
              style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}
            >
              {sync.trainingWeek.weekLabel} · {completedCount}/
              {exercises.length} exercises
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>
              {completedKcal} kcal
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              / {totalKcal} est.
            </div>
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '999px',
            marginTop: '10px',
          }}
        >
          <div
            style={{
              width: `${
                exercises.length > 0
                  ? (completedCount / exercises.length) * 100
                  : 0
              }%`,
              height: '100%',
              background: '#111827',
              borderRadius: '999px',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* ── Sleep/Volume Warning ── */}
      {sleepAdj.skipTraining && (
        <div
          style={{
            ...s.card,
            background: '#fef2f2',
            border: '1px solid #fecaca',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
            ⚠️ Sleep {sleepHours}h — {sleepAdj.note}
          </div>
        </div>
      )}
      {!sleepAdj.skipTraining && sleepAdj.multiplier < 1.0 && (
        <div
          style={{
            ...s.card,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '10px 14px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#92400e' }}>
            ⚡ Volume adjusted: {sleepAdj.components}
          </div>
          <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
            {sleepAdj.note}
          </div>
        </div>
      )}

      {/* ── Strategy Note ── */}
      <div
        style={{
          ...s.card,
          padding: '10px 14px',
          background: '#f0f9ff',
          border: 'none',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
          📋 {sync.trainingWeek.note}
        </div>
      </div>

      {/* ── Exercise List ── */}
      {exercises.map((ex, idx) => {
        const checkKey = `ex-${sync.dayOfWeek}-planned-${sync.dayOfWeek}-${ex.name}`;
        const logKey = `log-${sync.dayOfWeek}-planned-${sync.dayOfWeek}-${ex.name}`;
        const checked = !!exerciseChecks[checkKey];
        const logValue = exerciseLogs[logKey] ?? '';
        const expanded = expandedExercise === ex.name;
        const weekTarget = ex.weekTargets?.[weekKey] ?? ex.target;

        // Get intelligent progression decision
        const decision = getProgressionTarget({
          exerciseName: ex.name,
          category: ex.category,
          currentWeightKg: parseFloat(ex.target) || 0,
          currentReps: ex.repRangeMax,
          currentRPE: 7,
          repRangeMin: ex.repRangeMin,
          repRangeMax: ex.repRangeMax,
          weightIncrementKg: ex.weightIncrementKg,
          weekNumber: sync.trainingWeek.weekNumber,
          cyclePhase: sync.phase,
          consecutiveSessionsAtTop: 0,
          consecutiveSessionsStalled: 0,
          sleepHoursAvg: sleepHours,
          deficitWeeks,
        });

        const categoryColor =
          ex.category === 'heavy_compound'
            ? '#ef4444'
            : ex.category === 'light_compound'
            ? '#f59e0b'
            : '#3b82f6';

        return (
          <div key={ex.name} style={s.card}>
            <div
              style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}
            >
              {/* Checkbox */}
              <div
                onClick={() => onExerciseCheck(checkKey)}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  border: `2px solid ${checked ? '#111827' : '#d1d5db'}`,
                  background: checked ? '#111827' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {checked && '✓'}
              </div>

              {/* Exercise info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedExercise(expanded ? null : ex.name)}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: checked ? '#9ca3af' : '#1f2937',
                      }}
                    >
                      {idx + 1}. {ex.name}
                    </span>
                    {ex.supersetWith && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          marginLeft: '6px',
                        }}
                      >
                        SS: {ex.supersetWith}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      ...s.badge,
                      background: categoryColor + '15',
                      color: categoryColor,
                    }}
                  >
                    {ex.sets}
                  </span>
                </div>

                {/* Target for this week */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '6px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#111827',
                    }}
                  >
                    🎯 {weekTarget}
                  </span>
                  {decision.action === 'pr_attempt' && (
                    <span
                      style={{
                        ...s.badge,
                        background: '#fffbeb',
                        color: '#92400e',
                        fontSize: '10px',
                      }}
                    >
                      PR ⚡
                    </span>
                  )}
                  {decision.action === 'deload' && (
                    <span
                      style={{
                        ...s.badge,
                        background: '#faf5ff',
                        color: '#6b21a8',
                        fontSize: '10px',
                      }}
                    >
                      DELOAD
                    </span>
                  )}
                </div>

                {/* Expanded: log + progression info */}
                {expanded && (
                  <div style={{ marginTop: '8px' }}>
                    {/* Log input */}
                    <input
                      type="text"
                      placeholder="Log: 35kg x 10, 10, 8 RPE 7"
                      value={logValue}
                      onChange={(e) => onExerciseLog(logKey, e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        fontSize: '13px',
                      }}
                    />

                    {/* Progression advice */}
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: '#f9fafb',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#374151',
                        }}
                      >
                        Progression: {decision.reason}
                      </div>
                      {decision.warnings.length > 0 && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#92400e',
                            marginTop: '4px',
                          }}
                        >
                          {decision.warnings.map((w, i) => (
                            <div key={i}>⚠️ {w}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Week targets overview */}
                    {ex.weekTargets && (
                      <div style={{ marginTop: '8px' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                            marginBottom: '4px',
                          }}
                        >
                          6-week plan:
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {Object.entries(ex.weekTargets).map(([wk, tgt]) => {
                            const isCurrent = wk === weekKey;
                            return (
                              <span
                                key={wk}
                                style={{
                                  ...s.badge,
                                  background: isCurrent ? '#111827' : '#f3f4f6',
                                  color: isCurrent ? 'white' : '#6b7280',
                                  fontSize: '10px',
                                  padding: '3px 6px',
                                }}
                              >
                                {wk.replace('Week ', 'S')}: {tgt}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {ex.note && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          marginTop: '6px',
                        }}
                      >
                        📝 {ex.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
