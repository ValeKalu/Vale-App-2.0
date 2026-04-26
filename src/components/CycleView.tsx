// ============================================================
// components/CycleView.tsx — Cycle tracking & alerts
// Consumes: cycleEngine, alertEngine
// ============================================================

import React, { useState } from 'react';
import type { CyclePhase, AlertLevel } from '../lib/types';
import type { CycleSyncState } from '../hooks/useCycleSync';
import {
  evaluateAlerts,
  buildSymptomReport,
  checkDeficitDuration,
  calculateLEA,
} from '../lib/alertEngine';
import type { DailyLog } from '../lib/types';

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
    padding: '5px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  } as React.CSSProperties,
};

const PHASE_INFO: Record<
  CyclePhase,
  {
    emoji: string;
    label: string;
    color: string;
    bg: string;
    description: string;
  }
> = {
  menstrual: {
    emoji: '🔴',
    label: 'Menstrual',
    color: '#991b1b',
    bg: '#fef2f2',
    description:
      'Iron priority. Anti-inflammatory foods. Gentle restart of training volume.',
  },
  follicular: {
    emoji: '🌱',
    label: 'Folicular',
    color: '#065f46',
    bg: '#ecfdf5',
    description:
      'Rising energy. Best insulin sensitivity. Push training volume. Easiest phase for adherence.',
  },
  ovulatory: {
    emoji: '⚡',
    label: 'Ovulatoria',
    color: '#92400e',
    bg: '#fffbeb',
    description:
      'Peak strength window. PR attempts. +5g protein. Extra hydration.',
  },
  luteal_early: {
    emoji: '🌙',
    label: 'Lútea temprana',
    color: '#1e40af',
    bg: '#f0f9ff',
    description:
      'Standard training. Watch hydration (temp +0.3°C). Antojos may start.',
  },
  luteal_late: {
    emoji: '🌊',
    label: 'Lútea tardía',
    color: '#6b21a8',
    bg: '#faf5ff',
    description:
      'DELOAD. Volume -30%. +carbs justified by RMR increase. FLEX COMPLETO. NO CULPA.',
  },
};

const ALERT_COLORS: Record<
  AlertLevel,
  { bg: string; border: string; text: string; icon: string }
> = {
  red: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '🔴' },
  orange: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', icon: '🟠' },
  yellow: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '🟡' },
  green: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '🟢' },
};

interface CycleViewProps {
  sync: CycleSyncState;
  periodStartDate: string;
  onPeriodStartChange: (date: string) => void;
  periodEndDate: string;
  spottingStartDate: string;
  recentLogs: DailyLog[];
  deficitStartDate: string;
  ferritinLevel: number;
  todayCalories: number;
  todayExerciseKcal: number;
}

