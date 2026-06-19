import { memo, useState, useMemo, lazy, Suspense, type CSSProperties } from "react";
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
import {
  medicationsApi,
  medicationKeys,
  parseTimesJson,
  buildSchedule,
  getSlotCountdown,
  groupRegisteredByBatch,
  type UpcomingSlot,
  type RegisteredSlot,
} from "@/features/medications";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/auth";
import { useNow } from "@/lib/hooks/use-now";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { Button } from "@/components/ui/button";


const MedicationSessionSheet = lazy(() =>
  import("@/components/forms/medication-session-sheet").then((m) => ({
    default: m.MedicationSessionSheet,
  })),
);

type EditIntakeState = {
  intakeId: string;
  medicationId: string;
  loggedAt: string;
  dosageTaken: string | null;
  notes: string | null;
};

// ── countdown leaf — own clock tick, keeps parents quiet ─────────────────
function SlotCountdown({
  slotTime,
  totalMs,
  onClick,
}: {
  slotTime: Date;
  totalMs: number;
  onClick: () => void;
}) {
  const now = useNow();
  const cd = getSlotCountdown(slotTime.getTime(), now, totalMs);
  return (
    <CountdownValue
      label={cd.label}
      overdue={cd.overdue}
      color={cd.color}
      progress={cd.progress}
      onClick={onClick}
    />
  );
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
  const now = useNow();
  const cd = getSlotCountdown(slot.slotTime.getTime(), now, slot.totalIntervalMs);
  const isGroup = slot.names.length > 1;
  const countdownDisplay = cd.overdue ? cd.label : `en ${cd.label}`;
  return (
    <button
      type="button"
      style={{ "--i": index } as CSSProperties}
      onClick={onLog}
      aria-label={`Registrar ${slot.names.join(", ")}`}
      className={cn(
        "anim-fade-up",
        "group grid min-h-[40px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] px-3 py-1.5 text-left",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)] focus-visible:outline-none",
        isGroup && "py-2",
      )}
    >
      <span className="flex min-w-0 items-start gap-2.5">
        <span
          className="mt-[3px] h-4 w-[3px] shrink-0 rounded-full opacity-90"
          style={{ background: cd.color }}
        />
        {isGroup ? (
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center rounded-full px-1.5 py-[2px] text-[10px] font-bold"
                style={{
                  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  color: "var(--accent)",
                }}
              >
                ×{slot.names.length}
              </span>
              <span className="font-mono text-[12px] leading-none tabular-nums text-[var(--text-faint)]">
                {slot.slotTimeLabel}
              </span>
            </span>
            <span className="flex min-w-0 flex-col gap-0">
              {slot.names.map((name) => (
                <span key={name} className="truncate text-[13px] font-medium capitalize leading-snug text-[var(--text-primary)]">
                  {name}
                </span>
              ))}
            </span>
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
          style={{ color: cd.color }}
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
    </button>
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

// ── registered batch row ─────────────────────────────────────────────────
function RegisteredBatchRow({
  batch,
  onEdit,
  onDelete,
}: {
  batch: RegisteredSlot[];
  onEdit: (item: RegisteredSlot) => void;
  onDelete: (item: RegisteredSlot) => void;
}) {
  return (
    <div
      className="border-l-2 pl-2.5"
      style={{ borderColor: "color-mix(in srgb, var(--dose-early) 45%, transparent)" }}
    >
      {batch.map((item, i) => (
        <div
          key={item.key}
          className="flex min-h-[36px] items-center gap-2"
        >
          <CheckCircleIcon size={16} weight="fill" className="shrink-0" style={{ color: "var(--dose-early)" }} />
          <span className="min-w-0 flex-1 truncate text-[14px] capitalize text-[var(--text-muted)] line-through decoration-[var(--text-faint)]">
            {item.name}
          </span>
          {i === 0 && (
            <span className="font-mono text-[13px] tabular-nums text-[var(--text-faint)]">
              {item.timeLabel}
            </span>
          )}
          <button
            type="button"
            aria-label={`Editar registro de ${item.name}`}
            onClick={() => onEdit(item)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-faint)] transition-colors hover:text-[var(--text-primary)]"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            aria-label={`Eliminar registro de ${item.name}`}
            onClick={() => onDelete(item)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-faint)] transition-colors hover:text-[var(--error)]"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────
export const MedicationsAgenda = memo(function MedicationsAgenda() {
  const [quickLogging, setQuickLogging] = useState(false);
  const [takenAtLabel, setTakenAtLabel] = useState<string | null>(null);
  const [editIntake, setEditIntake] = useState<EditIntakeState | null>(null);
  const [deleteIntakeId, setDeleteIntakeId] = useState<string | null>(null);

  const user = useUser();
  const tz = user.timezone;
  const queryClient = useQueryClient();

  const { data: medications = [], isLoading, dataUpdatedAt: medsUpdatedAt } = useQuery({
    queryKey: medicationKeys.list(),
    queryFn: medicationsApi.getList,
    staleTime: 60_000,
  });

  const { data: todayIntakes = [], dataUpdatedAt: intakesUpdatedAt } = useQuery({
    queryKey: medicationKeys.intakesToday(),
    queryFn: medicationsApi.getTodayIntakes,
    staleTime: 30_000,
  });

  // anchor = last fetch time: pure stand-in for "now" that only moves on data
  // refresh, so schedule structure stays referentially stable between ticks
  const scheduleAnchor = Math.max(medsUpdatedAt, intakesUpdatedAt);
  const { upcoming, registered } = useMemo(
    () => buildSchedule(medications, todayIntakes, scheduleAnchor, tz),
    [medications, todayIntakes, scheduleAnchor, tz],
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
      await Promise.all(intakes.map((intake) => medicationsApi.saveIntake(intake)));
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
                await Promise.all(intakeIds.map((id) => medicationsApi.deleteIntake(id)));
                setQuickLogging(false);
                setTakenAtLabel(null);
                void queryClient.invalidateQueries({ queryKey: medicationKeys.intakesToday() });
                void queryClient.invalidateQueries({ queryKey: medicationKeys.intakesLastPerMed() });
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
        void queryClient.invalidateQueries({ queryKey: medicationKeys.intakesToday() });
        void queryClient.invalidateQueries({ queryKey: medicationKeys.intakesLastPerMed() });
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
      await medicationsApi.deleteIntake(id);
      void queryClient.invalidateQueries({ queryKey: medicationKeys.intakesToday() });
      void queryClient.invalidateQueries({ queryKey: medicationKeys.intakesLastPerMed() });
    } catch {
      toast.error("No se pudo eliminar el registro");
    }
  }

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
                    <AnimatePresence mode="wait" initial={false}>
                      {quickLogging ? (
                        <motion.div
                          key="check"
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <QuickLogCheck color="var(--dose-early)" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="ring"
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <SlotCountdown
                            slotTime={hero.slotTime}
                            totalMs={hero.totalIntervalMs}
                            onClick={handleQuickLog}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Name(s) + time */}
                  <div className="grid min-w-0 gap-3">
                    {isGroupHero ? (
                      /* Grouped: count badge → names (tappable) → time below */
                      <div className="flex min-w-0 flex-col gap-2">
                        {/* Count badge */}
                        {!quickLogging && (
                          <span
                            className="inline-flex w-fit items-center rounded-full px-2.5 py-[3px] text-[11px] font-semibold tracking-wide"
                            style={{
                              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                              color: "var(--accent)",
                            }}
                          >
                            {hero.names.length} pastillas
                          </span>
                        )}
                        {/* Names — tappable, same pattern as single med */}
                        <button
                          type="button"
                          onClick={() => !quickLogging && openSessionSheet(hero.medicationIds[0])}
                          aria-label="Ver detalles de medicamentos"
                          disabled={quickLogging}
                          className="group inline-flex min-w-0 items-end gap-1.5 rounded-[8px] -mx-1 px-1 py-0.5 hover:bg-[color-mix(in_srgb,var(--surface-el)_30%,transparent)] active:opacity-70 transition-[background-color,opacity] duration-[160ms] text-left"
                          style={{ cursor: quickLogging ? "default" : "pointer" }}
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            {hero.names.map((name) => (
                              <span
                                key={name}
                                className="truncate text-[20px] font-bold capitalize leading-none tracking-[-0.02em] transition-colors duration-300"
                                style={{
                                  color: quickLogging ? "var(--text-muted)" : "var(--text-primary)",
                                  textDecorationLine: quickLogging ? "line-through" : "none",
                                  textDecorationColor: "rgba(0,0,0,0.2)",
                                }}
                              >
                                {name}
                              </span>
                            ))}
                          </span>
                          {!quickLogging && (
                            <CaretRightIcon
                              size={12}
                              weight="bold"
                              className="mb-[2px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                              style={{ color: "var(--text-faint)" }}
                            />
                          )}
                        </button>
                        {/* Time row */}
                        {!quickLogging && (
                          <div className="flex items-center gap-1.5">
                            <AlarmIcon size={16} weight="fill" className="shrink-0 text-[var(--accent)]" />
                            <p className="font-mono text-[18px] font-semibold leading-none tabular-nums text-[var(--accent)]">
                              {hero.slotTime.toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                                timeZone: tz,
                              })}
                            </p>
                          </div>
                        )}
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
                              textDecorationLine: quickLogging ? "line-through" : "none",
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
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[14px] text-[var(--text-muted)]">
                              {isGroupHero ? "Tomadas a las" : "Tomada a las"}{" "}
                              <span className="font-mono font-semibold" style={{ color: "var(--dose-early)" }}>
                                {takenAtLabel ?? ""}
                              </span>
                            </p>
                            {isGroupHero && (
                              <p className="text-[12px] text-[var(--text-faint)]">
                                {hero.names.join(" · ")}
                              </p>
                            )}
                          </div>
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
                {groupRegisteredByBatch(registered).map((batch) =>
                  batch.length === 1 ? (
                    <RegisteredRow
                      key={batch[0]!.key}
                      item={batch[0]!}
                      onEdit={() =>
                        setEditIntake({
                          intakeId: batch[0]!.intakeId,
                          medicationId: batch[0]!.medicationId,
                          loggedAt: batch[0]!.loggedAt,
                          dosageTaken: batch[0]!.dosageTaken,
                          notes: batch[0]!.notes,
                        })
                      }
                      onDelete={() => setDeleteIntakeId(batch[0]!.intakeId)}
                    />
                  ) : (
                    <RegisteredBatchRow
                      key={batch.map((i) => i.key).join("|")}
                      batch={batch}
                      onEdit={(item) =>
                        setEditIntake({
                          intakeId: item.intakeId,
                          medicationId: item.medicationId,
                          loggedAt: item.loggedAt,
                          dosageTaken: item.dosageTaken,
                          notes: item.notes,
                        })
                      }
                      onDelete={(item) => setDeleteIntakeId(item.intakeId)}
                    />
                  )
                )}
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
});
