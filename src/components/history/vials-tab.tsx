import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EyedropperSampleIcon, TimerIcon, CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

export function VialsTab() {
  const queryClient = useQueryClient();
  const [loadError] = useState<string | null>(null);

  const { data: activeInstances = [] } = useQuery({
    queryKey: ["vial-instances/active"],
    queryFn: api.getActiveVialInstances,
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["vial-instances/history"],
    queryFn: () => api.getVialInstanceHistory({ limit: 20 }),
  });

  const discardMutation = useMutation({
    mutationFn: ({ id, endedAt }: { id: string; endedAt: string }) => api.discardVialInstance(id, endedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vial-instances/active"] });
      queryClient.invalidateQueries({ queryKey: ["vial-instances/history"] });
    },
  });

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
                <span className="rounded-full bg-[var(--accent-dim)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.10em] text-[var(--accent)]">
                  Activo
                </span>
              </div>
              <VialCountdown startedAt={inst.started_at} durationHours={inst.duration_hours} />
              <div className="flex items-center justify-between text-[12px] text-[var(--text-faint)]">
                <span>Abierto: {new Date(inst.started_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
                <span>Vence: {new Date(new Date(inst.started_at).getTime() + inst.duration_hours * 3_600_000).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDiscard(inst.id)}
                disabled={discardMutation.isPending}
                className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-full bg-[var(--pain-high)]/10 py-2 text-[13px] font-medium text-[var(--pain-high)] transition-colors active:bg-[var(--pain-high)]/20 disabled:opacity-50"
              >
                <XCircleIcon size={16} />
                Descartar vial
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <EyedropperSampleIcon size={32} className="mx-auto mb-3 text-[var(--text-faint)]" />
          <p className="text-[14px] text-[var(--text-muted)]">No hay vial activo.</p>
          <p className="text-[12px] text-[var(--text-faint)] mt-1">Usa el botón + para abrir uno nuevo.</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[12px] uppercase tracking-[0.10em] text-[var(--text-faint)] font-semibold">Historial</p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-[16px]" />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(204,63,48,0.12)] border border-[rgba(204,63,48,0.3)] text-[var(--pain-high)]">
            {loadError}
          </div>
        ) : !historyData || historyData.instances.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)] py-4 text-center">No hay viales descartados aún.</p>
        ) : (
          <div className="space-y-2">
            {historyData.instances.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
                  <CheckCircleIcon size={16} className="text-[var(--text-faint)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[var(--text-primary)] truncate">
                    {inst.vial_name ?? inst.drop_type_name}
                  </p>
                  <p className="text-[12px] text-[var(--text-faint)]">
                    {new Date(inst.started_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} —{" "}
                    {inst.ended_at ? new Date(inst.ended_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "?"}
                  </p>
                </div>
                {inst.ended_at && (
                  <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--text-faint)]">
                    {Math.round((new Date(inst.ended_at).getTime() - new Date(inst.started_at).getTime()) / 36e5 * 10) / 10}h
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
