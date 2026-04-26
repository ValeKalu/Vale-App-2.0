// ============================================================
// components/TodayView.tsx — Daily dashboard
// Consumes: useCycleSync, mealEngine, supplementEngine
// ============================================================

import React, { useState } from 'react';
import type { CyclePhase, SupplementScheduleItem } from '../lib/types';
import type { CycleSyncState } from '../hooks/useCycleSync';
import { checkProteinCompliance } from '../lib/mealEngine';

// ── Shared styles (consistent with existing app) ──
const s = {
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '14px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '5px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  } as React.CSSProperties,
  progressWrap: {
    width: '100%',
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '999px',
    overflow: 'hidden',
    marginTop: '6px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '8px',
  } as React.CSSProperties,
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  } as React.CSSProperties,
  checkbox: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    border: '2px solid #d1d5db',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '14px',
    transition: 'all 0.15s',
  } as React.CSSProperties,
};

const PHASE_COLORS: Record<
  CyclePhase,
  { bg: string; text: string; accent: string }
> = {
  menstrual: { bg: '#fef2f2', text: '#991b1b', accent: '#ef4444' },
  follicular: { bg: '#ecfdf5', text: '#065f46', accent: '#10b981' },
  ovulatory: { bg: '#fffbeb', text: '#92400e', accent: '#f59e0b' },
  luteal_early: { bg: '#f0f9ff', text: '#1e40af', accent: '#3b82f6' },
  luteal_late: { bg: '#faf5ff', text: '#6b21a8', accent: '#8b5cf6' },
};

interface TodayViewProps {
  sync: CycleSyncState;
  // Meal tracking
  meals: Array<{
    key: string;
    time: string;
    label: string;
    detail: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    micronote?: string;
  }>;
  mealChecks: Record<string, boolean>;
  onMealCheck: (key: string) => void;
  // Supplement tracking
  supplementChecks: Record<string, boolean>;
  onSupplementCheck: (key: string) => void;
  // Water
  waterMl: number;
  onWaterAdd: (ml: number) => void;
  // Mood
  moodScore: number | null;
  moodNote: string;
  onMoodChange: (score: number, note: string) => void;
  // Symptoms
  symptoms: string[];
  onSymptomsChange: (symptoms: string[]) => void;
  // Weight
  weightKg: string;
  onWeightChange: (val: string) => void;
}

