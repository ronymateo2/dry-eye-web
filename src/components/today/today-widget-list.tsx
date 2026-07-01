import { useRef, type PointerEvent } from "react";
import { widgetDef, type TodayWidgetConfig } from "./widget-registry";

type Props = {
  config: TodayWidgetConfig;
  onLongPress: () => void;
};

const LONG_PRESS_MS = 450;

export function TodayWidgetList({ config, onLongPress }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    timer.current = setTimeout(onLongPress, LONG_PRESS_MS);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const visible = config.filter((e) => e.visible);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-5">
      {visible.map((entry) => {
        const def = widgetDef(entry.id);
        if (!def) return null;
        return (
          <div
            key={entry.id}
            onPointerDown={start}
            onPointerUp={cancel}
            onPointerMove={cancel}
            onPointerLeave={cancel}
            onContextMenu={(e) => e.preventDefault()}
          >
            {def.render()}
          </div>
        );
      })}
    </div>
  );
}
