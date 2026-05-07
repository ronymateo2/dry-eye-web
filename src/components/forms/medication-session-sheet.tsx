import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Pill, CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type MedFormState = {
  checked: boolean;
  loggedAt: string | null;
  dosageTaken: string;
  notes: string;
  expanded: boolean;
};

export function MedicationSessionSheet({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: api.getMedications,
  });

  const activeMeds = useMemo(
    () => medications.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [medications],
  );

  const nowISO = useMemo(() => new Date().toISOString(), []);
  const [globalTime, setGlobalTime] = useState<string | null>(nowISO);
  const [isPending, setIsPending] = useState(false);

  const [states, setStates] = useState<Record<string, MedFormState>>({});

  useEffect(() => {
    const next: Record<string, MedFormState> = {};
    for (const med of activeMeds) {
      if (!states[med.id]) {
        next[med.id] = {
          checked: false,
          loggedAt: null,
          dosageTaken: med.dosage ?? "",
          notes: "",
          expanded: false,
        };
      } else {
        next[med.id] = states[med.id];
      }
    }
    setStates(next);
  }, [activeMeds]);

  const checkedCount = useMemo(
    () => activeMeds.filter((m) => states[m.id]?.checked).length,
    [activeMeds, states],
  );

  const toggleCheck = (id: string) => {
    setStates((prev) => {
      const s = prev[id];
      if (!s) return prev;
      return { ...prev, [id]: { ...s, checked: !s.checked } };
    });
  };

  const toggleExpanded = (id: string) => {
    setStates((prev) => {
      const s = prev[id];
      if (!s) return prev;
      return { ...prev, [id]: { ...s, expanded: !s.expanded } };
    });
  };

  const updateField = (id: string, patch: Partial<MedFormState>) => {
    setStates((prev) => {
      const s = prev[id];
      if (!s) return prev;
      return { ...prev, [id]: { ...s, ...patch } };
    });
  };

  const handleSave = async () => {
    const toSave = activeMeds.filter((m) => states[m.id]?.checked);
    if (toSave.length === 0) {
      toast.error("Selecciona al menos un medicamento.");
      return;
    }

    setIsPending(true);

    const results = await Promise.allSettled(
      toSave.map((med) => {
        const s = states[med.id];
        const ts = s.loggedAt ?? globalTime ?? new Date().toISOString();
        return api.saveMedicationIntake({
          id: crypto.randomUUID(),
          medicationId: med.id,
          loggedAt: new Date(ts).toISOString(),
          dosageTaken: s.dosageTaken.trim() || null,
          notes: s.notes.trim() || null,
        });
      }),
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - successCount;

    queryClient.invalidateQueries({ queryKey: ["medication-intakes/last-per-med"] });
    queryClient.invalidateQueries({ queryKey: ["history"] });
    queryClient.invalidateQueries({ queryKey: ["medications"] });

    if (failCount === 0) {
      toast.success(
        successCount === 1 ? "Toma registrada." : `${successCount} tomas registradas.`,
      );
      onSaved();
    } else if (successCount === 0) {
      toast.error("No se pudo registrar ninguna toma.");
    } else {
      toast.warning(`${successCount} registradas, ${failCount} fallaron.`);
      onSaved();
    }

    setIsPending(false);
  };

  if (isLoading && activeMeds.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-[10px]" />
        <Skeleton className="h-[72px] w-full rounded-[10px]" />
        <Skeleton className="h-[72px] w-full rounded-[10px]" />
        <Skeleton className="h-[72px] w-full rounded-[10px]" />
        <Skeleton className="h-[52px] w-full rounded-full" />
      </div>
    );
  }

  if (activeMeds.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
        <Pill className="mx-auto mb-3 size-8 text-[var(--text-faint)]" weight="duotone" />
        <p className="text-[15px] font-medium text-[var(--text-primary)]">No tienes medicamentos activos</p>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Gestiona tus medicamentos en la pestaña Tratamientos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(80dvh - env(safe-area-inset-bottom) - 48px)" }}>
      {/* Global time */}
      <div className="mb-4 space-y-1.5">
        <p className="section-label mb-0">Hora de la toma</p>
        <DateTimePicker value={globalTime} onChange={setGlobalTime} max={new Date()} />
        <p className="text-[12px] text-[var(--text-faint)]">
          Se aplica a todas las pastillas marcadas. Puedes cambiarla por pastilla más abajo.
        </p>
      </div>

      {/* Medication list */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pb-4">
        <p className="section-label mb-0">Medicamentos</p>
        {activeMeds.map((med) => {
          const s = states[med.id];
          if (!s) return null;
          return (
            <div
              key={med.id}
              className={cn(
                "relative overflow-hidden rounded-[var(--radius-md)] border bg-[var(--surface)] transition-all duration-200",
                s.checked
                  ? "border-[var(--accent)]/30 ring-1 ring-inset ring-[var(--accent)]/10"
                  : "border-[var(--border)]",
              )}
            >
              {/* Active indicator: left edge amber line */}
              <div
                className={cn(
                  "absolute left-0 top-0 h-full w-[3px] bg-[var(--accent)] transition-opacity duration-200",
                  s.checked ? "opacity-100" : "opacity-0",
                )}
              />

              {/* Row: checkbox + info + expand chevron */}
              <div className="flex items-center gap-3 p-3 pl-4">
                <button
                  type="button"
                  aria-label={s.checked ? "Desmarcar" : "Marcar como tomada"}
                  onClick={() => toggleCheck(med.id)}
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-200",
                    s.checked
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--text-faint)] bg-transparent hover:border-[var(--text-muted)]",
                  )}
                >
                  {s.checked && (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2.5 7.5L5.5 10.5L11.5 4.5"
                        stroke="var(--accent)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className="flex flex-1 flex-col items-start text-left"
                  onClick={() => toggleExpanded(med.id)}
                >
                  <span className={cn("text-[15px] font-semibold transition-colors duration-200", s.checked ? "text-[var(--accent-bright)]" : "text-[var(--text-primary)]")}>
                    {med.name}
                  </span>
                  {med.dosage ? (
                    <span className="text-[13px] text-[var(--text-muted)]">{med.dosage}</span>
                  ) : null}
                </button>

                <button
                  type="button"
                  aria-label={s.expanded ? "Contraer detalles" : "Expandir detalles"}
                  onClick={() => toggleExpanded(med.id)}
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-transform duration-200",
                    s.expanded && "rotate-180",
                  )}
                >
                  <CaretDown size={16} />
                </button>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {s.expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-[var(--border)] px-3 pb-3 pt-3">
                      {/* Individual time */}
                      <div className="space-y-1">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                          Hora específica
                        </p>
                        <DateTimePicker
                          value={s.loggedAt}
                          onChange={(v) => updateField(med.id, { loggedAt: v })}
                          max={new Date()}
                        />
                        {!s.loggedAt && (
                          <p className="text-[11px] text-[var(--text-faint)]">
                            Sin cambios: se usa la hora general de arriba.
                          </p>
                        )}
                      </div>

                      {/* Dosage */}
                      <div className="space-y-1">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                          Dosis tomada
                        </p>
                        <input
                          className="min-h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
                          placeholder="ej. 1 comprimido"
                          value={s.dosageTaken}
                          onChange={(e) => updateField(med.id, { dosageTaken: e.target.value })}
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                          Notas
                        </p>
                        <input
                          className="min-h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
                          placeholder="ej. con comida"
                          value={s.notes}
                          onChange={(e) => updateField(med.id, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-10 -mx-[var(--screen-padding)] border-t border-[var(--border)] bg-[var(--bg)] px-[var(--screen-padding)] pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <Button
          className="w-full shadow-[0_10px_24px_var(--fab-shadow)]"
          disabled={isPending || checkedCount === 0}
          type="button"
          onClick={handleSave}
        >
          {isPending
            ? "Guardando..."
            : checkedCount === 0
              ? "Selecciona al menos una"
              : checkedCount === 1
                ? "Registrar 1 toma"
                : `Registrar ${checkedCount} tomas`}
        </Button>
      </div>
    </div>
  );
}
