import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { getDayKey } from "@/lib/utils";
import type { HistoryFeed, HygieneRecord } from "@/types/domain";

import { FeedSkeleton } from "@/components/history/feed-skeleton";
import { ObservationsTab } from "@/components/history/observations-tab";
import { HistoryList } from "@/components/history/history-list";
import { HISTORY_TABS, type HistoryTab } from "@/components/history/types";

export default function HistoryPage() {
  const user = useUser();
  const [feed, setFeed] = useState<HistoryFeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const timezone = feed?.timezone ?? user.timezone ?? "America/Bogota";

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  };

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getHistory();
      setFeed(data);
      const todayKey = getDayKey(new Date().toISOString(), data.timezone);
      setExpandedDays(new Set([todayKey]));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    const handler = async () => {
      const data = await api.getHistory();
      setFeed(data);
    };
    window.addEventListener("history:refresh", handler);
    return () => window.removeEventListener("history:refresh", handler);
  }, []);

  const loadMore = async () => {
    if (!feed || isLoadingMore) return;
    const lastGroup = feed.groups[feed.groups.length - 1];
    if (!lastGroup) return;
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const more = await api.getHistoryMore(lastGroup.dayKey);
      setFeed((prev) => {
        if (!prev) return more;
        const hygieneByDay = new Map<string, HygieneRecord>();
        for (const row of prev.hygiene) hygieneByDay.set(row.dayKey, row);
        for (const row of more.hygiene) hygieneByDay.set(row.dayKey, row);
        return {
          ...more,
          groups: [...prev.groups, ...more.groups],
          hygiene: Array.from(hygieneByDay.values()),
        };
      });
    } catch {
      setLoadError("No se pudo cargar más registros. Intenta de nuevo.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <section>
      {isLoading ? (
        <FeedSkeleton />
      ) : (
        <>
          {/* Minimal underline tabs */}
          <div className="mb-6 flex gap-6 border-b border-[var(--border)]">
            {HISTORY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="relative pb-2.5 text-[14px] font-semibold transition-colors duration-150"
                style={{
                  color: activeTab === tab.value ? "var(--text-primary)" : "var(--text-faint)",
                }}
              >
                {tab.label}
                {activeTab === tab.value && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
          >
            {activeTab === "observations" ? (
              <ObservationsTab timezone={timezone} />
            ) : !feed || (feed.groups.length === 0 && feed.hygiene.length === 0) ? (
              <div className="rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(92,184,90,0.12)] border border-[rgba(92,184,90,0.3)] text-[var(--pain-low)]">
                Aún no tienes registros. Ve a Registrar para empezar.
              </div>
            ) : (
              <>
                <HistoryList
                  feed={feed}
                  timezone={timezone}
                  expandedDays={expandedDays}
                  toggleDay={toggleDay}
                />

                <div className="mt-6 flex flex-col items-center gap-3 pb-4">
                  {loadError && (
                    <div className="w-full rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(204,63,48,0.12)] border border-[rgba(204,63,48,0.3)] text-[var(--pain-high)]">
                      {loadError}
                    </div>
                  )}
                  {feed.hasMore && (
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="mono text-[11px] tracking-[0.12em] text-[var(--text-muted)] disabled:opacity-50"
                    >
                      {isLoadingMore ? "CARGANDO..." : "CARGAR MÁS"}
                    </button>
                  )}
                  {!feed.hasMore && (
                    <p className="mono text-[10px] tracking-[0.12em] text-[var(--text-faint)]">
                      INICIO DEL HISTORIAL
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
          </AnimatePresence>
        </>
      )}
    </section>
  );
}
