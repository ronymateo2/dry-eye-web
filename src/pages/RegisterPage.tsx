import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { PainSlider } from "@/components/ui/pain-slider";
import { TextInput } from "@/components/ui/text-input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { api } from "@/lib/api";
import { TRIGGER_OPTIONS, SYMPTOM_OPTIONS } from "@/lib/constants";
import { painColor } from "@/lib/pain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BoneIcon,
  HandEyeIcon,
  EyeIcon,
  SmileyMeltingIcon,
  LightningIcon,
  HeadCircuitIcon,
  CaretDownIcon,
  ActivityIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import type { TriggerType } from "@/types/domain";

const defaultPain = {
  eyelidPain: 0,
  templePain: 0,
  masseterPain: 0,
  cervicalPain: 0,
  orbitalPain: 0,
  stressLevel: 0,
};

type ContextTab = "now" | "custom";
type LastCheckIn = NonNullable<Awaited<ReturnType<typeof api.getLastCheckIn>>>;

function formatLoggedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = d.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (d.toDateString() === now.toDateString()) return `hoy, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `ayer, ${time}`;
  return (
    d.toLocaleDateString("es", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) + `, ${time}`
  );
}

function formatTimeAgo(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "hace un momento";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  const diffDays = Math.floor(diffHr / 24);
  return diffDays === 1 ? "hace 1 dia" : `hace ${diffDays} dias`;
}

function getTriggerLabel(triggerType: string | null): string | null {
  if (!triggerType) return null;
  if (triggerType === "climate") return "Clima";
  return TRIGGER_OPTIONS.find((opt) => opt.value === triggerType)?.label ?? triggerType;
}

const pillClass = (active: boolean) =>
  cn(
    "inline-flex items-center justify-center min-h-[48px] rounded-[999px] border px-4 text-[13px] font-medium transition-[color,background-color,border-color,transform] duration-[160ms] ease-out active:scale-[0.97]",
    active
      ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
      : "border-[var(--border)] bg-transparent text-[var(--text-muted)]",
  );

const accordionToggleClass = (expanded: boolean, hasSelection: boolean) =>
  cn(
    "flex w-full min-h-[48px] items-center justify-between rounded-[12px] border px-4 text-[14px] font-medium transition-colors duration-[160ms] ease-out active:scale-[0.98]",
    hasSelection && !expanded
      ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
      : expanded
        ? "border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-primary)]"
        : "border-[var(--border)] bg-transparent text-[var(--text-muted)]",
  );

export default function RegisterPage() {
  const queryClient = useQueryClient();
  const [pain, setPain] = useState(defaultPain);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [customTriggerName, setCustomTriggerName] = useState("");
  const [showTriggers, setShowTriggers] = useState(false);
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(
    new Set(),
  );
  const [customSymptom, setCustomSymptom] = useState("");
  const [contextTab, setContextTab] = useState<ContextTab>("now");
  const [loggedAt, setLoggedAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [zeroWarning, setZeroWarning] = useState<string | null>(null);
  const {
    data: lastCheckIn,
    isLoading: isLastCheckInLoading,
    isError: isLastCheckInError,
  } = useQuery({
    queryKey: ["check-ins/last"],
    queryFn: api.getLastCheckIn,
    staleTime: 0,
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!zeroWarning) return;
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;
    if ("vibrate" in navigator) navigator.vibrate([35, 40, 55]);
  }, [zeroWarning]);

  const updatePain = (key: keyof typeof pain) => (v: number) =>
    setPain((p) => ({ ...p, [key]: v }));

  const handleContextTab = (tab: ContextTab) => {
    setContextTab(tab);
    if (tab === "custom")
      setLoggedAt((prev) => prev ?? new Date().toISOString());
    else setLoggedAt(null);
  };

  const isTriggerValid =
    selectedTrigger === null ||
    selectedTrigger !== "other" ||
    customTriggerName.trim().length > 0;

  const triggerValue = TRIGGER_OPTIONS.find((t) => t.id === selectedTrigger)
    ?.value as TriggerType | undefined;

  const lastCheckInPainValues: { label: string; value: number }[] = lastCheckIn
    ? [
        { label: "Ojo/Parpados", value: lastCheckIn.eyelid_pain },
        { label: "Sienes", value: lastCheckIn.temple_pain },
        { label: "Zona orbital", value: lastCheckIn.orbital_pain },
        { label: "Masetero", value: lastCheckIn.masseter_pain },
        { label: "Cuello / Cervical", value: lastCheckIn.cervical_pain },
        { label: "Estres", value: lastCheckIn.stress_level },
      ]
    : [];
  const lastTriggerLabel = getTriggerLabel(lastCheckIn?.trigger_type ?? null);

  const getZeroWarning = (): string | null => {
    const fields = [
      { label: "parpados", value: pain.eyelidPain },
      { label: "sienes", value: pain.templePain },
      { label: "masetero", value: pain.masseterPain },
      { label: "cuello / cervical", value: pain.cervicalPain },
      { label: "zona orbital", value: pain.orbitalPain },
      { label: "nivel de estres", value: pain.stressLevel },
    ];
    const zeros = fields.filter((f) => f.value === 0);
    if (zeros.length === 0) return null;
    if (zeros.length === fields.length)
      return "Todos los valores estan en 0. ¿Deseas guardar el registro igual?";
    return `Vas a guardar valores en 0 para: ${zeros.map((f) => f.label).join(", ")}. ¿Deseas continuar?`;
  };

  const resetForm = () => {
    setPain(defaultPain);
    setSelectedTrigger(null);
    setCustomTriggerName("");
    setShowTriggers(false);
    setShowSymptoms(false);
    setSelectedSymptoms(new Set());
    setCustomSymptom("");
    setContextTab("now");
    setLoggedAt(null);
  };

  const doSave = async () => {
    setIsPending(true);
    try {
      const checkInId = crypto.randomUUID();
      const checkInLoggedAt = loggedAt ?? new Date().toISOString();
      const notes =
        selectedTrigger === "other" && customTriggerName.trim()
          ? customTriggerName.trim()
          : null;

      await api.saveCheckIn({
        id: checkInId,
        loggedAt: checkInLoggedAt,
        timeOfDay: null,
        eyelidPain: pain.eyelidPain,
        templePain: pain.templePain,
        masseterPain: pain.masseterPain,
        cervicalPain: pain.cervicalPain,
        orbitalPain: pain.orbitalPain,
        stressLevel: pain.stressLevel,
        triggerType: triggerValue ?? null,
        notes: notes ?? undefined,
      });

      const cachedCheckIn: LastCheckIn = {
        id: checkInId,
        logged_at: checkInLoggedAt,
        time_of_day: null,
        eyelid_pain: pain.eyelidPain,
        temple_pain: pain.templePain,
        masseter_pain: pain.masseterPain,
        cervical_pain: pain.cervicalPain,
        orbital_pain: pain.orbitalPain,
        stress_level: pain.stressLevel,
        trigger_type: triggerValue ?? null,
        notes,
      };
      queryClient.setQueryData<LastCheckIn | null>(
        ["check-ins/last"],
        cachedCheckIn,
      );

      const symptomsToSave = [...selectedSymptoms];
      if (customSymptom.trim())
        symptomsToSave.push(
          customSymptom.trim().toLowerCase().replace(/\s+/g, "_"),
        );

      if (symptomsToSave.length > 0) {
        await Promise.all(
          symptomsToSave.map((st) =>
            api.saveSymptom({
              id: crypto.randomUUID(),
              loggedAt: checkInLoggedAt,
              symptomType: st,
            }),
          ),
        );
      }

      resetForm();
      queryClient.invalidateQueries({ queryKey: ["check-ins/last"] });
      toast.success("Registro guardado.");
    } catch {
      toast.error("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setIsPending(false);
    }
  };

  const applyLastCheckInValues = () => {
    if (!lastCheckIn) return;
    setPain({
      eyelidPain: lastCheckIn.eyelid_pain,
      templePain: lastCheckIn.temple_pain,
      masseterPain: lastCheckIn.masseter_pain,
      cervicalPain: lastCheckIn.cervical_pain,
      orbitalPain: lastCheckIn.orbital_pain,
      stressLevel: lastCheckIn.stress_level,
    });
    setZeroWarning(null);
    toast.success("Se cargaron los valores del ultimo check-in.");
  };

  const handleSave = () => {
    if (isPending || !isTriggerValid) return;
    const warning = getZeroWarning();
    if (warning) {
      setZeroWarning(warning);
      return;
    }
    doSave();
  };

  return (
    <section>
      <div className="relative pb-[calc(var(--sticky-cta-height,88px)+44px)] space-y-6">
        {/* Context */}
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="section-label mb-0">Contexto</p>
          </div>

          <div className="px-4 pb-4 space-y-5">
            {/* Time tabs */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className={pillClass(contextTab === "now")}
                  onClick={() => handleContextTab("now")}
                >
                  Ahora
                </button>
                <button
                  type="button"
                  className={pillClass(contextTab === "custom")}
                  onClick={() => handleContextTab("custom")}
                >
                  {contextTab === "custom" && loggedAt
                    ? formatLoggedAt(loggedAt)
                    : "Cambiar hora"}
                </button>
              </div>
              <AnimatePresence initial={false}>
                {contextTab === "custom" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <DateTimePicker
                        max={new Date()}
                        value={loggedAt}
                        onChange={setLoggedAt}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Trigger */}
            <div className="space-y-2.5">
              <button
                type="button"
                className={accordionToggleClass(
                  showTriggers,
                  selectedTrigger !== null,
                )}
                onClick={() => {
                  const next = !showTriggers;
                  setShowTriggers(next);
                  if (!next) {
                    setSelectedTrigger(null);
                    setCustomTriggerName("");
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <TargetIcon
                    size={18}
                    className="text-[var(--text-muted)]"
                  />
                  {selectedTrigger !== null
                    ? `Trigger: ${TRIGGER_OPTIONS.find((t) => t.id === selectedTrigger)?.label}`
                    : "¿Hubo un trigger?"}
                </span>
                <CaretDownIcon
                  weight="bold"
                  className={cn(
                    "transition-transform duration-200",
                    showTriggers && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {showTriggers && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2.5 pt-1">
                      <div className="flex flex-wrap gap-2">
                        {TRIGGER_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={pillClass(selectedTrigger === opt.id)}
                            onClick={() => {
                              setSelectedTrigger(
                                selectedTrigger === opt.id ? null : opt.id,
                              );
                              if (opt.id !== "other")
                                setCustomTriggerName("");
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {selectedTrigger === "other" && (
                        <TextInput
                          placeholder="Nombre del trigger (ej. polvo, humo)"
                          value={customTriggerName}
                          onChange={(e) =>
                            setCustomTriggerName(e.target.value)
                          }
                          rows={1}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Symptoms */}
            <div className="space-y-2.5">
              <button
                type="button"
                className={accordionToggleClass(
                  showSymptoms,
                  selectedSymptoms.size > 0,
                )}
                onClick={() => {
                  const next = !showSymptoms;
                  setShowSymptoms(next);
                  if (!next) {
                    setSelectedSymptoms(new Set());
                    setCustomSymptom("");
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <ActivityIcon
                    size={18}
                    className="text-[var(--text-muted)]"
                  />
                  {selectedSymptoms.size > 0
                    ? `Sintomas (${selectedSymptoms.size})`
                    : "¿Sientes algun sintoma?"}
                </span>
                <CaretDownIcon
                  weight="bold"
                  className={cn(
                    "transition-transform duration-200",
                    showSymptoms && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {showSymptoms && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2.5 pt-1">
                      <div className="flex flex-wrap gap-2">
                        {SYMPTOM_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={pillClass(
                              selectedSymptoms.has(opt.id),
                            )}
                            onClick={() =>
                              setSelectedSymptoms((cur) => {
                                const n = new Set(cur);
                                n.has(opt.id)
                                  ? n.delete(opt.id)
                                  : n.add(opt.id);
                                return n;
                              })
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <TextInput
                        placeholder="Describe el sintoma..."
                        value={customSymptom}
                        onChange={(e) => setCustomSymptom(e.target.value)}
                        rows={1}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Pain map */}
        <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
          <p className="section-label">Mapa de dolor</p>
          {isLastCheckInLoading ? (
            <div className="animate-pulse space-y-2.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface-el)] p-3">
              <div className="h-3 w-28 rounded-full bg-[var(--surface)]" />
              <div className="h-3.5 w-44 rounded-full bg-[var(--surface)]" />
              <div className="h-8 w-full rounded-[10px] bg-[var(--surface)]" />
            </div>
          ) : isLastCheckInError ? (
            <p className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-el)] px-3 py-2.5 text-[13px] text-[var(--text-muted)]">
              No se pudo cargar el ultimo registro por ahora.
            </p>
          ) : lastCheckIn ? (
            <div className="space-y-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-el)] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    Ultimo registro
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                    {formatLoggedAt(lastCheckIn.logged_at)} ·{" "}
                    {formatTimeAgo(lastCheckIn.logged_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="subtle"
                  className="h-9 min-h-0 shrink-0 whitespace-nowrap px-3 py-0 text-[12px]"
                  onClick={applyLastCheckInValues}
                >
                  Usar valores
                </Button>
              </div>

              <ul className="grid grid-cols-2 gap-2">
                {lastCheckInPainValues.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-card)] px-2.5 py-1.5 text-[12px] text-[var(--text-muted)]"
                  >
                    <span className="truncate">{item.label}</span>
                    <span
                      className="mono text-[13px] font-medium leading-none"
                      style={{ color: painColor(item.value) }}
                    >
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>

              {(lastTriggerLabel || lastCheckIn.notes) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text-muted)]">
                  {lastTriggerLabel && <span>Trigger: {lastTriggerLabel}</span>}
                  {lastCheckIn.notes && (
                    <span className="max-w-full truncate">
                      Nota: {lastCheckIn.notes}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-el)] px-3 py-2.5 text-[13px] text-[var(--text-muted)]">
              Aun no tienes registros previos. Guarda el primero y aqui veremos
              tu ultimo check-in.
            </p>
          )}
          <div className="space-y-5">
            <PainSlider
              icon={<EyeIcon size={15} />}
              label="Ojo/Parpados"
              value={pain.eyelidPain}
              onChange={updatePain("eyelidPain")}
            />
            <PainSlider
              icon={<HeadCircuitIcon size={15} />}
              label="Sienes"
              value={pain.templePain}
              onChange={updatePain("templePain")}
            />
            <PainSlider
              icon={<HandEyeIcon size={15} />}
              label="Zona Orbital"
              value={pain.orbitalPain}
              onChange={updatePain("orbitalPain")}
            />
            <PainSlider
              icon={<SmileyMeltingIcon size={15} />}
              label="Masetero"
              value={pain.masseterPain}
              onChange={updatePain("masseterPain")}
            />
            <PainSlider
              icon={<BoneIcon size={15} />}
              label="Cuello / Cervical"
              value={pain.cervicalPain}
              onChange={updatePain("cervicalPain")}
            />
          </div>
        </div>

        {/* Stress */}
        <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
          <p className="section-label">Estres</p>
          <PainSlider
            icon={<LightningIcon size={15} />}
            label="Nivel de estres"
            value={pain.stressLevel}
            onChange={updatePain("stressLevel")}
          />
        </div>
      </div>

      <div
        className="pointer-events-none fixed inset-x-0 z-50"
        style={{
          bottom: "calc(var(--tabbar-height) + var(--safe-bottom-nav) + 12px)",
        }}
      >
        <div className="mx-auto flex w-[min(100%,480px)] flex-col gap-3 px-[var(--screen-padding)]">
          {!isOnline && (
            <div className="pointer-events-auto self-end flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(28,24,16,0.9)] px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--text-muted)" }}
              />
              <p
                className="m-0 text-[12px] leading-none"
                style={{ color: "var(--text-muted)" }}
              >
                Sin conexion
              </p>
            </div>
          )}
          <Button
            className="pointer-events-auto h-[56px] w-full text-[16px] shadow-[0_8px_24px_var(--fab-shadow)]"
            disabled={isPending || !isTriggerValid}
            onClick={handleSave}
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <MobileSheet
        open={Boolean(zeroWarning)}
        title="Confirmar valores en cero"
        description="Revisa antes de confirmar."
        panelClassName="warning-sheet-attention"
        onClose={() => setZeroWarning(null)}
      >
        <div className="space-y-5">
          <p className="text-[15px] leading-6 text-[var(--text-primary)]">
            {zeroWarning}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="subtle" onClick={() => setZeroWarning(null)}>
              Revisar registro
            </Button>
            <Button
              onClick={() => {
                setZeroWarning(null);
                doSave();
              }}
            >
              Guardar igual
            </Button>
          </div>
        </div>
      </MobileSheet>
    </section>
  );
}
