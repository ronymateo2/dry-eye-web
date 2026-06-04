import { http } from "@/lib/http";
import type { LastCheckIn } from "./types";

export const checkInsApi = {
  getLast: () => http.get<LastCheckIn>("/check-ins/last"),
  save: (body: unknown) => http.post("/check-ins", body),
};
