export type { ActiveVialEntry, DoseSlot } from "@/features/drops/domain";
export {
  timeAgo,
  getCountdown,
  isLoggedToday,
  isCompletedToday,
  getNextMs,
  getVialStatus,
} from "@/features/drops/domain";

export function dispatchQuickAction(sheet: string, extra?: Record<string, unknown>) {
  window.dispatchEvent(
    new CustomEvent("quickactions:open", { detail: { sheet, ...extra } }),
  );
}
