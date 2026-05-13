import { CheckIcon } from "@phosphor-icons/react";

type TimeRowProps = {
  time: string;
  children: React.ReactNode;
};

export function TimelineRow({ time, children }: TimeRowProps) {
  return (
    <div className="grid grid-cols-[44px_16px_1fr] items-center gap-2">
      <span className="mono text-[12px] font-normal tabular-nums text-[var(--text-primary)]">{time}</span>
      {children}
    </div>
  );
}

export function TimelineDot({ color = "var(--accent)" }: { color?: string }) {
  return (
    <div className="relative flex h-6 items-center justify-center">
      <span
        className="relative z-10 block h-[7px] w-[7px] rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)`,
        }}
      />
    </div>
  );
}

export function TimelineGap({ lineColor, children }: { lineColor?: string; children?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[44px_16px_1fr] items-center gap-2">
      <span />
      <div className="relative flex h-5 items-center justify-center" aria-hidden>
        <span
          className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
          style={{ background: lineColor ?? "color-mix(in srgb, var(--accent) 28%, transparent)" }}
        />
      </div>
      {children ? (
        <div className="flex items-center gap-2">
          <span
            className="h-px flex-1 max-w-[18px]"
            style={{ background: `color-mix(in srgb, ${lineColor ?? "var(--accent)"} 22%, transparent)` }}
            aria-hidden
          />
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function CheckBadge({ color = "var(--pain-low)" }: { color?: string }) {
  return (
    <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
      <CheckIcon size={9} color={color} />
    </div>
  );
}