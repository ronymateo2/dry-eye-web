import { type ElementType, type ReactNode } from "react";
import {
  CircleHalfIcon,
  ClockIcon,
  DropIcon,
  FireIcon,
  PillIcon,
} from "@phosphor-icons/react";
import { SymptomStatusCard } from "./symptom-status-card";
import { ScheduleSection } from "./schedule-section";
import { OnDemandDrops } from "./on-demand-drops";
import { DropStreakWidget } from "./drop-streak-widget";
import { MedicationsAgenda } from "./medications-agenda";

export type TodayWidgetId =
  | "symptoms"
  | "schedule"
  | "on-demand-drops"
  | "drop-streak"
  | "medications";

export type TodayWidgetEntry = { id: TodayWidgetId; visible: boolean };
export type TodayWidgetConfig = TodayWidgetEntry[];

export type WidgetRenderCtx = { onRegister: () => void };

export type TodayWidgetDef = {
  id: TodayWidgetId;
  label: string;
  icon: ElementType;
  render: (ctx: WidgetRenderCtx) => ReactNode;
};

export const TODAY_WIDGET_REGISTRY: TodayWidgetDef[] = [
  {
    id: "symptoms",
    label: "Estado de síntomas",
    icon: CircleHalfIcon,
    render: ({ onRegister }) => <SymptomStatusCard onRegister={onRegister} />,
  },
  {
    id: "schedule",
    label: "Calendario de gotas",
    icon: ClockIcon,
    render: () => <ScheduleSection />,
  },
  {
    id: "on-demand-drops",
    label: "Gotas on-demand",
    icon: DropIcon,
    render: () => <OnDemandDrops />,
  },
  {
    id: "drop-streak",
    label: "Seguimiento de gotas",
    icon: FireIcon,
    render: () => <DropStreakWidget />,
  },
  {
    id: "medications",
    label: "Medicamentos",
    icon: PillIcon,
    render: () => <MedicationsAgenda />,
  },
];

export const DEFAULT_WIDGET_CONFIG: TodayWidgetConfig = TODAY_WIDGET_REGISTRY.map(
  (def) => ({ id: def.id, visible: true }),
);

export function reconcileWidgetConfig(stored: TodayWidgetConfig): TodayWidgetConfig {
  const known = new Set(TODAY_WIDGET_REGISTRY.map((w) => w.id));
  const seen = new Set<TodayWidgetId>();
  const result: TodayWidgetConfig = [];
  for (const entry of stored) {
    if (known.has(entry.id) && !seen.has(entry.id)) {
      result.push({ id: entry.id, visible: entry.visible });
      seen.add(entry.id);
    }
  }
  for (const def of TODAY_WIDGET_REGISTRY) {
    if (!seen.has(def.id)) result.push({ id: def.id, visible: true });
  }
  return result;
}

export function widgetDef(id: TodayWidgetId): TodayWidgetDef {
  const def = TODAY_WIDGET_REGISTRY.find((w) => w.id === id);
  if (!def) throw new Error(`Unknown today widget: ${id}`);
  return def;
}
