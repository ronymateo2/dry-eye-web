import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { TextInput } from "@/components/ui/text-input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TimesPicker, parseTimesJson } from "@/components/treatments/times-picker";
import { ArchiveConfirm } from "@/components/treatments/archive-confirm";
import { api } from "@/lib/api";
import type { MedicationRecord, MedicationPhase } from "@/types/domain";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

export type MedForm = {
  name: string;
  dosage: string;
  frequency: string;
  notes: string;
  startDate: string;
  endDate: string;
  phases: MedicationPhase[];
  times: string[];
};

export const EMPTY_MED_FORM: MedForm = {
  name: "",
  dosage: "",
  frequency: "",
  notes: "",
  startDate: "",
  endDate: "",
  phases: [],
  times: [],
};

export function parsePhasesJson(json: string | null | undefined): MedicationPhase[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function MedFormContent({
  item,
  onClose,
}: {
  item: MedicationRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = item !== null;

  const [form, setForm] = useState<MedForm>(
    item
      ? {
          name: item.name,
          dosage: item.dosage ?? "",
          frequency: item.frequency ?? "",
          notes: item.notes ?? "",
          startDate: item.start_date ?? "",
          endDate: item.end_date ?? "",
          phases: parsePhasesJson(item.phases_json),
          times: parseTimesJson(item.times_json),
        }
      : EMPTY_MED_FORM,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        dosage: form.dosage.trim() || null,
        frequency: form.frequency.trim() || null,
        notes: form.notes.trim() || null,
        startDate: form.startDate.trim() || null,
        endDate: form.endDate.trim() || null,
        phasesJson: form.phases.length > 0 ? JSON.stringify(form.phases) : null,
        timesJson: form.times.length > 0 ? form.times : null,
      };
      return isEdit ? api.updateMedication(item!.id, body) : api.createMedication(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      toast.success(isEdit ? "Medicamento actualizado." : "Medicamento guardado.");
      onClose();
    },
    onError: () => toast.error("No se pudo guardar el medicamento."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteMedication(item!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["medications/archived"] });
      toast.success("Medicamento archivado.");
      onClose();
    },
    onError: () => toast.error("No se pudo archivar."),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-[13px] text-[var(--text-faint)]">Nombre</p>
        <TextInput
          placeholder="ej. Ciclosporina 0.1%"
          value={form.name}
          autoFocus={!isEdit}
          rows={1}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[13px] text-[var(--text-faint)]">Dosis</p>
        <TextInput
          placeholder="ej. 1 gota, 600mg"
          value={form.dosage}
          rows={1}
          onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[13px] text-[var(--text-faint)]">Frecuencia</p>
        <TextInput
          placeholder="ej. 2 veces al día"
          value={form.frequency}
          rows={1}
          onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[13px] text-[var(--text-faint)]">Horarios (Google Calendar)</p>
        <TimesPicker
          value={form.times}
          onChange={(times) => setForm((f) => ({ ...f, times }))}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[13px] text-[var(--text-faint)]">Notas</p>
        <TextInput
          placeholder="opcional"
          value={form.notes}
          rows={2}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[13px] text-[var(--text-faint)]">Ciclo (opcional)</p>
        <DateRangePicker
          from={form.startDate || null}
          to={form.endDate || null}
          onChange={(f, t) => setForm((fm) => ({ ...fm, startDate: f ?? "", endDate: t ?? "" }))}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[13px] text-[var(--text-faint)]">Fases (opcional)</p>
        <div className="space-y-2">
          {form.phases.map((phase, i) => (
            <div key={i} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-el)] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Etiqueta (ej. Fase 1)"
                  value={phase.label}
                  onChange={(e) => setForm((f) => {
                    const phases = [...f.phases];
                    phases[i] = { ...phases[i], label: e.target.value };
                    return { ...f, phases };
                  })}
                  className="flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-faint)]"
                />
                <button
                  type="button"
                  aria-label="Eliminar fase"
                  onClick={() => setForm((f) => ({ ...f, phases: f.phases.filter((_, j) => j !== i) }))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--error)] opacity-60 hover:opacity-100 transition-opacity"
                >
                  <TrashIcon size={15} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Dosis (ej. 1g)"
                value={phase.dosage}
                onChange={(e) => setForm((f) => {
                  const phases = [...f.phases];
                  phases[i] = { ...phases[i], dosage: e.target.value };
                  return { ...f, phases };
                })}
                className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-faint)]"
              />
              <DateRangePicker
                from={phase.start_date || null}
                to={phase.end_date || null}
                onChange={(s, e) => setForm((f) => {
                  const phases = [...f.phases];
                  phases[i] = { ...phases[i], start_date: s ?? "", end_date: e ?? null };
                  return { ...f, phases };
                })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm((f) => ({
              ...f,
              phases: [...f.phases, { label: "", dosage: "", start_date: "", end_date: null }],
            }))}
            className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[var(--border)] py-2 text-[13px] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            <PlusIcon size={12} weight="bold" />
            Agregar fase
          </button>
        </div>
      </div>
      <Button
        className="w-full"
        disabled={saveMutation.isPending || !form.name.trim()}
        type="button"
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar medicamento"}
      </Button>

      {isEdit && !confirmDelete && (
        <Button
          variant="plain-error"
          className="w-full"
          onClick={() => setConfirmDelete(true)}
        >
          Archivar medicamento
        </Button>
      )}

      {isEdit && confirmDelete && (
        <ArchiveConfirm
          label="¿Archivar este medicamento? Tu historial de tomas se mantiene intacto."
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

export function MedSheet({
  item,
  open,
  onClose,
}: {
  item: MedicationRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = item !== null;

  return (
    <MobileSheet
      open={open}
      title={isEdit ? "Editar medicamento" : "Nuevo medicamento"}
      description={isEdit ? `Editando ${item?.name ?? ""}` : "Agrega un medicamento a tu perfil."}
      onClose={onClose}
    >
      {open && <MedFormContent key={item?.id ?? "new"} item={item} onClose={onClose} />}
    </MobileSheet>
  );
}
