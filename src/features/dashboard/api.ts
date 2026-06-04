import { http } from "@/lib/http";
import type { DashboardSummary, DashboardCorrelations } from "./types";

export const dashboardApi = {
  getSummary: () => http.get<DashboardSummary>("/dashboard/summary"),
  getCorrelations: () => http.get<DashboardCorrelations>("/dashboard/correlations"),
};
