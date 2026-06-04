export type { SaveHygieneInput, HygieneRecord } from "@/types/domain";

export type HygieneDashboard = {
  firstDayKey: string | null;
  totalCompletedDays: number;
  todayCompletedCount: number;
  recentRecords: import("@/types/domain").HygieneRecord[];
};
