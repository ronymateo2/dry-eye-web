export type { TherapyCorrelation } from "@/types/domain";

export type DashboardSummary = { ok: true; [key: string]: unknown };
export type DashboardCorrelations = {
  ok: true;
  therapyCorrelation: import("@/types/domain").TherapyCorrelation | null;
  [key: string]: unknown;
};
