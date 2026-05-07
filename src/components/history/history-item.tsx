import type { DisplayItem } from "./types";
import { CheckInCard } from "./checkin-card";
import { DropsBlock } from "./drops-card";
import { HygieneCard } from "./hygiene-card";
import { TriggerCard } from "./trigger-card";
import { ObservationCard } from "./observation-card";
import { SleepCard } from "./sleep-card";
import { SymptomCard } from "./symptom-card";
import { TherapyCard } from "./therapy-card";
import { MedicationGroupCard, MedicationIntakeCard } from "./medication-cards";

export function HistoryItem({ item, timezone }: { item: DisplayItem; timezone: string }) {
  if (item.kind === "check_in") return <CheckInCard item={item} timezone={timezone} />;
  if (item.kind === "drop_group") return <DropsBlock drops={item.drops} timezone={timezone} />;
  if (item.kind === "hygiene") return <HygieneCard item={item.record} timezone={timezone} />;
  if (item.kind === "trigger_group") return <TriggerCard item={item} timezone={timezone} />;
  if (item.kind === "observation") return <ObservationCard item={item} timezone={timezone} />;
  if (item.kind === "sleep") return <SleepCard item={item} timezone={timezone} />;
  if (item.kind === "therapy") return <TherapyCard item={item} timezone={timezone} />;
  if (item.kind === "medication_group") return <MedicationGroupCard item={item} timezone={timezone} />;
  if (item.kind === "medication-intake") return <MedicationIntakeCard item={item} timezone={timezone} />;
  return <SymptomCard item={item} timezone={timezone} />;
}