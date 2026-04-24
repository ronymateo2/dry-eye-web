import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { PainSlider } from "@/components/ui/pain-slider";
import { TextInput } from "@/components/ui/text-input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { api } from "@/lib/api";
import { TRIGGER_OPTIONS, SYMPTOM_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
      await api.saveCheckIn({
        id: crypto.randomUUID(),
        loggedAt: loggedAt ?? new Date().toISOString(),
        timeOfDay: null,
        eyelidPain: pain.eyelidPain,
        templePain: pain.templePain,
        masseterPain: pain.masseterPain,
        cervicalPain: pain.cervicalPain,
        orbitalPain: pain.orbitalPain,
        stressLevel: pain.stressLevel,
        triggerType: triggerValue ?? null,
        notes:
          selectedTrigger === "other" && customTriggerName.trim()
            ? customTriggerName.trim()
            : undefined,
      });

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
              loggedAt: loggedAt ?? new Date().toISOString(),
              symptomType: st,
            }),
          ),
        );
      }

      resetForm();
      toast.success("Registro guardado.");
    } catch {
      toast.error("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setIsPending(false);
    }
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

      <div className="pointer-events-none fixed bottom-[calc(82px+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-3 md:right-[calc(50vw-240px)]">
        {!isOnline && (
          <div className="pointer-events-auto flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(28,24,16,0.9)] px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md">
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
          className="pointer-events-auto h-[56px] min-w-[124px] px-6 text-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
          disabled={isPending || !isTriggerValid}
          onClick={handleSave}
        >
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
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
