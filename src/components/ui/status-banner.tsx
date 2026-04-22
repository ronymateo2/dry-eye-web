import type { ActionState } from "@/types/domain";

export function StatusBanner({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  const isError = state.status === "error";
  return (
    <div
      className="rounded-[var(--radius-md)] px-4 py-3 text-[13px]"
      style={{
        background: isError ? "rgba(204,63,48,0.12)" : "rgba(92,184,90,0.12)",
        border: `1px solid ${isError ? "rgba(204,63,48,0.3)" : "rgba(92,184,90,0.3)"}`,
        color: isError ? "var(--pain-high)" : "var(--pain-low)",
      }}
    >
      {state.message}
    </div>
  );
}
