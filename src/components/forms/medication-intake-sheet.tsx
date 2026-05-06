import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { WheelPicker } from "@/components/ui/wheel-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function MedicationIntakeSheet({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: api.getMedications,
  });

  const [selectedMedId, setSelectedMedId] = useState("");
  const [loggedAt, setLoggedAt] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dosageTaken, setDosageTaken] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (medications.length > 0 && !selectedMedId) {
      const first = medications[0];
      setSelectedMedId(first.id);
      setDosageTaken(first.dosage ?? "");
    }
  }, [medications, selectedMedId]);

  const wheelOptions = useMemo(
    () => medications.map((m) => ({ value: m.id, label: m.name })),
    [medications],
  );

  const handleMedChange = (id: string) => {
    setSelectedMedId(id);
    const med = medications.find((m) => m.id === id);
    setDosageTaken(med?.dosage ?? "");
  };

  const handleSave = async () => {
    if (!selectedMedId) {
      toast.error("Selecciona un medicamento.");
      return;
    }
    setIsPending(true);
    const ts = loggedAt ? new Date(loggedAt).toISOString() : new Date().toISOString();
    try {
      await api.saveMedicationIntake({
        id: crypto.randomUUID(),
        medicationId: selectedMedId,
        loggedAt: ts,
        dosageTaken: dosageTaken.trim() || null,
        notes: notes.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ["medication-intakes/last-per-med"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("Toma registrada.");
      onSaved();
    } catch {
      toast.error("No se pudo registrar la toma.");
    } finally {
      setIsPending(false);
    }
  };

  if (isLoading && medications.length === 0) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-full rounded-[10px]" />
        <Skeleton className="h-[148px] w-full rounded-[16px]" />
        <Skeleton className="h-[52px] w-full rounded-full" />
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-[14px] text-[var(--text-muted)]">
        No tienes medicamentos activos.
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
      <div>
        {!showDatePicker ? (
          <button
            type="button"
            className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)]"
            onClick={() => { setShowDatePicker(true); setLoggedAt((prev) => prev ?? new Date().toISOString()); }}
          >
            ¿Olvidaste registrarla? Cambiar fecha
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="section-label mb-0">Fecha y hora</p>
              <button
                type="button"
                className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)]"
                onClick={() => { setShowDatePicker(false); setLoggedAt(null); }}
              >
                Usar hora actual
              </button>
            </div>
            <DateTimePicker value={loggedAt} onChange={setLoggedAt} max={new Date()} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="section-label mb-0">Medicamento</p>
        <WheelPicker
          label="Seleccionar medicamento"
          options={wheelOptions}
          value={selectedMedId}
          onChange={handleMedChange}
        />
      </div>

      <div className="space-y-2">
        <p className="section-label mb-0">Dosis tomada (opcional)</p>
        <input
          className="min-h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
          placeholder="ej. 1 comprimido"
          value={dosageTaken}
          onChange={(e) => setDosageTaken(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <p className="section-label mb-0">Notas (opcional)</p>
        <input
          className="min-h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
          placeholder="ej. con comida"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button
        className="w-full shadow-[0_10px_24px_var(--fab-shadow)]"
        disabled={isPending || !selectedMedId}
        type="button"
        onClick={handleSave}
      >
        {isPending ? "Guardando..." : "Registrar toma"}
      </Button>
    </div>
  );
}
