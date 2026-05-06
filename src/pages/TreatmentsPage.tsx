import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { TextInput } from "@/components/ui/text-input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { api } from "@/lib/api";
import {
  DotsSixVerticalIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DropTypeRecord, ActionState, MedicationPhase } from "@/types/domain";
import { daysUntilEnd, cn } from "@/lib/utils";

// ─── Drops Panel ─────────────────────────────────────────────────────────────

const INTERVAL_OPTIONS: { label: string; value: number | null }[] = [
  { label: "A necesidad", value: null },
  { label: "c/2h", value: 2 },
  { label: "c/4h", value: 4 },
  { label: "c/6h", value: 6 },
  { label: "c/8h", value: 8 },
  { label: "c/12h", value: 12 },
  { label: "c/24h", value: 24 },
];

function intervalLabel(hours: number | null | undefined): string {
  if (!hours) return "a necesidad";
  const opt = INTERVAL_OPTIONS.find((o) => o.value === hours);
  return opt ? opt.label : `c/${hours}h`;
}

function IntervalPills({
  selected,
  onChange,
}: {
  selected: number | null;
  onChange: (v: number | null) => void;
}) {
  const isPreset = INTERVAL_OPTIONS.some((o) => o.value === selected);
  const isCustom = selected !== null && !isPreset;
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customVal, setCustomVal] = useState(isCustom ? String(selected) : "");

  const handleCustomCommit = () => {
    const n = parseInt(customVal, 10);
    if (n > 0) onChange(n);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {INTERVAL_OPTIONS.map((opt) => {
        const active = !showCustom && opt.value === selected;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setShowCustom(false); onChange(opt.value); }}
            className="rounded-full px-3 py-1 text-[12px] font-medium"
            style={{
              background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-faint)",
              border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
              transition: "color 120ms ease-out, background 120ms ease-out, border-color 120ms ease-out",
            }}
          >
            {opt.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setShowCustom(true)}
        className="rounded-full px-3 py-1 text-[12px] font-medium"
        style={{
          background: showCustom ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
          color: showCustom ? "var(--accent)" : "var(--text-faint)",
          border: showCustom ? "1.5px solid var(--accent)" : "1px solid var(--border)",
          transition: "color 120ms ease-out, background 120ms ease-out, border-color 120ms ease-out",
        }}
      >
        {isCustom && !showCustom ? `c/${selected}h` : "Otro..."}
      </button>
      {showCustom && (
        <div className="flex w-full items-center gap-2 pt-1">
          <span className="text-[13px] text-[var(--text-muted)]">c/</span>
          <input
            type="number"
            min="1"
            max="72"
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            onBlur={handleCustomCommit}
            onKeyDown={(e) => e.key === "Enter" && handleCustomCommit()}
            placeholder="ej. 3"
            autoFocus
            className="w-20 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <span className="text-[13px] text-[var(--text-muted)]">horas</span>
        </div>
      )}
    </div>
  );
}

