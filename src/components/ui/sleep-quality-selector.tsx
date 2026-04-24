import { cn } from "@/lib/utils";
import type { SleepQuality } from "@/types/domain";
import { SLEEP_QUALITY_OPTIONS } from "@/lib/constants";

type QualityMeta = { color: string; activeBg: string; bars: number };

const QUALITY_META: Record<SleepQuality, QualityMeta> = {
  muy_malo:  { color: "#cc3f30", activeBg: "rgba(204,63,48,0.13)",  bars: 1 },
  malo:      { color: "#e0932a", activeBg: "rgba(224,147,42,0.13)", bars: 2 },
  regular:   { color: "#8a7860", activeBg: "rgba(138,120,96,0.13)", bars: 3 },
  bueno:     { color: "#5cb85a", activeBg: "rgba(92,184,90,0.13)",  bars: 4 },
  excelente: { color: "#d4a24c", activeBg: "rgba(212,162,76,0.13)", bars: 5 },
};

function SignalBars({ bars, color, active }: { bars: number; color: string; active: boolean }) {
  const heights = [4, 7, 10, 13, 16];
  const W = 3, GAP = 2;
  const totalW = 5 * W + 4 * GAP;
  const maxH = 16;
  return (
    <svg width={totalW} height={maxH} aria-hidden="true">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * (W + GAP)} y={maxH - h}
          width={W} height={h} rx={1.5}
          fill={i < bars && active ? color : "var(--text-faint)"}
          opacity={i < bars ? 1 : 0.5}
        />
      ))}
    </svg>
  );
}

export function SleepQualitySelector({
  value,
  onChange,
}: {
  value: SleepQuality | null;
  onChange: (v: SleepQuality) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="section-label">Calidad del sueno</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {SLEEP_QUALITY_OPTIONS.map((opt) => {
          const q = opt.value as SleepQuality;
          const meta = QUALITY_META[q];
          const active = value === q;
          return (
            <button
              key={q}
              type="button"
              onClick={() => onChange(q)}
              className={cn("flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[10px] border px-1 py-3 transition-colors duration-150")}
              style={{
                borderColor: active ? meta.color : "var(--border)",
                backgroundColor: active ? meta.activeBg : "var(--surface)",
              }}
            >
              <SignalBars bars={meta.bars} color={meta.color} active={active} />
              <span
                className="text-center text-[11px] font-medium leading-tight"
                style={{ color: active ? meta.color : "var(--text-muted)" }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
