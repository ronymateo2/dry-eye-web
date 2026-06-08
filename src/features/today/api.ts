import { http } from "@/lib/http";
import type { TodayBundle } from "./types";

export const todayApi = {
  getBundle: () => http.get<TodayBundle>("/today"),
};
