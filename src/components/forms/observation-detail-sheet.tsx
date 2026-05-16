import { useState } from "react";
import { PencilSimpleIcon, PlusIcon, SparkleIcon, LightningIcon, WrenchIcon, CloudIcon, PersonSimpleIcon, FileTextIcon, TrashIcon, PencilIcon, DropIcon, MoonStarsIcon, StethoscopeIcon, PillIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { OBS_EYE_LABELS, OBS_BODY_ZONE_LABELS, OBS_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ObservationEye, ObservationRecord, PrevOccurrence, PropertyDef, PropertyValue } from "@/types/domain";

const EASE_OUT = { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const };

type Props = {
  observation: ObservationRecord;
  onLogNew: () => void;
  onEdit: () => void;
  onEditOccurrence: (occ: PrevOccurrence) => void;
};

function CategoryIcon({ category, size = 14 }: { category?: string | null; size?: number }) {
  const cls = "shrink-0 text-[var(--text-faint)]";
  switch (category) {
    case "sensory": return <SparkleIcon size={size} className={cls} />;
    case "pain": return <LightningIcon size={size} className={cls} />;
    case "functional": return <WrenchIcon size={size} className={cls} />;
    case "environmental": return <CloudIcon size={size} className={cls} />;
    case "postural": return <PersonSimpleIcon size={size} className={cls} />;
    default: return <FileTextIcon size={size} className={cls} />;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function PropChips({ occ, schema, useIntensity, useDuration }: {
  occ: PrevOccurrence;
  schema: PropertyDef[] | null;
  useIntensity?: boolean;
  useDuration?: boolean;
}) {
  const chips: { label: string; value: string; isText?: boolean }[] = [];

  if (useIntensity && occ.intensity != null) chips.push({ label: "Intensidad", value: `${occ.intensity}/10` });
  if (useDuration && occ.durationMinutes != null) chips.push({ label: "Duración", value: `${occ.durationMinutes} min` });

  if (schema && occ.propertyValues) {
    for (const def of schema) {
      const v: PropertyValue | undefined = occ.propertyValues[def.key];
      if (v === undefined || v === null || v === "") continue;
      let display = "";
      if (def.type === "boolean") display = v ? "Sí" : "No";
      else if (def.type === "scale") display = `${v}/10`;
      else if (def.type === "number") display = String(v);
      else if (def.type === "text") chips.push({ label: def.label, value: String(v), isText: true });
      else if (def.type === "select") {
        const opt = def.options.find((o) => o.value === v);
        display = opt?.label ?? String(v);
      }
      if (display) chips.push({ label: def.label, value: display });
    }
  }

  if (chips.length === 0 && !occ.notes) return (
    <span className="text-[12px] text-[var(--text-faint)]">Sin datos adicionales</span>
  );

  const inlineChips = chips.filter((c) => !c.isText);
  const textChips = chips.filter((c) => c.isText);

  return (
    <div className="space-y-1.5">
      {inlineChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {inlineChips.map((c, i) => (
            <span
              key={i}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-el)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]"
            >
              <span className="text-[var(--text-faint)]">{c.label}: </span>{c.value}
            </span>
          ))}
        </div>
      )}
      {textChips.map((c, i) => (
        <div key={i} className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">{c.label}</span>
          <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">{c.value}</p>
        </div>
      ))}
      {occ.notes && (
        <p className="text-[12px] leading-relaxed text-[var(--text-faint)]">
          "{occ.notes}"
        </p>
      )}
    </div>
  );
}

function LinksDisplay({ links }: { links: PrevOccurrence["links"] }) {
  if (!links) return null;
  const hasDrops = links.drop_type_ids && links.drop_type_ids.length > 0;
  const hasSleep = !!links.sleep_day_key;
  const hasCheckIn = !!links.check_in_id;
  const hasMeds = links.medication_ids && links.medication_ids.length > 0;
  if (!hasDrops && !hasSleep && !hasCheckIn && !hasMeds) return null;
  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      {hasDrops && <DropIcon size={11} className="text-[var(--text-faint)]" />}
      {hasSleep && <MoonStarsIcon size={11} className="text-[var(--text-faint)]" />}
      {hasCheckIn && <StethoscopeIcon size={11} className="text-[var(--text-faint)]" />}
      {hasMeds && <PillIcon size={11} className="text-[var(--text-faint)]" />}
      <span className="text-[11px] text-[var(--text-faint)]">Vinculado</span>
    </div>
  );
}

