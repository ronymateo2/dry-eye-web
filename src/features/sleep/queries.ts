import { useQuery } from "@tanstack/react-query";
import { sleepApi } from "./api";
import { sleepKeys } from "./query-keys";

export function useTodaySleep() {
  return useQuery({ queryKey: sleepKeys.today(), queryFn: sleepApi.getToday });
}
