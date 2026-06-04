import { useQuery } from "@tanstack/react-query";
import { observationsApi } from "./api";
import { observationKeys } from "./query-keys";

export function useObservations() {
  return useQuery({ queryKey: observationKeys.list(), queryFn: observationsApi.getList });
}
