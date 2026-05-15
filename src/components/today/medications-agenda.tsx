import { useState, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlarmIcon,
  CaretRightIcon,
  PencilSimpleIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { QuickLogCheck } from "./quick-log-check";
import { CountdownValue } from "./countdown-value";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { parseTimesJson } from "@/components/treatments/times-picker";
import { useUser } from "@/lib/auth";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { Button } from "@/components/ui/button";
import type { MedicationRecord } from "@/types/domain";


const MedicationSessionSheet = lazy(() =>
  import("@/components/forms/medication-session-sheet").then((m) => ({
    default: m.MedicationSessionSheet,
  })),
);

// ── local types ──────────────────────────────────────────────────────────
type TodayIntake = {
  id: string;
  medication_id: string;
  logged_at: string;
  dosage_taken: string | null;
  notes: string | null;
};

type UpcomingSlot = {
  key: string;
  medicationIds: string[];
  names: string[];
  slotTime: Date;
  slotTimeLabel: string;
  overdue: boolean;
  countdownLabel: string;
  countdownColor: string;
  countdownProgress: number;
  totalIntervalMs: number;
  medications: MedicationRecord[];
};

type RegisteredSlot = {
  key: string;
  medicationId: string;
  name: string;
  intakeId: string;
  loggedAt: string;
  timeLabel: string;
  dosageTaken: string | null;
  notes: string | null;
  medication: MedicationRecord;
};

type EditIntakeState = {
  intakeId: string;
  medicationId: string;
  loggedAt: string;
  dosageTaken: string | null;
  notes: string | null;
};

// ── timezone helpers ────────────────────────────────────────────────────
let _cachedDayKey = "";
let _cachedTodayStartMs = 0;

function getCachedTodayStart(now: number, tz: string): number {
  const dayKey = new Date(now).toLocaleDateString("en-CA", { timeZone: tz });
  if (dayKey !== _cachedDayKey) {
    _cachedDayKey = dayKey;
    _cachedTodayStartMs = getTodayStartUtcMs(now, tz);
  }
  return _cachedTodayStartMs;
}

function getTodayStartUtcMs(now: number, tz: string): number {
  const todayKey = new Date(now).toLocaleDateString("en-CA", { timeZone: tz });
  const [y, mo, d] = todayKey.split("-").map(Number) as [number, number, number];
  const utcNoon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(utcNoon);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value);
  const localNoonMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = utcNoon.getTime() - localNoonMs;
  return Date.UTC(y, mo - 1, d) + offsetMs;
}

function makeTodaySlotDate(timeStr: string, todayStartMs: number): Date {
  const [h, m] = timeStr.split(":").map(Number) as [number, number];
  return new Date(todayStartMs + h * 3_600_000 + m * 60_000);
}

function formatTime24(isoStr: string, tz: string): string {
  return new Date(isoStr).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });
}

// ── countdown ────────────────────────────────────────────────────────────
function getCountdown(
  slotMs: number,
  now: number,
  totalMs: number,
): { label: string; overdue: boolean; color: string; progress: number } {
  const diffMs = slotMs - now;
  if (diffMs <= 0) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    return {
      label: h > 0 ? `hace ${h}h ${m}m` : `hace ${m}m`,
      overdue: true,
      color: "var(--dose-overdue)",
      progress: 1,
    };
  }
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const progress = Math.max(0, Math.min(1, 1 - diffMs / totalMs));
  const color =
    progress < 0.5
      ? "var(--dose-early)"
      : progress < 0.8
        ? "var(--dose-mid)"
        : "var(--dose-late)";
  return { label, overdue: false, color, progress };
}

