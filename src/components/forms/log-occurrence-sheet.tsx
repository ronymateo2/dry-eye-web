import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDownIcon, DropIcon, StethoscopeIcon, MoonStarsIcon, PillIcon, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { PainSlider } from "@/components/ui/pain-slider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getDayKey } from "@/lib/utils";
import { formatPropertyValue } from "@/lib/observations";
import { OBS_EYE_LABELS, OBS_BODY_ZONE_LABELS, OBS_CATEGORY_LABELS } from "@/lib/constants";
import type { ActionState, PropertyDef, PropertyValue, ObservationEye, ObservationLinks, PrevOccurrence } from "@/types/domain";

type Props = {
  observation: {
    id: string;
    title: string;
    eye: string;
    body_zone?: string | null;
    body_zone_custom?: string | null;
    category?: string | null;
    propertiesSchema?: PropertyDef[] | null;
    use_intensity?: boolean;
    use_duration?: boolean;
  };
  initialOccurrence?: PrevOccurrence;
  onSaved: () => void;
};

function ObsContextCard({ observation }: { observation: Props["observation"] }) {
  const eyeLabel = observation.eye !== "none" ? OBS_EYE_LABELS[observation.eye as ObservationEye] : null;
  const zoneLabel = observation.body_zone
    ? (observation.body_zone === "other" && observation.body_zone_custom)
      ? observation.body_zone_custom
      : OBS_BODY_ZONE_LABELS[observation.body_zone]
    : null;
  const catLabel = observation.category ? OBS_CATEGORY_LABELS[observation.category] : null;

  if (!eyeLabel && !zoneLabel && !catLabel) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {eyeLabel && (
        <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{eyeLabel}</span>
      )}
      {zoneLabel && (
        <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{zoneLabel}</span>
      )}
      {catLabel && (
        <span className="rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[11px] text-[var(--accent)]">{catLabel}</span>
      )}
    </div>
  );
}

