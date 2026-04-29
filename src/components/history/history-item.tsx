import type { DisplayItem } from "./types";
import {
  CheckInCard,
  DropsBlock,
  HygieneCard,
  TriggerCard,
  ObservationCard,
  SleepCard,
  SymptomCard,
} from "./history-cards";

export function HistoryItem({ item, timezone }: { item: DisplayItem; timezone: string }) {
  if (item.kind === "check_in") return <CheckInCard item={item} timezone={timezone} />;
  if (item.kind === "drop_group") return <DropsBlock drops={item.drops} timezone={timezone} />;
  if (item.kind === "hygiene") return <HygieneCard item={item.record} />;
  if (item.kind === "trigger_group") return <TriggerCard item={item} timezone={timezone} />;
  if (item.kind === "observation") return <ObservationCard item={item} timezone={timezone} />;
  if (item.kind === "sleep") return <SleepCard item={item} timezone={timezone} />;
  return <SymptomCard item={item} timezone={timezone} />;
}
