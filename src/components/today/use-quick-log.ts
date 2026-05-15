import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queueDrop } from "@/lib/offline/drops-queue";
import type { DropEye } from "@/types/domain";

const TRANSITION_MS = 1400;

export function useQuickLog(opts?: {
  onSuccess?: (dropTypeId: string, dropId: string) => void;
  onError?: () => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ dropTypeId, autoCreateVial }: { dropTypeId: string; autoCreateVial?: boolean }) => {
      const cached = queryClient.getQueryData<{ id: string; logged_at: string; quantity: number; eye: string }[]>(
        ["drops/recent", dropTypeId],
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
        await api.saveDrop({ id, dropTypeId, loggedAt, quantity: 1, eye: lastEye });
      } catch {
        await queueDrop({ id, dropTypeId, loggedAt, quantity: 1, eye: lastEye });
        toast.success("Gota en cola — se sincronizará al reconectar.");
        return { id, dropTypeId, autoCreateVial: false };
      }

      if (autoCreateVial) {
        try {
          await api.createVial({ id: crypto.randomUUID(), dropTypeId, startedAt: loggedAt, dropId: id });
        } catch {
          toast.warning("Gota guardada. No se pudo abrir el vial — ábrelo manualmente.");
        }
      }
      return { id, dropTypeId, autoCreateVial };
    },
    onSuccess: (data) => {
      opts?.onSuccess?.(data.dropTypeId, data.id);
      queryClient.invalidateQueries({ queryKey: ["drops/last"] });
      if (data.autoCreateVial) {
        queryClient.invalidateQueries({ queryKey: ["vials/active"] });
      }
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
    quickLog: (dropTypeId: string, autoCreateVial?: boolean) => mutation.mutate({ dropTypeId, autoCreateVial }),
    isPending: mutation.isPending,
  };
}
