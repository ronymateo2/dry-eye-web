import { memo, useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { dropsApi, dropKeys, dropTypeKeys, useInvalidateDrops } from "@/features/drops";
import { CheckIcon, DropIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { TodayDropsSheet } from "./today-drops-sheet";
import { TodayCountBadge } from "./today-count-badge";
import { useQuickLog } from "./use-quick-log";
import { useNow } from "@/lib/hooks/use-now";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import type { DropTypeRecord } from "@/types/domain";

function formatTimeAgo(dateStr: string, now: number): string {
  const diffMin = Math.floor((now - new Date(dateStr).getTime()) / 60_000);
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin}min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `hace ${h}h ${m}min` : `hace ${h}h`;
}

function LastDropTime({ iso }: { iso: string }) {
  const now = useNow(60_000);
  return <span className="font-mono">{formatTimeAgo(iso, now)}</span>;
}

function OnDemandDropItem({ drop }: { drop: DropTypeRecord }) {
  const [justRegistered, setJustRegistered] = useState<string | null>(null);
  const [todayDropsOpen, setTodayDropsOpen] = useState(false);
  const lastDropIdRef = useRef<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidateDrops = useInvalidateDrops();
  const { data: todayDrops = [] } = useQuery({
    queryKey: dropKeys.today(),
    queryFn: dropsApi.getToday,
    staleTime: 30_000,
  });

  const mine = useMemo(
    () => todayDrops.filter((d) => d.drop_type_id === drop.id),
    [todayDrops, drop.id],
  );

  const todayCount = mine.length;
  const lastDrop = mine[0] ?? null;

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
                await dropsApi.remove(id);
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
      <div className="flex min-h-[64px] items-center gap-4 px-4 py-3">
        <IconButton
          variant={justRegistered ? "tinted-success" : "tinted"}
          onClick={handleLog}
          disabled={isPending}
          whileTap={{ scale: 1.4 }}
          aria-label={`Registrar dosis de ${drop.name}`}
          className="h-11 w-11 shrink-0"
        >
          <DropIcon size={18} />
        </IconButton>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[15px] font-semibold capitalize leading-snug transition-colors duration-300"
            style={{ color: justRegistered ? "var(--text-muted)" : "var(--text-primary)" }}
          >
            {drop.name}
          </p>
          {justRegistered ? (
            <p className="anim-fade-up mt-0.5 text-[12px] text-[var(--text-faint)]">
              Tomada a las{" "}
              <span className="font-mono font-semibold" style={{ color: "var(--pain-low)" }}>
                {justRegistered}
              </span>
            </p>
          ) : lastDrop ? (
            <p className="mt-0.5 text-[12px] text-[var(--text-faint)]">
              última <LastDropTime iso={lastDrop.logged_at} />
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {todayCount > 0 && (
            <TodayCountBadge
              count={todayCount}
              onClick={() => setTodayDropsOpen(true)}
              iconSize={11}
              className="px-3 py-1.5 text-[13px]"
            />
          )}

          {justRegistered ? (
            <div
              className="anim-pop-in flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--pain-low) 18%, transparent)" }}
            >
              <CheckIcon size={18} weight="bold" style={{ color: "var(--pain-low)" }} />
            </div>
          ) : (
            <Button
              variant="tinted"
              size="sm"
              onClick={handleLog}
              disabled={isPending}
              aria-label={`Registrar dosis de ${drop.name}`}
            >
              Registrar
            </Button>
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

export const OnDemandDrops = memo(function OnDemandDrops() {
  const { data: dropTypes = [] } = useQuery({
    queryKey: dropTypeKeys.list(),
    queryFn: dropsApi.getTypes,
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
      <div className="divide-y divide-[var(--border)]">
        {quickActionDrops.map((drop) => (
          <OnDemandDropItem key={drop.id} drop={drop} />
        ))}
      </div>
    </div>
  );
});
