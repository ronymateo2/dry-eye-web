import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EyeIcon, TrophyIcon, WrenchIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { HygieneRecord, SaveHygieneInput, ActionState } from "@/types/domain";
import { type View, identityLabel } from "./hygiene/constants";
import { CalibratingView } from "./hygiene/calibrating-view";
import { VictoriasView } from "./hygiene/victorias-view";
import { ServoView } from "./hygiene/servo-view";

function SlideView({
  direction,
  children,
}: {
  direction: "forward" | "back";
  children: React.ReactNode;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      style={{
        opacity: entered ? 1 : 0,
        transform: entered
          ? "translateX(0)"
          : `translateX(${direction === "forward" ? 18 : -18}px)`,
        transition: entered
          ? "opacity 260ms cubic-bezier(0,0,0.2,1), transform 300ms cubic-bezier(0.23,1,0.32,1)"
          : "none",
      }}
    >
      {children}
    </div>
  );
}

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

  const tabs: { view: "main" | "victorias" | "servo"; label: string; icon: React.ReactNode }[] = [
    { view: "main", label: "Acción", icon: <EyeIcon size={15} /> },
    { view: "victorias", label: "Victorias", icon: <TrophyIcon size={15} /> },
    { view: "servo", label: "Progreso", icon: <WrenchIcon size={15} /> },
  ];

  return (
    <div>
      {displayedView !== "calibrating" && (
        <div className="flex w-full px-2 pb-2 pt-1">
          {tabs.map(({ view, label, icon }) => {
            const active = displayedView === view;
            return (
              <button
                key={view}
                aria-label={label}
                className="flex flex-1 items-center justify-center gap-[6px] py-2 transition-colors active:opacity-60"
                type="button"
                onClick={() => transitionTo(view)}
              >
                <span style={{ color: active ? "var(--accent)" : "var(--text-faint)" }}>
                  {icon}
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.08em]"
                  style={{
                    color: active ? "var(--text-primary)" : "var(--text-faint)",
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {displayedView === "calibrating" && (
        <SlideView direction={navDirection}>
          <CalibratingView
            actionState={actionState}
            isSaving={savingCalibration}
            selectedFriction={selectedFriction}
            onOmit={onSaved}
            onSave={handleCalibrationSave}
            onSelect={setSelectedFriction}
          />
        </SlideView>
      )}

      {displayedView === "victorias" && (
        <SlideView direction={navDirection}>
          <VictoriasView
            records={recentRecords}
            cycleStartKey={cycleStartKey}
          />
        </SlideView>
      )}

      {displayedView === "servo" && (
        <SlideView direction={navDirection}>
          <ServoView records={sessions ?? []} />
        </SlideView>
      )}

      {displayedView === "main" && (
        <SlideView direction={navDirection}>
          <div className="flex flex-col gap-5 px-5 pb-8">
            {/* Top bar */}
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

            {/* Identity header */}
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

            {/* Main action card */}
            <div>
              {saving ? (
                <div
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)]"
                  style={{
                    minHeight: 160,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
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
                </div>
              ) : confirmRepeat ? (
                <div
                  className="flex flex-col items-center justify-center gap-5 rounded-[var(--radius-lg)] px-5 py-6"
                  style={{
                    minHeight: 160,
                    background: "var(--surface)",
                    border: "1px solid rgba(212,162,76,0.4)",
                  }}
                >
                  <p
                    className="text-[17px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ¿Lo hiciste de nuevo?
                  </p>
                  <div className="flex w-full gap-3">
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
                  </div>
                </div>
              ) : (
                <button
                  className="flex w-full flex-col items-center justify-center rounded-[var(--radius-lg)] transition-all active:opacity-75 active:scale-[0.97]"
                  style={{
                    minHeight: 160,
                    background: "var(--surface)",
                    border: `1px solid ${todaySessions > 0 ? "rgba(212,162,76,0.5)" : "var(--border)"}`,
                  }}
                  type="button"
                  onClick={handleMainButtonTap}
                >
                  {todaySessions > 0 ? (
                    <>
                      <p
                        className="font-mono text-[60px] font-normal leading-none"
                        style={{ color: "var(--accent)" }}
                      >
                        {todaySessions}
                      </p>
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
                </button>
              )}
            </div>

            {/* Stat cards */}
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

            {/* Progress bar */}
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

            {/* Error */}
            {actionState.status === "error" && (
              <p
                className="text-center text-[13px]"
                style={{ color: "var(--error)" }}
              >
                {actionState.message}
              </p>
            )}

            {/* Close */}
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
        </SlideView>
      )}
    </div>
  );
}
