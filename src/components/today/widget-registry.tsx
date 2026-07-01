export {
  type TodayWidgetId,
  type TodayWidgetEntry,
  type TodayWidgetConfig,
  DEFAULT_WIDGET_CONFIG,
  reconcileWidgetConfig,
  WIDGET_IDS,
} from "./widget-config";
import type { TodayWidgetId } from "./widget-config";

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

export type TodayWidgetDef = {
  id: TodayWidgetId;
  label: string;
  icon: ElementType;
  render: () => ReactNode;
};

export const TODAY_WIDGET_REGISTRY: TodayWidgetDef[] = [
  {
    id: "symptoms",
    label: "Estado de síntomas",
    icon: CircleHalfIcon,
    render: () => <SymptomStatusCard />,
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

export function widgetDef(id: TodayWidgetId): TodayWidgetDef | undefined {
  return TODAY_WIDGET_REGISTRY.find((w) => w.id === id);
}
