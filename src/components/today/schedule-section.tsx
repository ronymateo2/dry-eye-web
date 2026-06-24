import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { CardView } from "./card-view";
import { HeroView } from "./hero-view";
import { useScheduleData } from "./use-schedule-data";

export function ScheduleSection() {
  const [view, setView] = useLocalStorage<"card" | "hero">("schedule-view", "hero");
  const scheduleData = useScheduleData();

  return view === "card" ? (
    <CardView data={scheduleData} view={view} setView={setView} />
  ) : (
    <HeroView data={scheduleData} view={view} setView={setView} />
  );
}
