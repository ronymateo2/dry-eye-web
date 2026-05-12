import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PulseIcon,
  CaretRightIcon,
  GearIcon,
  TrashIcon,
  DropIcon,
  EyedropperSampleIcon,
  ClockCountdownIcon,
  ArrowRightIcon,
  ListDashesIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { MedicationsAgenda } from "@/components/today/medications-agenda";
import { SymptomStatusCard } from "@/components/today/symptom-status-card";
import { SleepStatus } from "@/components/ui/sleep-status";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { DayProjectionSheet } from "@/components/register/day-projection-sheet";
import type { DoseSlot } from "@/components/register/day-projection-sheet";
import { api } from "@/lib/api";
import { cn, daysUntilEnd } from "@/lib/utils";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import type { DropScheduleEntry } from "@/types/domain";

type ActiveVialEntry = Awaited<ReturnType<typeof api.getActiveVials>>[0];

// ---- helpers ----

function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays > 0) return `hace ${diffDays}d`;
  if (diffHr > 0) return `hace ${diffHr}h`;
  if (diffMin > 0) return `hace ${diffMin}m`;
  return "ahora";
}

function getCountdown(
  lastLoggedAt: string,
  intervalHours: number,
  now: number,
): { label: string; overdue: boolean; nextTime: string; color: string; progress: number } {
  const intervalMs = intervalHours * 3_600_000;
  const nextMs = new Date(lastLoggedAt).getTime() + intervalMs;
  const diffMs = nextMs - now;
  const progress = Math.min(1, Math.max(0, 1 - diffMs / intervalMs));
  const nd = new Date(nextMs);
  const nh = nd.getHours(), nm = nd.getMinutes();
  const nextTime = `${String(nh % 12 || 12).padStart(2, "0")}:${String(nm).padStart(2, "0")} ${nh < 12 ? "am" : "pm"}`;

  let label: string;
  let color: string;
  if (diffMs <= 0) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    label = h > 0 ? `hace ${h}h ${m}m` : `hace ${m}m`;
    color = "var(--pain-high)";
  } else {
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    label = h > 0 ? `${h}h ${m}m` : `${m}m`;
    color =
      progress < 0.5 ? "var(--pain-low)" : progress < 0.8 ? "var(--accent)" : "var(--pain-mid)";
  }

  return { label, overdue: diffMs <= 0, nextTime, color, progress };
}

function getNextMs(entry: DropScheduleEntry): number {
  if (!entry.last_logged_at || !entry.interval_hours) return Number.POSITIVE_INFINITY;
  return new Date(entry.last_logged_at).getTime() + entry.interval_hours * 3_600_000;
}

function buildDayProjection(entries: DropScheduleEntry[]): DoseSlot[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = todayStart.getTime() + 86_400_000;
  const slots: DoseSlot[] = [];
  for (const entry of entries) {
    if (!entry.interval_hours || !entry.last_logged_at) continue;
    const intervalMs = entry.interval_hours * 3_600_000;
    let cursor = new Date(entry.last_logged_at).getTime() + intervalMs;
    while (cursor - intervalMs >= todayStart.getTime()) cursor -= intervalMs;
    while (cursor < todayEnd) {
      if (cursor >= todayStart.getTime()) {
        slots.push({ time: cursor, name: entry.name, drop_type_id: entry.drop_type_id });
      }
      cursor += intervalMs;
    }
  }
  return slots.sort((a, b) => a.time - b.time);
}

// ---- shared data hook ----

