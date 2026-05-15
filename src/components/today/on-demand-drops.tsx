import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon, CheckIcon, DropIcon } from "@phosphor-icons/react";
import { TodayDropsSheet } from "./today-drops-sheet";
import { useQuickLog } from "./use-quick-log";
import { api } from "@/lib/api";
import type { DropTypeRecord } from "@/types/domain";

function OnDemandDropItem({ drop }: { drop: DropTypeRecord }) {
  const [justRegistered, setJustRegistered] = useState<string | null>(null);
  const [todayDropsOpen, setTodayDropsOpen] = useState(false);

  const { data: recentDrops = [] } = useQuery({
    queryKey: ["drops/recent", drop.id],
    queryFn: () => api.getRecentDrops(drop.id, 24),
    staleTime: 30_000,
  });

  const todayCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return recentDrops.filter((d) => new Date(d.logged_at).toDateString() === todayStr).length;
  }, [recentDrops]);

  const { quickLog, isPending } = useQuickLog({
    onSuccess: () => setTimeout(() => setJustRegistered(null), 1400),
    onError: () => setJustRegistered(null),
  });

  function handleLog() {
    if (isPending || justRegistered) return;
    const takenAt = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    setJustRegistered(takenAt);
    quickLog(drop.id);
  }

  return (
    <>
      <div
        className="flex min-h-[52px] items-center gap-3 rounded-[10px] px-3 py-2 transition-colors duration-300"
        style={{
          background: justRegistered
            ? "color-mix(in srgb, var(--pain-low) 8%, var(--surface-card))"
            : "var(--surface-el)",
        }}
      >
        <DropIcon
          size={14}
          className="shrink-0"
          style={{ color: justRegistered ? "var(--pain-low)" : "var(--accent)" }}
        />

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[15px] font-semibold capitalize leading-tight transition-colors duration-300"
            style={{ color: justRegistered ? "var(--text-muted)" : "var(--text-primary)" }}
          >
            {drop.name}
          </p>
          {justRegistered && (
            <motion.p
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="text-[12px] text-[var(--text-faint)]"
            >
              Tomada a las{" "}
              <span className="font-mono font-semibold" style={{ color: "var(--pain-low)" }}>
                {justRegistered}
              </span>
            </motion.p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {todayCount > 0 && (
            <button
              type="button"
              onClick={() => setTodayDropsOpen(true)}
              aria-label={`Ver ${todayCount} dosis registradas hoy`}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20 active:scale-[0.97]"
            >
              <DropIcon size={10} weight="bold" />
              {todayCount}
            </button>
          )}

          {justRegistered ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--pain-low) 18%, transparent)" }}
            >
              <CheckIcon size={14} weight="bold" style={{ color: "var(--pain-low)" }} />
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={handleLog}
              disabled={isPending}
              aria-label={`Registrar dosis de ${drop.name}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--accent)]/15 px-3 text-[13px] font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25 active:scale-[0.97] disabled:opacity-50"
            >
              <PlusIcon size={12} weight="bold" />
              Registrar
            </button>
          )}
        </div>
      </div>

      <TodayDropsSheet
        open={todayDropsOpen}
        onClose={() => setTodayDropsOpen(false)}
        initialDropTypeId={drop.id}
      />
    </>
  );
}

export function OnDemandDrops() {
  const { data: dropTypes = [] } = useQuery({
    queryKey: ["drop-types"],
    queryFn: api.getDropTypes,
    staleTime: 60_000,
  });

  const quickActionDrops = dropTypes.filter((d) => d.quick_action);

  if (quickActionDrops.length === 0) return null;

  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
      <div className="px-4 pt-4 pb-3">
        <p className="mb-0 text-[12px] font-semibold uppercase leading-none tracking-[0.10em] text-[var(--text-faint)]">
          A demanda
        </p>
      </div>
      <div className="space-y-1 px-3 pb-3">
        {quickActionDrops.map((drop) => (
          <OnDemandDropItem key={drop.id} drop={drop} />
        ))}
      </div>
    </div>
  );
}