export function TodayView({
  sync,
  meals,
  mealChecks,
  onMealCheck,
  supplementChecks,
  onSupplementCheck,
  waterMl,
  onWaterAdd,
  moodScore,
  moodNote,
  onMoodChange,
  symptoms,
  onSymptomsChange,
  weightKg,
  onWeightChange,
}: TodayViewProps) {
  const colors = PHASE_COLORS[sync.phase];
  const [showMealDetails, setShowMealDetails] = useState<string | null>(null);

  // ── Computed values ──
  const checkedMeals = meals.filter(
    (m) => mealChecks[`meal-${sync.dayOfWeek}-${m.key}`]
  );
  const consumedCals = checkedMeals.reduce((a, m) => a + m.calories, 0);
  const consumedProtein = checkedMeals.reduce((a, m) => a + m.protein, 0);
  const consumedCarbs = checkedMeals.reduce((a, m) => a + m.carbs, 0);
  const consumedFat = checkedMeals.reduce((a, m) => a + m.fats, 0);

  const proteinCheck = checkProteinCompliance(
    consumedProtein,
    sync.targets.proteinG,
    73
  );
  const calPercent = Math.round((consumedCals / sync.adjustedCalories) * 100);

  const completedSupps = sync.supplements.filter(
    (sup) => supplementChecks[`supp-${sync.dayOfWeek}-${sup.name}`]
  ).length;
  const suppPercent =
    sync.supplements.length > 0
      ? Math.round((completedSupps / sync.supplements.length) * 100)
      : 0;

  const waterTarget = 2500;
  const waterPercent = Math.round((waterMl / waterTarget) * 100);

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* ── Phase Banner ── */}
      <div
        style={{
          ...s.card,
          background: colors.bg,
          borderColor: colors.accent + '40',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{ fontSize: '13px', color: colors.text, fontWeight: 600 }}
          >
            Día {sync.cycleDay} · {sync.phaseEmoji} {sync.phaseLabel}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: colors.text + 'cc',
              marginTop: '2px',
            }}
          >
            {sync.trainingWeek.weekLabel} ·{' '}
            {sync.isTrainingDay ? '🏋️ Gym day' : '😌 Rest day'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: colors.text + 'aa' }}>
            Próxima regla
          </div>
          <div
            style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}
          >
            {sync.daysUntilNextPeriod > 0
              ? `${sync.daysUntilNextPeriod}d`
              : 'Hoy'}
          </div>
        </div>
      </div>

      {/* ── Training Strategy Note ── */}
      {sync.targets.trainingStrategy && (
        <div
          style={{
            ...s.card,
            padding: '10px 14px',
            background: sync.targets.isPRWindow
              ? '#fffbeb'
              : sync.targets.isDeloadPhase
              ? '#faf5ff'
              : '#f0f9ff',
            border: 'none',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700 }}>
            {sync.targets.isPRWindow
              ? '⚡ '
              : sync.targets.isDeloadPhase
              ? '🌊 '
              : '📋 '}
            {sync.targets.trainingStrategy}
          </div>
          {sync.targets.nutritionNotes && (
            <div
              style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}
            >
              {sync.targets.nutritionNotes}
            </div>
          )}
        </div>
      )}

      {/* ── Macros Summary ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Macros</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '8px',
          }}
        >
          <MacroMini
            label="kcal"
            consumed={consumedCals}
            target={sync.adjustedCalories}
            color="#111827"
          />
          <MacroMini
            label="P"
            consumed={consumedProtein}
            target={sync.targets.proteinG}
            color={
              proteinCheck.severity === 'green'
                ? '#10b981'
                : proteinCheck.severity === 'yellow'
                ? '#f59e0b'
                : '#ef4444'
            }
          />
          <MacroMini
            label="C"
            consumed={consumedCarbs}
            target={sync.targets.carbsG}
            color="#3b82f6"
          />
          <MacroMini
            label="F"
            consumed={consumedFat}
            target={sync.targets.fatG}
            color="#8b5cf6"
          />
        </div>
        <div style={{ ...s.progressWrap, marginTop: '10px' }}>
          <div
            style={{
              width: `${Math.min(100, calPercent)}%`,
              height: '100%',
              background: calPercent > 105 ? '#ef4444' : '#111827',
              borderRadius: '999px',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#6b7280',
            marginTop: '4px',
            textAlign: 'right',
          }}
        >
          {consumedCals} / {sync.adjustedCalories} kcal ({calPercent}%)
        </div>
      </div>

      {/* ── Meals ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Comidas</div>
        {meals.map((meal) => {
          const checkKey = `meal-${sync.dayOfWeek}-${meal.key}`;
          const checked = !!mealChecks[checkKey];
          const expanded = showMealDetails === meal.key;

          return (
            <div key={meal.key} style={s.checkRow}>
              <div
                style={{
                  ...s.checkbox,
                  background: checked ? '#111827' : 'white',
                  borderColor: checked ? '#111827' : '#d1d5db',
                  color: 'white',
                }}
                onClick={() => onMealCheck(checkKey)}
              >
                {checked && '✓'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowMealDetails(expanded ? null : meal.key)}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {meal.time}{' '}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        textDecoration: checked ? 'line-through' : 'none',
                        color: checked ? '#9ca3af' : '#1f2937',
                      }}
                    >
                      {meal.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {meal.calories} · P{meal.protein}
                  </span>
                </div>
                {expanded && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '4px',
                    }}
                  >
                    {meal.detail}
                    {meal.micronote && (
                      <span style={{ color: '#3b82f6', marginLeft: '6px' }}>
                        • {meal.micronote}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Supplements ── */}
      <div style={s.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={s.sectionTitle}>Suplementos</div>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {completedSupps}/{sync.supplements.length}
          </span>
        </div>
        {sync.supplements.map((sup) => {
          const checkKey = `supp-${sync.dayOfWeek}-${sup.name}`;
          const checked = !!supplementChecks[checkKey];

          return (
            <div key={sup.name} style={s.checkRow}>
              <div
                style={{
                  ...s.checkbox,
                  background: checked ? '#111827' : 'white',
                  borderColor: checked ? '#111827' : '#d1d5db',
                  color: 'white',
                  width: '20px',
                  height: '20px',
                }}
                onClick={() => onSupplementCheck(checkKey)}
              >
                {checked && '✓'}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: checked ? '#9ca3af' : '#1f2937',
                    }}
                  >
                    {sup.name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {sup.timing}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {sup.dose}
                  {sup.priority === 'critical' && (
                    <span
                      style={{
                        color: '#ef4444',
                        fontWeight: 700,
                        marginLeft: '6px',
                      }}
                    >
                      ● PRIORIDAD
                    </span>
                  )}
                </div>
                {sup.phaseNote && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: PHASE_COLORS[sync.phase].text,
                      marginTop: '2px',
                    }}
                  >
                    {sup.phaseNote}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {sync.supplementWarnings.length > 0 && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#fffbeb',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#92400e',
            }}
          >
            {sync.supplementWarnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}
      </div>

      {/* ── Water + Weight + Mood row ── */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
      >
        {/* Water */}
        <div style={s.card}>
          <div style={s.sectionTitle}>💧 Agua</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>
            {(waterMl / 1000).toFixed(1)}L
            <span
              style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}
            >
              {' '}
              / 2.5L
            </span>
          </div>
          <div style={s.progressWrap}>
            <div
              style={{
                width: `${Math.min(100, waterPercent)}%`,
                height: '100%',
                background: waterPercent >= 100 ? '#10b981' : '#3b82f6',
                borderRadius: '999px',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginTop: '8px',
              flexWrap: 'wrap',
            }}
          >
            {[250, 500].map((ml) => (
              <button
                key={ml}
                onClick={() => onWaterAdd(ml)}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                +{ml}ml
              </button>
            ))}
          </div>
        </div>

        {/* Weight */}
        <div style={s.card}>
          <div style={s.sectionTitle}>⚖️ Peso</div>
          <input
            type="number"
            step="0.1"
            value={weightKg}
            onChange={(e) => onWeightChange(e.target.value)}
            placeholder="73.0"
            style={{
              width: '100%',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              padding: '8px 10px',
              fontSize: '16px',
              fontWeight: 700,
            }}
          />
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
            Target: 60 kg ·{' '}
            {weightKg
              ? `${(parseFloat(weightKg) - 60).toFixed(1)} kg to go`
              : ''}
          </div>
        </div>
      </div>

      {/* ── Mood ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>😊 Mood & Síntomas</div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => onMoodChange(n, moodNote)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                border:
                  moodScore === n ? '2px solid #111827' : '1px solid #e5e7eb',
                background: moodScore === n ? '#111827' : 'white',
                color: moodScore === n ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                padding: 0,
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {SYMPTOM_OPTIONS.map((sym) => {
            const active = symptoms.includes(sym);
            return (
              <button
                key={sym}
                onClick={() => {
                  onSymptomsChange(
                    active
                      ? symptoms.filter((x) => x !== sym)
                      : [...symptoms, sym]
                  );
                }}
                style={{
                  ...s.badge,
                  cursor: 'pointer',
                  background: active ? '#111827' : '#f3f4f6',
                  color: active ? 'white' : '#6b7280',
                  border: 'none',
                }}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Craving Strategy (phase-specific) ── */}
      {sync.targets.cravingStrategy && (
        <div
          style={{
            ...s.card,
            background: colors.bg,
            border: 'none',
            padding: '10px 14px',
          }}
        >
          <div
            style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}
          >
            💡 {sync.targets.cravingStrategy}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function MacroMini({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.round((consumed / target) * 100) : 0;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 700, color }}>{consumed}</div>
      <div style={{ fontSize: '10px', color: '#9ca3af' }}>/ {target}</div>
      <div
        style={{
          width: '100%',
          height: '4px',
          background: '#e5e7eb',
          borderRadius: '999px',
          marginTop: '4px',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, pct)}%`,
            height: '100%',
            background: color,
            borderRadius: '999px',
          }}
        />
      </div>
    </div>
  );
}

const SYMPTOM_OPTIONS = [
  'Fatigue',
  'Headache',
  'Cramps',
  'Bloating',
  'Low energy',
  'Cravings',
  'Insomnia',
  'Spotting',
  'Anxiety',
  'Irritability',
  'Hair loss',
  'Palpitations',
  'Dizziness',
  'Nausea',
];
