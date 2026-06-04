import { useQuery } from "@tanstack/react-query";
import { medicationsApi } from "./api";
import { medicationKeys } from "./query-keys";

export function useMedications() {
  return useQuery({ queryKey: medicationKeys.list(), queryFn: medicationsApi.getList });
}

export function useTodayIntakes() {
  return useQuery({ queryKey: medicationKeys.intakesToday(), queryFn: medicationsApi.getTodayIntakes });
}
