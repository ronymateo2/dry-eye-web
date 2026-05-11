import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { PainSlider } from "@/components/ui/pain-slider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PAIN_QUALITY_OPTIONS } from "@/lib/constants";
import type { ActionState, TriggerType, PainQuality } from "@/types/domain";

type Props = {
  observation: { id: string; title: string; eye: string };
  onSaved: () => void;
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

const TRIGGER_OPTS = [
  { label: "Pantallas", value: "screens" },
  { label: "TV", value: "tv" },
  { label: "Estres", value: "stress" },
  { label: "Ejercicio", value: "exercise" },
  { label: "Clima", value: "climate" },
  { label: "Humidificador", value: "humidifier" },
  { label: "Ergonomia", value: "ergonomics" },
  { label: "Otro", value: "other" },
] as const satisfies readonly { label: string; value: TriggerType }[];

export function LogOccurrenceSheet({ observation, onSaved }: Props) {
  const [intensity, setIntensity] = useState(5);
  const [durationRaw, setDurationRaw] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType | null>(null);
  const [painQuality, setPainQuality] = useState<PainQuality | null>(null);
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [isPending, setIsPending] = useState(false);

  const handleSave = async () => {
    const durationMinutes = durationRaw === "" ? null : Math.max(1, parseInt(durationRaw, 10) || 1);
    setIsPending(true);
    try {
      await api.saveOccurrence(observation.id, {
        id: crypto.randomUUID(),
        loggedAt: new Date().toISOString(),
        intensity,
        durationMinutes,
        triggerType,
        painQuality,
        notes: notes.trim(),
      });
      toast.success("Ocurrencia guardada.");
      onSaved();
    } catch {
      setState({ status: "error", message: "No se pudo guardar." });
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-4">
        {state.status !== "idle" && <StatusBanner state={state} />}
        <p className="text-[13px] text-[var(--text-muted)]">{observation.title}</p>

        <PainSlider label="Intensidad" value={intensity} onChange={setIntensity} />

        <div className="space-y-2">
          <p className="section-label">Duracion (min, opcional)</p>
          <input
            className="w-full h-12 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            inputMode="numeric"
            placeholder="Ej: 15"
            type="number"
            value={durationRaw}
            onChange={(e) => setDurationRaw(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="section-label">Tipo de sensacion (opcional)</p>
          <PillGrid
            options={PAIN_QUALITY_OPTIONS}
            value={painQuality}
            onChange={setPainQuality}
          />
        </div>

        <div className="space-y-2">
          <p className="section-label">Trigger (opcional)</p>
          <PillGrid
            options={TRIGGER_OPTS}
            value={triggerType}
            onChange={setTriggerType}
          />
        </div>

        <div className="space-y-2">
          <p className="section-label">Notas (opcional)</p>
          <textarea
            className="w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] min-h-[80px]"
            maxLength={300}
            placeholder="Que mas notaste?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div
        className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}
      >
        <Button className="w-full" disabled={isPending} onClick={handleSave}>
          {isPending ? "Guardando..." : "Guardar ocurrencia"}
        </Button>
      </div>
    </>
  );
}
