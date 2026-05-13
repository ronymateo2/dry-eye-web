import { type ReactNode } from "react";
import { motion } from "motion/react";

export function CircularProgress({
  size = 100,
  strokeWidth = 4,
  progress,
  color,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color: string;
  children: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-el)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.23, 1, 0.32, 1)" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

export function CountdownValue({
  label,
  overdue,
  color,
  progress,
  onClick,
}: {
  label: string;
  overdue: boolean;
  color: string;
  progress?: number;
  onClick?: () => void;
}) {
  const cleanLabel = label.replace(/^hace\s+/, "");
  const parts = cleanLabel.split(" ");

  return (
    <div
      className="grid gap-1 justify-items-center"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <CircularProgress size={88} progress={progress ?? 0} color={color}>
        <p className="mb-0.5 text-[8px] font-semibold uppercase leading-none tracking-[0.10em]" style={{ color }}>
          {overdue ? "Vencida" : "En"}
        </p>
        <div className="flex flex-nowrap items-end gap-x-0.5 whitespace-nowrap leading-none" style={{ color }}>
          {parts.map((part) => {
            const value = part.slice(0, -1);
            const unit = part.slice(-1);
            return (
              <span key={part} className="inline-flex items-end gap-0.5">
                <motion.span
                  key={`val-${part}`}
                  initial={{ scale: 1.04, opacity: 0.85 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="font-mono tabular-nums"
                  style={{ fontSize: parts.length > 1 ? 20 : 22, fontWeight: 600, lineHeight: 0.9 }}
                >
                  {value}
                </motion.span>
                <span className="pb-0.5 text-[11px] font-semibold leading-none">
                  {unit}
                </span>
              </span>
            );
          })}
        </div>
      </CircularProgress>
    </div>
  );
}
