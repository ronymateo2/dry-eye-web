import { useState, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { useInvalidateDrops } from "@/lib/hooks/use-invalidate-drops";
import { PlusIcon, CheckIcon, DropIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { TodayDropsSheet } from "./today-drops-sheet";
import { TodayCountBadge } from "./today-count-badge";
import { useQuickLog } from "./use-quick-log";
import { useNow } from "@/lib/hooks/use-now";
import { IconButton } from "@/components/ui/icon-button";
import { api } from "@/lib/api";
import type { DropTypeRecord } from "@/types/domain";

function formatTimeAgo(dateStr: string, now: number): string {
  const diffMin = Math.floor((now - new Date(dateStr).getTime()) / 60_000);
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin}min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `hace ${h}h ${m}min` : `hace ${h}h`;
}

function OnDemandDropItem({ drop }: { drop: DropTypeRecord }) {
  const now = useNow(60_000);
  const [justRegistered, setJustRegistered] = useState<string | null>(null);
  const [todayDropsOpen, setTodayDropsOpen] = useState(false);
  const lastDropIdRef = useRef<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidateDrops = useInvalidateDrops();
  const { data: recentDrops = [] } = useQuery({
    queryKey: ["drops/recent", drop.id],
    queryFn: () => api.getRecentDrops(drop.id, 24),
    staleTime: 30_000,
  });

  const todayCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return recentDrops.filter((d) => new Date(d.logged_at).toDateString() === todayStr).length;
  }, [recentDrops]);

  const lastDrop = recentDrops[0] ?? null;

  const { quickLog, isPending } = useQuickLog({
    onSuccess: (dropTypeId, dropId) => {
      lastDropIdRef.current = dropId;
      toast.success(`${drop.name} registrada`, {
        duration: 3_000,
        action: {
          label: "Deshacer",
          onClick: () => {
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
            void (async () => {
              const id = lastDropIdRef.current;
              if (!id) return;
              try {
                await api.deleteDrop(id);
                setJustRegistered(null);
                invalidateDrops(dropTypeId);
              } catch {
                toast.error("No se pudo deshacer el registro");
              }
            })();
          },
        },
      });
      clearTimerRef.current = setTimeout(() => {
        setJustRegistered(null);
        invalidateDrops(dropTypeId);
      }, 3_000);
    },
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
        <IconButton
          variant={justRegistered ? "tinted-success" : "tinted"}
          onClick={handleLog}
          disabled={isPending}
          whileTap={{ scale: 1.5 }}
          aria-label={`Registrar dosis de ${drop.name}`}
        >
          <DropIcon size={14} />
        </IconButton>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[15px] font-semibold capitalize leading-tight transition-colors duration-300"
            style={{ color: justRegistered ? "var(--text-muted)" : "var(--text-primary)" }}
          >
            {drop.name}
          </p>
          {justRegistered ? (
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
          ) : lastDrop ? (
            <p className="text-[12px] text-[var(--text-faint)]">
              última{" "}
              <span className="font-mono">{formatTimeAgo(lastDrop.logged_at, now)}</span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {todayCount > 0 && (
            <TodayCountBadge
              count={todayCount}
              onClick={() => setTodayDropsOpen(true)}
              iconSize={10}
              className="px-2.5 py-1 text-[12px]"
            />
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
          Gota a demanda
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
