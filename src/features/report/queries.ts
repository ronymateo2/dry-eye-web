import { useQuery } from "@tanstack/react-query";
import { reportApi } from "./api";
import { reportKeys } from "./query-keys";

export function useReport() {
  return useQuery({ queryKey: reportKeys.all, queryFn: reportApi.get });
}
