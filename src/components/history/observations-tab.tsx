import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getDayKey } from "@/lib/utils";
import { OBS_EYE_LABELS } from "@/lib/constants";
import type { OccurrenceRow } from "./types";
import { formatTime, getDayPillLabel, formatShortDate, painColor } from "./utils";

const OBS_PAGE_SIZE = 5;

export function ObservationsTab({ timezone }: { timezone: string }) {
  const [occurrences, setOccurrences] = useState<OccurrenceRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    api.getObservationOccurrences({ limit: OBS_PAGE_SIZE }).then((data) => {
      setOccurrences(data.occurrences);
      setHasMore(data.hasMore);
    }).catch(() => {
      setOccurrences([]);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const loadMore = async () => {
    if (isLoadingMore || occurrences.length === 0) return;
    const before = occurrences[occurrences.length - 1].loggedAt;
    setIsLoadingMore(true);
    try {
      const data = await api.getObservationOccurrences({ limit: OBS_PAGE_SIZE, before });
      setOccurrences((prev) => [...prev, ...data.occurrences]);
      setHasMore(data.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-[14px] bg-[var(--surface)]" />
        ))}
      </div>
    );
  }

  if (occurrences.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(92,184,90,0.12)] border border-[rgba(92,184,90,0.3)] text-[var(--pain-low)]">
        No hay observaciones clínicas aún. Toca + para registrar tu primera observación.
      </div>
    );
  }

  const groups = new Map<string, { title: string; eye: string; items: OccurrenceRow[] }>();
  for (const occ of occurrences) {
    const existing = groups.get(occ.observationId);
    if (existing) {
      existing.items.push(occ);
    } else {
      groups.set(occ.observationId, { title: occ.title, eye: occ.eye, items: [occ] });
    }
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([obsId, group]) => (
        <div key={obsId} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">{group.title}</p>
              {group.eye && group.eye !== "none" ? (
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mt-0.5">
                  {OBS_EYE_LABELS[group.eye as keyof typeof OBS_EYE_LABELS]}
                </p>
              ) : null}
            </div>
            <span className="mono shrink-0 inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-[var(--surface-el)] text-[11px] font-semibold text-[var(--text-muted)]">
              {group.items.length}
            </span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {group.items.map((item) => {
              const time = formatTime(item.loggedAt, timezone);
              const dayKey = getDayKey(item.loggedAt, timezone);
              const pillLabel = getDayPillLabel(dayKey, timezone);
              const shortDate = formatShortDate(dayKey);
              const dateLabel = pillLabel ?? shortDate;
              const intensityHue = painColor(item.intensity);
              return (
                <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="mono text-[11px] text-[var(--text-muted)]">
                        {dateLabel} · {time}
                        {item.durationMinutes ? ` · ${item.durationMinutes} min` : ""}
                      </p>
                      <span className="mono shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: intensityHue }}>
                        {item.intensity}/10
                      </span>
                    </div>
                    {item.notes ? (
                      <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-secondary)]">{item.notes}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="mono text-[11px] tracking-[0.12em] text-[var(--text-muted)] disabled:opacity-50"
          >
            {isLoadingMore ? "CARGANDO..." : "CARGAR MÁS"}
          </button>
        </div>
      )}
      {!hasMore && occurrences.length > 0 && (
        <p className="mono text-center text-[10px] tracking-[0.12em] text-[var(--text-faint)] pb-4">
          INICIO DEL HISTORIAL
        </p>
      )}
    </div>
  );
}