// ── schedule builder ─────────────────────────────────────────────────────
function buildSchedule(
  medications: MedicationRecord[],
  todayIntakes: TodayIntake[],
  now: number,
  tz: string,
): { upcoming: UpcomingSlot[]; registered: RegisteredSlot[] } {
  const todayStartMs = getCachedTodayStart(now, tz);
  const registered: RegisteredSlot[] = [];

  const intakesByMed = new Map<string, TodayIntake[]>();
  for (const intake of todayIntakes) {
    const arr = intakesByMed.get(intake.medication_id) ?? [];
    arr.push(intake);
    intakesByMed.set(intake.medication_id, arr);
  }
  for (const arr of intakesByMed.values()) {
    arr.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  }

  type RawSlot = {
    key: string;
    medicationId: string;
    name: string;
    slotTime: Date;
    slotTimeLabel: string;
    overdue: boolean;
    countdownLabel: string;
    countdownColor: string;
    countdownProgress: number;
    totalIntervalMs: number;
    medication: MedicationRecord;
  };
  const rawUpcoming: RawSlot[] = [];

  for (const med of medications) {
    const times = parseTimesJson(med.times_json);
    if (times.length === 0) continue;

    const slots = times
      .map((t) => makeTodaySlotDate(t, todayStartMs))
      .sort((a, b) => a.getTime() - b.getTime());

    const minInterval =
      slots.length > 1
        ? Math.min(...slots.slice(1).map((s, i) => s.getTime() - slots[i]!.getTime()))
        : 86_400_000;

    const medIntakes = intakesByMed.get(med.id) ?? [];

    for (const intake of medIntakes) {
      registered.push({
        key: intake.id,
        medicationId: med.id,
        name: med.name,
        intakeId: intake.id,
        loggedAt: intake.logged_at,
        timeLabel: formatTime24(intake.logged_at, tz),
        dosageTaken: intake.dosage_taken,
        notes: intake.notes,
        medication: med,
      });
    }

    const nTaken = Math.min(medIntakes.length, slots.length);
    for (let i = nTaken; i < slots.length; i++) {
      const slotTime = slots[i]!;
      const { label, overdue, color, progress } = getCountdown(slotTime.getTime(), now, minInterval);
      rawUpcoming.push({
        key: `${med.id}-${i}`,
        medicationId: med.id,
        name: med.name,
        slotTime,
        slotTimeLabel: slotTime.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }),
        overdue,
        countdownLabel: label,
        countdownColor: color,
        countdownProgress: progress,
        totalIntervalMs: minInterval,
        medication: med,
      });
    }
  }

  rawUpcoming.sort((a, b) => a.slotTime.getTime() - b.slotTime.getTime());

  // Group by slotTime — meds at same time share a single countdown
  const groupedMap = new Map<number, RawSlot[]>();
  for (const slot of rawUpcoming) {
    const key = slot.slotTime.getTime();
    const arr = groupedMap.get(key) ?? [];
    arr.push(slot);
    groupedMap.set(key, arr);
  }

  const upcoming: UpcomingSlot[] = [];
  for (const [, slots] of groupedMap) {
    const first = slots[0]!;
    upcoming.push({
      key: slots.map((s) => s.key).join("|"),
      medicationIds: slots.map((s) => s.medicationId),
      names: slots.map((s) => s.name),
      slotTime: first.slotTime,
      slotTimeLabel: first.slotTimeLabel,
      overdue: first.overdue,
      countdownLabel: first.countdownLabel,
      countdownColor: first.countdownColor,
      countdownProgress: first.countdownProgress,
      totalIntervalMs: first.totalIntervalMs,
      medications: slots.map((s) => s.medication),
    });
  }

  registered.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));

  return { upcoming, registered };
}

