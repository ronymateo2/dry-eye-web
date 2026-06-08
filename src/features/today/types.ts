import type { CalendarEventEntry, MedicationRecord, SymptomStatusToday } from "@/types/domain";
import type { LastCheckIn } from "@/features/check-ins/types";
import type { TodaySleep } from "@/features/sleep/types";
import type { DropScheduleEntry, RecentDrop, DropTypeFull, ActiveVial } from "@/features/drops/types";
import type { TodayIntake, LastIntakePerMed } from "@/features/medications/types";

export type TodayBundle = {
  ok: boolean;
  checkInLast: LastCheckIn;
  sleepToday: TodaySleep;
  dropsLastPerType: DropScheduleEntry[];
  calendarEventsToday: { events: CalendarEventEntry[] };
  medications: MedicationRecord[];
  medicationIntakesToday: TodayIntake[];
  medicationIntakesLastPerMed: LastIntakePerMed[];
  vialsActive: ActiveVial[];
  symptomsToday: SymptomStatusToday & { ok: boolean };
  dropTypes: DropTypeFull[];
  dropsRecent24h: RecentDrop[];
};
