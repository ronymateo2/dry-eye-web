import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  OBS_EYE_OPTIONS,
  OBS_BODY_ZONE_OPTIONS,
  OBS_CATEGORY_OPTIONS,
} from "@/lib/constants";
import type { ObservationBodyZone, ObservationCategory, ObservationEye, ActionState, PropertyDef, PropertyType } from "@/types/domain";

const MAX_TITLE = 80;

const PROP_TYPE_OPTIONS: { label: string; value: PropertyType }[] = [
  { label: "Escala", value: "scale" },
  { label: "Sí/No", value: "boolean" },
  { label: "Opciones", value: "select" },
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 40);
}

type InitialObs = {
  id: string;
  title: string;
  eye?: string;
  body_zone?: string | null;
  body_zone_custom?: string | null;
  category?: string | null;
  propertiesSchema?: PropertyDef[];
};

type Props = {
  initialObservation?: InitialObs;
  onSaved: (obs: { id: string; title: string; eye: string; propertiesSchema?: PropertyDef[] | null }) => void;
};

function PillGrid<T extends string>({
  options,
  value,
  onChange,
  scrollable,
}: {
  options: readonly { label: string; value: T }[];
  value: T | null;
  onChange: (v: T) => void;
  scrollable?: boolean;
}) {
  return (
    <div className={cn(
      "flex gap-2",
      scrollable
        ? "overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        : "flex-wrap"
    )}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition duration-[120ms] ease-out active:scale-95",
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

function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: { value: string; label: string }[];
  onChange: (opts: { value: string; label: string }[]) => void;
}) {
  const [newOpt, setNewOpt] = useState("");

  const add = () => {
    const label = newOpt.trim();
    if (!label) return;
    const value = slugify(label) || `opt_${Date.now()}`;
    onChange([...options, { label, value }]);
    setNewOpt("");
  };

  return (
    <div className="space-y-1.5 pt-1 pl-1">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-[var(--text-muted)]">{opt.label}</span>
          <button
            type="button"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="text-[var(--text-faint)] active:opacity-70"
            aria-label={`Eliminar opción ${opt.label}`}
          >
            <XIcon size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface-el)] px-2.5 py-1 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          placeholder="Nueva opción"
          value={newOpt}
          onChange={(e) => setNewOpt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 text-[12px] font-medium text-[var(--accent)] active:opacity-70"
        >
          + Añadir
        </button>
      </div>
    </div>
  );
}

function PropertyRow({
  prop,
  onChange,
  onRemove,
  showError,
}: {
  prop: PropertyDef;
  onChange: (p: PropertyDef) => void;
  onRemove: () => void;
  showError?: boolean;
}) {
  const updateLabel = (label: string) => {
    const key = slugify(label) || `prop_${Date.now()}`;
    onChange({ ...prop, label, key } as PropertyDef);
  };

  const updateType = (type: PropertyType) => {
    const base = { key: prop.key, label: prop.label };
    if (type === "scale") onChange({ ...base, type: "scale" });
    else if (type === "boolean") onChange({ ...base, type: "boolean" });
    else onChange({ ...base, type: "select", options: [] });
  };

  return (
    <div className={cn(
      "space-y-2 rounded-[12px] border bg-[var(--surface)] p-3",
      showError && !prop.label.trim() ? "border-[var(--pain-high)]" : "border-[var(--border)]"
    )}>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] placeholder:italic focus:outline-none"
          placeholder={showError && !prop.label.trim() ? "Nombre requerido" : "Nombre del campo…"}
          value={prop.label}
          onChange={(e) => updateLabel(e.target.value)}
        />
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-[var(--text-faint)] active:opacity-70"
          aria-label="Eliminar propiedad"
        >
          <XIcon size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PROP_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateType(opt.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[12px] font-medium transition duration-[120ms] ease-out active:scale-95",
              prop.type === opt.value
                ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-muted)]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {prop.type === "select" && (
        <SelectOptionsEditor
          options={prop.options}
          onChange={(opts) => onChange({ ...prop, options: opts })}
        />
      )}
    </div>
  );
}

