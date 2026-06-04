import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";

export const reportKeys = {
  all: ["report"] as const,
};

export const reportApi = {
  get: () =>
    http.get<{
      ok: true;
      medications: { name: string; dosage: string | null; start_date: string | null; end_date: string | null; phases_json: string | null }[];
      [key: string]: unknown;
    }>("/report"),
};

export function useReport() {
  return useQuery({ queryKey: reportKeys.all, queryFn: reportApi.get });
}
