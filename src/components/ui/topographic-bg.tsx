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
        background: `radial-gradient(${size} circle at ${position}, transparent 0%, 26%, color-mix(in srgb, var(--topo-accent) 1%, transparent) 0%, 46%, color-mix(in srgb, var(--topo-accent) 4%, transparent) 0%, 60%, color-mix(in srgb, var(--topo-accent) 8%, transparent) 0%, 82%, color-mix(in srgb, var(--topo-accent) 12%, transparent) 0%)`,
      }}
    />
  );
}