function SortableDropType({
  dt,
  isOnly,
  confirmingDelete,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
  onIntervalChange,
  onDateChange,
}: {
  dt: DropTypeRecord;
  isOnly: boolean;
  confirmingDelete: boolean;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onIntervalChange: (id: string, hours: number | null) => void;
  onDateChange: (id: string, startDate: string | null, endDate: string | null) => void;
}) {
  const [editingInterval, setEditingInterval] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [localStart, setLocalStart] = useState(dt.start_date ?? "");
  const [localEnd, setLocalEnd] = useState(dt.end_date ?? "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dt.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? ("relative" as const) : undefined,
  };

  const endDays = dt.end_date ? daysUntilEnd(dt.end_date) : null;
  const isPastEnd = endDays !== null && endDays < 0;
  const isUrgentEnd = endDays !== null && !isPastEnd && endDays <= 7;

  const handleDateSave = () => {
    onDateChange(dt.id, localStart || null, localEnd || null);
    setEditingDates(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "border-b border-[var(--border)] last:border-b-0",
        isDragging ? "bg-[var(--surface-el)] opacity-90 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "bg-transparent",
      ].filter(Boolean).join(" ")}
    >
      {confirmingDelete ? (
        <div className="flex min-h-12 items-center gap-3 px-4 py-2">
          <span className="flex-1 text-[13px] text-[var(--text-muted)]">
            ¿Archivar esta gota? Tu historial se mantiene intacto.
          </span>
          <button
            type="button"
            onClick={onDeleteConfirm}
            className="min-h-[36px] rounded-[8px] bg-[var(--error)] px-3 text-[12px] font-medium text-white"
          >
            Archivar
          </button>
          <button
            type="button"
            onClick={onDeleteCancel}
            className="min-h-[36px] rounded-[8px] border border-[var(--border)] px-3 text-[12px] font-medium text-[var(--text-muted)]"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <div className="flex min-h-12 items-center px-4 text-[15px] text-[var(--text-primary)]">
            <div className={cn("flex flex-1 flex-col gap-0.5 py-3 min-w-0", isPastEnd && "opacity-50")}>
              <span className={isPastEnd ? "line-through" : ""}>
                {dt.name}
              </span>
              {(dt.start_date || dt.end_date) && (
                <span className="mono text-[10px] text-[var(--text-faint)]">
                  {dt.start_date ?? "—"} → {dt.end_date ?? "∞"}
                </span>
              )}
              {dt.end_date && (
                <span className={cn(
                  "self-start inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                  isPastEnd ? "bg-[rgba(204,63,48,0.12)] text-[var(--error)]"
                  : isUrgentEnd ? "bg-[rgba(234,179,8,0.12)] text-[#ca8a04]"
                  : "hidden",
                )}>
                  {isPastEnd ? "Suspendido" : `Suspender en ${endDays}d`}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setEditingDates((v) => !v); setEditingInterval(false); }}
              className="rounded-full px-2 py-1 text-[10px] font-medium transition-colors mr-1"
              style={{
                background: editingDates ? "var(--accent)" : "var(--surface-el)",
                color: editingDates ? "var(--bg)" : "var(--text-faint)",
              }}
              aria-label={`Fechas de ${dt.name}`}
            >
              {dt.start_date || dt.end_date ? "fechas" : "+ fechas"}
            </button>
            <button
              type="button"
              onClick={() => { setEditingInterval((v) => !v); setEditingDates(false); }}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors mr-2"
              style={{
                background: editingInterval ? "var(--accent)" : "var(--surface-el)",
                color: editingInterval ? "var(--bg)" : "var(--text-muted)",
              }}
              aria-label={`Cambiar intervalo de ${dt.name}`}
            >
              {intervalLabel(dt.interval_hours)}
            </button>
            <button
              type="button"
              onClick={onDeleteRequest}
              aria-label={`Archivar ${dt.name}`}
              className="flex min-h-12 w-10 shrink-0 items-center justify-center text-[var(--text-faint)] hover:text-[var(--error)] transition-colors"
            >
              <TrashIcon size={16} />
            </button>
            {!isOnly && (
              <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label={`Reordenar ${dt.name}`}
                className="flex min-h-12 w-10 shrink-0 cursor-grab items-center justify-center text-[var(--text-faint)] active:cursor-grabbing"
              >
                <DotsSixVerticalIcon size={16} />
              </button>
            )}
          </div>
          {editingInterval && (
            <div className="px-4 pb-3">
              <IntervalPills
                selected={dt.interval_hours ?? null}
                onChange={(hours) => {
                  onIntervalChange(dt.id, hours);
                  setEditingInterval(false);
                }}
              />
            </div>
          )}
          {editingDates && (
            <div className="px-4 pb-3 space-y-2">
              <DateRangePicker
                from={localStart || null}
                to={localEnd || null}
                onChange={(f, t) => { setLocalStart(f ?? ""); setLocalEnd(t ?? ""); }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDateSave}
                  className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-[12px] font-medium text-[var(--btn-primary-text)]"
                >
                  Guardar fechas
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDates(false)}
                  className="rounded-full border border-[var(--border)] px-4 py-1.5 text-[12px] font-medium text-[var(--text-muted)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}

function DropsPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: dropTypes = [], isLoading } = useQuery({ queryKey: ["drop-types"], queryFn: api.getDropTypes });

  const [dropName, setDropName] = useState("");
  const [intervalHours, setIntervalHours] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveMutation = useMutation({
    mutationFn: () => api.createDropType(dropName.trim(), intervalHours, startDate || null, endDate || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      qc.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      setDropName("");
      setIntervalHours(null);
      setStartDate("");
      setEndDate("");
      setState({ status: "success", message: "Guardado." });
      setTimeout(() => setState({ status: "idle" }), 2000);
    },
    onError: () => setState({ status: "error", message: "No se pudo guardar." }),
  });

  const intervalMutation = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number | null }) =>
      api.updateDropTypeInterval(id, hours),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      qc.invalidateQueries({ queryKey: ["drops/last-per-type"] });
    },
  });

  const dateMutation = useMutation({
    mutationFn: ({ id, sd, ed }: { id: string; sd: string | null; ed: string | null }) =>
      api.updateDropType(id, { startDate: sd, endDate: ed }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      qc.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      toast.success("Fechas guardadas.");
    },
    onError: () => toast.error("No se pudieron guardar las fechas."),
  });

  const deleteDropTypeMutation = useMutation({
    mutationFn: (id: string) => api.deleteDropType(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      qc.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      setDeletingId(null);
      toast.success("Gota archivada.");
    },
    onError: () => toast.error("No se pudo archivar."),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => api.reorderDropTypes(ids),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dropTypes.findIndex((d) => d.id === active.id);
    const newIndex = dropTypes.findIndex((d) => d.id === over.id);
    const reordered = arrayMove(dropTypes, oldIndex, newIndex);
    qc.setQueryData(["drop-types"], reordered);
    reorderMutation.mutate(reordered.map((d) => d.id));
  };

  return (
    <div className="space-y-6">
      {state.status !== "idle" && <StatusBanner state={state} />}
      <section className="space-y-3">
        <p className="section-label">Nueva gota</p>
        <input
          className="min-h-12 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
          placeholder="Nombre de la gota (ej. Systane Ultra)"
          value={dropName}
          onChange={(e) => setDropName(e.target.value)}
        />
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Intervalo</p>
          <IntervalPills selected={intervalHours} onChange={setIntervalHours} />
        </div>
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Ciclo (opcional)</p>
          <DateRangePicker
            from={startDate || null}
            to={endDate || null}
            onChange={(f, t) => { setStartDate(f ?? ""); setEndDate(t ?? ""); }}
          />
        </div>
        <Button
          className="w-full"
          disabled={saveMutation.isPending || !dropName.trim()}
          type="button"
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Guardando..." : "Guardar tipo de gota"}
        </Button>
      </section>

      <section className="space-y-3">
        <p className="section-label">Gotas guardadas</p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-[var(--radius-md)]" />
            ))}
          </div>
        ) : dropTypes.length === 0 ? (
          <p className="text-[13px] text-[var(--text-faint)]">Todavia no registras gotas frecuentes.</p>
        ) : (
          <>
            {dropTypes.length > 1 && (
              <p className="text-[12px] text-[var(--text-muted)]">
                Mantén presionado el icono para reordenar — la primera aparece primero al registrar.
              </p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={dropTypes.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <ul className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
                  {dropTypes.map((dt) => (
                    <SortableDropType
                      key={dt.id}
                      dt={dt}
                      isOnly={dropTypes.length === 1}
                      confirmingDelete={deletingId === dt.id}
                      onDeleteRequest={() => setDeletingId(dt.id)}
                      onDeleteCancel={() => setDeletingId(null)}
                      onDeleteConfirm={() => deleteDropTypeMutation.mutate(dt.id)}
                      onIntervalChange={(id, hours) => intervalMutation.mutate({ id, hours })}
                      onDateChange={(id, sd, ed) => dateMutation.mutate({ id, sd, ed })}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </>
        )}
      </section>

      <button
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[999px] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-[15px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-el)]"
        onClick={() => {
          navigate("/register");
          setTimeout(() => window.dispatchEvent(new CustomEvent("quickactions:open", { detail: { sheet: "drop" } })), 50);
        }}
      >
        Volver a Registrar
      </button>
    </div>
  );
}

// ─── Medications Panel ────────────────────────────────────────────────────────

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  sort_order: number | null;
  start_date: string | null;
  end_date: string | null;
  phases_json: string | null;
};

function MedPhaseTimeline({ phasesJson }: { phasesJson: string }) {
  let phases: MedicationPhase[] = [];
  try { phases = JSON.parse(phasesJson); } catch { return null; }
  const today = new Date().toISOString().slice(0, 10);
  const currentIdx = phases.findIndex(
    (p) => today >= p.start_date && (p.end_date === null || today <= p.end_date),
  );
  return (
    <div className="flex items-end gap-1 overflow-x-auto pt-1">
      {phases.map((p, i) => {
        const isCurrent = i === currentIdx;
        const isPast = currentIdx > -1 && i < currentIdx;
        return (
          <div key={i} className="flex shrink-0 flex-col items-center gap-0.5">
            <div className={[
              "h-1.5 w-12 rounded-full",
              isCurrent ? "bg-[var(--accent)]" : isPast ? "bg-[var(--text-faint)]" : "bg-[var(--border)]",
            ].join(" ")} />
            <span className={["text-[10px]", isCurrent ? "font-medium text-[var(--accent)]" : "text-[var(--text-faint)]"].join(" ")}>
              {p.dosage}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type MedRowProps = {
  med: Medication;
  isOnly: boolean;
  confirmingDelete: boolean;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
};

function SortableMedRow({
  med,
  isOnly,
  confirmingDelete,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: MedRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: med.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? ("relative" as const) : undefined,
  };
  const detail = [med.dosage, med.frequency].filter(Boolean).join(" · ");
  const endDays = med.end_date ? daysUntilEnd(med.end_date) : null;
  const isPastEnd = endDays !== null && endDays < 0;
  const isUrgentEnd = endDays !== null && !isPastEnd && endDays <= 7;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "border-b border-[var(--border)] px-4 last:border-b-0",
        isDragging
          ? "bg-[var(--surface-el)] opacity-90 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          : "bg-transparent",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {confirmingDelete ? (
        <div className="flex min-h-12 items-center gap-3 py-2">
          <span className="flex-1 text-[13px] text-[var(--text-muted)]">
            ¿Archivar este medicamento? Tu historial de tomas se mantiene intacto.
          </span>
          <button
            type="button"
            onClick={onDeleteConfirm}
            className="min-h-[36px] rounded-[8px] bg-[var(--error)] px-3 text-[12px] font-medium text-white"
          >
            Archivar
          </button>
          <button
            type="button"
            onClick={onDeleteCancel}
            className="min-h-[36px] rounded-[8px] border border-[var(--border)] px-3 text-[12px] font-medium text-[var(--text-muted)]"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex min-h-12 items-start gap-2 py-3">
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <span className="text-[15px] text-[var(--text-primary)] leading-tight">
              {med.name}
              {(isPastEnd || isUrgentEnd) && (
                <span className={[
                  "ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                  isPastEnd ? "bg-[rgba(204,63,48,0.12)] text-[var(--error)]" : "bg-[rgba(234,179,8,0.12)] text-[#ca8a04]",
                ].join(" ")}>
                  {isPastEnd ? "Suspendido" : `Suspender en ${endDays}d`}
                </span>
              )}
            </span>
            {detail ? (
              <span className="mono text-[11px] text-[var(--text-muted)] leading-tight">
                {detail}
              </span>
            ) : null}
            {med.notes ? (
              <span className="text-[12px] text-[var(--text-faint)] leading-tight mt-0.5">
                {med.notes}
              </span>
            ) : null}
            {med.phases_json && <MedPhaseTimeline phasesJson={med.phases_json} />}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onDeleteRequest}
              aria-label={`Archivar ${med.name}`}
              className="flex min-h-12 w-10 items-center justify-center text-[var(--text-faint)] hover:text-[var(--error)] transition-colors"
            >
              <TrashIcon size={16} />
            </button>
            {!isOnly && (
              <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label={`Reordenar ${med.name}`}
                className="flex min-h-12 w-10 cursor-grab items-center justify-center text-[var(--text-faint)] active:cursor-grabbing"
              >
                <DotsSixVerticalIcon size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

type MedFormState = { name: string; dosage: string; frequency: string; notes: string; startDate: string; endDate: string; phasesJson: string };
const EMPTY_MED_FORM: MedFormState = { name: "", dosage: "", frequency: "", notes: "", startDate: "", endDate: "", phasesJson: "" };

function MedicationsPanel() {
  const qc = useQueryClient();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: api.getMedications,
  });

  const [form, setForm] = useState<MedFormState>(EMPTY_MED_FORM);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveMedMutation = useMutation({
    mutationFn: () =>
      api.createMedication({
        name: form.name.trim(),
        dosage: form.dosage.trim() || undefined,
        frequency: form.frequency.trim() || undefined,
        notes: form.notes.trim() || undefined,
        startDate: form.startDate.trim() || null,
        endDate: form.endDate.trim() || null,
        phasesJson: form.phasesJson.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      setSheetOpen(false);
      setForm(EMPTY_MED_FORM);
      toast.success("Medicamento guardado.");
    },
    onError: () => toast.error("No se pudo guardar el medicamento."),
  });

  const deleteMedMutation = useMutation({
    mutationFn: (id: string) => api.deleteMedication(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      setDeletingId(null);
      toast.success("Medicamento archivado.");
    },
    onError: () => toast.error("No se pudo archivar."),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => api.reorderMedications(ids),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = medications.findIndex((m) => m.id === active.id);
    const newIndex = medications.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(medications, oldIndex, newIndex);
    qc.setQueryData(["medications"], reordered);
    reorderMutation.mutate(reordered.map((m) => m.id));
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Pastillas y medicamentos</p>
          <button
            type="button"
            onClick={() => { setForm(EMPTY_MED_FORM); setSheetOpen(true); }}
            aria-label="Agregar medicamento"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-el)] text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
          >
            <PlusIcon size={12} weight="bold" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-[16px]" />
            ))}
          </div>
        ) : medications.length === 0 ? (
          <button
            type="button"
            onClick={() => { setForm(EMPTY_MED_FORM); setSheetOpen(true); }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-[var(--border)] text-[13px] text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <PlusIcon size={14} weight="bold" />
            Agregar primer medicamento
          </button>
        ) : (
          <>
            {medications.length > 1 && (
              <p className="text-[12px] text-[var(--text-muted)]">Mantén presionado para reordenar.</p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={medications.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                <ul className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
                  {medications.map((med) => (
                    <SortableMedRow
                      key={med.id}
                      med={med}
                      isOnly={medications.length === 1}
                      confirmingDelete={deletingId === med.id}
                      onDeleteRequest={() => setDeletingId(med.id)}
                      onDeleteCancel={() => setDeletingId(null)}
                      onDeleteConfirm={() => deleteMedMutation.mutate(med.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      <MobileSheet
        open={sheetOpen}
        title="Nuevo medicamento"
        description="Guarda un medicamento en tu perfil."
        onClose={() => { setSheetOpen(false); setForm(EMPTY_MED_FORM); }}
      >
        <div className="space-y-3">
          <TextInput
            placeholder="Nombre (ej. Ciclosporina 0.1%)"
            value={form.name}
            autoFocus
            rows={1}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextInput
            placeholder="Dosis (ej. 1 gota)"
            value={form.dosage}
            rows={1}
            onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
          />
          <TextInput
            placeholder="Frecuencia (ej. 2 veces al día)"
            value={form.frequency}
            rows={1}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
          />
          <TextInput
            placeholder="Notas (opcional)"
            value={form.notes}
            rows={2}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="space-y-1.5">
            <p className="text-[12px] text-[var(--text-faint)]">Ciclo (opcional)</p>
            <DateRangePicker
              from={form.startDate || null}
              to={form.endDate || null}
              onChange={(f, t) => setForm((fm) => ({ ...fm, startDate: f ?? "", endDate: t ?? "" }))}
            />
          </div>
          <TextInput
            placeholder={`Fases JSON (opcional)\n[{"label":"Fase 1","dosage":"1g","start_date":"2026-05-01","end_date":"2026-06-01"}]`}
            value={form.phasesJson}
            rows={3}
            onChange={(e) => setForm((f) => ({ ...f, phasesJson: e.target.value }))}
          />
          <Button
            className="w-full"
            disabled={saveMedMutation.isPending || !form.name.trim()}
            type="button"
            onClick={() => saveMedMutation.mutate()}
          >
            {saveMedMutation.isPending ? "Guardando..." : "Agregar medicamento"}
          </Button>
        </div>
      </MobileSheet>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TreatmentsPage() {
  const [tab, setTab] = useState<"drops" | "pills">(
    () => new URLSearchParams(window.location.search).get("tab") === "pills" ? "pills" : "drops",
  );

  return (
    <section className="space-y-6">
      <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1" role="tablist" aria-label="Tipo de tratamiento">
        {(["drops", "pills"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className="flex-1 rounded-full py-2.5 text-[14px] font-medium transition-colors"
            style={{
              background: tab === v ? "var(--accent)" : "transparent",
              color: tab === v ? "var(--btn-primary-text)" : "var(--text-muted)",
            }}
          >
            {v === "drops" ? "Gotas" : "Pastillas"}
          </button>
        ))}
      </div>
      {tab === "drops" ? <DropsPanel /> : <MedicationsPanel />}
    </section>
  );
}
