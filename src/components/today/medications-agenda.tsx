import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlarmIcon,
  CaretRightIcon,
  PencilSimpleIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
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
  medicationId: string;
  name: string;
  slotTime: Date;
  overdue: boolean;
  countdownLabel: string;
  countdownColor: string;
  countdownProgress: number;
  totalIntervalMs: number;
  medication: MedicationRecord;
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
  const todayStartMs = getTodayStartUtcMs(now, tz);
  const upcoming: UpcomingSlot[] = [];
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
      upcoming.push({
        key: `${med.id}-${i}`,
        medicationId: med.id,
        name: med.name,
        slotTime,
        overdue,
        countdownLabel: label,
        countdownColor: color,
        countdownProgress: progress,
        totalIntervalMs: minInterval,
        medication: med,
      });
    }
  }

  upcoming.sort((a, b) => a.slotTime.getTime() - b.slotTime.getTime());
  registered.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));

  return { upcoming, registered };
}

// ── quick-log check (copied from hero-view) ──────────────────────────────
function QuickLogCheck() {
  return (
    <div style={{ width: 88, height: 88, display: "grid", placeItems: "center" }}>
      <motion.div
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "color-mix(in srgb, var(--dose-early) 16%, transparent)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="var(--dose-early)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M5 12.5l4.5 4.5L19 7"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: 30,
              animation: "medMedDrawCheck 400ms ease-out 130ms forwards",
            }}
          />
        </svg>
      </motion.div>
      <style>{`
        @keyframes medMedDrawCheck { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}

// ── timeline row ─────────────────────────────────────────────────────────
function TimelineRow({
  slot,
  index,
  tz,
  onLog,
}: {
  slot: UpcomingSlot;
  index: number;
  tz: string;
  onLog: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      onClick={onLog}
      aria-label={`Registrar ${slot.name}`}
      className={cn(
        "group grid min-h-[40px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] px-3 py-1.5 text-left",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)] focus-visible:outline-none",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-4 w-[3px] shrink-0 rounded-full opacity-90"
          style={{ background: slot.countdownColor }}
        />
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-[15px] font-medium capitalize leading-none text-[var(--text-primary)]">
            {slot.name}
          </span>
          <span className="shrink-0 text-[12px] leading-none text-[var(--text-faint)]">·</span>
          <span className="font-mono text-[12px] leading-none tabular-nums text-[var(--text-faint)]">
            {slot.slotTime.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: tz,
            })}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className="font-mono text-[13px] font-medium tabular-nums"
          style={{ color: slot.countdownColor }}
        >
          {slot.countdownLabel}
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
export function MedicationsAgenda() {
  const [now, setNow] = useState(() => Date.now());
  const [quickLogging, setQuickLogging] = useState<string | null>(null);
  const [takenAtLabel, setTakenAtLabel] = useState<string | null>(null);
  const [editIntake, setEditIntake] = useState<EditIntakeState | null>(null);
  const [deleteIntakeId, setDeleteIntakeId] = useState<string | null>(null);

  const user = useUser();
  const tz = user.timezone;
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

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
    const medId = hero.medicationId;
    const takenAt = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
    setTakenAtLabel(takenAt);
    setQuickLogging(medId);
    try {
      await api.saveMedicationIntake({
        id: crypto.randomUUID(),
        medicationId: medId,
        loggedAt: new Date().toISOString(),
      });
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["medication-intakes/today"] });
        void queryClient.invalidateQueries({ queryKey: ["medication-intakes/last-per-med"] });
        setQuickLogging(null);
        setTakenAtLabel(null);
      }, 1_400);
    } catch {
      setQuickLogging(null);
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
                {quickLogging ? "Pastilla registrada" : "Próxima pastilla"}
              </p>
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-5">
                  {/* Ring / check */}
                  <div>
                    <AnimatePresence mode="wait">
                      {quickLogging === hero.medicationId ? (
                        <motion.div key="check">
                          <QuickLogCheck />
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

                  {/* Name + time */}
                  <div className="grid min-w-0 gap-3">
                    <button
                      type="button"
                      onClick={() => !quickLogging && openSessionSheet(hero.medicationId)}
                      aria-label={`Registrar ${hero.name} con detalles`}
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
                        {hero.name}
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

                    {/* Time / "Tomada a las" */}
                    <div style={{ position: "relative" }}>
                      <div style={{ opacity: quickLogging ? 0 : 1, transition: "opacity 200ms ease" }}>
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
                      </div>
                      {quickLogging && (
                        <motion.p
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                          className="absolute inset-x-0 top-0 text-[14px] text-[var(--text-muted)]"
                        >
                          Tomada a las{" "}
                          <span className="font-mono font-semibold" style={{ color: "var(--dose-early)" }}>
                            {takenAtLabel ?? ""}
                          </span>
                        </motion.p>
                      )}
                    </div>
                  </div>
                </div>
                {!quickLogging && (
                  <div className="w-[92px] flex justify-center">
                    <button
                      type="button"
                      onClick={handleQuickLog}
                      aria-label="Registrar dosis"
                      className="text-[11px] font-medium text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors duration-[160ms] active:opacity-60"
                    >
                      Registrar
                    </button>
                  </div>
                )}
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
                    tz={tz}
                    onLog={() => openSessionSheet(slot.medicationId)}
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
