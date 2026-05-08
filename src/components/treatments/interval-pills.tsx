import { useState } from "react";

const INTERVAL_OPTIONS: { label: string; value: number | null }[] = [
  { label: "A necesidad", value: null },
  { label: "c/2h", value: 2 },
  { label: "c/4h", value: 4 },
  { label: "c/6h", value: 6 },
  { label: "c/8h", value: 8 },
  { label: "c/12h", value: 12 },
  { label: "c/24h", value: 24 },
];

export function intervalLabel(hours: number | null | undefined): string {
  if (!hours) return "a necesidad";
  const opt = INTERVAL_OPTIONS.find((o) => o.value === hours);
  return opt ? opt.label : `c/${hours}h`;
}

export function IntervalPills({
  selected,
  onChange,
}: {
  selected: number | null;
  onChange: (v: number | null) => void;
}) {
  const isPreset = INTERVAL_OPTIONS.some((o) => o.value === selected);
  const isCustom = selected !== null && !isPreset;
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customVal, setCustomVal] = useState(isCustom ? String(selected) : "");

  const handleCustomCommit = () => {
    const n = parseInt(customVal, 10);
    if (n > 0) onChange(n);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {INTERVAL_OPTIONS.map((opt) => {
        const active = !showCustom && opt.value === selected;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setShowCustom(false); onChange(opt.value); }}
            className="rounded-full px-3 py-1 text-[12px] font-medium"
            style={{
              background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-faint)",
              border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
              transition: "color 120ms ease-out, background 120ms ease-out, border-color 120ms ease-out",
            }}
          >
            {opt.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setShowCustom(true)}
        className="rounded-full px-3 py-1 text-[12px] font-medium"
        style={{
          background: showCustom ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
          color: showCustom ? "var(--accent)" : "var(--text-faint)",
          border: showCustom ? "1.5px solid var(--accent)" : "1px solid var(--border)",
          transition: "color 120ms ease-out, background 120ms ease-out, border-color 120ms ease-out",
        }}
      >
        {isCustom && !showCustom ? `c/${selected}h` : "Otro..."}
      </button>
      {showCustom && (
        <div className="flex w-full items-center gap-2 pt-1">
          <span className="text-[13px] text-[var(--text-muted)]">c/</span>
          <input
            type="number"
            min="1"
            max="72"
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            onBlur={handleCustomCommit}
            onKeyDown={(e) => e.key === "Enter" && handleCustomCommit()}
            placeholder="ej. 3"
            autoFocus
            className="w-20 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <span className="text-[13px] text-[var(--text-muted)]">horas</span>
        </div>
      )}
    </div>
  );
}