// ── timeline row ─────────────────────────────────────────────────────────
function TimelineRow({
  slot,
  index,
  onLog,
}: {
  slot: UpcomingSlot;
  index: number;
  onLog: () => void;
}) {
  const isGroup = slot.names.length > 1;
  const countdownDisplay = slot.overdue ? slot.countdownLabel : `en ${slot.countdownLabel}`;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      onClick={onLog}
      aria-label={`Registrar ${slot.names.join(", ")}`}
      className={cn(
        "group grid min-h-[40px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] px-3 py-1.5 text-left",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)] focus-visible:outline-none",
        isGroup && "py-2",
      )}
    >
      <span className="flex min-w-0 items-start gap-2.5">
        <span
          className="mt-[3px] h-4 w-[3px] shrink-0 rounded-full opacity-90"
          style={{ background: slot.countdownColor }}
        />
        {isGroup ? (
          <span className="flex min-w-0 flex-col gap-0.5">
            {slot.names.map((name, idx) => (
              <span key={name} className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-[14px] font-medium capitalize leading-snug text-[var(--text-primary)]">
                  {name}
                </span>
                {idx === 0 && (
                  <>
                    <span className="shrink-0 text-[12px] leading-none text-[var(--text-faint)]">·</span>
                    <span className="font-mono text-[12px] leading-none tabular-nums text-[var(--text-faint)]">
                      {slot.slotTimeLabel}
                    </span>
                  </>
                )}
              </span>
            ))}
          </span>
        ) : (
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-[15px] font-medium capitalize leading-none text-[var(--text-primary)]">
              {slot.names[0]}
            </span>
            <span className="shrink-0 text-[12px] leading-none text-[var(--text-faint)]">·</span>
            <span className="font-mono text-[12px] leading-none tabular-nums text-[var(--text-faint)]">
              {slot.slotTimeLabel}
            </span>
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className="font-mono text-[13px] font-medium tabular-nums"
          style={{ color: slot.countdownColor }}
        >
          {countdownDisplay}
        </span>
        <CaretRightIcon
          aria-hidden
          size={9}
          weight="bold"
          className="text-[var(--text-faint)] transition-transform duration-[160ms] ease-out group-hover:translate-x-0.5"
        />
      </span>
    </motion.button>
  );
}

// ── registered row ───────────────────────────────────────────────────────
function RegisteredRow({
  item,
  onEdit,
  onDelete,
}: {
  item: RegisteredSlot;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex min-h-[36px] items-center gap-2">
      <CheckCircleIcon
        size={16}
        weight="fill"
        className="shrink-0"
        style={{ color: "var(--dose-early)" }}
      />
      <span className="min-w-0 flex-1 truncate text-[14px] capitalize text-[var(--text-muted)] line-through decoration-[var(--text-faint)]">
        {item.name}
      </span>
      <span className="font-mono text-[13px] tabular-nums text-[var(--text-faint)]">
        {item.timeLabel}
      </span>
      <button
        type="button"
        aria-label={`Editar registro de ${item.name}`}
        onClick={onEdit}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-faint)] transition-colors hover:text-[var(--text-primary)]"
      >
        <PencilSimpleIcon size={14} />
      </button>
      <button
        type="button"
        aria-label={`Eliminar registro de ${item.name}`}
        onClick={onDelete}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-faint)] transition-colors hover:text-[var(--error)]"
      >
        <TrashIcon size={14} />
      </button>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────
