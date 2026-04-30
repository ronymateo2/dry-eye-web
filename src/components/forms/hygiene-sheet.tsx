import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EyeIcon, TrophyIcon, WrenchIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { HygieneRecord, SaveHygieneInput, ActionState } from "@/types/domain";
import { type View, identityLabel } from "./hygiene/constants";
import { CalibratingView } from "./hygiene/calibrating-view";
import { VictoriasView } from "./hygiene/victorias-view";
import { ServoView } from "./hygiene/servo-view";

const SLIDE_SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.9 } as const;
const SLIDE_OFFSET = 26;

export function HygieneSheet({
  onSaved,
  onClose,
}: {
  onSaved: () => void;
  onClose?: () => void;
}) {
  const [displayedView, setDisplayedView] = useState<View>("main");
  const [navDirection, setNavDirection] = useState<"forward" | "back">("forward");
  const [confirmRepeat, setConfirmRepeat] = useState(false);

  const [pendingSave, setPendingSave] = useState<{ id: string; loggedAt: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingCalibration, setSavingCalibration] = useState(false);
  const [selectedFriction, setSelectedFriction] = useState<number | null>(null);
  const [actionState, setActionState] = useState<ActionState>({ status: "idle" });
  const [firstDayKey, setFirstDayKey] = useState<string | null>(null);
  const [totalCompletedDays, setTotalCompletedDays] = useState(0);
  const [recentRecords, setRecentRecords] = useState<HygieneRecord[]>([]);
  const [todayCompletedCount, setTodayCompletedCount] = useState(0);
  const [sessions, setSessions] = useState<HygieneRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const isSaving = useRef(false);
  const mounted = useRef(false);
  const currentViewRef = useRef<View>("main");

  useEffect(() => {
    mounted.current = true;
    api
      .getHygieneDashboard()
      .then(({ firstDayKey, totalCompletedDays, recentRecords, todayCompletedCount }) => {
        setFirstDayKey(firstDayKey);
        setTotalCompletedDays(totalCompletedDays);
        setRecentRecords(recentRecords);
        setTodayCompletedCount(todayCompletedCount);
      })
      .finally(() => setLoading(false));
  }, []);

  const VIEW_ORDER: View[] = ["main", "victorias", "servo", "calibrating"];

  const transitionTo = useCallback(
    (next: View) => {
      const currentIndex = VIEW_ORDER.indexOf(currentViewRef.current);
      const nextIndex = VIEW_ORDER.indexOf(next);
      setNavDirection(nextIndex >= currentIndex ? "forward" : "back");
      currentViewRef.current = next;
      setDisplayedView(next);
      if (next === "servo" && sessions === null) {
        api.getHygieneSessions().then(({ sessions }) => setSessions(sessions));
      }
    },
    [sessions],
  );

  const todayKey = new Date().toLocaleDateString("en-CA");

  const { totalCompleted, cycleNumber, sessionInCycle, progressPct, identity, todaySessions, cycleStartKey } =
    useMemo(() => {
      if (!firstDayKey) {
        return {
          totalCompleted: 0,
          cycleNumber: 1,
          sessionInCycle: 0,
          progressPct: 0,
          identity: identityLabel(0),
          todaySessions: todayCompletedCount,
          cycleStartKey: todayKey,
        };
      }

      const msPerDay = 24 * 60 * 60 * 1000;
      const firstDate = new Date(firstDayKey + "T00:00:00Z");
      const todayDate = new Date(todayKey + "T00:00:00Z");
      const daysSinceFirst = Math.round((todayDate.getTime() - firstDate.getTime()) / msPerDay);

      const cycle = Math.floor(daysSinceFirst / 21) + 1;
      const dayInCycle = (daysSinceFirst % 21) + 1;

      const cycleStartDate = new Date(firstDate);
      cycleStartDate.setUTCDate(firstDate.getUTCDate() + (cycle - 1) * 21);
      const cycleStart = cycleStartDate.toISOString().slice(0, 10);

      return {
        totalCompleted: totalCompletedDays,
        cycleNumber: cycle,
        sessionInCycle: dayInCycle,
        progressPct: Math.round((dayInCycle / 21) * 100),
        identity: identityLabel(totalCompletedDays % 21),
        todaySessions: todayCompletedCount,
        cycleStartKey: cycleStart,
      };
    }, [firstDayKey, totalCompletedDays, todayCompletedCount, todayKey]);

  async function saveHygiene(input: SaveHygieneInput): Promise<boolean> {
    try {
      const result = await api.saveHygiene(input);
      if (!result.ok) {
        setActionState({ status: "error", message: "No se pudo guardar." });
        return false;
      }
      return true;
    } catch {
      setActionState({ status: "error", message: "No se pudo guardar." });
      return false;
    }
  }

  async function handleLoHice() {
    if (isSaving.current) return;
    isSaving.current = true;
    setSaving(true);
    setConfirmRepeat(false);
    setActionState({ status: "idle" });

    const id = crypto.randomUUID();
    const loggedAt = new Date().toISOString();

    const ok = await saveHygiene({ id, loggedAt, status: "completed", deviationValue: null, frictionType: null });

    isSaving.current = false;
    setSaving(false);
    if (ok) {
      setTodayCompletedCount((n) => n + 1);
      setPendingSave({ id, loggedAt });
      setSelectedFriction(null);
      transitionTo("calibrating");
    }
  }

  async function handleCalibrationSave() {
    if (!pendingSave || isSaving.current) return;
    isSaving.current = true;
    setSavingCalibration(true);
    setActionState({ status: "idle" });

    const ok = await saveHygiene({
      id: pendingSave.id,
      loggedAt: pendingSave.loggedAt,
      status: "completed",
      deviationValue: selectedFriction,
      frictionType: selectedFriction !== null ? "none" : null,
    });

    isSaving.current = false;
    setSavingCalibration(false);
    if (ok) onSaved();
  }

  function handleMainButtonTap() {
    if (todaySessions > 0) {
      setConfirmRepeat(true);
    } else {
      handleLoHice();
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-5 pb-8">
        {[100, 160, 80].map((h, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--radius-lg)]"
            style={{ height: h, background: "var(--surface-el)" }}
          />
        ))}
      </div>
    );
  }

  const tabs: { view: "main" | "victorias" | "servo"; label: string; icon: ReactNode }[] = [
    { view: "main", label: "Acción", icon: <EyeIcon size={15} /> },
    { view: "victorias", label: "Victorias", icon: <TrophyIcon size={15} /> },
    { view: "servo", label: "Progreso", icon: <WrenchIcon size={15} /> },
  ];

  const slideVariants = {
    initial: (dir: "forward" | "back") => ({
      x: dir === "forward" ? SLIDE_OFFSET : -SLIDE_OFFSET,
      opacity: 0,
    }),
    animate: { x: 0, opacity: 1 },
    exit: (dir: "forward" | "back") => ({
      x: dir === "forward" ? -SLIDE_OFFSET : SLIDE_OFFSET,
      opacity: 0,
    }),
  };

  return (
    <div>
      {displayedView !== "calibrating" && (
        <div
          className="flex w-full px-2 pt-1"
          style={{
            paddingBottom: 0,
            borderBottom: "1px solid var(--border)",
            marginBottom: 20,
          }}
        >
          {tabs.map(({ view, label, icon }) => {
            const active = displayedView === view;
            return (
              <button
                key={view}
                aria-label={label}
                className="relative flex flex-1 items-center justify-center gap-[6px] pb-3 pt-2"
                style={{ WebkitTapHighlightColor: "transparent" }}
                type="button"
                onClick={() => transitionTo(view)}
              >
                <motion.span
                  animate={{ color: active ? "var(--accent)" : "var(--text-faint)" }}
                  transition={{ duration: 0.18 }}
                >
                  {icon}
                </motion.span>
                <motion.span
                  className="text-[11px] uppercase tracking-[0.08em]"
                  animate={{
                    color: active ? "var(--text-primary)" : "var(--text-faint)",
                    fontWeight: active ? 700 : 400,
                  }}
                  transition={{ duration: 0.18 }}
                >
                  {label}
                </motion.span>
                {active && (
                  <motion.div
                    layoutId="hygiene-tab-indicator"
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                    style={{ background: "var(--accent)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 38 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ overflow: "hidden" }}>
        <AnimatePresence initial={false} mode="popLayout" custom={navDirection}>
          {displayedView === "calibrating" && (
            <motion.div
              key="calibrating"
              custom={navDirection}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={SLIDE_SPRING}
            >
              <CalibratingView
                actionState={actionState}
                isSaving={savingCalibration}
                selectedFriction={selectedFriction}
                onOmit={onSaved}
                onSave={handleCalibrationSave}
                onSelect={setSelectedFriction}
              />
            </motion.div>
          )}

          {displayedView === "victorias" && (
            <motion.div
              key="victorias"
              custom={navDirection}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={SLIDE_SPRING}
            >
              <VictoriasView
                records={recentRecords}
                cycleStartKey={cycleStartKey}
              />
            </motion.div>
          )}

          {displayedView === "servo" && (
            <motion.div
              key="servo"
              custom={navDirection}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={SLIDE_SPRING}
            >
              <ServoView records={sessions ?? []} />
            </motion.div>
          )}

          {displayedView === "main" && (
            <motion.div
              key="main"
              custom={navDirection}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={SLIDE_SPRING}
            >
              <div className="flex flex-col gap-5 px-5 pb-8">
                <div className="flex items-center pt-1">
                  <div
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-muted)",
                    }}
                  >
                    CICLO{" "}
                    <span style={{ color: "var(--accent)" }}>{cycleNumber}</span>
                    {" · "}DÍA{" "}
                    <span style={{ color: "var(--accent)" }}>{sessionInCycle}</span>
                  </div>
                </div>

                <div className="text-center">
                  <p
                    className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    TU IDENTIDAD ACTUAL
                  </p>
                  <p
                    className="text-[28px] font-semibold leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {identity}
                  </p>
                </div>

                <div>
                  <AnimatePresence mode="wait" initial={false}>
                  {saving ? (
                    <motion.div
                      key="saving"
                      className="flex w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)]"
                      style={{
                        minHeight: 160,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1, transition: { type: "spring", stiffness: 620, damping: 38 } }}
                      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.08, ease: [0.4, 0, 1, 1] } }}
                    >
                      <div className="flex items-center gap-[6px]">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            style={{
                              display: "inline-block",
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "var(--accent)",
                              animation: `hygienieDot 1.1s ease-in-out ${i * 0.18}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                        style={{ color: "var(--text-faint)" }}
                      >
                        Guardando…
                      </p>
                      <style>{`
                        @keyframes hygienieDot {
                          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
                          40% { opacity: 1; transform: scale(1); }
                        }
                      `}</style>
                    </motion.div>
                  ) : confirmRepeat ? (
                    <motion.div
                      key="confirm"
                      className="flex flex-col items-center justify-center gap-5 rounded-[var(--radius-lg)] px-5 py-6"
                      style={{
                        minHeight: 160,
                        background: "var(--surface)",
                        border: "1px solid rgba(212,162,76,0.4)",
                      }}
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 620, damping: 38 } }}
                      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.08, ease: [0.4, 0, 1, 1] } }}
                    >
                      <motion.p
                        className="text-[17px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 32, delay: 0.03 }}
                      >
                        ¿Lo hiciste de nuevo?
                      </motion.p>
                      <motion.div
                        className="flex w-full gap-3"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 32, delay: 0.07 }}
                      >
                        <Button className="flex-1" type="button" onClick={handleLoHice}>
                          Sí, lo hice
                        </Button>
                        <Button
                          className="flex-1"
                          variant="subtle"
                          type="button"
                          onClick={() => setConfirmRepeat(false)}
                        >
                          Cancelar
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="main"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1, transition: { type: "spring", stiffness: 620, damping: 38 } }}
                      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.08, ease: [0.4, 0, 1, 1] } }}
                    >
                      <motion.button
                        className="flex w-full flex-col items-center justify-center rounded-[var(--radius-lg)]"
                        style={{
                          minHeight: 160,
                          background: "var(--surface)",
                          border: `1px solid ${todaySessions > 0 ? "rgba(212,162,76,0.5)" : "var(--border)"}`,
                          WebkitTapHighlightColor: "transparent",
                          animation: todaySessions === 0 ? "hygienieButtonPulse 3s ease-in-out infinite" : undefined,
                        }}
                        type="button"
                        whileHover={{ scale: 1.016 }}
                        whileTap={{ scale: 0.93, opacity: 0.68 }}
                        transition={{ type: "spring", stiffness: 600, damping: 22 }}
                        onClick={handleMainButtonTap}
                      >
                        {todaySessions > 0 ? (
                          <>
                            <motion.p
                              key={todaySessions}
                              className="font-mono text-[60px] font-normal leading-none"
                              style={{ color: "var(--accent)" }}
                              initial={{ scale: 1.4, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 380, damping: 20 }}
                            >
                              {todaySessions}
                            </motion.p>
                            <p
                              className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                              style={{ color: "var(--text-faint)" }}
                            >
                              {todaySessions === 1 ? "VEZ HOY" : "VECES HOY"}
                            </p>
                            <div
                              className="my-4 h-px w-10"
                              style={{ background: "var(--border)" }}
                            />
                            <p
                              className="text-[14px] font-medium"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Hacerlo de nuevo
                            </p>
                          </>
                        ) : (
                          <>
                            <p
                              className="text-[42px] font-semibold leading-none tracking-tight"
                              style={{ color: "var(--text-primary)" }}
                            >
                              LO
                              <br />
                              HICE
                            </p>
                            <p
                              className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                              style={{ color: "var(--text-faint)" }}
                            >
                              REGISTRAR ACCIÓN
                            </p>
                          </>
                        )}
                      </motion.button>
                      <style>{`
                        @keyframes hygienieButtonPulse {
                          0%, 100% { box-shadow: 0 0 0 0 transparent; border-color: var(--border); }
                          50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
                        }
                      `}</style>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-[var(--radius-lg)] px-4 py-3"
                    style={{ background: "var(--surface)" }}
                  >
                    <p
                      className="font-mono text-[32px] font-normal leading-none"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {totalCompleted}
                    </p>
                    <p
                      className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Días completados
                    </p>
                  </div>
                  <div
                    className="rounded-[var(--radius-lg)] px-4 py-3"
                    style={{ background: "var(--surface)" }}
                  >
                    <p className="leading-none" style={{ color: "var(--text-primary)" }}>
                      <span className="font-mono text-[32px] font-normal">{sessionInCycle}</span>
                      <span
                        className="font-mono text-[16px] font-normal"
                        style={{ color: "var(--text-muted)" }}
                      >
                        /21
                      </span>
                    </p>
                    <p
                      className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Este Ciclo
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-[var(--radius-lg)] px-4 py-3"
                  style={{ background: "var(--surface)" }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Ciclo {cycleNumber}
                    </span>
                    <span
                      className="font-mono text-[12px]"
                      style={{ color: "var(--accent)" }}
                    >
                      {progressPct}%
                    </span>
                  </div>
                  <div
                    className="h-[6px] w-full overflow-hidden rounded-full"
                    style={{ background: "var(--surface-el)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progressPct}%`,
                        background: "var(--accent)",
                        transition: mounted.current ? "width 500ms cubic-bezier(0,0,0.2,1)" : "none",
                      }}
                    />
                  </div>
                </div>

                {actionState.status === "error" && (
                  <p
                    className="text-center text-[13px]"
                    style={{ color: "var(--error)" }}
                  >
                    {actionState.message}
                  </p>
                )}

                {onClose && (
                  <button
                    className="min-h-[48px] py-2 text-[13px] transition-opacity active:opacity-60"
                    style={{ color: "var(--text-faint)" }}
                    type="button"
                    onClick={onClose}
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
