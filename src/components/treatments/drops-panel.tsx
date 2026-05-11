import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { api } from "@/lib/api";
import type { DropTypeRecord } from "@/types/domain";
import { EyeIcon, EyedropperIcon } from "@phosphor-icons/react";

export function DropsPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/today";
  const qc = useQueryClient();

  const { data: dropTypes = [], isLoading } = useQuery({
    queryKey: ["drop-types"],
    queryFn: api.getDropTypes,
  });

  const [editingItem, setEditingItem] = useState<DropTypeRecord | null | "new">(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => api.reorderDropTypes(ids),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dropTypes.findIndex((d) => d.id === active.id);
    const newIndex = dropTypes.findIndex((d) => d.id === over.id);
    const reordered = arrayMove(dropTypes, oldIndex, newIndex);
    qc.setQueryData(["drop-types"], reordered);
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
            icon={<EyeIcon size={24} color="var(--accent)" weight="fill" />}
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
                      icon={<EyeIcon size={18} color="var(--accent)" weight="fill" />}
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
        queryKey={["drop-types"]}
        archivedQueryKey={["drop-types/archived"]}
        fetchArchived={api.getArchivedDropTypes}
        unarchive={api.unarchiveDropType}
        renderItem={(item) => (
          <span className="text-[14px] text-[var(--text-muted)]">{item.name}</span>
        )}
      />

      <button
        type="button"
        onClick={() => {
          navigate(returnTo);
          window.dispatchEvent(new CustomEvent("quickactions:open", { detail: { sheet: "drop" } }));
        }}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-dim)] px-5 font-medium text-[var(--accent)] transition-opacity active:opacity-70"
      >
        <EyedropperIcon size={17} weight="fill" />
        <span className="text-[15px]">Registrar gota</span>
      </button>

      <DropSheet
        item={editingItem === "new" ? null : editingItem}
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
      />
    </div>
  );
}
