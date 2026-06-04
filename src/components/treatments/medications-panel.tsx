import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/treatments/empty-state";
import { PanelHeader } from "@/components/treatments/panel-header";
import { parseTimesJson } from "@/components/treatments/times-picker";
import { TreatmentCard } from "@/components/treatments/treatment-card";
import { ArchivedItems } from "@/components/treatments/archived-items";
import { PhaseListInline } from "@/components/treatments/phase-list-inline";
import { MedSheet } from "@/components/treatments/med-sheet";
import { medicationsApi, medicationKeys } from "@/features/medications";
import type { MedicationRecord } from "@/types/domain";
import { PillIcon } from "@phosphor-icons/react";

export function MedicationsPanel() {
  const qc = useQueryClient();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: medicationKeys.list(),
    queryFn: medicationsApi.getList,
  });

  const [editingItem, setEditingItem] = useState<MedicationRecord | null | "new">(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => medicationsApi.reorder(ids),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = medications.findIndex((m) => m.id === active.id);
    const newIndex = medications.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(medications, oldIndex, newIndex);
    qc.setQueryData(medicationKeys.list(), reordered);
    reorderMutation.mutate(reordered.map((m) => m.id));
  };

  return (
    <div className="space-y-5">
      <PanelHeader
        title="Pastillas y medicamentos"
        count={medications.length}
        onAdd={() => setEditingItem("new")}
        addLabel="Agregar"
        countLabel="activos"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-[16px]" />
          ))}
        </div>
      ) : medications.length === 0 ? (
        <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
          <EmptyState
            label="Agregar primer medicamento"
            description="Registra tus medicamentos y dosis para llevar un seguimiento clínico completo."
            icon={<PillIcon size={24} color="var(--accent)" weight="fill" />}
            onClick={() => setEditingItem("new")}
            buttonLabel="Agregar medicamento"
          />
        </div>
      ) : (
        <>
          {medications.length > 1 && (
            <p className="text-[12px] text-[var(--text-muted)]">
              Mantén presionado el icono para reordenar.
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={medications.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <ul className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
                {medications.map((med) => {
                  const detail = [med.dosage, med.frequency].filter(Boolean).join(" · ");
                  const times = parseTimesJson(med.times_json);
                  return (
                    <TreatmentCard
                      key={med.id}
                      item={med}
                      name={med.name}
                      detail={detail || undefined}
                      isOnly={medications.length === 1}
                      onClick={() => setEditingItem(med)}
                      icon={<PillIcon size={18} color="var(--accent)" weight="fill" />}
                    >
                      {times.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {times.map((t) => (
                            <span key={t} className="inline-flex rounded-[6px] bg-[var(--surface-el)] px-1.5 py-0.5 mono text-[11px] text-[var(--accent)] leading-none">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {med.phases_json && <PhaseListInline phasesJson={med.phases_json} />}
                      {med.notes && (
                        <span className="block pt-1 text-[12px] text-[var(--text-faint)] leading-tight">
                          {med.notes}
                        </span>
                      )}
                    </TreatmentCard>
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}

      <ArchivedItems
        label="Medicamento"
        queryKey={medicationKeys.list()}
        archivedQueryKey={medicationKeys.archived()}
        fetchArchived={medicationsApi.getArchived}
        unarchive={medicationsApi.unarchive}
        renderItem={(item) => (
          <span className="text-[14px] text-[var(--text-muted)]">{item.name}</span>
        )}
      />

      <MedSheet
        item={editingItem === "new" ? null : editingItem}
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
      />
    </div>
  );
}
