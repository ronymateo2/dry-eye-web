import { memo } from "react";
import { motion } from "motion/react";
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

export const PainSlider = memo(function PainSlider({
  label,
  labelClassName,
  icon,
  value,
  onChange,
  scale = "integer",
  variant = "pain",
}: PainSliderProps) {
  const colorFn = variant === "quality" ? qualityColor : painColor;
  const gradientFn = variant === "quality" ? qualityGradient : painGradient;
  const displayValue = formatValue(value, scale);
  const color = colorFn(value);

  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-4">
        <span
          className={
            labelClassName ??
            "flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)]"
          }
        >
          {icon}
          {label}
        </span>
        <motion.span
          key={displayValue}
          initial={{ scale: 1.12, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
          className="text-[24px] font-normal tabular-nums leading-none"
          style={{ color, fontFamily: "var(--font-mono)" }}
        >
          {displayValue}
        </motion.span>
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
        style={
          {
            "--track-bg": gradientFn(value),
            "--thumb-color": color,
          } as React.CSSProperties
        }
        type="range"
        value={value}
        onChange={(e) => onChange(normalizeValue(Number(e.target.value), scale))}
      />
    </div>
  );
});
