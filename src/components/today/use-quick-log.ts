import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dropsApi, dropKeys, vialKeys } from "@/features/drops";
import { queueDrop } from "@/lib/offline/drops-queue";
import type { DropEye } from "@/types/domain";

const TRANSITION_MS = 1400;

export function useQuickLog(opts?: {
  onSuccess?: (dropTypeId: string, dropId: string, vialId?: string) => void;
  onError?: () => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ dropTypeId, autoCreateVial }: { dropTypeId: string; autoCreateVial?: boolean }) => {
      const cached = queryClient.getQueryData<{ id: string; logged_at: string; quantity: number; eye: string }[]>(
        dropKeys.recent(dropTypeId),
      );
      const lastEye: DropEye =
        cached && cached.length > 0 && ["left", "right", "both"].includes(cached[0].eye)
          ? (cached[0].eye as DropEye)
          : "both";

      const id = crypto.randomUUID();
      const loggedAt = new Date().toISOString();

      if (!navigator.onLine) {
        await queueDrop({ id, dropTypeId, loggedAt, quantity: 1, eye: lastEye });
        toast.success("Gota en cola — se sincronizará al reconectar.");
        return { id, dropTypeId, autoCreateVial: false };
      }

      try {
        await dropsApi.save({ id, dropTypeId, loggedAt, quantity: 1, eye: lastEye });
      } catch {
        await queueDrop({ id, dropTypeId, loggedAt, quantity: 1, eye: lastEye });
        toast.success("Gota en cola — se sincronizará al reconectar.");
        return { id, dropTypeId, autoCreateVial: false };
      }

      let vialId: string | undefined;
      if (autoCreateVial) {
        try {
          vialId = crypto.randomUUID();
          await dropsApi.createVial({ id: vialId, dropTypeId, startedAt: loggedAt, dropId: id });
        } catch {
          vialId = undefined;
          toast.warning("Gota guardada. No se pudo abrir el vial — ábrelo manualmente.");
        }
      }
      return { id, dropTypeId, vialId };
    },
    onSuccess: (data) => {
      opts?.onSuccess?.(data.dropTypeId, data.id, data.vialId);
      queryClient.invalidateQueries({ queryKey: dropKeys.last() });
      if (data.vialId) {
        queryClient.invalidateQueries({ queryKey: vialKeys.active() });
      }
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: dropKeys.recent(data.dropTypeId) });
        queryClient.invalidateQueries({ queryKey: dropKeys.recentAll() });
      }, TRANSITION_MS);
    },
    onError: () => {
      toast.error("No se pudo registrar la dosis. Intenta de nuevo.");
      opts?.onError?.();
    },
  });

  return {
    quickLog: (dropTypeId: string, autoCreateVial?: boolean) => mutation.mutate({ dropTypeId, autoCreateVial }),
    isPending: mutation.isPending,
  };
}
