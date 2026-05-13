import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { DropEye } from "@/types/domain";

const TRANSITION_MS = 1400;

export function useQuickLog(opts?: {
  onSuccess?: (dropTypeId: string) => void;
  onError?: () => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (dropTypeId: string) => {
      const cached = queryClient.getQueryData<{ id: string; logged_at: string; quantity: number; eye: string }[]>(
        ["drops/recent", dropTypeId],
      );
      const lastEye: DropEye =
        cached && cached.length > 0 && ["left", "right", "both"].includes(cached[0].eye)
          ? (cached[0].eye as DropEye)
          : "both";

      return api.saveDrop({
        id: crypto.randomUUID(),
        dropTypeId,
        loggedAt: new Date().toISOString(),
        quantity: 1,
        eye: lastEye,
      });
    },
    onSuccess: (_data, dropTypeId) => {
      opts?.onSuccess?.(dropTypeId);
      // Delay so the registered animation plays before data refreshes
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["drops/last"] });
        queryClient.invalidateQueries({ queryKey: ["drops/last-per-type"] });
        queryClient.invalidateQueries({ queryKey: ["drops/recent", dropTypeId] });
      }, TRANSITION_MS);
    },
    onError: () => {
      toast.error("No se pudo registrar la dosis. Intenta de nuevo.");
      opts?.onError?.();
    },
  });

  return {
    quickLog: (dropTypeId: string) => mutation.mutate(dropTypeId),
    isPending: mutation.isPending,
  };
}
