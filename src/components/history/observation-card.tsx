import { NotePencilIcon } from "@phosphor-icons/react";
import { OBS_EYE_LABELS } from "@/lib/constants";
import type { DisplayObservation } from "./types";
import type { PropertyDef, PropertyValue } from "@/types/domain";
import { formatTime, painColor } from "./utils";

function PropertyValueChips({
  propertyValues,
  propertiesSchema,
}: {
  propertyValues: Record<string, PropertyValue>;
  propertiesSchema: PropertyDef[];
}) {
  const entries = propertiesSchema
    .map((def) => {
      const v = propertyValues[def.key];
      if (v === undefined || v === null || v === "") return null;
      let display: string;
      if (def.type === "scale") display = `${v}/10`;
      else if (def.type === "boolean") display = v ? "Sí" : "No";
      else if (def.type === "select") {
        const opt = def.options.find((o) => o.value === v);
        display = opt?.label ?? String(v);
      } else {
        const str = String(v);
        display = str.length > 40 ? str.slice(0, 40) + "…" : str;
      }
      return { label: def.label, display };
    })
    .filter((e): e is { label: string; display: string } => e !== null);

  if (entries.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map((e, i) => (
        <span
          key={i}
          className="rounded-full bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
        >
          {e.label}:{" "}
          <span className="font-medium text-[var(--text-primary)]">{e.display}</span>
        </span>
      ))}
    </div>
  );
}

export function ObservationCard({ item, timezone }: { item: DisplayObservation; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  const eyeLabel = OBS_EYE_LABELS[item.eye as keyof typeof OBS_EYE_LABELS];
  const hasPropertyValues = item.propertyValues && item.propertiesSchema && item.propertiesSchema.length > 0;
  const intensityHue = painColor(item.intensity);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
          <NotePencilIcon size={15} color="var(--text-muted)" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[14px] font-medium text-[var(--text-primary)]">{item.title}</p>
            {!hasPropertyValues && item.intensity > 0 && (
              <span
                className="mono shrink-0 text-[13px] font-medium tabular-nums"
                style={{ color: intensityHue }}
              >
                {item.intensity}/10
              </span>
            )}
          </div>
          <p className="mono mt-0.5 text-[10px] text-[var(--text-muted)]">
            {eyeLabel ? `${eyeLabel} · ` : ""}
            {!hasPropertyValues && item.durationMinutes ? `${item.durationMinutes} min · ` : ""}
            {time}
          </p>
          {hasPropertyValues ? (
            <PropertyValueChips
              propertyValues={item.propertyValues!}
              propertiesSchema={item.propertiesSchema!}
            />
          ) : item.notes ? (
            <p className="mt-1.5 text-[13px] leading-snug text-[var(--text-muted)]">{item.notes}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
