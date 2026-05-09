import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function VialsTab() {
  const [loadError] = useState<string | null>(null);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["vials/history"],
    queryFn: () => api.getVialHistory({ limit: 20 }),
  });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[12px] uppercase tracking-[0.10em] text-[var(--text-faint)] font-semibold">Historial de viales</p>
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
        ) : !historyData || historyData.vials.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)] py-4 text-center">No hay viales descartados aún.</p>
        ) : (
          <div className="space-y-2">
            {historyData.vials.map((vial) => (
              <div
                key={vial.id}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
                  <CheckCircleIcon size={16} className="text-[var(--text-faint)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[var(--text-primary)] truncate">
                    {vial.drop_type_name}
                  </p>
                  <p className="text-[12px] text-[var(--text-faint)]">
                    {new Date(vial.started_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} —{" "}
                    {vial.ended_at ? new Date(vial.ended_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "?"}
                  </p>
                </div>
                {vial.ended_at && (
                  <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--text-faint)]">
                    {Math.round((new Date(vial.ended_at).getTime() - new Date(vial.started_at).getTime()) / 36e5 * 10) / 10}h
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
