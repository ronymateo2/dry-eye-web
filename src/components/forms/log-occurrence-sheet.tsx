import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { PainSlider } from "@/components/ui/pain-slider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PAIN_QUALITY_OPTIONS, OBS_EYE_LABELS, OBS_BODY_ZONE_LABELS, OBS_CATEGORY_LABELS } from "@/lib/constants";
import type { ActionState, TriggerType, PainQuality, PropertyDef, PropertyValue, ObservationEye } from "@/types/domain";

function CollapsiblePillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { label: string; value: T }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between py-1 active:opacity-70"
      >
        <p className="section-label mb-0">{label}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[13px] font-medium", value ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>
            {selectedLabel ?? "Ninguna"}
          </span>
          <CaretDownIcon
            size={14}
            className={cn("text-[var(--text-faint)] transition-transform duration-200 ease-out", open && "rotate-180")}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <PillGrid
                options={options}
                value={value}
                onChange={(v) => { onChange(v); setOpen(false); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Props = {
  observation: {
    id: string;
    title: string;
    eye: string;
    body_zone?: string | null;
    category?: string | null;
    notes?: string | null;
    propertiesSchema?: PropertyDef[] | null;
  };
  onSaved: () => void;
}

function ObsContextCard({ observation }: { observation: Props["observation"] }) {
  const [expanded, setExpanded] = useState(false);

  const eyeLabel = observation.eye !== "none" ? OBS_EYE_LABELS[observation.eye as ObservationEye] : null;
  const zoneLabel = observation.body_zone ? OBS_BODY_ZONE_LABELS[observation.body_zone] : null;
  const catLabel = observation.category ? OBS_CATEGORY_LABELS[observation.category] : null;
  const hasChips = eyeLabel || zoneLabel || catLabel;
  const hasDetails = observation.notes || (observation.propertiesSchema && observation.propertiesSchema.length > 0);

  if (!hasChips && !hasDetails) return null;

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 active:opacity-70"
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {eyeLabel && (
            <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{eyeLabel}</span>
          )}
          {zoneLabel && (
            <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{zoneLabel}</span>
          )}
          {catLabel && (
            <span className="rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[11px] text-[var(--accent)]">{catLabel}</span>
          )}
          {!hasChips && (
            <span className="text-[13px] text-[var(--text-muted)]">Ver detalles</span>
          )}
        </div>
        {hasDetails && (
          <CaretDownIcon
            size={14}
            className={cn("shrink-0 ml-2 text-[var(--text-faint)] transition-transform duration-200 ease-out", expanded && "rotate-180")}
          />
        )}
      </button>

      <AnimatePresence>
        {expanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4">
              {observation.notes && (
                <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{observation.notes}</p>
              )}
              {observation.propertiesSchema && observation.propertiesSchema.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]">Campos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {observation.propertiesSchema.map((def) => (
                      <span key={def.key} className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                        {def.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PillGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { label: string; value: T }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition duration-[120ms] ease-out active:scale-95",
              active
                ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const TRIGGER_OPTS = [
  { label: "Pantallas", value: "screens" },
  { label: "TV", value: "tv" },
  { label: "Estres", value: "stress" },
  { label: "Ejercicio", value: "exercise" },
  { label: "Clima", value: "climate" },
  { label: "Humidificador", value: "humidifier" },
  { label: "Ergonomia", value: "ergonomics" },
  { label: "Otro", value: "other" },
] as const satisfies readonly { label: string; value: TriggerType }[];

function DynamicPropertyField({
  def,
  value,
  onChange,
}: {
  def: PropertyDef;
  value: PropertyValue | undefined;
  onChange: (v: PropertyValue) => void;
}) {
  if (def.type === "scale") {
    const min = def.min ?? 0;
    const numVal = typeof value === "number" ? value : min;
    return (
      <div className="space-y-2">
        <PainSlider label={def.label} value={numVal} onChange={(v) => onChange(v)} />
      </div>
    );
  }

  if (def.type === "boolean") {
    const boolVal = typeof value === "boolean" ? value : false;
    return (
      <div className="space-y-2">
        <p className="section-label">{def.label}</p>
        <div className="flex gap-2">
          {([{ label: "Sí", val: true }, { label: "No", val: false }] as const).map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.val)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[13px] font-medium transition duration-[120ms] ease-out active:scale-95",
                boolVal === opt.val
                  ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (def.type === "select") {
    const strVal = typeof value === "string" ? value : null;
    return (
      <div className="space-y-2">
        <p className="section-label">{def.label}</p>
        <div className="flex flex-wrap gap-2">
          {def.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(strVal === opt.value ? "" : opt.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition duration-[120ms] ease-out active:scale-95",
                strVal === opt.value
                  ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // text
  const textVal = typeof value === "string" ? value : "";
  return (
    <div className="space-y-2">
      <p className="section-label">{def.label}</p>
      <textarea
        className="w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] min-h-[72px]"
        maxLength={def.maxLength ?? 200}
        value={textVal}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function LogOccurrenceSheet({ observation, onSaved }: Props) {
  const hasDynamicSchema = (observation.propertiesSchema?.length ?? 0) > 0;

  // Legacy fields
  const [intensity, setIntensity] = useState(5);
  const [durationRaw, setDurationRaw] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType | null>(null);
  const [painQuality, setPainQuality] = useState<PainQuality | null>(null);
  const [notes, setNotes] = useState("");

  // Dynamic fields
  const [propertyValues, setPropertyValues] = useState<Record<string, PropertyValue>>({});

  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [isPending, setIsPending] = useState(false);

  const setPropValue = (key: string, value: PropertyValue) => {
    setPropertyValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const durationMinutes = durationRaw === "" ? null : Math.max(1, parseInt(durationRaw, 10) || 1);
    setIsPending(true);
    try {
      await api.saveOccurrence(observation.id, {
        id: crypto.randomUUID(),
        loggedAt: new Date().toISOString(),
        intensity: hasDynamicSchema ? null : intensity,
        durationMinutes: hasDynamicSchema ? null : durationMinutes,
        triggerType: hasDynamicSchema ? null : triggerType,
        painQuality: hasDynamicSchema ? null : painQuality,
        notes: notes.trim(),
        propertyValues: hasDynamicSchema ? propertyValues : undefined,
      });
      toast.success("Ocurrencia guardada.");
      onSaved();
    } catch {
      setState({ status: "error", message: "No se pudo guardar." });
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-4">
        {state.status !== "idle" && <StatusBanner state={state} />}
        <ObsContextCard observation={observation} />

        {hasDynamicSchema ? (
          observation.propertiesSchema!.map((def) => (
            <DynamicPropertyField
              key={def.key}
              def={def}
              value={propertyValues[def.key]}
              onChange={(v) => setPropValue(def.key, v)}
            />
          ))
        ) : (
          <>
            <PainSlider label="Intensidad" value={intensity} onChange={setIntensity} />

            <div className="space-y-2">
              <p className="section-label">Duracion (min, opcional)</p>
              <input
                className="w-full h-12 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                inputMode="numeric"
                placeholder="Ej: 15"
                type="number"
                value={durationRaw}
                onChange={(e) => setDurationRaw(e.target.value)}
              />
            </div>

            <CollapsiblePillGroup label="Tipo de sensacion (opcional)" options={PAIN_QUALITY_OPTIONS} value={painQuality} onChange={setPainQuality} />
            <CollapsiblePillGroup label="Trigger (opcional)" options={TRIGGER_OPTS} value={triggerType} onChange={setTriggerType} />
          </>
        )}

        <div className="space-y-2">
          <p className="section-label">Notas (opcional)</p>
          <textarea
            className="w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] min-h-[80px]"
            maxLength={300}
            placeholder="Que mas notaste?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div
        className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}
      >
        <Button className="w-full" disabled={isPending} onClick={handleSave}>
          {isPending ? "Guardando..." : "Guardar ocurrencia"}
        </Button>
      </div>
    </>
  );
}
