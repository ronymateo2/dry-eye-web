import { http } from "@/lib/http";
import type { TodaySleep } from "./types";

export const sleepApi = {
  getToday: () => http.get<TodaySleep>("/sleep/today"),
  save: (body: unknown) => http.put("/sleep", body),
};
