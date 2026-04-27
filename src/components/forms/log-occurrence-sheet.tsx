import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { PainSlider } from "@/components/ui/pain-slider";
import { api } from "@/lib/api";
import type { ActionState } from "@/types/domain";

type Props = {
  observation: { id: string; title: string; eye: string };
  onSaved: () => void;
};

export function LogOccurrenceSheet({ observation, onSaved }: Props) {
  const [intensity, setIntensity] = useState(5);
  const [durationRaw, setDurationRaw] = useState("");
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
      <div className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3" style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}>
        <Button className="w-full" disabled={isPending} onClick={handleSave}>
          {isPending ? "Guardando..." : "Guardar ocurrencia"}
        </Button>
      </div>
    </>
  );
}
