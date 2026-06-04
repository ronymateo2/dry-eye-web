import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { PillIcon, CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { medicationsApi, medicationKeys } from "@/features/medications";
import { historyKeys } from "@/features/history";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type MedFormState = {
  checked: boolean;
  loggedAt: string | null;
  dosageTaken: string;
  notes: string;
  expanded: boolean;
};

type EditProps = {
  editIntakeId: string;
  editMedicationId: string;
  editLoggedAt: string;
  editDosageTaken: string | null;
  editNotes: string | null;
};

export function MedicationSessionSheet({
  onSaved,
  editProps,
}: {
  onSaved: () => void;
  editProps?: EditProps;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: medications = [], isLoading } = useQuery({
    queryKey: medicationKeys.list(),
    queryFn: medicationsApi.getList,
  });

  const activeMeds = useMemo(
    () => medications.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [medications],
  );

  const nowISO = useMemo(() => new Date().toISOString(), []);
  const [globalTime, setGlobalTime] = useState<string | null>(
    editProps?.editLoggedAt ?? nowISO,
  );
  const [isPending, setIsPending] = useState(false);

  const [states, setStates] = useState<Record<string, MedFormState>>({});

  const effectiveStates = useMemo(() => {
    const result = { ...states };
    for (const med of activeMeds) {
      if (!result[med.id]) {
        const isEditTarget = editProps?.editMedicationId === med.id;
        result[med.id] = {
          checked: isEditTarget,
          loggedAt: null,
          dosageTaken: isEditTarget
            ? (editProps?.editDosageTaken ?? med.dosage ?? "")
            : (med.dosage ?? ""),
          notes: isEditTarget ? (editProps?.editNotes ?? "") : "",
          expanded: isEditTarget,
        };
      }
    }
    return result;
  }, [activeMeds, states, editProps]);

  const checkedCount = useMemo(
    () => activeMeds.filter((m) => effectiveStates[m.id]?.checked).length,
    [activeMeds, effectiveStates],
  );

  const toggleCheck = (id: string) => {
    const s = effectiveStates[id];
    if (!s) return;
    setStates((prev) => ({ ...prev, [id]: { ...s, checked: !s.checked } }));
  };

  const toggleExpanded = (id: string) => {
    const s = effectiveStates[id];
    if (!s) return;
    setStates((prev) => ({ ...prev, [id]: { ...s, expanded: !s.expanded } }));
  };

  const updateField = (id: string, patch: Partial<MedFormState>) => {
    const s = effectiveStates[id];
    if (!s) return;
    setStates((prev) => ({ ...prev, [id]: { ...s, ...patch } }));
  };

  const handleSave = async () => {
    const toSave = activeMeds.filter((m) => effectiveStates[m.id]?.checked);
    if (toSave.length === 0) {
      toast.error("Selecciona al menos un medicamento.");
      return;
    }

    setIsPending(true);

    const results = await Promise.allSettled(
      toSave.map((med) => {
        const s = effectiveStates[med.id];
        const ts = s.loggedAt ?? globalTime ?? new Date().toISOString();
        return medicationsApi.saveIntake({
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

    if (editProps?.editIntakeId) {
      await medicationsApi.deleteIntake(editProps.editIntakeId).catch(() => null);
    }

    queryClient.invalidateQueries({ queryKey: medicationKeys.intakesLastPerMed() });
    queryClient.invalidateQueries({ queryKey: medicationKeys.intakesToday() });
    queryClient.invalidateQueries({ queryKey: historyKeys.all });
    queryClient.invalidateQueries({ queryKey: medicationKeys.list() });

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
        <PillIcon className="mx-auto mb-3 size-8 text-[var(--text-faint)]" weight="duotone" />
        <p className="text-[15px] font-medium text-[var(--text-primary)]">No tienes medicamentos activos</p>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Gestiona tus medicamentos en{" "}
          <button
            type="button"
            className="text-[var(--accent)] hover:text-[var(--accent-bright)]"
            onClick={() => { onSaved(); navigate("/treatments"); }}
          >
            Tratamientos
          </button>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(80dvh - env(safe-area-inset-bottom) - 48px)" }}>
      {/* Global time */}
      <div className="mb-5 space-y-2">
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
          const s = effectiveStates[med.id];
          if (!s) return null;
          return (
            <div
              key={med.id}
              className={cn(
                "relative overflow-hidden rounded-[var(--radius-md)] border transition-[border-color,background-color,box-shadow] duration-200",
                s.checked
                  ? "border-[var(--accent)]/40 bg-[var(--accent-dim)] ring-1 ring-inset ring-[var(--accent)]/15"
                  : "border-[var(--border)] bg-[var(--surface)]",
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
                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200",
                    s.checked
                      ? ""
                      : "hover:bg-[var(--surface-el)]",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] transition-all duration-200",
                      s.checked
                        ? "border-[var(--accent)] bg-[var(--accent)]"
                        : "border-[var(--text-faint)] bg-transparent",
                    )}
                  >
                    {s.checked && (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ animation: "checkScale 200ms ease-out" }}>
                        <path
                          d="M2.5 7.5L5.5 10.5L11.5 4.5"
                          stroke="var(--btn-primary-text)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  className="flex flex-1 flex-col items-start text-left active:scale-[0.98] transition-transform duration-75"
                  aria-pressed={s.checked}
                  onClick={() => toggleCheck(med.id)}
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
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-transform duration-200 hover:bg-[var(--surface-el)]",
                    s.expanded && "rotate-180",
                  )}
                >
                  <CaretDownIcon size={16} />
                </button>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {s.expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-[var(--border)] px-3 pb-3 pt-3">
                      {/* Individual time */}
                      <div className="space-y-1">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[var(--text-faint)] mb-1">
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
                        <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[var(--text-faint)] mb-1">
                          Dosis tomada
                        </p>
                        <input
                          className="text-input"
                          placeholder="ej. 1 comprimido"
                          value={s.dosageTaken}
                          onChange={(e) => updateField(med.id, { dosageTaken: e.target.value })}
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[var(--text-faint)] mb-1">
                          Notas
                        </p>
                        <input
                          className="text-input"
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
          className="w-full"
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