function useScheduleData() {
  const [now, setNow] = useState(() => Date.now());

  const { data: activeVials = [] } = useQuery({
    queryKey: ["vials/active"],
    queryFn: api.getActiveVials,
    staleTime: 60_000,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["drops/last-per-type"],
    queryFn: api.getLastDropPerType,
    staleTime: 60_000,
  });

  const { data: calendarData } = useQuery({
    queryKey: ["calendar/events/today"],
    queryFn: api.getCalendarEventsToday,
    staleTime: 60_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const scheduled = useMemo(
    () =>
      entries
        .filter((e) => e.interval_hours != null)
        .filter((e) => !(e.end_date && daysUntilEnd(e.end_date) < 0))
        .sort((a, b) => getNextMs(a) - getNextMs(b)),
    [entries],
  );

  const daySlots = useMemo<DoseSlot[]>(() => {
    const calEvents = calendarData?.events;
    if (calEvents && calEvents.length > 0) {
      return calEvents
        .map((e) => ({
          time: new Date(e.scheduled_at).getTime(),
          name: e.name,
          drop_type_id: e.drop_type_id,
        }))
        .sort((a, b) => a.time - b.time);
    }
    return buildDayProjection(entries);
  }, [calendarData, entries]);

  const vialByDropType = useMemo(
    () => new Map(activeVials.map((v) => [v.drop_type_id, v])),
    [activeVials],
  );

  return { now, activeVials, scheduled, daySlots, vialByDropType };
}

// ---- VialRow (tarjeta view — inline confirm) ----

function VialRow({
  vial,
  index,
  now,
  isConfirming,
  onRequestDiscard,
  onCancel,
  onConfirmDiscard,
  isPending,
}: {
  vial: ActiveVialEntry;
  index: number;
  now: number;
  isConfirming: boolean;
  onRequestDiscard: () => void;
  onCancel: () => void;
  onConfirmDiscard: () => void;
  isPending: boolean;
}) {
  const durationMs = (vial.vial_duration ?? 24) * 3_600_000;
  const expiresAtMs = new Date(vial.started_at).getTime() + durationMs;
  const diffMs = expiresAtMs - now;
  const isExpired = diffMs <= 0;
  const isWarning = !isExpired && diffMs < 2 * 3_600_000;
  const barColor = isExpired
    ? "var(--pain-high)"
    : isWarning
      ? "var(--warning)"
      : "var(--pain-low)";

  let rightLabel: string;
  if (isExpired) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    rightLabel = h > 0 ? `vencido hace ${h}h ${m}m` : `vencido hace ${m}m`;
  } else {
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    rightLabel = h > 0 ? `vence en ${h}h ${m}m` : `vence en ${m}m`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="group min-h-[34px] w-full overflow-hidden rounded-[9px]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isConfirming ? (
          <motion.div
            key="normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-1"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="shrink-0 flex items-center justify-center rounded-[8px]"
                style={{
                  width: 32,
                  height: 32,
                  background: `color-mix(in srgb, ${barColor} 12%, var(--surface-el))`,
                }}
                aria-hidden
              >
                <EyedropperSampleIcon size={15} style={{ color: barColor }} />
              </span>
              <span
                className="truncate text-[14px] font-medium capitalize leading-none"
                style={{ color: isExpired ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {vial.drop_type_name}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5">
              <span
                className="font-mono text-[12px] font-semibold tabular-nums"
                style={{ color: barColor }}
              >
                {rightLabel}
              </span>
              <button
                type="button"
                onClick={onRequestDiscard}
                className="flex items-center justify-center w-7 h-7 rounded-full text-[var(--text-faint)] opacity-60 hover:opacity-100 hover:bg-[var(--surface-el)] active:bg-[var(--surface-el)] active:text-[var(--error)] transition-all duration-[160ms]"
                aria-label={`Descartar ${vial.drop_type_name}`}
              >
                <TrashIcon size={15} weight="regular" />
              </button>
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex items-center justify-between gap-3 px-3 py-1 min-h-[44px]"
          >
            <span className="min-w-0 truncate text-[13px] font-medium text-[var(--error)]">
              ¿Descartar {vial.drop_type_name}?
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-el)]"
              >
                No
              </button>
              <button
                type="button"
                onClick={onConfirmDiscard}
                disabled={isPending}
                className="rounded-full bg-[var(--error)]/10 px-3 py-1.5 text-[13px] font-medium text-[var(--error)] transition-opacity hover:bg-[var(--error)]/20 disabled:opacity-50"
              >
                {isPending ? "…" : "Sí"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---- CountdownRing (hero view) ----

function CountdownRing({
  progress,
  color,
  ringLabel,
}: {
  progress: number;
  color: string;
  ringLabel: string;
}) {
  const size = 128;
  const sw = 8;
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  const dashOffset = C * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-el)" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s ease-linear, stroke 0.4s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4,
        }}
      >
        <DropIcon size={16} weight="fill" style={{ color }} />
        <span
          className="font-mono font-bold tabular-nums"
          style={{ fontSize: 17, lineHeight: 1, color: "var(--text-primary)" }}
        >
          {ringLabel}
        </span>
        <span
          className="text-center"
          style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.3, maxWidth: 70 }}
        >
          para tu próxima dosis
        </span>
      </div>
    </div>
  );
}