export function MedicationsAgenda({ now }: { now: number }) {
  const [quickLogging, setQuickLogging] = useState(false);
  const [takenAtLabel, setTakenAtLabel] = useState<string | null>(null);
  const [editIntake, setEditIntake] = useState<EditIntakeState | null>(null);
  const [deleteIntakeId, setDeleteIntakeId] = useState<string | null>(null);

  const user = useUser();
  const tz = user.timezone;
  const queryClient = useQueryClient();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: api.getMedications,
    staleTime: 60_000,
  });

  const { data: todayIntakes = [] } = useQuery({
    queryKey: ["medication-intakes/today"],
    queryFn: api.getTodayMedicationIntakes,
    staleTime: 30_000,
  });

  const { upcoming, registered } = useMemo(
    () => buildSchedule(medications, todayIntakes, now, tz),
    [medications, todayIntakes, now, tz],
  );

  const hero = upcoming[0] ?? null;
  const rest = upcoming.slice(1);

  const hasMedsWithTimes = medications.some((m) => parseTimesJson(m.times_json).length > 0);

  function openSessionSheet(medicationId?: string) {
    window.dispatchEvent(
      new CustomEvent("quickactions:open", {
        detail: { sheet: "medication-intake", dropTypeId: medicationId },
      }),
    );
  }

  async function handleQuickLog() {
    if (!hero || quickLogging) return;
    const takenAt = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
    setTakenAtLabel(takenAt);
    setQuickLogging(true);

    const loggedAt = new Date().toISOString();
    const intakes = hero.medications.map((med) => ({
      id: crypto.randomUUID(),
      medicationId: med.id,
      loggedAt,
    }));

    try {
      await Promise.all(intakes.map((intake) => api.saveMedicationIntake(intake)));
      const intakeIds = intakes.map((i) => i.id);

      const label = isGroupHero
        ? `${hero.names.join(" · ")} registradas`
        : `${hero.names[0]} registrada`;

      toast.success(label, {
        duration: 3_000,
        action: {
          label: "Deshacer",
          onClick: () => {
            void (async () => {
              try {
                await Promise.all(intakeIds.map((id) => api.deleteMedicationIntake(id)));
                setQuickLogging(false);
                setTakenAtLabel(null);
                void queryClient.invalidateQueries({ queryKey: ["medication-intakes/today"] });
                void queryClient.invalidateQueries({ queryKey: ["medication-intakes/last-per-med"] });
              } catch {
                toast.error("No se pudo deshacer el registro");
              }
            })();
          },
        },
      });

      setTimeout(() => {
        setQuickLogging(false);
        setTakenAtLabel(null);
        void queryClient.invalidateQueries({ queryKey: ["medication-intakes/today"] });
        void queryClient.invalidateQueries({ queryKey: ["medication-intakes/last-per-med"] });
      }, 3_000);
    } catch {
      setQuickLogging(false);
      setTakenAtLabel(null);
      toast.error("No se pudo registrar la dosis");
    }
  }

  async function handleDeleteIntake() {
    if (!deleteIntakeId) return;
    const id = deleteIntakeId;
    setDeleteIntakeId(null);
    try {
      await api.deleteMedicationIntake(id);
      void queryClient.invalidateQueries({ queryKey: ["medication-intakes/today"] });
      void queryClient.invalidateQueries({ queryKey: ["medication-intakes/last-per-med"] });
    } catch {
      toast.error("No se pudo eliminar el registro");
    }
  }

  const heroAccent = hero?.countdownColor ?? "var(--dose-early)";
  const isGroupHero = (hero?.names.length ?? 0) > 1;
  const hasAny = upcoming.length > 0 || registered.length > 0;

  // ── loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          <div className="h-[110px] rounded-[16px] bg-[var(--surface-el)]" />
        </div>
      </div>
    );
  }

  // ── empty state ─────────────────────────────────────────────────────────
  if (!hasMedsWithTimes && medications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* ── single card ───────────────────────────────────────────────── */}
      {hasAny && (
        <motion.div
          layout
          transition={{ layout: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } }}
          className="overflow-hidden rounded-[16px] border transition-colors duration-300"
          style={{
            background: quickLogging
              ? "color-mix(in srgb, var(--dose-early) 7%, var(--surface-card))"
              : "var(--surface-card)",
            borderColor: quickLogging
              ? "color-mix(in srgb, var(--dose-early) 30%, var(--border))"
              : "var(--border)",
          }}
        >
          {/* Hero */}
          {hero ? (
            <div className="px-5 pt-5 pb-4">
              <p
                className="mb-4 text-[12px] font-semibold uppercase leading-none tracking-[0.10em] transition-colors duration-300"
                style={{ color: quickLogging ? "var(--dose-early)" : "var(--text-faint)" }}
              >
                {quickLogging
                  ? isGroupHero
                    ? "Pastillas registradas"
                    : "Pastilla registrada"
                  : isGroupHero
                    ? "Próximas pastillas"
                    : "Próxima pastilla"}
              </p>
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-5">
                  {/* Ring / check */}
                  <div>
                    <AnimatePresence mode="wait">
                      {quickLogging ? (
                        <motion.div key="check">
                          <QuickLogCheck color="var(--dose-early)" />
                        </motion.div>
                      ) : (
                        <motion.div key="ring">
                          <CountdownValue
                            label={hero.countdownLabel}
                            overdue={hero.overdue}
                            color={heroAccent}
                            progress={hero.countdownProgress}
                            onClick={handleQuickLog}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Name(s) + time */}
                  <div className="grid min-w-0 gap-3">
                    {isGroupHero ? (
                      /* Grouped: time (tappable → opens sheet) + stacked names */
                      <div className="flex min-w-0 flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => !quickLogging && openSessionSheet(hero.medicationIds[0])}
                          aria-label="Ver detalles de medicamentos"
                          disabled={quickLogging}
                          className="inline-flex items-center gap-1.5 rounded-[6px] -mx-1 px-1 py-0.5 active:opacity-70 transition-opacity duration-[160ms]"
                          style={{ cursor: quickLogging ? "default" : "pointer" }}
                        >
                          <AlarmIcon size={18} weight="fill" className="shrink-0 text-[var(--accent)]" />
                          <p
                            className="font-mono text-[20px] font-semibold leading-none tabular-nums transition-colors duration-300"
                            style={{ color: quickLogging ? "var(--text-muted)" : "var(--accent)" }}
                          >
                            {hero.slotTime.toLocaleTimeString("es-CO", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                              timeZone: tz,
                            })}
                          </p>
                          {!quickLogging && (
                            <CaretRightIcon
                              size={11}
                              weight="bold"
                              className="shrink-0"
                              style={{ color: "var(--text-faint)" }}
                            />
                          )}
                        </button>
                        <div className="flex flex-col gap-0.5">
                          {hero.names.map((name) => (
                            <span
                              key={name}
                              className="truncate text-[18px] font-bold capitalize leading-none tracking-[-0.02em] transition-colors duration-300"
                              style={{
                                color: quickLogging ? "var(--text-muted)" : "var(--text-primary)",
                                textDecoration: quickLogging ? "line-through" : "none",
                                textDecorationColor: "rgba(0,0,0,0.2)",
                              }}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Single med: big name, time below */
                      <>
                        <button
                          type="button"
                          onClick={() => !quickLogging && openSessionSheet(hero.medicationIds[0])}
                          aria-label={`Registrar ${hero.names[0]} con detalles`}
                          className="group inline-flex min-w-0 max-w-full items-center gap-2 text-left active:opacity-70 rounded-[8px] -mx-1 px-1 py-0.5 hover:bg-[color-mix(in_srgb,var(--surface-el)_30%,transparent)] transition-colors duration-[160ms]"
                          style={{ cursor: quickLogging ? "default" : "pointer" }}
                        >
                          <span
                            className="truncate text-[22px] font-bold capitalize leading-none tracking-[-0.02em] transition-colors duration-300"
                            style={{
                              color: quickLogging ? "var(--text-muted)" : "var(--text-primary)",
                              textDecoration: quickLogging ? "line-through" : "none",
                              textDecorationColor: "rgba(0,0,0,0.2)",
                            }}
                          >
                            {hero.names[0]}
                          </span>
                          {!quickLogging && (
                            <CaretRightIcon
                              size={14}
                              weight="bold"
                              className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                              style={{ color: "var(--text-faint)" }}
                            />
                          )}
                        </button>

                        {/* Time */}
                        {!quickLogging && (
                          <div className="flex items-center gap-1.5">
                            <AlarmIcon size={18} weight="fill" className="shrink-0 text-[var(--accent)]" />
                            <p className="font-mono text-[20px] font-semibold leading-none tabular-nums text-[var(--accent)]">
                              {hero.slotTime.toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                                timeZone: tz,
                              })}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Logged at (shown after quick log) */}
                    <AnimatePresence>
                      {quickLogging && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                          className="flex items-center gap-3"
                        >
                          <p className="text-[14px] text-[var(--text-muted)]">
                            {isGroupHero ? "Tomadas a las" : "Tomada a las"}{" "}
                            <span className="font-mono font-semibold" style={{ color: "var(--dose-early)" }}>
                              {takenAtLabel ?? ""}
                            </span>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          ) : registered.length > 0 ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: "color-mix(in srgb, var(--dose-early) 15%, transparent)" }}
              >
                <CheckCircleIcon size={22} weight="fill" style={{ color: "var(--dose-early)" }} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">¡Todo al día!</p>
                <p className="text-[12px] text-[var(--text-faint)]">No quedan dosis pendientes hoy.</p>
              </div>
            </div>
          ) : null}

          {/* Divider before timeline */}
          {hero && rest.length > 0 && (
            <div className="mx-4 h-px bg-[var(--border)]" />
          )}

          {/* Timeline */}
          {rest.length > 0 && (
            <div className="px-2 pt-2 pb-2">
              <p className="section-label mb-1 px-1">Después de esta</p>
              <div>
                {rest.map((slot, i) => (
                  <TimelineRow
                    key={slot.key}
                    slot={slot}
                    index={i}
                    onLog={() => openSessionSheet(slot.medicationIds[0])}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Divider before registered */}
          {registered.length > 0 && (hero || rest.length > 0) && (
            <div className="mx-4 h-px border-t border-dashed border-[var(--border)]" />
          )}

          {/* Registered today */}
          {registered.length > 0 && (
            <div className="px-5 pb-4 pt-3">
              <p className="section-label mb-2">Registradas hoy</p>
              <div className="space-y-0.5">
                {registered.map((item) => (
                  <RegisteredRow
                    key={item.key}
                    item={item}
                    onEdit={() =>
                      setEditIntake({
                        intakeId: item.intakeId,
                        medicationId: item.medicationId,
                        loggedAt: item.loggedAt,
                        dosageTaken: item.dosageTaken,
                        notes: item.notes,
                      })
                    }
                    onDelete={() => setDeleteIntakeId(item.intakeId)}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── edit intake sheet ─────────────────────────────────────────── */}
      <MobileSheet
        open={editIntake !== null}
        title="Editar registro"
        description="Modificar una toma registrada"
        onClose={() => setEditIntake(null)}
      >
        {editIntake && (
          <Suspense>
            <MedicationSessionSheet
              editProps={{
                editIntakeId: editIntake.intakeId,
                editMedicationId: editIntake.medicationId,
                editLoggedAt: editIntake.loggedAt,
                editDosageTaken: editIntake.dosageTaken,
                editNotes: editIntake.notes,
              }}
              onSaved={() => setEditIntake(null)}
            />
          </Suspense>
        )}
      </MobileSheet>

      {/* ── delete intake confirmation ────────────────────────────────── */}
      <MobileSheet
        open={deleteIntakeId !== null}
        title="Eliminar registro"
        description="Confirmar eliminación de un registro de dosis"
        onClose={() => setDeleteIntakeId(null)}
      >
        <p className="mb-4 text-[14px] text-[var(--text-muted)]">
          ¿Eliminar este registro de dosis? Esta acción no se puede deshacer.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="tinted-error" size="lg" className="w-full" type="button" onClick={() => void handleDeleteIntake()}>
            Sí, eliminar
          </Button>
          <Button variant="plain-muted" size="lg" className="w-full" type="button" onClick={() => setDeleteIntakeId(null)}>
            Cancelar
          </Button>
        </div>
      </MobileSheet>
    </div>
  );
}
