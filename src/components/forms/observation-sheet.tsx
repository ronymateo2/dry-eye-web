import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  OBS_BODY_ZONE_OPTIONS,
  OBS_CATEGORY_OPTIONS,
} from "@/lib/constants";
import type { ObservationBodyZone, ObservationCategory, ActionState } from "@/types/domain";

const MAX_CHARS = 300;
const MAX_TITLE = 80;

type Props = {
  onSaved: (obs: { id: string; title: string; eye: string }) => void;
};

function PillGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { label: string; value: T }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition duration-[120ms] ease-out active:scale-95",
              active
                ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ObservationSheet({ onSaved }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [bodyZone, setBodyZone] = useState<ObservationBodyZone | null>(null);
  const [category, setCategory] = useState<ObservationCategory | null>(null);
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const canSave = title.trim().length > 0 && !isPending;
  const charsLeft = MAX_CHARS - notes.length;

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await api.createObservation({
          title: title.trim(),
          body_zone: bodyZone,
          category,
          notes: notes.trim() || undefined,
        });
        queryClient.invalidateQueries({ queryKey: ["observations"] });
        onSaved(result as { id: string; title: string; eye: string });
      } catch {
        setState({ status: "error", message: "No se pudo guardar." });
      }
    });
  };

  return (
    <>
      <div className="space-y-5 pb-4">
        {state.status !== "idle" && <StatusBanner state={state} />}

        <div className="space-y-2">
          <p className="section-label">Titulo</p>
          <input
            className={cn(
              "w-full rounded-[12px] border border-[var(--border)] bg-transparent px-4 py-3",
              "text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "focus:outline-none focus:border-[var(--accent)]",
              "h-[48px]"
            )}
            maxLength={MAX_TITLE}
            placeholder="Ej: Sensibilidad a gotas frias"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="section-label">Zona afectada</p>
          <PillGrid
            options={OBS_BODY_ZONE_OPTIONS}
            value={bodyZone}
            onChange={setBodyZone}
          />
        </div>

        <div className="space-y-2">
          <p className="section-label">Categoria</p>
          <PillGrid
            options={OBS_CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
          />
        </div>

        <div className="space-y-2">
          <p className="section-label">Descripcion (opcional)</p>
          <div className="relative">
            <textarea
              className={cn(
                "w-full resize-none rounded-[12px] border border-[var(--border)] bg-transparent px-4 py-3",
                "text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:border-[var(--accent)]",
                "min-h-[80px]"
              )}
              maxLength={MAX_CHARS}
              placeholder="Describe la observacion..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <span
              className={cn(
                "absolute bottom-3 right-4 text-[11px] tabular-nums",
                charsLeft < 30 ? "text-[var(--pain-high)]" : "text-[var(--text-muted)]"
              )}
            >
              {notes.length}/{MAX_CHARS}
            </span>
          </div>
        </div>
      </div>

      <div
        className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}
      >
        <Button className="w-full" disabled={!canSave} type="button" onClick={handleSave}>
          {isPending ? "Guardando..." : "Guardar observacion"}
        </Button>
      </div>
    </>
  );
}
