import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { DropEye } from "@/types/domain";

const TRANSITION_MS = 1400;

export function useQuickLog(opts?: {
  onSuccess?: (dropTypeId: string, dropId: string) => void;
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

      const id = crypto.randomUUID();
      await api.saveDrop({
        id,
        dropTypeId,
        loggedAt: new Date().toISOString(),
        quantity: 1,
        eye: lastEye,
      });
      return { id, dropTypeId };
    },
    onSuccess: (data) => {
      opts?.onSuccess?.(data.dropTypeId, data.id);
      queryClient.invalidateQueries({ queryKey: ["drops/last"] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["drops/recent", data.dropTypeId] });
        queryClient.invalidateQueries({ queryKey: ["drops/recent-all"] });
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