function PropertyEditorSection({
  properties,
  onChange,
  showErrors,
}: {
  properties: PropertyDef[];
  onChange: (props: PropertyDef[]) => void;
  showErrors?: boolean;
}) {
  const add = () => {
    onChange([...properties, { key: `prop_${properties.length + 1}`, label: "", type: "scale" }]);
  };

  return (
    <div className="space-y-3">
      <p className="section-label">Campos extra (opcional)</p>
      {properties.map((prop, i) => (
        <PropertyRow
          key={i}
          prop={prop}
          onChange={(updated) => onChange(properties.map((p, j) => j === i ? updated : p))}
          onRemove={() => onChange(properties.filter((_, j) => j !== i))}
          showError={showErrors}
        />
      ))}
      <button
        type="button"
        className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)] active:opacity-70"
        onClick={add}
      >
        <PlusIcon size={14} />
        Añadir campo
      </button>
    </div>
  );
}

export function ObservationSheet({ initialObservation, onSaved }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!initialObservation;

  const [title, setTitle] = useState(initialObservation?.title ?? "");
  const [eye, setEye] = useState<ObservationEye>(
    (initialObservation?.eye as ObservationEye | undefined) ?? "none"
  );
  const [bodyZone, setBodyZone] = useState<ObservationBodyZone | null>(
    (initialObservation?.body_zone as ObservationBodyZone | null) ?? null
  );
  const [bodyZoneCustom, setBodyZoneCustom] = useState(
    initialObservation?.body_zone_custom ?? ""
  );
  const [category, setCategory] = useState<ObservationCategory | null>(
    (initialObservation?.category as ObservationCategory | null) ?? null
  );
  const [properties, setProperties] = useState<PropertyDef[]>(
    initialObservation?.propertiesSchema ?? []
  );
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [showPropErrors, setShowPropErrors] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canSave = title.trim().length > 0 && !isPending;

  const handleSave = () => {
    if (properties.some((p) => !p.label.trim())) {
      setShowPropErrors(true);
      setState({ status: "error", message: "Todos los campos necesitan un nombre." });
      return;
    }
    setShowPropErrors(false);

    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          eye,
          body_zone: bodyZone,
          body_zone_custom: bodyZone === "other" ? (bodyZoneCustom.trim() || null) : null,
          category,
          propertiesSchema: properties.length > 0 ? properties : undefined,
        };

        let result: { id: string; title: string; eye: string; properties_schema?: PropertyDef[] | null };
        if (isEdit) {
          result = await api.updateObservation(initialObservation.id, payload);
        } else {
          result = await api.createObservation(payload);
        }

        queryClient.invalidateQueries({ queryKey: ["observations"] });
        onSaved({
          id: result.id,
          title: result.title,
          eye: result.eye,
          propertiesSchema: result.properties_schema,
        });
      } catch {
        setState({ status: "error", message: "No se pudo guardar." });
      }
    });
  };

  return (
    <>
      <div className="space-y-5 pb-4">
        {state.status !== "idle" && <StatusBanner state={state} />}

        <div className="space-y-2">
          <p className="section-label">Nombre</p>
          <input
            className={cn(
              "w-full rounded-[12px] border border-[var(--border)] bg-transparent px-4 py-3",
              "text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "focus:outline-none focus:border-[var(--accent)]",
              "h-[48px]"
            )}
            maxLength={MAX_TITLE}
            placeholder="Ej: Ardor párpado superior OI"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="section-label">Ojo</p>
          <PillGrid options={OBS_EYE_OPTIONS} value={eye} onChange={setEye} />
        </div>

        <div className="space-y-2">
          <p className="section-label">Zona</p>
          <PillGrid
            options={OBS_BODY_ZONE_OPTIONS}
            value={bodyZone}
            onChange={(v) => { setBodyZone(v); if (v !== "other") setBodyZoneCustom(""); }}
            scrollable
          />
          <AnimatePresence>
            {bodyZone === "other" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <input
                  className="mt-2 w-full rounded-[12px] border border-[var(--border)] bg-transparent px-4 py-2.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  placeholder="Especificar zona..."
                  maxLength={60}
                  value={bodyZoneCustom}
                  onChange={(e) => setBodyZoneCustom(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <p className="section-label">Categoría</p>
          <PillGrid options={OBS_CATEGORY_OPTIONS} value={category} onChange={setCategory} scrollable />
        </div>

        <PropertyEditorSection properties={properties} onChange={setProperties} showErrors={showPropErrors} />
      </div>

      <div
        className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}
      >
        <Button className="w-full" disabled={!canSave} type="button" onClick={handleSave}>
          {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar observación"}
        </Button>
      </div>
    </>
  );
}
