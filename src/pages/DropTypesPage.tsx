import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DropTypeRecord, ActionState } from "@/types/domain";

function SortableDropType({ dt, isOnly }: { dt: DropTypeRecord; isOnly: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dt.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? ("relative" as const) : undefined,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "flex min-h-12 items-center border-b border-[var(--border)] px-4 text-[15px] text-[var(--text-primary)] last:border-b-0",
        isDragging ? "bg-[var(--surface-el)] opacity-90 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "bg-transparent",
      ].filter(Boolean).join(" ")}
    >
      <span className="flex-1 py-3">{dt.name}</span>
      {!isOnly && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${dt.name}`}
          className="flex min-h-12 w-10 shrink-0 cursor-grab items-center justify-center text-[var(--text-faint)] active:cursor-grabbing"
        >
          <DotsSixVerticalIcon size={16} />
        </button>
      )}
    </li>
  );
}

export default function DropTypesPage() {
  const qc = useQueryClient();

  const { data: dropTypes = [], isLoading } = useQuery({ queryKey: ["drop-types"], queryFn: api.getDropTypes });

  const [dropName, setDropName] = useState("");
  const [state, setState] = useState<ActionState>({ status: "idle" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveMutation = useMutation({
    mutationFn: () => api.createDropType(dropName.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      setDropName("");
      setState({ status: "success", message: "Guardado." });
      setTimeout(() => setState({ status: "idle" }), 2000);
    },
    onError: () => setState({ status: "error", message: "No se pudo guardar." }),
  });

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
    <section className="space-y-6">
      {state.status !== "idle" && <StatusBanner state={state} />}
      <section className="space-y-3">
        <p className="section-label">Nueva gota</p>
        <input
          className="min-h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
          placeholder="Nombre de la gota (ej. systane ultra)"
          value={dropName}
          onChange={(e) => setDropName(e.target.value)}
        />
        <Button
          className="w-full"
          disabled={saveMutation.isPending || !dropName.trim()}
          type="button"
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Guardando..." : "Guardar tipo de gota"}
        </Button>
      </section>

      <section className="space-y-3">
        <p className="section-label">Gotas guardadas</p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-[var(--radius-md)]" />
            ))}
          </div>
        ) : dropTypes.length === 0 ? (
          <p className="text-[13px] text-[var(--text-faint)]">Todavia no registras gotas frecuentes.</p>
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
                  {dropTypes.map((dt) => (
                    <SortableDropType key={dt.id} dt={dt} isOnly={dropTypes.length === 1} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </>
        )}
      </section>

      <Link
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[999px] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-[15px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-el)]"
        to="/register"
      >
        Volver a Registrar
      </Link>
    </section>
  );
}
