import { Button } from "@/components/ui/button";
import { FRICTION_LEVELS } from "./constants";
import type { ActionState } from "@/types/domain";

export function CalibratingView({
  selectedFriction,
  onSelect,
  onSave,
  onOmit,
  actionState,
  isSaving = false,
}: {
  selectedFriction: number | null;
  onSelect: (v: number) => void;
  onSave: () => void;
  onOmit: () => void;
  actionState: ActionState;
  isSaving?: boolean;
}) {
  const level =
    selectedFriction !== null ? FRICTION_LEVELS[selectedFriction] : null;

  return (
    <div className="flex flex-col items-center gap-5 px-5 pb-8">
      {/* Chip */}
      <div className="w-full">
        <span
          className="rounded-full px-3 py-[5px] text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          ¿Cómo se sintió?
        </span>
      </div>

      {/* Check circle */}
      <div
        className="flex h-[80px] w-[80px] items-center justify-center rounded-full"
        style={{ border: "2px solid var(--accent)" }}
      >
        <span
          className="text-[34px] leading-none"
          style={{
            color: "var(--accent)",
            display: "inline-block",
            animation: "checkScale 300ms cubic-bezier(0,0,0.2,1) forwards",
          }}
        >
          ✓
        </span>
      </div>

      {/* Confirmation */}
      <div className="text-center">
        <p
          className="text-[26px] font-semibold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Acción registrada
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
          Tu identidad se actualiza con cada acción.
        </p>
      </div>

      {/* Friction card */}
      <div
        className="w-full rounded-[var(--radius-lg)] p-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="mb-[3px] text-[11px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--text-muted)" }}
        >
          ¿Qué tan difícil fue hoy?{" "}
          <span
            className="font-normal lowercase tracking-normal"
            style={{ color: "var(--text-faint)" }}
          >
            (Opcional)
          </span>
        </p>
        <p
          className="mb-4 text-[12px] italic leading-snug"
          style={{ color: "var(--text-muted)" }}
        >
          ¿Cuánto esfuerzo te costó hacerlo hoy? No importa si fue difícil — lo
          importante es que lo hiciste.
        </p>

        {/* 0–5 buttons */}
        <div className="grid grid-cols-6 gap-[5px]">
          {FRICTION_LEVELS.map(({ val, label }) => {
            const isSelected = selectedFriction === val;
            return (
              <button
                key={val}
                className="flex flex-col items-center justify-center overflow-hidden rounded-[var(--radius-md)] py-3 transition-colors active:scale-95"
                style={{
                  minHeight: 64,
                  background: isSelected
                    ? "var(--accent-dim)"
                    : "var(--surface-el)",
                  border: `1px solid ${isSelected ? "rgba(212,162,76,0.5)" : "var(--border)"}`,
                }}
                type="button"
                onClick={() => onSelect(val)}
              >
                <span
                  className="font-mono text-[22px] font-semibold leading-none"
                  style={{
                    color: isSelected ? "var(--accent)" : "var(--text-primary)",
                  }}
                >
                  {val}
                </span>
                <span
                  className="mt-[3px] w-full whitespace-pre-line break-all text-center text-[6px] uppercase leading-tight"
                  style={{
                    color: isSelected ? "var(--accent)" : "var(--text-faint)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected description */}
        {level && (
          <p
            className="mt-3 text-[12px] italic"
            style={{ color: "var(--text-muted)" }}
          >
            {level.desc}
          </p>
        )}

        <Button
          className="mt-3 w-full"
          disabled={isSaving}
          type="button"
          onClick={onSave}
        >
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      {/* Error */}
      {actionState.status === "error" && (
        <p
          className="text-center text-[13px]"
          style={{ color: "var(--error)" }}
        >
          {actionState.message}
        </p>
      )}

      <Button
        className="w-full text-[var(--text-faint)]"
        variant="ghost"
        type="button"
        onClick={onOmit}
      >
        omitir esto
      </Button>
    </div>
  );
}