// ---- VialDiscardSheet (hero view — bottom sheet confirm) ----

function VialDiscardSheet({
  vial,
  onClose,
  onConfirm,
  isPending,
}: {
  vial: ActiveVialEntry | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <MobileSheet
      open={vial !== null}
      title="Descartar vial"
      description={vial?.drop_type_name ?? ""}
      onClose={onClose}
    >
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="w-full rounded-[14px] bg-[var(--error)]/10 py-4 text-[15px] font-semibold text-[var(--error)] transition-opacity disabled:opacity-50 hover:bg-[var(--error)]/20"
        >
          {isPending ? "…" : "Sí, descartar"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-[14px] py-4 text-[15px] font-medium text-[var(--text-muted)] transition-opacity hover:opacity-70"
        >
          Cancelar
        </button>
      </div>
    </MobileSheet>
  );
}

// ---- HeroVialChip (hero view — clickable vial pill badge) ----

function HeroVialChip({
  vial,
  now,
  onClick,
}: {
  vial: ActiveVialEntry;
  now: number;
  onClick: () => void;
}) {
  const durationMs = (vial.vial_duration ?? 24) * 3_600_000;
  const diffMs = new Date(vial.started_at).getTime() + durationMs - now;
  const isExpired = diffMs <= 0;
  const isWarning = !isExpired && diffMs < 2 * 3_600_000;
  const color = isExpired
    ? "var(--pain-high)"
    : isWarning
      ? "var(--warning)"
      : "var(--pain-low)";
  const h = Math.floor(Math.abs(diffMs) / 3_600_000);
  const m = Math.floor((Math.abs(diffMs) % 3_600_000) / 60_000);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const suffix = isExpired ? `vencido hace ${timeStr}` : `vence en ${timeStr}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60"
      aria-label={`Vial de ${vial.drop_type_name}. ${suffix}. Toca para descartar.`}
    >
      <EyedropperSampleIcon size={11} weight="fill" style={{ color, flexShrink: 0 }} />
      <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
        vial · {suffix}
      </span>
    </button>
  );
}

// ---- ViewToggle ----

function ViewToggle({
  view,
  setView,
}: {
  view: "card" | "hero";
  setView: (v: "card" | "hero") => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[var(--surface-el)] p-0.5">
      <button
        type="button"
        onClick={() => setView("card")}
        aria-label="Vista tarjeta"
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-[160ms]",
          view === "card"
            ? "bg-[var(--accent)] text-[var(--btn-primary-text)]"
            : "text-[var(--text-faint)] hover:text-[var(--text-muted)]",
        )}
      >
        <ListDashesIcon size={13} />
      </button>
      <button
        type="button"
        onClick={() => setView("hero")}
        aria-label="Vista hero"
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-[160ms]",
          view === "hero"
            ? "bg-[var(--accent)] text-[var(--btn-primary-text)]"
            : "text-[var(--text-faint)] hover:text-[var(--text-muted)]",
        )}
      >
        <ClockCountdownIcon size={13} />
      </button>
    </div>
  );
}

// ---- TimelineRow (hero view — subsequent doses) ----

function TimelineRow({
  entry,
  index,
  now,
  vial,
  onDiscardVial,
}: {
  entry: DropScheduleEntry;
  index: number;
  now: number;
  vial: ActiveVialEntry | null;
  onDiscardVial: () => void;
}) {
  if (!entry.interval_hours) return null;

  const noRecord = !entry.last_logged_at;
  const computed = noRecord ? null : getCountdown(entry.last_logged_at!, entry.interval_hours, now);
  const badgeLabel = noRecord ? "Sin registro" : computed!.label;
  const badgeColor = computed?.color ?? "var(--text-muted)";

  const openDropSheet = () => {
    window.dispatchEvent(
      new CustomEvent("quickactions:open", {
        detail: { sheet: "drop", dropTypeId: entry.drop_type_id },
      }),
    );
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group grid min-h-[34px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] px-1 py-1 text-left",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
      )}
      onClick={openDropSheet}
      aria-label={`Registrar ${entry.name}. Próxima dosis ${badgeLabel}.`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className="shrink-0 flex items-center justify-center rounded-[8px]"
          style={{
            width: 32,
            height: 32,
            background: `color-mix(in srgb, ${badgeColor} 12%, var(--surface-el))`,
          }}
          aria-hidden
        >
          <DropIcon size={15} style={{ color: badgeColor }} />
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="shrink-0 font-mono text-[12px] tabular-nums whitespace-nowrap"
            style={{ color: "var(--text-faint)" }}
          >
            {computed?.nextTime ?? `cada ${entry.interval_hours}h`}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="truncate text-[13px] font-medium capitalize leading-none"
              style={{ color: computed?.overdue ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {entry.name}
            </span>
            {vial && (() => {
              const durationMs = (vial.vial_duration ?? 24) * 3_600_000;
              const diffMs = new Date(vial.started_at).getTime() + durationMs - now;
              const isExpired = diffMs <= 0;
              const isWarning = !isExpired && diffMs < 2 * 3_600_000;
              const vialColor = isExpired ? "var(--pain-high)" : isWarning ? "var(--warning)" : "var(--pain-low)";
              return (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDiscardVial(); }}
                  className="inline-flex shrink-0 items-center justify-center w-5 h-5 rounded-full transition-opacity hover:opacity-80 active:opacity-60"
                  style={{ color: vialColor }}
                  aria-label={`Vial activo de ${entry.name}`}
                >
                  <EyedropperSampleIcon size={12} weight="fill" />
                </button>
              );
            })()}
          </span>
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className="font-mono text-[11px] font-semibold tabular-nums"
          style={{ color: badgeColor }}
        >
          {badgeLabel}
        </span>
        <CaretRightIcon
          aria-hidden
          size={9}
          weight="bold"
          className="text-[var(--text-faint)] opacity-60 group-hover:opacity-100"
        />
      </span>
    </motion.button>
  );
}

// ---- CardView (tarjeta única) ----

function CardView({
  data,
  view,
  setView,
}: {
  data: ReturnType<typeof useScheduleData>;
  view: "card" | "hero";
  setView: (v: "card" | "hero") => void;
}) {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [projectionOpen, setProjectionOpen] = useState(false);

  const discardMutation = useMutation({
    mutationFn: (id: string) => api.discardVial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vials/active"] });
      setConfirmingId(null);
    },
    onError: () => {
      toast.error("No se pudo descartar el vial. Intenta de nuevo.");
    },
  });

  const { activeVials, scheduled, now, daySlots } = data;

  if (activeVials.length === 0 && scheduled.length === 0) return null;

  return (
    <>
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Próximas dosis</p>
          <div className="flex items-center gap-2">
            {scheduled.length > 0 && (
              <button
                type="button"
                onClick={() => setProjectionOpen(true)}
                aria-label="Ver proyección del día"
                className="flex items-center gap-1 rounded-sm text-[11px] font-medium transition-opacity duration-[160ms] hover:opacity-75 active:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              >
                <span style={{ color: "var(--accent)" }}>Ver día</span>
                <ArrowRightIcon size={10} weight="bold" aria-hidden style={{ color: "var(--accent)" }} />
              </button>
            )}
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>

        {scheduled.length > 0 && (
          <div className="space-y-0">
            {scheduled.map((entry, i) => (
              <TimelineRow
                key={entry.drop_type_id}
                entry={entry}
                index={i}
                now={now}
                vial={null}
                onDiscardVial={() => {}}
              />
            ))}
          </div>
        )}

        {activeVials.length > 0 && scheduled.length > 0 && (
          <div className="h-px bg-[var(--border)]" />
        )}

        {activeVials.length > 0 && (
          <div className="space-y-0.5">
            <p className="section-label mb-0">Viales activos</p>
            <div className="space-y-0">
              <AnimatePresence initial={false}>
                {activeVials.map((vial, i) => (
                  <VialRow
                    key={vial.id}
                    vial={vial}
                    index={i}
                    now={now}
                    isConfirming={confirmingId === vial.id}
                    onRequestDiscard={() =>
                      setConfirmingId((prev) => (prev === vial.id ? null : vial.id))
                    }
                    onCancel={() => setConfirmingId(null)}
                    onConfirmDiscard={() => discardMutation.mutate(vial.id)}
                    isPending={discardMutation.isPending && confirmingId === vial.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <DayProjectionSheet
        open={projectionOpen}
        onClose={() => setProjectionOpen(false)}
        slots={daySlots}
        now={now}
      />
    </>
  );
}

// ---- HeroView ----

function HeroView({
  data,
  view,
  setView,
}: {
  data: ReturnType<typeof useScheduleData>;
  view: "card" | "hero";
  setView: (v: "card" | "hero") => void;
}) {
  const queryClient = useQueryClient();
  const [discardTarget, setDiscardTarget] = useState<ActiveVialEntry | null>(null);
  const [projectionOpen, setProjectionOpen] = useState(false);

  const discardMutation = useMutation({
    mutationFn: (id: string) => api.discardVial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vials/active"] });
      setDiscardTarget(null);
    },
    onError: () => {
      toast.error("No se pudo descartar el vial. Intenta de nuevo.");
    },
  });

  const { now, scheduled, daySlots, vialByDropType } = data;

  if (scheduled.length === 0) return null;

  const heroEntry = scheduled[0];
  const timelineEntries = scheduled.slice(1);
  const heroVial = vialByDropType.get(heroEntry.drop_type_id) ?? null;

  const computed =
    heroEntry.last_logged_at && heroEntry.interval_hours
      ? getCountdown(heroEntry.last_logged_at, heroEntry.interval_hours, now)
      : null;

  const openHeroDrop = () => {
    window.dispatchEvent(
      new CustomEvent("quickactions:open", {
        detail: { sheet: "drop", dropTypeId: heroEntry.drop_type_id },
      }),
    );
  };

  return (
    <>
      {/* Combined hero + timeline card */}
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Próximas dosis</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProjectionOpen(true)}
              aria-label="Ver proyección del día"
              className="flex items-center gap-1 rounded-sm text-[11px] font-medium transition-opacity duration-[160ms] hover:opacity-75 active:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            >
              <span style={{ color: "var(--accent)" }}>Ver día</span>
              <ArrowRightIcon size={10} weight="bold" aria-hidden style={{ color: "var(--accent)" }} />
            </button>
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <CountdownRing
            progress={computed?.progress ?? 0}
            color={computed?.color ?? "var(--accent)"}
            ringLabel={computed?.label ?? "—"}
          />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="space-y-1.5">
              <p className="text-[16px] font-bold capitalize leading-tight text-[var(--text-primary)]">
                {heroEntry.name}
              </p>
              {heroVial && (
                <HeroVialChip vial={heroVial} now={now} onClick={() => setDiscardTarget(heroVial)} />
              )}
            </div>

            {computed && (
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                próxima a las{" "}
                <span className="font-mono tabular-nums">{computed.nextTime}</span>
              </p>
            )}

            <button
              type="button"
              onClick={openHeroDrop}
              className="w-full min-h-[48px] rounded-full bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-[var(--btn-primary-text)] transition-opacity hover:opacity-90 active:opacity-70"
            >
              Registrar dosis
            </button>
          </div>
        </div>

        {/* Divider + timeline (only when there are more doses) */}
        {timelineEntries.length > 0 && (
          <>
            <div className="h-px bg-[var(--border)]" />
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">Después de esta</p>
            <div className="space-y-0">
              {timelineEntries.map((entry, i) => {
                const vial = vialByDropType.get(entry.drop_type_id) ?? null;
                return (
                  <TimelineRow
                    key={entry.drop_type_id}
                    entry={entry}
                    index={i}
                    now={now}
                    vial={vial}
                    onDiscardVial={() => vial && setDiscardTarget(vial)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      <VialDiscardSheet
        vial={discardTarget}
        onClose={() => setDiscardTarget(null)}
        onConfirm={() => discardTarget && discardMutation.mutate(discardTarget.id)}
        isPending={discardMutation.isPending}
      />

      <DayProjectionSheet
        open={projectionOpen}
        onClose={() => setProjectionOpen(false)}
        slots={daySlots}
        now={now}
      />
    </>
  );
}

// ---- PainCheckInCompact ----

function PainCheckInCompact() {
  const navigate = useNavigate();
  const { data: lastCheckIn } = useQuery({
    queryKey: ["check-ins/last"],
    queryFn: api.getLastCheckIn,
    staleTime: 60_000,
  });

  const lastAgo = timeAgo(lastCheckIn?.logged_at ?? null);
  const label = lastAgo ? `Dolor · ${lastAgo}` : "Dolor";

  return (
    <button
      type="button"
      onClick={() => navigate("/check-in")}
      className={cn(
        "flex min-h-[48px] w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
      )}
      aria-label="Registrar dolor"
    >
      <PulseIcon size={16} className="shrink-0 text-[var(--text-muted)]" />
      <span className={cn("text-[14px]", lastAgo ? "text-[var(--text-muted)]" : "text-[var(--text-faint)]")}>
        {label}
      </span>
      <CaretRightIcon size={10} className="ml-auto shrink-0 text-[var(--text-faint)]" />
    </button>
  );
}

function openSymptomsSheet() {
  window.dispatchEvent(
    new CustomEvent("quickactions:open", { detail: { sheet: "symptoms" } }),
  );
}

// ---- TodayPage ----

export default function TodayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useLocalStorage<"card" | "hero">("schedule-view", "card");

  const scheduleData = useScheduleData();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ["check-ins/last"],
      queryFn: api.getLastCheckIn,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["sleep/today"],
      queryFn: api.getTodaySleep,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["drops/last-per-type"],
      queryFn: api.getLastDropPerType,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["calendar/events/today"],
      queryFn: api.getCalendarEventsToday,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["medications"],
      queryFn: api.getMedications,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["medication-intakes/last-per-med"],
      queryFn: api.getLastIntakePerMedication,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["vials/active"],
      queryFn: api.getActiveVials,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["symptoms/today"],
      queryFn: api.getSymptomStatusToday,
      staleTime: 60_000,
    });
  }, [queryClient]);

  const { scheduled } = scheduleData;

  return (
    <section className="space-y-5">
      <SymptomStatusCard onRegister={openSymptomsSheet} />

      {view === "card" || scheduled.length === 0 ? (
        <CardView data={scheduleData} view={view} setView={setView} />
      ) : (
        <HeroView data={scheduleData} view={view} setView={setView} />
      )}

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
        <MedicationsAgenda />
      </div>

      <div className="space-y-0.5 pt-1">
        <PainCheckInCompact />
        <SleepStatus />
        <button
          type="button"
          onClick={() => navigate("/treatments")}
          className={cn(
            "flex min-h-[48px] w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left",
            "text-[14px] text-[var(--text-muted)]",
            "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
            "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
          )}
          aria-label="Gestionar tratamientos"
        >
          <GearIcon size={16} className="shrink-0" />
          Gestionar tratamientos
          <CaretRightIcon size={10} className="ml-auto shrink-0 text-[var(--text-faint)]" />
        </button>
      </div>
    </section>
  );
}
