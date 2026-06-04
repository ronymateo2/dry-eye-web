import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";

export type TodaySleep = {
  id: string;
  day_key: string;
  logged_at: string;
  sleep_hours: number;
  sleep_quality: string;
} | null;

export const sleepKeys = {
  all: ["sleep"] as const,
  today: () => [...sleepKeys.all, "today"] as const,
};

export const sleepApi = {
  getToday: () => http.get<TodaySleep>("/sleep/today"),
  save: (body: unknown) => http.put("/sleep", body),
};

export function useTodaySleep() {
  return useQuery({ queryKey: sleepKeys.today(), queryFn: sleepApi.getToday });
}
