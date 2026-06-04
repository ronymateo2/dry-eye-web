import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./api";
import { dashboardKeys } from "./query-keys";

export function useDashboardSummary() {
  return useQuery({ queryKey: dashboardKeys.summary(), queryFn: dashboardApi.getSummary });
}

export function useDashboardCorrelations() {
  return useQuery({ queryKey: dashboardKeys.correlations(), queryFn: dashboardApi.getCorrelations });
}
