import { memo } from "react";
import { painColor, qualityColor, painGradient, qualityGradient } from "@/lib/pain";

type PainSliderProps = {
  label: string;
  icon?: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  variant?: "pain" | "quality";
};

export const PainSlider = memo(function PainSlider({ label, icon, value, onChange, variant = "pain" }: PainSliderProps) {
  const colorFn = variant === "quality" ? qualityColor : painColor;
  const gradientFn = variant === "quality" ? qualityGradient : painGradient;

  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-4">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)]">
          {icon}{label}
        </span>
        <span className="mono text-[22px] font-normal" style={{ color: colorFn(value) }}>
          {value}
        </span>
      </div>
      <input
        aria-label={label}
        aria-valuemax={10}
        aria-valuemin={0}
        aria-valuenow={value}
        className="pain-range"
        max={10}
        min={0}
        style={{ "--track-bg": gradientFn(value), "--thumb-color": colorFn(value) } as React.CSSProperties}
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
});