export function CycleView({
  sync,
  periodStartDate,
  onPeriodStartChange,
  periodEndDate,
  spottingStartDate,
  recentLogs,
  deficitStartDate,
  ferritinLevel,
  todayCalories,
  todayExerciseKcal,
}: CycleViewProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const phaseInfo = PHASE_INFO[sync.phase];

  // ── Alert evaluation ──
  const symptomReport = buildSymptomReport(recentLogs, ferritinLevel);
  const alertResult = evaluateAlerts(symptomReport);
  const alertColors = ALERT_COLORS[alertResult.level];

  // ── Deficit duration ──
  const deficitCheck = checkDeficitDuration(deficitStartDate);

  // ── LEA ──
  const lea = calculateLEA(todayCalories, todayExerciseKcal);

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* ── Current Phase Card ── */}
      <div
        style={{
          ...s.card,
          background: phaseInfo.bg,
          borderColor: phaseInfo.color + '30',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>
              {phaseInfo.emoji}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: phaseInfo.color,
              }}
            >
              {phaseInfo.label}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: phaseInfo.color + 'cc',
                marginTop: '2px',
              }}
            >
              Día {sync.cycleDay} de 31
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: phaseInfo.color + 'aa' }}>
              Próxima regla
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: phaseInfo.color,
              }}
            >
              {sync.daysUntilNextPeriod > 0
                ? `${sync.daysUntilNextPeriod}d`
                : '¡Hoy!'}
            </div>
            <div style={{ fontSize: '11px', color: phaseInfo.color + 'aa' }}>
              ~{sync.nextPeriodDate}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: phaseInfo.color + 'cc',
            marginTop: '10px',
            lineHeight: '1.5',
          }}
        >
          {phaseInfo.description}
        </div>
      </div>

      {/* ── Cycle Calendar (31-day grid) ── */}
      <div style={s.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={s.sectionTitle}>Ciclo actual</div>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '4px 10px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            ✏️ Ajustar
          </button>
        </div>

        {showDatePicker && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>
              Inicio última regla:
            </label>
            <input
              type="date"
              value={periodStartDate}
              onChange={(e) => onPeriodStartChange(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '8px 10px',
                fontSize: '14px',
                marginTop: '4px',
              }}
            />
          </div>
        )}

        {/* 31-day grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
          }}
        >
          {Array.from({ length: 31 }, (_, i) => {
            const day = i + 1;
            const isCurrent = day === sync.cycleDay;
            const dayPhase = getDayPhase(day);
            const dayColor = PHASE_INFO[dayPhase];

            return (
              <div
                key={day}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: isCurrent ? 800 : 500,
                  background: isCurrent ? '#111827' : dayColor.bg,
                  color: isCurrent ? 'white' : dayColor.color,
                  border: isCurrent
                    ? '2px solid #111827'
                    : '1px solid transparent',
                }}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Phase legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '10px',
          }}
        >
          {Object.entries(PHASE_INFO).map(([key, info]) => (
            <div
              key={key}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: info.bg,
                  border: `1px solid ${info.color}30`,
                }}
              />
              <span style={{ fontSize: '10px', color: '#6b7280' }}>
                {info.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Health Alert Card ── */}
      <div
        style={{
          ...s.card,
          background: alertColors.bg,
          borderColor: alertColors.border,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>{alertColors.icon}</span>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: alertColors.text,
            }}
          >
            Health Status: {alertResult.level.toUpperCase()}
          </div>
          <span style={{ fontSize: '11px', color: alertColors.text + 'aa' }}>
            (score: {alertResult.score})
          </span>
        </div>

        {alertResult.flags.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            {alertResult.flags.map((flag, i) => (
              <div
                key={i}
                style={{
                  fontSize: '12px',
                  color: alertColors.text,
                  marginBottom: '4px',
                  paddingLeft: '8px',
                  borderLeft: `2px solid ${alertColors.text}40`,
                }}
              >
                {flag}
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: '12px', color: alertColors.text + 'cc' }}>
          {alertResult.actions.map((action, i) => (
            <div key={i} style={{ marginBottom: '2px' }}>
              → {action}
            </div>
          ))}
        </div>

        {alertResult.medicalReferral && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#fef2f2',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#991b1b',
            }}
          >
            🏥 Medical referral recommended
          </div>
        )}
      </div>

      {/* ── Deficit Duration + LEA ── */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
      >
        <div style={s.card}>
          <div style={s.sectionTitle}>Déficit</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>
            {deficitCheck.weeks} sem
          </div>
          <div
            style={{
              fontSize: '11px',
              color: deficitCheck.needsDietBreak ? '#991b1b' : '#6b7280',
              marginTop: '4px',
            }}
          >
            {deficitCheck.message}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sectionTitle}>LEA</div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color:
                lea.level === 'safe'
                  ? '#065f46'
                  : lea.level === 'adaptable'
                  ? '#1e40af'
                  : lea.level === 'problematic'
                  ? '#92400e'
                  : '#991b1b',
            }}
          >
            {lea.lea}{' '}
            <span style={{ fontSize: '12px', fontWeight: 400 }}>kcal/kg</span>
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            {lea.message}
          </div>
        </div>
      </div>

      {/* ── Cycle Stats ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Datos del ciclo</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <StatRow label="Duración ciclo" value="31 días" />
          <StatRow label="Menstruación" value="8-9 días" />
          <StatRow label="Inicio última regla" value={periodStartDate} />
          <StatRow label="Fin menstruación" value={periodEndDate || '—'} />
          <StatRow
            label="Spotting premenstrual"
            value={
              spottingStartDate
                ? `desde ${spottingStartDate}`
                : '3-4 días típico'
            }
          />
          <StatRow
            label="Ferritina"
            value={`${ferritinLevel} µg/L`}
            highlight={ferritinLevel < 30}
          />
        </div>
      </div>

      {/* ── Training Impact by Phase ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Entrenamiento por fase</div>
        {Object.entries(PHASE_INFO).map(([key, info]) => {
          const phase = key as CyclePhase;
          const isCurrent = phase === sync.phase;
          return (
            <div
              key={key}
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                marginBottom: '4px',
                background: isCurrent ? info.bg : 'transparent',
                border: isCurrent
                  ? `1px solid ${info.color}30`
                  : '1px solid transparent',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? info.color : '#6b7280',
                  }}
                >
                  {info.emoji} {info.label}
                </span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {getPhaseTrainingLabel(phase)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ──

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</div>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: highlight ? '#991b1b' : '#1f2937',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function getDayPhase(day: number): CyclePhase {
  if (day <= 7) return 'menstrual';
  if (day <= 14) return 'follicular';
  if (day <= 17) return 'ovulatory';
  if (day <= 24) return 'luteal_early';
  return 'luteal_late';
}

function getPhaseTrainingLabel(phase: CyclePhase): string {
  switch (phase) {
    case 'menstrual':
      return 'Vol −10%, RPE 7';
    case 'follicular':
      return 'Vol +10%, PUSH';
    case 'ovulatory':
      return 'PR week ⚡';
    case 'luteal_early':
      return 'Maintain, RPE 7-8';
    case 'luteal_late':
      return 'DELOAD, Vol −30%';
  }
}
