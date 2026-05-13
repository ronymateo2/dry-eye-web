import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { EyedropperIcon, StethoscopeIcon, MoonIcon, PillIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { getDayKey } from "@/lib/utils";
import { OBS_EYE_LABELS } from "@/lib/constants";
import type { OccurrenceRow } from "./types";
import { formatTime, getDayPillLabel, formatShortDate, painColor } from "./utils";

const OBS_PAGE_SIZE = 5;

export function ObservationsTab({ timezone }: { timezone: string }) {
  const { data: firstPage, isLoading } = useQuery({
    queryKey: ["observation-occurrences"],
    queryFn: () => api.getObservationOccurrences({ limit: OBS_PAGE_SIZE }),
  });

  const [extra, setExtra] = useState<OccurrenceRow[]>([]);
  const [extraHasMore, setExtraHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setExtra([]);
    setExtraHasMore(false);
  }, [firstPage]);

  const occurrences = [...(firstPage?.occurrences ?? []), ...extra];
  const hasMore = extra.length > 0 ? extraHasMore : (firstPage?.hasMore ?? false);

  const loadMore = async () => {
    if (isLoadingMore || occurrences.length === 0) return;
    const before = occurrences[occurrences.length - 1].loggedAt;
    setIsLoadingMore(true);
    try {
      const data = await api.getObservationOccurrences({ limit: OBS_PAGE_SIZE, before });
      setExtra((prev) => [...prev, ...data.occurrences]);
      setExtraHasMore(data.hasMore);
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
      <div className="rounded-[var(--radius-md)] px-4 py-3 text-[15px] bg-[rgba(123,198,122,0.12)] border border-[rgba(123,198,122,0.3)] text-[var(--pain-low)]">
        No hay observaciones clínicas aún. Toca + para registrar tu primera observación.
      </div>
    );
  }

  const groups = new Map<string, { title: string; eye: string; bodyZone: string | null; bodyZoneCustom: string | null; items: OccurrenceRow[] }>();
  for (const occ of occurrences) {
    const existing = groups.get(occ.observationId);
    if (existing) {
      existing.items.push(occ);
    } else {
      groups.set(occ.observationId, { title: occ.title, eye: occ.eye, bodyZone: occ.bodyZone, bodyZoneCustom: occ.bodyZoneCustom, items: [occ] });
    }
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([obsId, group], index) => (
        <motion.div
          key={obsId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: Math.min(index, 4) * 0.055 }}
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">{group.title}</p>
              {group.eye && group.eye !== "none" ? (
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mt-0.5">
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
              const intensityHue = item.intensity != null ? painColor(item.intensity) : undefined;
              const hasProps = item.propertyValues && item.propertiesSchema && item.propertiesSchema.length > 0;
              const hasLinks = item.links && Object.values(item.links).some((v) =>
                Array.isArray(v) ? v.length > 0 : v !== undefined
              );
              return (
                <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="mono text-[11px] text-[var(--text-muted)]">
                        {dateLabel} · {time}
                      </p>
                      {item.intensity != null && (
                        <span className="mono shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: intensityHue }}>
                          {item.intensity}/10
                        </span>
                      )}
                    </div>
                    {hasProps && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {item.propertiesSchema!.map((def) => {
                          const v = item.propertyValues![def.key];
                          if (v === undefined || v === null || v === "") return null;
                          let display: string;
                          if (def.type === "scale") display = `${v}/10`;
                          else if (def.type === "boolean") display = v ? "Sí" : "No";
                          else {
                            const opt = def.options.find((o) => o.value === v);
                            display = opt?.label ?? String(v);
                          }
                          return (
                            <span key={def.key} className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                              {def.label}: <span className="font-medium text-[var(--text-primary)]">{display}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {item.notes && (
                      <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-secondary)]">{item.notes}</p>
                    )}
                    {hasLinks && (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {(item.links!.drop_type_ids ?? []).length > 0 && (
                          <EyedropperIcon size={12} color="var(--text-faint)" />
                        )}
                        {item.links!.check_in_id && (
                          <StethoscopeIcon size={12} color="var(--text-faint)" />
                        )}
                        {item.links!.sleep_day_key && (
                          <MoonIcon size={12} color="var(--text-faint)" />
                        )}
                        {(item.links!.medication_ids ?? []).length > 0 && (
                          <PillIcon size={12} color="var(--text-faint)" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
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
        <p className="mono text-center text-[11px] tracking-[0.12em] text-[var(--text-faint)] pb-4">
          INICIO DEL HISTORIAL
        </p>
      )}
    </div>
  );
}
