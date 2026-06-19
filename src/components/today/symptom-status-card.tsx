import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNow } from "@/lib/hooks/use-now";
import {
  DropHalfIcon,
  FireIcon,
  SunIcon,
  WaveSineIcon,
  LightningIcon,
  CircleHalfIcon,
  EyeClosedIcon,
} from "@phosphor-icons/react";
import { symptomsApi, symptomKeys } from "@/features/symptoms";
import { SYMPTOM_STATE_COLOR, SYMPTOM_STATE_COPY, SYMPTOM_STATE_LABEL } from "@/lib/symptom-state";
import { cn } from "@/lib/utils";
import { TopographicBg } from "@/components/ui/topographic-bg";
import type { SymptomIntensities, SymptomState, SymptomTopItem } from "@/types/domain";

const SYMPTOM_ICONS: Record<keyof SymptomIntensities, React.ElementType> = {
  dryness: DropHalfIcon,
  burning: FireIcon,
  photophobia: SunIcon,
  blurry_vision: WaveSineIcon,
  stinging: LightningIcon,
  pressure: CircleHalfIcon,
};

const SYMPTOM_LABELS: Record<keyof SymptomIntensities, string> = {
  dryness: "Sequedad",
  burning: "Ardor",
  photophobia: "Fotofobia",
  blurry_vision: "V. Borrosa",
  stinging: "Pinchazos",
  pressure: "Presión",
};

const ADVICE: Record<SymptomState, string> = {
  calmado: "Mantén hidratación y pausa de pantallas cada hora",
  leve: "Aplica gotas lubricantes y reduce el tiempo en pantalla",
  sensible: "Hidratación + pausas visuales cada 20 min",
  reactivo: "Evita aires directos y reduce estímulos visuales",
  brote: "Considera compresas frías y consulta con tu médico",
};

