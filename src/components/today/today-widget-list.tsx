import {
  widgetDef,
  type TodayWidgetConfig,
} from "./widget-registry";

type Props = {
  config: TodayWidgetConfig;
};

export function TodayWidgetList({ config }: Props) {
  const visible = config.filter((e) => e.visible);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-5">
      {visible.map((entry) => (
        <div key={entry.id}>{widgetDef(entry.id).render()}</div>
      ))}
    </div>
  );
}
