import { useQuery } from "@tanstack/react-query";
import { symptomsApi } from "./api";
import { symptomKeys } from "./query-keys";

export function useSymptomStatusToday() {
  return useQuery({ queryKey: symptomKeys.today(), queryFn: symptomsApi.getStatusToday });
}
