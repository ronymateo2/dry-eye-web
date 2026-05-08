import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { TextInput } from "@/components/ui/text-input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { IntervalPills } from "@/components/treatments/interval-pills";
import { ArchiveConfirm } from "@/components/treatments/archive-confirm";
import { api } from "@/lib/api";
import type { DropTypeRecord } from "@/types/domain";

export type DropForm = { name: string; intervalHours: number | null; startDate: string; endDate: string };

function DropFormContent({
  item,
  onClose,
}: {
  item: DropTypeRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = item !== null;

  const [form, setForm] = useState<DropForm>(
    item
      ? {
          name: item.name,
          intervalHours: item.interval_hours ?? null,
          startDate: item.start_date ?? "",
          endDate: item.end_date ?? "",
        }
      : { name: "", intervalHours: null, startDate: "", endDate: "" },
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? api.updateDropType(item!.id, {
            intervalHours: form.intervalHours,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
          })
        : api.createDropType(form.name.trim(), form.intervalHours, form.startDate || null, form.endDate || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      qc.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      toast.success(isEdit ? "Gota actualizada." : "Gota guardada.");
      onClose();
    },
    onError: () => toast.error("No se pudo guardar."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteDropType(item!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      qc.invalidateQueries({ queryKey: ["drop-types/archived"] });
      qc.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      toast.success("Gota archivada.");
      onClose();
    },
    onError: () => toast.error("No se pudo archivar."),
  });

  return (
    <div className="space-y-4">
      {isEdit ? (
        <p className="text-[17px] font-semibold text-[var(--text-primary)]">{item?.name}</p>
      ) : (
        <TextInput
          placeholder="Nombre (ej. Systane Ultra)"
          value={form.name}
          autoFocus
          rows={1}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      )}

      <div className="space-y-1.5">
        <p className="text-[12px] text-[var(--text-faint)]">Intervalo</p>
        <IntervalPills
          selected={form.intervalHours}
          onChange={(v) => setForm((f) => ({ ...f, intervalHours: v }))}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[12px] text-[var(--text-faint)]">Ciclo (opcional)</p>
        <DateRangePicker
          from={form.startDate || null}
          to={form.endDate || null}
          onChange={(f, t) => setForm((fm) => ({ ...fm, startDate: f ?? "", endDate: t ?? "" }))}
        />
      </div>

      <Button
        className="w-full"
        disabled={saveMutation.isPending || (!isEdit && !form.name.trim())}
        type="button"
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar gota"}
      </Button>

      {isEdit && !confirmDelete && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="w-full py-2 text-[13px] text-[var(--error)] opacity-60 hover:opacity-100 transition-opacity"
        >
          Archivar gota
        </button>
      )}

      {isEdit && confirmDelete && (
        <ArchiveConfirm
          label="¿Archivar esta gota? Tu historial se mantiene intacto."
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

export function DropSheet({
  item,
  open,
  onClose,
}: {
  item: DropTypeRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = item !== null;

  return (
    <MobileSheet
      open={open}
      title={isEdit ? "Editar gota" : "Nueva gota"}
      description={isEdit ? `Editando ${item?.name ?? ""}` : "Agrega un tipo de gota a tu perfil."}
      onClose={onClose}
    >
      {open && <DropFormContent key={item?.id ?? "new"} item={item} onClose={onClose} />}
    </MobileSheet>
  );
}
