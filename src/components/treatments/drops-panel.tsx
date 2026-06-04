import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/treatments/empty-state";
import { PanelHeader } from "@/components/treatments/panel-header";
import { intervalLabel } from "@/components/treatments/interval-pills";
import { TreatmentCard } from "@/components/treatments/treatment-card";
import { ArchivedItems } from "@/components/treatments/archived-items";
import { DropSheet } from "@/components/treatments/drop-sheet";
import { dropsApi, dropTypeKeys } from "@/features/drops";
import type { DropTypeRecord } from "@/types/domain";
import { DropIcon, } from "@phosphor-icons/react";

export function DropsPanel() {
  const qc = useQueryClient();

  const { data: dropTypes = [], isLoading } = useQuery({
    queryKey: dropTypeKeys.list(),
    queryFn: dropsApi.getTypes,
  });

  const [editingItem, setEditingItem] = useState<DropTypeRecord | null | "new">(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => dropsApi.reorderTypes(ids),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dropTypes.findIndex((d) => d.id === active.id);
    const newIndex = dropTypes.findIndex((d) => d.id === over.id);
    const reordered = arrayMove(dropTypes, oldIndex, newIndex);
    qc.setQueryData(dropTypeKeys.list(), reordered);
    reorderMutation.mutate(reordered.map((d) => d.id));
  };

  return (
    <div className="space-y-5">
      <PanelHeader
        title="Gotas guardadas"
        count={dropTypes.length}
        onAdd={() => setEditingItem("new")}
        addLabel="Agregar"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-[16px]" />
          ))}
        </div>
      ) : dropTypes.length === 0 ? (
        <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
          <EmptyState
            label="Agregar primera gota"
            description="Registra los tipos de gota que usas para que aparezcan al registrar tu día."
            icon={<DropIcon size={24} color="var(--accent)" weight="fill" />}
            onClick={() => setEditingItem("new")}
            buttonLabel="Agregar gota"
          />
        </div>
      ) : (
        <>
          {dropTypes.length > 1 && (
            <p className="text-[12px] text-[var(--text-muted)]">
              Mantén presionado el icono para reordenar — la primera aparece primero al registrar.
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dropTypes.map((d) => d.id)} strategy={verticalListSortingStrategy}>
              <ul className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
                {dropTypes.map((dt) => {
                  const detail = [
                    intervalLabel(dt.interval_hours),
                    dt.start_date || dt.end_date
                      ? `${dt.start_date ?? "—"} → ${dt.end_date ?? "∞"}`
                      : null,
                    dt.is_vial ? `Vial · ${dt.vial_duration ?? 24}h` : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ");
                  return (
                    <TreatmentCard
                      key={dt.id}
                      item={dt}
                      name={dt.name}
                      detail={detail}
                      isOnly={dropTypes.length === 1}
                      onClick={() => setEditingItem(dt)}
                      icon={<DropIcon size={18} color="var(--accent)" />}
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}

      <ArchivedItems
        label="Gota"
        queryKey={dropTypeKeys.list()}
        archivedQueryKey={dropTypeKeys.archived()}
        fetchArchived={dropsApi.getArchivedTypes}
        unarchive={dropsApi.unarchiveType}
        renderItem={(item) => (
          <span className="text-[14px] text-[var(--text-muted)]">{item.name}</span>
        )}
      />

      <DropSheet
        item={editingItem === "new" ? null : editingItem}
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
      />
    </div>
  );
}
