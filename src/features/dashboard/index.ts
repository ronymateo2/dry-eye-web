import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type { TherapyCorrelation } from "@/types/domain";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  correlations: () => [...dashboardKeys.all, "correlations"] as const,
};

export const dashboardApi = {
  getSummary: () => http.get<{ ok: true; [key: string]: unknown }>("/dashboard/summary"),
  getCorrelations: () =>
    http.get<{ ok: true; therapyCorrelation: TherapyCorrelation | null; [key: string]: unknown }>(
      "/dashboard/correlations",
    ),
};

export function useDashboardSummary() {
  return useQuery({ queryKey: dashboardKeys.summary(), queryFn: dashboardApi.getSummary });
}

export function useDashboardCorrelations() {
  return useQuery({ queryKey: dashboardKeys.correlations(), queryFn: dashboardApi.getCorrelations });
}
