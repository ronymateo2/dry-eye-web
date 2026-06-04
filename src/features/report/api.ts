import { http } from "@/lib/http";
import type { ReportResponse } from "./types";

export const reportApi = {
  get: () => http.get<ReportResponse>("/report"),
};
