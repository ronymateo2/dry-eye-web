import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { EyedropperSampleIcon, TimerIcon, PlusCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function DiscardConfirm({
  name,
  isPending,
  onConfirm,
  onCancel,
}: {
  name: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 500, damping: 34 }}
      className="rounded-[var(--radius-md)] border border-[var(--pain-high)]/20 bg-[var(--surface)] p-3.5 space-y-3"
    >
      <p className="text-[13px] text-[var(--text-primary)]">
        ¿Descartar vial de <span className="font-semibold">{name}</span>?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 min-h-12 rounded-full border border-[var(--pain-high)]/30 bg-transparent px-5 py-3 text-[15px] font-medium text-[var(--pain-high)] transition-[color,background-color,border-color,transform] duration-[160ms] ease-out active:scale-[0.97] disabled:opacity-60"
        >
          {isPending ? "Descartando..." : "Descartar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-12 rounded-full border border-[var(--border)] bg-transparent px-5 py-3 text-[15px] font-medium text-[var(--text-muted)] transition-[color,background-color,border-color,transform] duration-[160ms] ease-out active:scale-[0.97]"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}

function OpenConfirm({
  name,
  isPending,
  onConfirm,
  onCancel,
}: {
  name: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 500, damping: 34 }}
      className="rounded-[var(--radius-md)] border border-[var(--accent)]/20 bg-[var(--surface)] p-3.5 space-y-3"
    >
      <p className="text-[13px] text-[var(--text-primary)]">
        ¿Abrir vial de <span className="font-semibold">{name}</span>?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 min-h-12 rounded-full border-transparent bg-[var(--accent)] px-5 py-3 text-[15px] font-medium text-[var(--btn-primary-text)] transition-[color,background-color,border-color,transform] duration-[160ms] ease-out hover:bg-[var(--accent-bright)] active:scale-[0.97] disabled:opacity-60"
        >
          {isPending ? "Abriendo..." : "Abrir"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-12 rounded-full border border-[var(--border)] bg-transparent px-5 py-3 text-[15px] font-medium text-[var(--text-muted)] transition-[color,background-color,border-color,transform] duration-[160ms] ease-out active:scale-[0.97]"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}

function formatCountdown(targetIso: string): string {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "Vencido";
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  const secs = Math.floor((diffMs % 60_000) / 1_000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

function VialCountdown({ startedAt, durationHours }: { startedAt: string; durationHours: number }) {
  const endTime = new Date(new Date(startedAt).getTime() + durationHours * 3_600_000).toISOString();
  const [text, setText] = useState(() => formatCountdown(endTime));

  useEffect(() => {
    const id = setInterval(() => setText(formatCountdown(endTime)), 1_000);
    return () => clearInterval(id);
  }, [endTime]);

  const isExpired = text === "Vencido";

  return (
    <div className={cn("flex items-center gap-2 text-[13px] font-[family-name:var(--font-mono)]", isExpired ? "text-[var(--pain-high)]" : "text-[var(--accent)]")}>
      <TimerIcon size={14} />
      {text}
    </div>
  );
}

export function VialSheet({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [confirmingVialId, setConfirmingVialId] = useState<string | null>(null);
  const [confirmingDiscardId, setConfirmingDiscardId] = useState<string | null>(null);

  const { data: vials = [] } = useQuery({
    queryKey: ["vials"],
    queryFn: api.getVials,
  });

  const { data: activeInstances = [] } = useQuery({
    queryKey: ["vial-instances/active"],
    queryFn: api.getActiveVialInstances,
  });

  const openMutation = useMutation({
    mutationFn: api.openVialInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vial-instances/active"] });
      queryClient.invalidateQueries({ queryKey: ["vial-instances/history"] });
      setConfirmingVialId(null);
    },
  });

  const discardMutation = useMutation({
    mutationFn: ({ id, endedAt }: { id: string; endedAt: string }) => api.discardVialInstance(id, endedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vial-instances/active"] });
      queryClient.invalidateQueries({ queryKey: ["vial-instances/history"] });
      setConfirmingDiscardId(null);
    },
  });

  const handleOpen = useCallback((vialId: string) => {
    openMutation.mutate({
      id: crypto.randomUUID(),
      vial_id: vialId,
      started_at: new Date().toISOString(),
    });
  }, [openMutation]);

  const handleDiscard = useCallback((id: string) => {
    discardMutation.mutate({
      id,
      endedAt: new Date().toISOString(),
    });
  }, [discardMutation]);

  return (
    <div className="space-y-5">
      <AnimatePresence mode="popLayout">
        {activeInstances.length > 0 ? (
          activeInstances.map((inst) => {
            const isConfirmingDiscard = confirmingDiscardId === inst.id;
            return (
              <motion.div
                key={inst.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EyedropperSampleIcon size={18} className="text-[var(--accent)]" />
                    <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                      {inst.vial_name ?? inst.drop_type_name}
                    </span>
                  </div>
                  <span className="rounded-full bg-[var(--accent-dim)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.10em] text-[var(--accent)]">Activo</span>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  {isConfirmingDiscard ? (
                    <DiscardConfirm
                      key="confirm-discard"
                      name={inst.vial_name ?? inst.drop_type_name ?? "este vial"}
                      isPending={discardMutation.isPending}
                      onConfirm={() => handleDiscard(inst.id)}
                      onCancel={() => setConfirmingDiscardId(null)}
                    />
                  ) : (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="flex items-center justify-between"
                    >
                      <VialCountdown startedAt={inst.started_at} durationHours={inst.duration_hours} />
                      <button
                        type="button"
                        onClick={() => setConfirmingDiscardId(inst.id)}
                        disabled={discardMutation.isPending}
                        className="flex min-h-[48px] items-center gap-1.5 rounded-full bg-[var(--pain-high)]/10 px-4 py-2 text-[13px] font-medium text-[var(--pain-high)] transition-colors active:bg-[var(--pain-high)]/20 disabled:opacity-50"
                      >
                        <XCircleIcon size={14} />
                        Descartar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-[12px] text-[var(--text-faint)]">
                  Abierto: {new Date(inst.started_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </motion.div>
            );
          })
        ) : (
          <motion.div
            key="empty"
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-[13px] text-[var(--text-muted)]"
          >
            No hay vial activo. Abre uno nuevo para empezar el seguimiento.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <p className="text-[12px] uppercase tracking-[0.10em] text-[var(--text-faint)] font-semibold">Abrir nuevo vial</p>
        {vials.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">
            Primero crea una configuración de vial en Gestionar viales.
          </p>
        ) : (
          <div className="space-y-2">
            {vials.map((vial) => {
              const name = vial.name ?? vial.drop_type_name ?? "este vial";
              const isConfirming = confirmingVialId === vial.id;
              return (
                <AnimatePresence mode="wait" initial={false} key={vial.id}>
                  {isConfirming ? (
                    <OpenConfirm
                      key="confirm"
                      name={name}
                      isPending={openMutation.isPending}
                      onConfirm={() => handleOpen(vial.id)}
                      onCancel={() => setConfirmingVialId(null)}
                    />
                  ) : (
                    <motion.div
                      key="row"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="flex w-full min-h-[48px] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    >
                      <EyedropperSampleIcon size={18} className="text-[var(--text-muted)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[var(--text-primary)] truncate">{name}</p>
                        <p className="text-[12px] text-[var(--text-faint)]">{vial.duration_hours}h máximo</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmingVialId(vial.id)}
                        disabled={openMutation.isPending}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--accent)] transition-colors hover:bg-[var(--accent-dim)] active:bg-[var(--accent-dim)] disabled:opacity-50"
                        aria-label={`Abrir vial de ${name}`}
                      >
                        <PlusCircleIcon size={22} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent py-2 text-[14px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-el)]"
      >
        Cerrar
      </button>
    </div>
  );
}
