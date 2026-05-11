import { memo } from "react";
import { painColor, qualityColor, painGradient, qualityGradient } from "@/lib/pain";

type PainSliderProps = {
  label: string;
  labelClassName?: string;
  icon?: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  scale?: "integer" | "vas";
  variant?: "pain" | "quality";
};

function formatValue(value: number, scale: "integer" | "vas"): string {
  return scale === "vas" ? value.toFixed(1) : String(value);
}

function normalizeValue(value: number, scale: "integer" | "vas"): number {
  if (scale === "vas") return Math.round(value * 10) / 10;
  return Math.round(value);
}

export const PainSlider = memo(function PainSlider({ label, labelClassName, icon, value, onChange, scale = "integer", variant = "pain" }: PainSliderProps) {
  const colorFn = variant === "quality" ? qualityColor : painColor;
  const gradientFn = variant === "quality" ? qualityGradient : painGradient;
  const displayValue = formatValue(value, scale);

  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-4">
        <span className={labelClassName ?? "flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)]"}>
          {icon}{label}
        </span>
        <span className="mono text-[22px] font-normal" style={{ color: colorFn(value), transition: "color 200ms cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {displayValue}
        </span>
      </div>
      <input
        aria-label={label}
        aria-valuemax={10}
        aria-valuemin={0}
        aria-valuenow={value}
        aria-valuetext={`${displayValue} de 10`}
        className="pain-range"
        max={10}
        min={0}
        step={scale === "vas" ? 0.1 : 1}
        style={{ "--track-bg": gradientFn(value), "--thumb-color": colorFn(value) } as React.CSSProperties}
        type="range"
        value={value}
        onChange={(e) => onChange(normalizeValue(Number(e.target.value), scale))}
      />
    </div>
  );
});
