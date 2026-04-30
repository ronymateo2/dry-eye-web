import { DropIcon, ArrowsClockwiseIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useLastDropWidget } from "@/lib/hooks/use-last-drop-widget";

export function LastDropLine() {
  const { data, timeAgo, isRefreshing, refresh } = useLastDropWidget();
  if (!data) return null;
  return (
    <div className="app-header__last-drop-line">
      <button
        type="button"
        aria-label="Registrar gota"
        className="app-header__last-drop-text-btn"
        style={{ WebkitTapHighlightColor: "transparent" }}
        onClick={() => window.dispatchEvent(new CustomEvent("quickactions:open", { detail: { sheet: "drop" } }))}
      >
        <DropIcon aria-hidden weight="duotone" size={13} style={{ color: "var(--accent)" }} />
        <span className="app-header__last-drop-name">{data.drop_type_name}</span>
        <span className="app-header__last-drop-sep">·</span>
        <span className="app-header__last-drop-time">{timeAgo}</span>
        <CaretRightIcon aria-hidden size={9} weight="bold" className="app-header__last-drop-caret" />
      </button>
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
