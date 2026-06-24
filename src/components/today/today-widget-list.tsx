import {
  widgetDef,
  type TodayWidgetConfig,
  type WidgetRenderCtx,
} from "./widget-registry";

type Props = {
  config: TodayWidgetConfig;
  ctx: WidgetRenderCtx;
};

export function TodayWidgetList({ config, ctx }: Props) {
  const visible = config.filter((e) => e.visible);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-5">
      {visible.map((entry) => (
        <div key={entry.id}>{widgetDef(entry.id).render(ctx)}</div>
      ))}
    </div>
  );
}
