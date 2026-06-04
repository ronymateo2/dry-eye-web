import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dropsApi, vialKeys } from "@/features/drops";

export function useDiscardVial(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dropsApi.discardVial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vialKeys.active() });
      onSuccess?.();
    },
    onError: () => toast.error("No se pudo descartar el vial. Intenta de nuevo."),
  });
}
