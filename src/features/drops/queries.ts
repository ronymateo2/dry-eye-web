import { useQuery } from "@tanstack/react-query";
import { dropsApi } from "./api";
import { dropKeys, dropTypeKeys, vialKeys } from "./query-keys";

export function useDropTypes() {
  return useQuery({ queryKey: dropTypeKeys.list(), queryFn: dropsApi.getTypes });
}

export function useArchivedDropTypes(enabled = true) {
  return useQuery({
    queryKey: dropTypeKeys.archived(),
    queryFn: dropsApi.getArchivedTypes,
    enabled,
  });
}

export function useLastDropPerType() {
  return useQuery({
    queryKey: dropKeys.lastPerType(),
    queryFn: dropsApi.getLastPerType,
    staleTime: 60_000,
  });
}

export function useDropStatsPerType() {
  return useQuery({ queryKey: dropKeys.statsPerType(), queryFn: dropsApi.getStatsPerType });
}

export function useActiveVials() {
  return useQuery({
    queryKey: vialKeys.active(),
    queryFn: dropsApi.getActiveVials,
    staleTime: 60_000,
  });
}

export function useVialHistory() {
  return useQuery({ queryKey: vialKeys.history(), queryFn: () => dropsApi.getVialHistory() });
}
