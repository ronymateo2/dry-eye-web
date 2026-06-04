import { useMutation } from "@tanstack/react-query";
import type { SaveTherapySessionInput } from "@/types/domain";
import { therapyApi } from "./api";

export function useSaveTherapySession() {
  return useMutation({
    mutationFn: (input: SaveTherapySessionInput) => therapyApi.saveSession(input),
  });
}
