import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { historyApi } from "@/features/history";
import { useUser } from "@/lib/auth";
import { getDayKey } from "@/lib/utils";
import type { HistoryFeed, HygieneRecord } from "@/types/domain";

import { FeedSkeleton } from "@/components/history/feed-skeleton";
import { ObservationsTab } from "@/components/history/observations-tab";
import { DropsTab } from "@/components/history/drops-tab";
import { VialsTab } from "@/components/history/vials-tab";
import { HistoryList } from "@/components/history/history-list";
import { HISTORY_TABS, type HistoryTab } from "@/components/history/types";

function TabBar({ activeTab, onTabChange }: { activeTab: HistoryTab; onTabChange: (tab: HistoryTab) => void }) {
  return (
    <div className="mb-6 flex gap-6 border-b border-[var(--border)]">
      {HISTORY_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className="relative pb-2.5 text-[13px] font-semibold transition-colors duration-150"
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
  );
}

function EmptyFeed() {
  return (
    <div className="rounded-[var(--radius-md)] px-4 py-3 text-body-emphasized bg-[rgba(123,198,122,0.12)] border border-[rgba(123,198,122,0.3)] text-[var(--pain-low)]">
      Aún no tienes registros. Ve a Registrar para empezar.
    </div>
  );
}

function LoadMoreFooter({
  loadError,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  loadError: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 pb-4">
      {loadError && (
        <div className="w-full rounded-[var(--radius-md)] px-4 py-3 text-[15px] bg-[rgba(204,63,48,0.12)] border border-[rgba(204,63,48,0.3)] text-[var(--pain-high)]">
          {loadError}
        </div>
      )}
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="mono text-[11px] font-normal tracking-[0.12em] text-[var(--text-muted)] disabled:opacity-50"
        >
          {isLoadingMore ? "CARGANDO..." : "CARGAR MÁS"}
        </button>
      )}
      {!hasMore && (
        <p className="mono text-[11px] font-normal tracking-[0.12em] text-[var(--text-faint)]">
          INICIO DEL HISTORIAL
        </p>
      )}
    </div>
  );
}

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
      const data = await historyApi.getFeed();
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
      const data = await historyApi.getFeed();
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
      const more = await historyApi.getMore(lastGroup.dayKey);
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

  if (isLoading) return <section><FeedSkeleton /></section>;

  return (
    <section>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

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
          ) : activeTab === "drops" ? (
            <DropsTab timezone={timezone} />
          ) : activeTab === "vials" ? (
            <VialsTab />
          ) : !feed || (feed.groups.length === 0 && feed.hygiene.length === 0) ? (
            <EmptyFeed />
          ) : (
            <>
              <HistoryList
                feed={feed}
                timezone={timezone}
                expandedDays={expandedDays}
                toggleDay={toggleDay}
              />
              <LoadMoreFooter
                loadError={loadError}
                hasMore={feed.hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMore}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}