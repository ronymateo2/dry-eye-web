import { openQuickAction, type QuickActionSheet } from "@/lib/quick-actions-store";

export type { ActiveVialEntry, DoseSlot } from "@/features/drops/domain";
export {
  timeAgo,
  getCountdown,
  isLoggedToday,
  isCompletedToday,
  getNextMs,
  getVialStatus,
} from "@/features/drops/domain";

export function dispatchQuickAction(sheet: QuickActionSheet, extra?: { dropTypeId?: string }) {
  openQuickAction(sheet, extra?.dropTypeId);
}
