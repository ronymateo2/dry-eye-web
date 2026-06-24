import { useRef } from "react";
import { widgetDef, type TodayWidgetConfig } from "./widget-registry";

type Props = {
  config: TodayWidgetConfig;
  onLongPress: () => void;
};

const LONG_PRESS_MS = 450;

export function TodayWidgetList({ config, onLongPress }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
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
      {visible.map((entry) => (
        <div
          key={entry.id}
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerMove={cancel}
          onPointerLeave={cancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {widgetDef(entry.id).render()}
        </div>
      ))}
    </div>
  );
}
