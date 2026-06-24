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
import { SortableWidgetCard } from "./sortable-widget-card";
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

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-[var(--text-muted)]">
        Arrastra las tarjetas para reordenar. Toca el ojo para mostrar u ocultar.
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
          <div className="space-y-5">
            {config.map((entry) => {
              const def = widgetDef(entry.id);
              return (
                <SortableWidgetCard
                  key={entry.id}
                  id={entry.id}
                  label={def.label}
                  visible={entry.visible}
                  onToggle={onToggle}
                >
                  {def.render()}
                </SortableWidgetCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

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