const IntensityGauge = memo(function IntensityGauge({
  value,
  color,
  label,
  onClick,
}: {
  value: number;
  color: string;
  label?: string;
  onClick?: () => void;
}) {
  const pct = value / 10;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 46;
  const startAngle = -210;
  const sweepAngle = 240;
  const endAngle = startAngle + sweepAngle * pct;

  function polarToXY(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function arcPath(start: number, end: number, radius: number) {
    const s = polarToXY(start, radius);
    const e = polarToXY(end, radius);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center shrink-0"
      style={{ width: size, height: size, cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      aria-label={label ? `${label}: ${value} de 10` : `Intensidad promedio ${value} de 10`}
    >
      {onClick && (
        <>
          <style>{`
            @keyframes gaugeRingPulse {
              0%   { transform: scale(1);    opacity: 0.35; }
              65%  { transform: scale(1.15); opacity: 0; }
              100% { transform: scale(1.15); opacity: 0; }
            }
          `}</style>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 10,
              borderRadius: "50%",
              border: `2px solid ${color}`,
              animation: "gaugeRingPulse 2.2s ease-out infinite",
              pointerEvents: "none",
            }}
          />
        </>
      )}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <path
          d={arcPath(startAngle, startAngle + sweepAngle, r)}
          fill="none"
          stroke="var(--surface-el)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={arcPath(startAngle, endAngle, r)}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            style={{ transition: "stroke 0.4s ease, d 0.4s ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="mono text-[24px] font-bold leading-none" style={{ color }}>
          {value}/10
        </span>
        {label && (
          <span
            key={label}
            className="anim-fade-up text-[9px] font-semibold uppercase tracking-[0.08em] leading-none"
            style={{ color: "var(--text-faint)" }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
});

function TopSymptomCell({ item }: { item: SymptomTopItem }) {
  const Icon = SYMPTOM_ICONS[item.key];
  const label = SYMPTOM_LABELS[item.key];
  const color =
    item.value >= 7
      ? "var(--pain-high)"
      : item.value >= 4
        ? "var(--pain-mid)"
        : "var(--pain-low)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Icon size={20} style={{ color }} className="shrink-0" />
      <span className="text-[12px] text-[var(--text-muted)] leading-none text-center">{label}</span>
      <span className="mono text-[17px] font-semibold" style={{ color }}>
        {item.value}/10
      </span>
    </div>
  );
}

type Props = {
  onRegister: () => void;
};

function RelativeTime({ iso }: { iso: string }) {
  const now = useNow();
  return <>{formatRelative(iso, now)}</>;
}

export const SymptomStatusCard = memo(function SymptomStatusCard({ onRegister }: Props) {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: symptomKeys.today(),
    queryFn: symptomsApi.getStatusToday,
    staleTime: 60_000,
  });

  const latest = data?.latest ?? null;
  const topSymptoms = data?.top_symptoms ?? [];

  const state = (latest?.calculated_state ?? "calmado") as SymptomState;
  const color = SYMPTOM_STATE_COLOR[state];

  const allVals = latest
    ? [
      latest.intensities.dryness,
      latest.intensities.burning,
      latest.intensities.photophobia,
      latest.intensities.blurry_vision,
      latest.intensities.stinging ?? 0,
      latest.intensities.pressure ?? 0,
    ].filter((v) => v > 0)
    : [];
  const avgVal =
    allVals.length > 0
      ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length)
      : 0;

  if (isLoading) {
    return (
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-[var(--surface-el)]" />
        <div className="mt-3 h-16 animate-pulse rounded-[10px] bg-[var(--surface-el)]" />
      </div>
    );
  }

  if (!latest) {
    return (
      <button
        type="button"
        onClick={onRegister}
        className={cn(
          "anim-fade-up",
          "w-full rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4 text-left",
          "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
          "hover:bg-[color-mix(in_srgb,var(--surface-card)_95%,var(--accent))]",
        )}
        aria-label="Registrar síntomas oculares"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
            <EyeClosedIcon size={18} className="text-[var(--text-faint)]" />
          </div>
          <div>
            <p className="text-[15px] font-medium text-[var(--text-primary)]">Registrar síntomas</p>
            <p className="text-[14px] text-[var(--text-faint)]">Aún no hay registro hoy</p>
          </div>
        </div>
      </button>
    );
  }

  const copy = SYMPTOM_STATE_COPY[state];
  const label = SYMPTOM_STATE_LABEL[state];
  const timeAgo = formatRelative(latest.logged_at, dataUpdatedAt);

  return (
    <div className="anim-fade-up relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
      <TopographicBg position="calc(100% + 20px) calc(100% + 10px)" size="600px" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <p className="section-label mb-0">Estado actual</p>
          <button
            type="button"
            className="flex items-center justify-center text-[var(--text-faint)] opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Información sobre el cálculo de estado"
            title={`Estado calculado a partir de la intensidad promedio de los síntomas. Última actualización: ${timeAgo}`}
          >
          </button>
        </div>

        {/* Main row: state + gauge */}
        <button
          type="button"
          onClick={onRegister}
          className="w-full text-left mb-3"
          aria-label="Actualizar registro de síntomas"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[28px] font-bold leading-tight tracking-[-0.02em]" style={{ color }}>
                {label}
              </p>
              <p className="text-[17px] font-medium text-[var(--text-muted)] mt-2">{copy}</p>
              <p className="text-[13px] text-[var(--text-faint)] mt-1.5">
                <RelativeTime iso={latest.logged_at} />
              </p>
            </div>
            <IntensityGauge
              value={avgVal}
              color={color}
              onClick={onRegister}
            />
          </div>
        </button>

        {/* Top symptoms grid */}
        {topSymptoms.length > 0 && (
          <>
            <div className="h-px bg-[var(--border)] my-4" />
            <div className="grid grid-cols-5 gap-x-1 gap-y-3">
              {topSymptoms.slice(0, 5).map((item) => (
                <TopSymptomCell key={item.key} item={item} />
              ))}
            </div>
          </>
        )}

        {/* Advice footer */}
        <div className="mt-4 h-px bg-[var(--border)]" />
        <div className="mt-2.5 flex items-start gap-2">
          <SunIcon size={12} className="mt-[2px] shrink-0 text-[var(--accent)]" />
          <p className="text-[14px] leading-relaxed text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-primary)]">Consejo del día: </span>
            {ADVICE[state]}
          </p>
        </div>
      </div>
    </div>
  );
});

function formatRelative(isoStr: string, now: number): string {
  const diffMs = now - new Date(isoStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr >= 24) return `hace ${Math.floor(diffHr / 24)}d`;
  if (diffHr > 0) return `hace ${diffHr}h`;
  if (diffMin > 0) return `hace ${diffMin}m`;
  return "ahora";
}
