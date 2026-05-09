import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EyedropperSampleIcon, TimerIcon, CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const [selectedVialId, setSelectedVialId] = useState<string | null>(null);

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
      onSaved();
    },
  });

  const discardMutation = useMutation({
    mutationFn: ({ id, endedAt }: { id: string; endedAt: string }) => api.discardVialInstance(id, endedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vial-instances/active"] });
      queryClient.invalidateQueries({ queryKey: ["vial-instances/history"] });
      onSaved();
    },
  });

  const handleOpen = useCallback(() => {
    if (!selectedVialId) return;
    openMutation.mutate({
      id: crypto.randomUUID(),
      vial_id: selectedVialId,
      started_at: new Date().toISOString(),
    });
  }, [selectedVialId, openMutation]);

  const handleDiscard = useCallback((id: string) => {
    discardMutation.mutate({
      id,
      endedAt: new Date().toISOString(),
    });
  }, [discardMutation]);

  return (
    <div className="space-y-5">
      {activeInstances.length > 0 ? (
        <div className="space-y-2">
          {activeInstances.map((inst) => (
            <div key={inst.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyedropperSampleIcon size={18} className="text-[var(--accent)]" />
                  <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {inst.vial_name ?? inst.drop_type_name}
                  </span>
                </div>
                <span className="rounded-full bg-[var(--accent-dim)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.10em] text-[var(--accent)]">Activo</span>
              </div>
              <div className="flex items-center justify-between">
                <VialCountdown startedAt={inst.started_at} durationHours={inst.duration_hours} />
                <button
                  type="button"
                  onClick={() => handleDiscard(inst.id)}
                  disabled={discardMutation.isPending}
                  className="flex min-h-[48px] items-center gap-1.5 rounded-full bg-[var(--pain-high)]/10 px-4 py-2 text-[13px] font-medium text-[var(--pain-high)] transition-colors active:bg-[var(--pain-high)]/20 disabled:opacity-50"
                >
                  <XCircleIcon size={14} />
                  Descartar
                </button>
              </div>
              <p className="text-[12px] text-[var(--text-faint)]">
                Abierto: {new Date(inst.started_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-[13px] text-[var(--text-muted)]">
          No hay vial activo. Abre uno nuevo para empezar el seguimiento.
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[12px] uppercase tracking-[0.10em] text-[var(--text-faint)] font-semibold">Abrir nuevo vial</p>
        {vials.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">
            Primero crea una configuración de vial en Gestionar viales.
          </p>
        ) : (
          <div className="space-y-2">
            {vials.map((vial) => (
              <button
                key={vial.id}
                type="button"
                onClick={() => setSelectedVialId(vial.id)}
                className={cn(
                  "flex w-full min-h-[48px] items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors",
                  selectedVialId === vial.id
                    ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40",
                )}
              >
                <EyedropperSampleIcon size={18} className={selectedVialId === vial.id ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[var(--text-primary)] truncate">{vial.name ?? vial.drop_type_name}</p>
                  <p className="text-[12px] text-[var(--text-faint)]">{vial.duration_hours}h máximo</p>
                </div>
                {selectedVialId === vial.id && <CheckCircleIcon size={18} className="text-[var(--accent)]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedVialId && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={openMutation.isPending}
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          <CheckCircleIcon size={16} />
          Abrir vial ahora
        </button>
      )}

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
