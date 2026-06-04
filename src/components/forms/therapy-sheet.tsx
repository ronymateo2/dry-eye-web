import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { therapyApi } from "@/features/therapy";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TherapyType } from "@/types/domain";

const THERAPY_OPTIONS: { id: TherapyType; label: string }[] = [
  { id: "miofascial", label: "Miofascial" },
  { id: "other", label: "Otro" },
];

const pillClass = (active: boolean) =>
  cn(
    "inline-flex items-center justify-center min-h-[44px] rounded-[999px] border px-4 text-[13px] font-medium transition-[color,background-color,border-color] duration-[160ms] ease-out active:scale-[0.97]",
    active
      ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
      : "border-[var(--border)] bg-transparent text-[var(--text-muted)]",
  );

export function TherapySheet({ onSaved }: { onSaved: () => void }) {
  const [therapyType, setTherapyType] = useState<TherapyType>("miofascial");
  const [notes, setNotes] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [loggedAt, setLoggedAt] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async () => {
    setIsPending(true);
    try {
      await therapyApi.saveSession({
        id: crypto.randomUUID(),
        loggedAt: loggedAt ?? new Date().toISOString(),
        therapyType,
        notes: notes.trim() || null,
      });
      toast.success("Terapia registrada.");
      onSaved();
    } catch {
      toast.error("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">Tipo</p>
        <div className="flex flex-wrap gap-2">
          {THERAPY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={pillClass(therapyType === opt.id)}
              onClick={() => setTherapyType(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">Hora</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={pillClass(!useCustomTime)}
            onClick={() => { setUseCustomTime(false); setLoggedAt(null); }}
          >
            Ahora
          </button>
          <button
            type="button"
            className={pillClass(useCustomTime)}
            onClick={() => { setUseCustomTime(true); setLoggedAt((p) => p ?? new Date().toISOString()); }}
          >
            Cambiar hora
          </button>
        </div>
        {useCustomTime && (
          <DateTimePicker max={new Date()} value={loggedAt} onChange={setLoggedAt} />
        )}
      </div>

      <TextInput
        placeholder="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />

      <Button className="w-full" disabled={isPending} type="button" onClick={handleSave}>
        {isPending ? "Guardando..." : "Registrar sesión"}
      </Button>
    </div>
  );
}
