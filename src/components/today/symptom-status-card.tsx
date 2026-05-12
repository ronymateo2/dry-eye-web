import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  DropIcon,
  FireIcon,
  SunIcon,
  WaveSineIcon,
  DropHalfIcon,
  LightningIcon,
  CircleHalfIcon,
  EyeClosedIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { SYMPTOM_STATE_COLOR, SYMPTOM_STATE_COPY, SYMPTOM_STATE_LABEL } from "@/lib/symptom-state";
import { cn } from "@/lib/utils";
import type { SymptomIntensities, SymptomState, SymptomTopItem } from "@/types/domain";

const SYMPTOM_ICONS: Record<keyof SymptomIntensities, React.ElementType> = {
  dryness: DropIcon,
  burning: FireIcon,
  photophobia: SunIcon,
  blurry_vision: WaveSineIcon,
  tearing: DropHalfIcon,
  stinging: LightningIcon,
  pressure: CircleHalfIcon,
};

const SYMPTOM_LABELS: Record<keyof SymptomIntensities, string> = {
  dryness: "Sequedad",
  burning: "Ardor",
  photophobia: "Fotofobia",
  blurry_vision: "V. Borrosa",
  tearing: "Lagrimeo",
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

function IntensityGauge({ value, state }: { value: number; state: SymptomState }) {
  const color = SYMPTOM_STATE_COLOR[state];
  const pct = value / 10;
  const r = 28;
  const cx = 36;
  const cy = 36;
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
    <div className="relative flex flex-col items-center">
      <svg
        width="72"
        height="56"
        viewBox="0 0 72 72"
        aria-label={`Intensidad promedio ${value} de 10, estado ${SYMPTOM_STATE_LABEL[state]}`}
        role="img"
      >
        <path
          d={arcPath(startAngle, startAngle + sweepAngle, r)}
          fill="none"
          stroke="var(--surface-el)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={arcPath(startAngle, endAngle, r)}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute top-[18px] flex flex-col items-center leading-none">
        <span className="mono text-[15px] font-bold" style={{ color }}>
          {value}/10
        </span>
      </div>
    </div>
  );
}

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
    <div className="flex flex-col items-center gap-0.5">
      <Icon size={14} style={{ color }} className="shrink-0" />
      <span className="text-[10px] text-[var(--text-muted)] leading-none text-center">{label}</span>
      <span className="mono text-[11px] font-semibold" style={{ color }}>
        {item.value}/10
      </span>
    </div>
  );
}

type Props = {
  onRegister: () => void;
};

export function SymptomStatusCard({ onRegister }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["symptoms/today"],
    queryFn: api.getSymptomStatusToday,
    staleTime: 60_000,
  });

  const latest = data?.latest ?? null;
  const topSymptoms = data?.top_symptoms ?? [];

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
      <motion.button
        type="button"
        onClick={onRegister}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
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
            <p className="text-[13px] font-medium text-[var(--text-primary)]">Registrar síntomas</p>
            <p className="text-[12px] text-[var(--text-faint)]">Aún no hay registro hoy</p>
          </div>
        </div>
      </motion.button>
    );
  }

  const state = latest.calculated_state as SymptomState;
  const color = SYMPTOM_STATE_COLOR[state];
  const copy = SYMPTOM_STATE_COPY[state];
  const label = SYMPTOM_STATE_LABEL[state];

  const allVals = [
    latest.intensities.dryness,
    latest.intensities.burning,
    latest.intensities.photophobia,
    latest.intensities.blurry_vision,
    latest.intensities.tearing,
    latest.intensities.stinging ?? 0,
    latest.intensities.pressure ?? 0,
  ].filter((v) => v > 0);
  const avgVal =
    allVals.length > 0
      ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length)
      : 0;

  const timeAgo = formatRelative(latest.logged_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="section-label mb-0">Estado actual</p>
        <button
          type="button"
          className="flex items-center justify-center text-[var(--text-faint)] opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Información sobre el cálculo de estado"
          title={`Estado calculado a partir de la intensidad promedio de los síntomas. Última actualización: ${timeAgo}`}
        >
          <InfoIcon size={14} />
        </button>
      </div>

      {/* Main row: state + gauge */}
      <button
        type="button"
        onClick={onRegister}
        className="w-full text-left mb-3"
        aria-label="Actualizar registro de síntomas"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-semibold leading-tight" style={{ color }}>
              {label}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{copy}</p>
            <p className="text-[11px] text-[var(--text-faint)] mt-1">{timeAgo}</p>
          </div>
          <IntensityGauge value={avgVal} state={state} />
        </div>
      </button>

      {/* Top symptoms grid */}
      {topSymptoms.length > 0 && (
        <>
          <div className="h-px bg-[var(--border)] mb-3" />
          <div className="grid grid-cols-5 gap-1">
            {topSymptoms.slice(0, 5).map((item) => (
              <TopSymptomCell key={item.key} item={item} />
            ))}
          </div>
        </>
      )}

      {/* Advice footer */}
      <div className="mt-3 h-px bg-[var(--border)]" />
      <div className="mt-2.5 flex items-start gap-2">
        <SunIcon size={12} className="mt-[2px] shrink-0 text-[var(--accent)]" />
        <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-primary)]">Consejo del día: </span>
          {ADVICE[state]}
        </p>
      </div>
    </motion.div>
  );
}

function formatRelative(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr >= 24) return `hace ${Math.floor(diffHr / 24)}d`;
  if (diffHr > 0) return `hace ${diffHr}h`;
  if (diffMin > 0) return `hace ${diffMin}m`;
  return "ahora";
}
