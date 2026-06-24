import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { SortableWidgetRow } from "./sortable-widget-row";
import {
  widgetDef,
  type TodayWidgetConfig,
  type TodayWidgetId,
} from "./widget-registry";

type Props = {
  config: TodayWidgetConfig;
  onReorder: (activeId: TodayWidgetId, overId: TodayWidgetId) => void;
  onToggle: (id: TodayWidgetId) => void;
  onReset: () => void;
};

export function TodayWidgetEditor({ config, onReorder, onToggle, onReset }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as TodayWidgetId, over.id as TodayWidgetId);
    }
  };

  const allHidden = config.every((e) => !e.visible);

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[var(--text-muted)]">
        Arrastra para reordenar. Toca el ojo para mostrar u ocultar.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={config.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            {config.map((entry) => (
              <SortableWidgetRow
                key={entry.id}
                entry={entry}
                def={widgetDef(entry.id)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {allHidden && (
        <p className="text-[12px] text-[var(--text-faint)]">
          Todos los módulos están ocultos. Muéstralos con el icono del ojo.
        </p>
      )}

      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] transition-[color,transform] duration-[160ms] ease-out hover:text-[var(--accent)] active:scale-[0.96]"
        aria-label="Restaurar orden predeterminado"
      >
        <ArrowCounterClockwiseIcon size={14} />
        Restaurar orden
      </button>
    </div>
  );
}
