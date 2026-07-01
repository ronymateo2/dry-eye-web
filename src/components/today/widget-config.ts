import type { TodayWidgetConfigEntry } from "@/types/domain";

export const WIDGET_IDS = [
  "symptoms",
  "schedule",
  "on-demand-drops",
  "drop-streak",
  "medications",
] as const;

export type TodayWidgetId = (typeof WIDGET_IDS)[number];

export type TodayWidgetEntry = { id: TodayWidgetId; visible: boolean };
export type TodayWidgetConfig = TodayWidgetEntry[];

export const DEFAULT_WIDGET_CONFIG: TodayWidgetConfig = WIDGET_IDS.map((id) => ({
  id,
  visible: true,
}));

const KNOWN = new Set<string>(WIDGET_IDS);

function isKnown(id: string): id is TodayWidgetId {
  return KNOWN.has(id);
}

export function reconcileWidgetConfig(
  stored: TodayWidgetConfigEntry[],
): TodayWidgetConfig {
  const seen = new Set<TodayWidgetId>();
  const result: TodayWidgetConfig = [];
  for (const entry of stored) {
    if (isKnown(entry.id) && !seen.has(entry.id)) {
      result.push({ id: entry.id, visible: entry.visible });
      seen.add(entry.id);
    }
  }
  for (const id of WIDGET_IDS) {
    if (!seen.has(id)) result.push({ id, visible: true });
  }
  return result;
}
