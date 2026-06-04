import { useQuery } from "@tanstack/react-query";
import { checkInsApi } from "./api";
import { checkInKeys } from "./query-keys";

export function useLastCheckIn() {
  return useQuery({ queryKey: checkInKeys.last(), queryFn: checkInsApi.getLast });
}
