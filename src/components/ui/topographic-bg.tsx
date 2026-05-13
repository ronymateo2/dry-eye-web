import { cn } from "@/lib/utils";

export function TopographicBg({
  className,
  position = "top right",
  size = "farthest-corner"
}: {
  className?: string;
  position?: string;
  size?: string;
}) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{
        background: `radial-gradient(${size} circle at ${position}, transparent 0%, transparent 20%, color-mix(in srgb, var(--topo-accent) 2%, transparent) 45%, color-mix(in srgb, var(--topo-accent) 4%, transparent) 70%, color-mix(in srgb, var(--topo-accent) 6%, transparent) 100%)`,
      }}
    />
  );
}