function OccurrenceRow({
  occ,
  index,
  observationId,
  schema,
  useIntensity,
  useDuration,
  onEdit,
  onDeleted,
}: {
  occ: PrevOccurrence;
  index: number;
  observationId: string;
  schema: PropertyDef[] | null;
  useIntensity?: boolean;
  useDuration?: boolean;
  onEdit: (occ: PrevOccurrence) => void;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteOccurrence(observationId, occ.id);
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <motion.div
      key={occ.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...EASE_OUT, delay: index * 0.03 }}
      className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--accent)]/70">{formatDate(occ.loggedAt)}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Editar ocurrencia"
            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-faint)] active:opacity-60"
            onClick={() => onEdit(occ)}
          >
            <PencilIcon size={13} />
          </button>
          <button
            type="button"
            aria-label="Eliminar ocurrencia"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full active:opacity-60",
              confirming ? "text-[var(--pain-high)]" : "text-[var(--text-faint)]"
            )}
            onClick={() => setConfirming(true)}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      <PropChips occ={occ} schema={schema} useIntensity={useIntensity} useDuration={useDuration} />
      <LinksDisplay links={occ.links} />

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pt-1">
              <span className="flex-1 text-[12px] text-[var(--pain-high)]">¿Eliminar este registro?</span>
              <button
                type="button"
                className="text-[12px] text-[var(--text-faint)] active:opacity-60"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="text-[12px] font-medium text-[var(--pain-high)] active:opacity-60"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "..." : "Eliminar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ObsHeader({ observation, onEdit }: { observation: ObservationRecord; onEdit: () => void }) {
  const eyeLabel = observation.eye !== "none" ? OBS_EYE_LABELS[observation.eye as ObservationEye] : null;
  const zoneLabel = observation.body_zone
    ? observation.body_zone === "other" && observation.body_zone_custom
      ? observation.body_zone_custom
      : OBS_BODY_ZONE_LABELS[observation.body_zone]
    : null;
  const catLabel = observation.category ? OBS_CATEGORY_LABELS[observation.category] : null;

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-el)]">
        <CategoryIcon category={observation.category} size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {eyeLabel && <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{eyeLabel}</span>}
          {zoneLabel && <span className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{zoneLabel}</span>}
          {catLabel && <span className="rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[11px] text-[var(--accent)]">{catLabel}</span>}
        </div>
        {observation.properties_schema && observation.properties_schema.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {observation.properties_schema.map((def, i) => (
              <span key={i} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-faint)]">
                {def.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Editar plantilla"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-faint)] active:opacity-60"
        onClick={onEdit}
      >
        <PencilSimpleIcon size={16} />
      </button>
    </div>
  );
}

export function ObservationDetailSheet({ observation, onLogNew, onEdit, onEditOccurrence }: Props) {
  const queryClient = useQueryClient();
  const { data: occurrences = [], isLoading } = useQuery({
    queryKey: ["observation-prev", observation.id, "detail"],
    queryFn: () => api.getObservationPrevious(observation.id, 20),
  });

  const handleDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["observation-prev", observation.id] });
    queryClient.invalidateQueries({ queryKey: ["observations"] });
    queryClient.invalidateQueries({ queryKey: ["observation-occurrences"] });
  };

  return (
    <>
      <div className="space-y-4 pb-4">
        <ObsHeader observation={observation} onEdit={onEdit} />

        <div className="space-y-2">
          <p className="px-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
            {isLoading ? "Cargando..." : `${occurrences.length} registro${occurrences.length !== 1 ? "s" : ""}`}
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : occurrences.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-[14px] text-[var(--text-muted)]">Sin registros aún.</p>
              <p className="text-[12px] text-[var(--text-faint)]">Toca el botón para registrar la primera ocurrencia.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {occurrences.map((occ, i) => (
                <OccurrenceRow
                  key={occ.id}
                  occ={occ}
                  index={i}
                  observationId={observation.id}
                  schema={observation.properties_schema}
                  useIntensity={observation.use_intensity}
                  useDuration={observation.use_duration}
                  onEdit={onEditOccurrence}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}
      >
        <Button className="w-full gap-2" type="button" onClick={onLogNew}>
          <PlusIcon size={18} />
          Nueva ocurrencia
        </Button>
      </div>
    </>
  );
}
