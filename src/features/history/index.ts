import { http } from "@/lib/http";
import type { HistoryFeed } from "@/types/domain";

export const historyKeys = {
  all: ["history"] as const,
};

export const historyApi = {
  getFeed: () => http.get<HistoryFeed>("/history"),
  getMore: (before: string, limit = 5) =>
    http.get<HistoryFeed>(`/history/more?before=${before}&limit=${limit}`),
};
