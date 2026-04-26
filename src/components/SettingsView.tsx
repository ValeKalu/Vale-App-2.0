// ============================================================
// components/SettingsView.tsx — Profile & settings
// ============================================================

import React, { useState } from 'react';
import type { CycleSyncState } from '../hooks/useCycleSync';

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
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '14px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '4px',
    marginTop: '12px',
  } as React.CSSProperties,
  button: {
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    background: '#111827',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    width: '100%',
  } as React.CSSProperties,
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    padding: '10px 14px',
    background: 'white',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    width: '100%',
  } as React.CSSProperties,
};

interface SettingsViewProps {
  sync: CycleSyncState;
  // Cycle
  periodStartDate: string;
  onPeriodStartChange: (date: string) => void;
  periodEndDate: string;
  onPeriodEndChange: (date: string) => void;
  spottingStartDate: string;
  onSpottingStartChange: (date: string) => void;
  cycleLength: number;
  onCycleLengthChange: (len: number) => void;
  // Deficit
  deficitStartDate: string;
  onDeficitStartChange: (date: string) => void;
  // Weight
  currentWeight: string;
  targetWeight: number;
  // Export
  onExportData: () => void;
  onResetData: () => void;
}

export function SettingsView({
  sync,
  periodStartDate,
  onPeriodStartChange,
  periodEndDate,
  onPeriodEndChange,
  spottingStartDate,
  onSpottingStartChange,
  cycleLength,
  onCycleLengthChange,
  deficitStartDate,
  onDeficitStartChange,
  currentWeight,
  targetWeight,
  onExportData,
  onResetData,
}: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const weightNum = parseFloat(currentWeight) || 73;
  const toGo = weightNum - targetWeight;
  const weeksEstimate = toGo > 0 ? Math.round(toGo / 0.25) : 0;

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* ── Profile Summary ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>👤 Perfil</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <InfoRow label="Nombre" value="Val" />
          <InfoRow label="Edad" value="39" />
          <InfoRow label="Altura" value="1.61 m" />
          <InfoRow label="Peso actual" value={`${currentWeight || '73'} kg`} />
          <InfoRow label="Peso objetivo" value={`${targetWeight} kg`} />
          <InfoRow
            label="Por perder"
            value={
              toGo > 0
                ? `${toGo.toFixed(1)} kg (~${weeksEstimate} sem)`
                : 'Meta alcanzada'
            }
          />
          <InfoRow label="Dieta" value="Pescatariana" />
          <InfoRow label="Medicación" value="Bupropion" />
          <InfoRow label="Ferritina" value="18 µg/L (baja)" highlight />
          <InfoRow label="TDEE" value="2070 kcal" />
          <InfoRow label="Déficit" value="~350 kcal/día" />
          <InfoRow
            label="Proteína target"
            value={`${sync.targets.proteinG}g (${(
              sync.targets.proteinG / weightNum
            ).toFixed(1)} g/kg)`}
          />
        </div>
      </div>

      {/* ── Cycle Settings ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>🔴 Ciclo menstrual</div>

        <label style={s.label}>Inicio última regla</label>
        <input
          type="date"
          value={periodStartDate}
          onChange={(e) => onPeriodStartChange(e.target.value)}
          style={s.input}
        />

        <label style={s.label}>Fin menstruación</label>
        <input
          type="date"
          value={periodEndDate}
          onChange={(e) => onPeriodEndChange(e.target.value)}
          style={s.input}
        />

        <label style={s.label}>Inicio spotting premenstrual</label>
        <input
          type="date"
          value={spottingStartDate}
          onChange={(e) => onSpottingStartChange(e.target.value)}
          style={s.input}
        />

        <label style={s.label}>Duración ciclo (días)</label>
        <input
          type="number"
          value={cycleLength}
          onChange={(e) => onCycleLengthChange(parseInt(e.target.value) || 31)}
          min={21}
          max={45}
          style={s.input}
        />

        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            background: '#f9fafb',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Fase actual: {sync.phaseEmoji} {sync.phaseLabel} (día{' '}
            {sync.cycleDay})
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            Próxima regla: ~{sync.nextPeriodDate} ({sync.daysUntilNextPeriod}{' '}
            días)
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            Semana training: {sync.trainingWeek.weekLabel}
          </div>
        </div>
      </div>

      {/* ── Deficit Tracking ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>📉 Déficit calórico</div>

        <label style={s.label}>Inicio del déficit</label>
        <input
          type="date"
          value={deficitStartDate}
          onChange={(e) => onDeficitStartChange(e.target.value)}
          style={s.input}
        />

        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            background: '#f9fafb',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          <div>
            Recomendación: diet break de 5-7 días at TDEE (2070 kcal) cada 6-8
            semanas. Idealmente durante fase lútea tardía. (Byrne 2018, Int J
            Obes)
          </div>
        </div>
      </div>

      {/* ── Labs Reference ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>🔬 Labs (Marzo 2026)</div>
        <div style={{ display: 'grid', gap: '6px' }}>
          <LabRow
            label="Ferritina"
            value="18 µg/L"
            status="low"
            note="GP prescribió hierro"
          />
          <LabRow
            label="HbA1c"
            value="40 mmol/mol"
            status="borderline"
            note="Borde superior normal"
          />
          <LabRow
            label="MCV"
            value="82 fL"
            status="borderline"
            note="Consistente con déficit Fe"
          />
          <LabRow
            label="Hemoglobina"
            value="134 g/L"
            status="normal"
            note="Normal sin holgura"
          />
          <LabRow label="TSH" value="1.59 mU/L" status="normal" note="" />
          <LabRow
            label="Estradiol"
            value="725 pmol/L"
            status="high"
            note="Día 18, lútea temprana"
          />
          <LabRow
            label="Progesterona"
            value="0.6 nmol/L"
            status="low"
            note="Baja en lútea temprana"
          />
          <LabRow
            label="Testosterona"
            value="<0.4 nmol/L"
            status="normal"
            note="Normal bajo"
          />
        </div>
      </div>

      {/* ── Data Management ── */}
      <div style={s.card}>
        <div style={s.sectionTitle}>💾 Datos</div>

        <button
          onClick={onExportData}
          style={{ ...s.secondaryButton, marginBottom: '10px' }}
        >
          📤 Exportar datos (JSON)
        </button>

        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            style={{
              ...s.secondaryButton,
              color: '#991b1b',
              borderColor: '#fecaca',
            }}
          >
            🗑 Resetear todos los datos
          </button>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            <div
              style={{ fontSize: '13px', color: '#991b1b', fontWeight: 600 }}
            >
              ¿Estás segura? Esto borrará todo el historial.
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              <button
                onClick={() => {
                  onResetData();
                  setConfirmReset(false);
                }}
                style={{ ...s.button, background: '#991b1b' }}
              >
                Sí, borrar
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                style={s.secondaryButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── App Info ── */}
      <div
        style={{
          textAlign: 'center',
          padding: '12px',
          fontSize: '11px',
          color: '#9ca3af',
        }}
      >
        Val Health App v2.0 · Cycle-synced nutrition + training
        <br />
        Evidence-based: Mountjoy 2023, Niering 2024, Helms 2014
      </div>
    </div>
  );
}

// ── Sub-components ──

function InfoRow({
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

function LabRow({
  label,
  value,
  status,
  note,
}: {
  label: string;
  value: string;
  status: 'normal' | 'low' | 'high' | 'borderline';
  note: string;
}) {
  const statusColors = {
    normal: '#065f46',
    low: '#991b1b',
    high: '#92400e',
    borderline: '#92400e',
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <div>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
        {note && (
          <span
            style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}
          >
            {note}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: statusColors[status],
        }}
      >
        {value}
      </span>
    </div>
  );
}