function PrevOccurrencesSection({ observationId, schema, useIntensity, useDuration }: { observationId: string; schema?: PropertyDef[] | null; useIntensity?: boolean; useDuration?: boolean }) {
  const [open, setOpen] = useState(false);

  const { data: prev = [], isLoading } = useQuery({
    queryKey: ["observation-prev", observationId],
    queryFn: () => api.getObservationPrevious(observationId, 3),
    enabled: open,
  });

  function formatPrev(occ: PrevOccurrence): string {
    const parts: string[] = [];
    if (useIntensity && occ.intensity != null) parts.push(`${occ.intensity}/10`);
    if (useDuration && occ.durationMinutes != null) parts.push(`${occ.durationMinutes} min`);
    if (occ.propertyValues && schema) {
      for (const def of schema) {
        const v = occ.propertyValues[def.key];
        if (v === undefined || v === null || v === "") continue;
        const display = formatPropertyValue(def, v);
        const truncated = def.type === "text" && display.length > 30 ? display.slice(0, 30) + "…" : display;
        parts.push(`${def.label}: ${truncated}`);
      }
    }
    if (occ.notes) parts.push(`"${occ.notes.slice(0, 40)}${occ.notes.length > 40 ? "…" : ""}"`);
    return parts.join(" · ") || "Sin datos";
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between py-1 active:opacity-70"
      >
        <p className="section-label mb-0">Anteriores</p>
        <CaretDownIcon
          size={14}
          className={cn("text-[var(--text-faint)] transition-transform duration-200 ease-out", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              {isLoading ? (
                <div className="h-8 animate-pulse rounded-[8px] bg-[var(--surface)]" />
              ) : prev.length === 0 ? (
                <p className="text-[12px] text-[var(--text-faint)]">Sin ocurrencias anteriores.</p>
              ) : (
                prev.map((occ) => (
                  <div key={occ.id} className="border-l-2 border-[var(--accent)]/30 pl-3">
                    <p className="text-[11px] text-[var(--accent)]/70">{formatDate(occ.loggedAt)}</p>
                    <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">{formatPrev(occ)}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
        <PainSlider label={def.label} labelClassName="section-label" value={numVal} onChange={(v) => onChange(v)} />
      </div>
    );
  }

  if (def.type === "boolean") {
    const boolVal = typeof value === "boolean" ? value : null;
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

  if (def.type === "number") {
    const numStr = value !== undefined && value !== null ? String(value) : "";
    return (
      <div className="space-y-2">
        <p className="section-label">{def.label}</p>
        <input
          type="number"
          inputMode="decimal"
          className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          placeholder="0"
          value={numStr}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) onChange(n);
            else if (e.target.value === "" || e.target.value === "-") onChange(e.target.value);
          }}
        />
      </div>
    );
  }

  if (def.type === "text") {
    const strVal = typeof value === "string" ? value : "";
    return (
      <div className="space-y-2">
        <p className="section-label">{def.label}</p>
        <textarea
          className="w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] min-h-[72px]"
          placeholder="Escribir..."
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  // select
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

function LinksSection({
  links,
  onChange,
  timezone,
}: {
  links: ObservationLinks;
  onChange: (l: ObservationLinks) => void;
  timezone: string;
}) {
  const todayKey = getDayKey(new Date().toISOString(), timezone);

  const { data: dropSchedule = [] } = useQuery({
    queryKey: ["drops/last-per-type"],
    queryFn: api.getLastDropPerType,
  });
  const { data: todaySleep } = useQuery({
    queryKey: ["sleep/today"],
    queryFn: api.getTodaySleep,
  });
  const { data: lastCheckIn } = useQuery({
    queryKey: ["check-ins/last"],
    queryFn: api.getLastCheckIn,
  });
  const { data: medications = [] } = useQuery({
    queryKey: ["medications"],
    queryFn: api.getMedications,
  });

  const todayDropTypes = dropSchedule.filter(
    (d) => d.last_logged_at && getDayKey(d.last_logged_at, timezone) === todayKey
  );

  const checkInToday = lastCheckIn && getDayKey(lastCheckIn.logged_at, timezone) === todayKey
    ? lastCheckIn
    : null;

  const activeMeds = medications.filter((m) => !("archived_at" in m));

  function toggleDropType(id: string) {
    const cur = links.drop_type_ids ?? [];
    onChange({
      ...links,
      drop_type_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  }

  function toggleMed(id: string) {
    const cur = links.medication_ids ?? [];
    onChange({
      ...links,
      medication_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  }

  const hasAny = todayDropTypes.length > 0 || todaySleep || checkInToday || activeMeds.length > 0;
  if (!hasAny) return null;

  return (
    <div className="space-y-3">
      <p className="section-label">Vincular contexto (opcional)</p>
      <div className="space-y-2">
        {todayDropTypes.map((d) => {
          const active = (links.drop_type_ids ?? []).includes(d.drop_type_id);
          return (
            <LinkRow
              key={d.drop_type_id}
              icon={DropIcon}
              label={d.name}
              active={active}
              onToggle={() => toggleDropType(d.drop_type_id)}
            />
          );
        })}
        {checkInToday && (
          <LinkRow
            icon={StethoscopeIcon}
            label="Check-in · dolor registrado"
            active={!!links.check_in_id}
            onToggle={() =>
              onChange({ ...links, check_in_id: links.check_in_id ? undefined : checkInToday.id })
            }
          />
        )}
        {todaySleep && (
          <LinkRow
            icon={MoonStarsIcon}
            label={`Sueño · ${todaySleep.sleep_hours}h`}
            active={!!links.sleep_day_key}
            onToggle={() =>
              onChange({ ...links, sleep_day_key: links.sleep_day_key ? undefined : todaySleep.day_key })
            }
          />
        )}
        {activeMeds.map((m) => {
          const active = (links.medication_ids ?? []).includes(m.id);
          return (
            <LinkRow
              key={m.id}
              icon={PillIcon}
              label={m.name}
              active={active}
              onToggle={() => toggleMed(m.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  active,
  onToggle,
}: {
  icon: PhosphorIcon;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-[12px] border px-4 py-2.5 text-left transition duration-[120ms] ease-out active:scale-[0.99]",
        active
          ? "border-[var(--accent)]/50 bg-[var(--accent-dim)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      )}
    >
      <Icon
        size={16}
        className={cn("shrink-0", active ? "text-[var(--accent)]" : "text-[var(--text-faint)]")}
      />
      <span className={cn("flex-1 text-[13px]", active ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>
        {label}
      </span>
      <span className={cn(
        "h-4 w-4 shrink-0 rounded-full border-2 transition",
        active ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--text-faint)]"
      )} />
    </button>
  );
}

export function LogOccurrenceSheet({ observation, initialOccurrence, onSaved }: Props) {
  const isEdit = !!initialOccurrence;
  const [propertyValues, setPropertyValues] = useState<Record<string, PropertyValue>>(
    initialOccurrence?.propertyValues ?? {}
  );
  const [notes, setNotes] = useState(initialOccurrence?.notes ?? "");
  const [links, setLinks] = useState<ObservationLinks>(initialOccurrence?.links ?? {});
  const [intensity, setIntensity] = useState<number>(initialOccurrence?.intensity ?? 5);
  const [durationMinutes, setDurationMinutes] = useState<string>(
    initialOccurrence?.durationMinutes != null ? String(initialOccurrence.durationMinutes) : ""
  );
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [isPending, setIsPending] = useState(false);
  const [loggedAt, setLoggedAt] = useState<string>(
    () => initialOccurrence ? initialOccurrence.loggedAt : new Date().toISOString()
  );

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const setPropValue = (key: string, value: PropertyValue) => {
    setPropertyValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsPending(true);
    try {
      const hasLinks = Object.values(links).some((v) =>
        Array.isArray(v) ? v.length > 0 : v !== undefined
      );
      const durNum = durationMinutes.trim() !== "" ? parseInt(durationMinutes, 10) : null;
      await api.saveOccurrence(observation.id, {
        id: initialOccurrence?.id ?? crypto.randomUUID(),
        loggedAt: loggedAt,
        intensity: observation.use_intensity ? intensity : null,
        durationMinutes: observation.use_duration && durNum !== null && !isNaN(durNum) ? durNum : null,
        notes: notes.trim() || undefined,
        propertyValues: Object.keys(propertyValues).length > 0 ? propertyValues : undefined,
        links: hasLinks ? links : undefined,
      });
      toast.success(isEdit ? "Ocurrencia actualizada." : "Ocurrencia guardada.");
      onSaved();
    } catch {
      setState({ status: "error", message: "No se pudo guardar." });
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="space-y-4 pb-4">
        {state.status !== "idle" && <StatusBanner state={state} />}

        <ObsContextCard observation={observation} />

        <div className="space-y-1.5">
          <p className="section-label">{isEdit ? "Fecha del registro" : "Fecha y hora"}</p>
          <DateTimePicker
            value={loggedAt}
            onChange={(v) => { if (v) setLoggedAt(v); }}
            max={new Date()}
          />
        </div>

        {observation.use_intensity && (
          <div className="space-y-2">
            <PainSlider
              label="Intensidad"
              labelClassName="section-label"
              value={intensity}
              onChange={setIntensity}
            />
          </div>
        )}

        {observation.use_duration && (
          <div className="space-y-2">
            <p className="section-label">Duración (minutos)</p>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Ej: 30"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
        )}

        {(observation.propertiesSchema ?? []).map((def) => (
          <DynamicPropertyField
            key={def.key}
            def={def}
            value={propertyValues[def.key]}
            onChange={(v) => setPropValue(def.key, v)}
          />
        ))}

        <div className="space-y-2">
          <p className="section-label">Notas (opcional)</p>
          <textarea
            className="w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] min-h-[80px]"
            maxLength={300}
            placeholder="¿Qué más notaste?"
            value={notes}
            autoComplete="off"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <LinksSection links={links} onChange={setLinks} timezone={timezone} />

        <PrevOccurrencesSection
          observationId={observation.id}
          schema={observation.propertiesSchema}
          useIntensity={observation.use_intensity}
          useDuration={observation.use_duration}
        />
      </div>

      <div
        className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}
      >
        <Button className="w-full" disabled={isPending} onClick={handleSave}>
          {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar ocurrencia"}
        </Button>
      </div>
    </>
  );
}
