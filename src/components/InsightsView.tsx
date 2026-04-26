// ============================================================
// components/InsightsView.tsx — Analytics & trends
// Consumes: daily logs, alertEngine, supplementEngine
// ============================================================

import React, { useMemo } from 'react';
import type { DailyLog } from '../lib/types';
import { getSupplementAdherence } from '../lib/supplementEngine';

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
    marginBottom: '10px',
  } as React.CSSProperties,
};

interface InsightsViewProps {
  recentLogs: DailyLog[];
  supplementLogs: Array<{ name: string; date: string; completed: boolean }>;
  targetWeight: number;
  targetProtein: number;
}

export function InsightsView({
  recentLogs,
  supplementLogs,
  targetWeight,
  targetProtein,
}: InsightsViewProps) {
  const insights = useMemo(
    () => computeInsights(recentLogs, supplementLogs, targetProtein),
    [recentLogs, supplementLogs, targetProtein]
  );

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* ── Summary Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '10px',
        }}
      >
        <SummaryCard
          label="Peso trend"
          value={
            insights.weightTrend.current
              ? `${insights.weightTrend.current} kg`
              : '—'
          }
          detail={
            insights.weightTrend.weeklyChange !== null
              ? `${
                  insights.weightTrend.weeklyChange > 0 ? '+' : ''
                }${insights.weightTrend.weeklyChange.toFixed(2)} kg/sem`
              : 'Sin datos'
          }
          color={insights.weightTrend.onTrack ? '#065f46' : '#92400e'}
        />
        <SummaryCard
          label="Proteína"
          value={`${insights.proteinCompliance}%`}
          detail={`${insights.proteinDaysHit}/${insights.totalDays} días ≥${targetProtein}g`}
          color={
            insights.proteinCompliance >= 80
              ? '#065f46'
              : insights.proteinCompliance >= 60
              ? '#92400e'
              : '#991b1b'
          }
        />
        <SummaryCard
          label="Suplementos"
          value={`${insights.supplementAdherence.overall}%`}
          detail={
            insights.supplementAdherence.worstAdherence !== 'N/A'
              ? `Peor: ${insights.supplementAdherence.worstAdherence}`
              : '—'
          }
          color={
            insights.supplementAdherence.overall >= 80 ? '#065f46' : '#92400e'
          }
        />
      </div>

      {/* ── Weight Chart (simple bar viz) ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>📊 Peso últimas semanas</div>
        {insights.weightEntries.length === 0 ? (
          <div
            style={{
              fontSize: '13px',
              color: '#9ca3af',
              textAlign: 'center',
              padding: '20px',
            }}
          >
            Sin datos de peso aún. Registra tu peso en el tab de hoy.
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '4px',
                height: '120px',
              }}
            >
              {insights.weightEntries.map((entry, i) => {
                const min =
                  Math.min(...insights.weightEntries.map((e) => e.weight)) - 1;
                const max =
                  Math.max(...insights.weightEntries.map((e) => e.weight)) + 1;
                const range = max - min || 1;
                const heightPct = ((entry.weight - min) / range) * 100;

                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        marginBottom: '2px',
                      }}
                    >
                      {entry.weight.toFixed(1)}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '28px',
                        height: `${Math.max(8, heightPct)}%`,
                        background:
                          i === insights.weightEntries.length - 1
                            ? '#111827'
                            : '#e5e7eb',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.3s',
                      }}
                    />
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#9ca3af',
                        marginTop: '4px',
                      }}
                    >
                      {entry.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                Target: {targetWeight} kg
              </span>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                Remaining:{' '}
                {insights.weightTrend.current
                  ? `${(insights.weightTrend.current - targetWeight).toFixed(
                      1
                    )} kg`
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Daily Compliance Heatmap ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>📅 Compliance últimos 14 días</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
          }}
        >
          {insights.last14Days.map((day, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                borderRadius: '6px',
                background:
                  day.adherence === 'green'
                    ? '#dcfce7'
                    : day.adherence === 'yellow'
                    ? '#fef9c3'
                    : day.adherence === 'red'
                    ? '#fecaca'
                    : '#f3f4f6',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
              }}
            >
              <span style={{ fontWeight: 600 }}>{day.dayLabel}</span>
              <span style={{ color: '#6b7280' }}>
                {day.proteinHit ? '✓P' : ''}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
            justifyContent: 'center',
          }}
        >
          <Legend color="#dcfce7" label="On track" />
          <Legend color="#fef9c3" label="Partial" />
          <Legend color="#fecaca" label="Missed" />
          <Legend color="#f3f4f6" label="No data" />
        </div>
      </div>

      {/* ── Calorie Trend ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>🔥 Calorías promedio</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              Últimos 7 días
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>
              {insights.avgCalories7d ?? '—'}{' '}
              <span
                style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}
              >
                kcal
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              Proteína promedio
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color:
                  (insights.avgProtein7d ?? 0) >= targetProtein
                    ? '#065f46'
                    : '#92400e',
              }}
            >
              {insights.avgProtein7d ?? '—'}{' '}
              <span
                style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}
              >
                g
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sleep & Energy ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>😴 Sueño & Energía</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
          }}
        >
          <MiniStat
            label="Sueño prom."
            value={insights.avgSleep ? `${insights.avgSleep.toFixed(1)}h` : '—'}
            target="7.5h"
            ok={insights.avgSleep !== null && insights.avgSleep >= 7}
          />
          <MiniStat
            label="Energía prom."
            value={
              insights.avgEnergy ? `${insights.avgEnergy.toFixed(1)}/10` : '—'
            }
            target="≥6"
            ok={insights.avgEnergy !== null && insights.avgEnergy >= 6}
          />
          <MiniStat
            label="Mood prom."
            value={insights.avgMood ? `${insights.avgMood.toFixed(1)}/10` : '—'}
            target="≥6"
            ok={insights.avgMood !== null && insights.avgMood >= 6}
          />
        </div>
      </div>

      {/* ── Water ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>💧 Agua promedio</div>
        <div style={{ fontSize: '20px', fontWeight: 700 }}>
          {insights.avgWater
            ? `${(insights.avgWater / 1000).toFixed(1)}L`
            : '—'}
          <span style={{ fontSize: '12px', fontWeight: 400, color: '#9ca3af' }}>
            {' '}
            / 2.5L target
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '999px',
            marginTop: '6px',
          }}
        >
          <div
            style={{
              width: `${
                insights.avgWater
                  ? Math.min(100, (insights.avgWater / 2500) * 100)
                  : 0
              }%`,
              height: '100%',
              background:
                insights.avgWater && insights.avgWater >= 2000
                  ? '#3b82f6'
                  : '#f59e0b',
              borderRadius: '999px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function SummaryCard({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div style={{ ...s.card, textAlign: 'center', padding: '12px 8px' }}>
      <div
        style={{
          fontSize: '10px',
          color: '#9ca3af',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{ fontSize: '20px', fontWeight: 700, color, marginTop: '2px' }}
      >
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
        {detail}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  target,
  ok,
}: {
  label: string;
  value: string;
  target: string;
  ok: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '10px', color: '#9ca3af' }}>{label}</div>
      <div
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: ok ? '#065f46' : '#92400e',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#9ca3af' }}>target {target}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '3px',
          background: color,
        }}
      />
      <span style={{ fontSize: '10px', color: '#6b7280' }}>{label}</span>
    </div>
  );
}

// ── Compute insights from logs ──

function computeInsights(
  logs: DailyLog[],
  supplementLogs: Array<{ name: string; date: string; completed: boolean }>,
  targetProtein: number
) {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const totalDays = sorted.length;

  // Weight trend
  const weightLogs = sorted.filter((l) => l.weightKg != null);
  const weightEntries = weightLogs
    .slice(0, 12)
    .reverse()
    .map((l) => ({
      weight: l.weightKg!,
      date: l.date,
      label: new Date(l.date).toLocaleDateString('es', {
        day: '2-digit',
        month: '2-digit',
      }),
    }));

  let weeklyChange: number | null = null;
  let onTrack = true;
  if (weightLogs.length >= 2) {
    const latest = weightLogs[0].weightKg!;
    const weekAgo = weightLogs.find((l) => {
      const diff =
        new Date(weightLogs[0].date).getTime() - new Date(l.date).getTime();
      return diff >= 5 * 86_400_000;
    });
    if (weekAgo?.weightKg) {
      const daysDiff =
        (new Date(weightLogs[0].date).getTime() -
          new Date(weekAgo.date).getTime()) /
        86_400_000;
      weeklyChange = ((latest - weekAgo.weightKg) / daysDiff) * 7;
      // On track if losing 0.15-0.5 kg/week
      onTrack = weeklyChange <= 0 && weeklyChange >= -0.5;
    }
  }

  // Protein compliance
  const proteinDaysHit = sorted.filter(
    (l) => l.proteinConsumed >= targetProtein
  ).length;
  const proteinCompliance =
    totalDays > 0 ? Math.round((proteinDaysHit / totalDays) * 100) : 0;

  // Supplement adherence
  const supplementAdherence = getSupplementAdherence(supplementLogs, totalDays);

  // Averages (7-day)
  const last7 = sorted.slice(0, 7);
  const avgCalories7d =
    last7.length > 0
      ? Math.round(
          last7.reduce((a, l) => a + l.caloriesConsumed, 0) / last7.length
        )
      : null;
  const avgProtein7d =
    last7.length > 0
      ? Math.round(
          last7.reduce((a, l) => a + l.proteinConsumed, 0) / last7.length
        )
      : null;

  const sleepLogs = last7.filter((l) => l.sleepHours != null);
  const avgSleep =
    sleepLogs.length > 0
      ? sleepLogs.reduce((a, l) => a + l.sleepHours!, 0) / sleepLogs.length
      : null;

  const energyLogs = last7.filter((l) => l.energyLevel != null);
  const avgEnergy =
    energyLogs.length > 0
      ? energyLogs.reduce((a, l) => a + l.energyLevel!, 0) / energyLogs.length
      : null;

  const moodLogs = last7.filter((l) => l.moodScore != null);
  const avgMood =
    moodLogs.length > 0
      ? moodLogs.reduce((a, l) => a + l.moodScore!, 0) / moodLogs.length
      : null;

  const waterLogs = last7.filter((l) => l.waterMl > 0);
  const avgWater =
    waterLogs.length > 0
      ? Math.round(
          waterLogs.reduce((a, l) => a + l.waterMl, 0) / waterLogs.length
        )
      : null;

  // Last 14 days compliance
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const log = sorted.find((l) => l.date === dateStr);

    let adherence: 'green' | 'yellow' | 'red' | 'none' = 'none';
    let proteinHit = false;

    if (log) {
      proteinHit = log.proteinConsumed >= targetProtein;
      const calOk = log.caloriesConsumed > 0;
      adherence = proteinHit && calOk ? 'green' : calOk ? 'yellow' : 'red';
    }

    return {
      date: dateStr,
      dayLabel: d.toLocaleDateString('es', { weekday: 'narrow' }),
      adherence,
      proteinHit,
    };
  });

  return {
    totalDays,
    weightTrend: {
      current: weightLogs[0]?.weightKg ?? null,
      weeklyChange,
      onTrack,
    },
    weightEntries,
    proteinDaysHit,
    proteinCompliance,
    supplementAdherence,
    avgCalories7d,
    avgProtein7d,
    avgSleep,
    avgEnergy,
    avgMood,
    avgWater,
    last14Days,
  };
}
