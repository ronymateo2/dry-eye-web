import { DropIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { useLastDropWidget } from "@/lib/hooks/use-last-drop-widget";

export function LastDropLine() {
  const { data, timeAgo, isRefreshing, refresh } = useLastDropWidget();
  if (!data) return null;
  return (
    <div className="app-header__last-drop-line">
      <DropIcon aria-hidden weight="duotone" size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <span className="app-header__last-drop-name">{data.drop_type_name}</span>
      <span className="app-header__last-drop-sep">·</span>
      <span className="app-header__last-drop-time">{timeAgo}</span>
      <button
        type="button"
        aria-label="Actualizar última gota"
        className="app-header__last-drop-refresh"
        disabled={isRefreshing}
        onClick={refresh}
      >
        <ArrowsClockwiseIcon size={13} className={isRefreshing ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
