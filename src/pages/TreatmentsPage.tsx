import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { TextInput } from "@/components/ui/text-input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { api } from "@/lib/api";
import {
  DotsSixVerticalIcon,
  PlusIcon,
  TrashIcon,
  ArchiveIcon,
  ArrowUUpLeftIcon,
  EyeIcon,
  PillIcon,
  NotePencilIcon,
  CaretRightIcon,
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
import type { DropTypeRecord, MedicationRecord, MedicationPhase } from "@/types/domain";
import { daysUntilEnd, cn } from "@/lib/utils";

// ─── Interval Pills ───────────────────────────────────────────────────────────

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

// ─── Times Picker ─────────────────────────────────────────────────────────────

function sortTimes(arr: string[]): string[] {
  return [...arr].sort();
}

function TimesPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const sorted = sortTimes(value);

  const handleAddSlot = () => onChange(sortTimes([...sorted, "08:00"]));

  const handleUpdateSlot = (i: number, next: string) => {
    const arr = [...sorted];
    arr[i] = next;
    onChange(sortTimes(arr));
  };

  const handleRemoveSlot = (i: number) => {
    onChange(sorted.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-1.5">
      {sorted.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="time"
            value={t}
            onChange={(e) => handleUpdateSlot(i, e.target.value)}
            className="flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            aria-label="Eliminar hora"
            onClick={() => handleRemoveSlot(i)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--error)] opacity-60 hover:opacity-100 transition-opacity"
          >
            <TrashIcon size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddSlot}
        className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[var(--border)] py-2 text-[13px] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
      >
        <PlusIcon size={12} weight="bold" />
        Agregar hora
      </button>
    </div>
  );
}

function parseTimesJson(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && /^\d{2}:\d{2}$/.test(t));
  } catch {
    return [];
  }
}

// ─── Med Phase Timeline ───────────────────────────────────────────────────────

function MedPhaseTimeline({ phasesJson }: { phasesJson: string }) {
  let phases: MedicationPhase[] = [];
  try {
    const parsed = JSON.parse(phasesJson);
    if (!Array.isArray(parsed)) return null;
    phases = parsed;
  } catch { return null; }
  const today = new Date().toISOString().slice(0, 10);
  const currentIdx = phases.findIndex(
    (p) => today >= p.start_date && (p.end_date === null || today <= p.end_date),
  );
  return (
    <div className="flex items-stretch gap-1 pt-1">
      {phases.map((p, i) => {
        const isCurrent = i === currentIdx;
        const isPast = currentIdx > -1 && i < currentIdx;
        return (
          <div key={i} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "h-2 w-full rounded-full",
                isCurrent && "bg-[var(--accent)]",
                isPast && "bg-[var(--text-faint)] opacity-40",
                !isCurrent && !isPast && "border border-[var(--border)] bg-transparent",
              )}
            />
            <span
              className={cn(
                "mono text-[10px] leading-none",
                isCurrent ? "font-medium text-[var(--accent)]" : "text-[var(--text-faint)]",
              )}
            >
              {p.dosage}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared Sortable Row ──────────────────────────────────────────────────────

type RowBase = { id: string; end_date?: string | null };

function SortableRow({
  item,
  name,
  detail,
  isOnly,
  onClick,
  children,
  icon,
}: {
  item: RowBase;
  name: string;
  detail?: string;
  isOnly: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const endDays = item.end_date ? daysUntilEnd(item.end_date) : null;
  const isPastEnd = endDays !== null && endDays < 0;
  const isUrgentEnd = endDays !== null && !isPastEnd && endDays <= 7;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        "border-b border-[var(--border)] last:border-b-0",
        isDragging && "bg-[var(--surface-el)] opacity-90 shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
      )}
    >
      <div className="flex min-h-[56px] items-stretch">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "flex flex-1 flex-col justify-center gap-0.5 px-4 py-3 text-left min-w-0",
            "active:bg-[var(--surface-el)] transition-colors",
            isPastEnd && "opacity-50",
          )}
        >
          <div className="flex items-center gap-2.5">
            {icon}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={cn(
                  "text-[15px] font-medium text-[var(--text-primary)] leading-snug",
                  isPastEnd && "line-through",
                )}>
                  {name}
                </span>
                {(isPastEnd || isUrgentEnd) && (
                  <span className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                    isPastEnd
                      ? "bg-[rgba(204,63,48,0.12)] text-[var(--error)]"
                      : "bg-[rgba(234,179,8,0.12)] text-[#ca8a04]",
                  )}>
                    {isPastEnd ? "Suspendido" : `Suspender en ${endDays}d`}
                  </span>
                )}
              </div>
              {detail && (
                <span className="mono text-[11px] text-[var(--text-muted)] leading-tight">
                  {detail}
                </span>
              )}
            </div>
          </div>
          {children}
        </button>

        {!isOnly && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reordenar ${name}`}
            className="flex w-10 shrink-0 cursor-grab items-center justify-center text-[var(--text-faint)] active:cursor-grabbing"
          >
            <DotsSixVerticalIcon size={16} />
          </button>
        )}
      </div>
    </li>
  );
}

// ─── Shared Archive Confirm ───────────────────────────────────────────────────

function ArchiveConfirm({
  label,
  isPending,
  onConfirm,
  onCancel,
}: {
  label: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-[12px] border border-[rgba(204,63,48,0.25)] bg-[rgba(204,63,48,0.07)] p-4 space-y-3">
      <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 min-h-[40px] rounded-[8px] bg-[var(--error)] text-[13px] font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Archivando..." : "Archivar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[40px] rounded-[8px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-muted)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyAdd({
  label,
  description,
  icon,
  onClick,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-center gap-3 rounded-[16px] border border-dashed border-[var(--border)] py-8 px-4 text-center transition-colors hover:border-[var(--accent)] active:bg-[var(--surface-el)]"
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-dim)]">
          {icon}
        </div>
      )}
      <div>
        <p className="text-[15px] font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">{description}</p>
        )}
      </div>
    </button>
  );
}

// ─── Archived Items Section ──────────────────────────────────────────────────

function ArchivedItems({
  label,
  queryKey,
  archivedQueryKey,
  fetchArchived,
  unarchive,
  renderItem,
}: {
  label: string;
  queryKey: string[];
  archivedQueryKey: string[];
  fetchArchived: () => Promise<{ id: string; name: string; archived_at: string }[]>;
  unarchive: (id: string) => Promise<{ ok: boolean }>;
  renderItem: (item: { id: string; name: string; archived_at: string }) => React.ReactNode;
}) {
  const qc = useQueryClient();
  const { data: archived = [], isLoading } = useQuery({
    queryKey: archivedQueryKey,
    queryFn: fetchArchived,
  });
  const [expanded, setExpanded] = useState(false);

  const unarchiveMutation = useMutation({
    mutationFn: unarchive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: archivedQueryKey });
      toast.success(`${label} desarchivad${label === "Gota" ? "a" : "o"}.`);
    },
    onError: () => toast.error("No se pudo desarchivar."),
  });

  if (archived.length === 0 && !isLoading) return null;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 py-2 text-[13px] font-medium text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
      >
        <ArchiveIcon size={14} />
        <span>{label === "Gota" ? "Gotas" : "Medicamentos"} archivados ({archived.length})</span>
        <span
          className="ml-auto transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ↓
        </span>
      </button>
      {expanded && (
        isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-[12px]" />)}
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[12px] border border-dashed border-[var(--border)] mt-1">
            {archived.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 border-b border-[var(--border)] last:border-b-0 px-4 py-3 opacity-70"
              >
                <div className="flex-1 min-w-0">
                  {renderItem(item)}
                </div>
                <button
                  type="button"
                  onClick={() => unarchiveMutation.mutate(item.id)}
                  disabled={unarchiveMutation.isPending}
                  aria-label={`Desarchivar ${item.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--accent)] opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
                >
                  <ArrowUUpLeftIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

// ─── Drop Sheet ───────────────────────────────────────────────────────────────

type DropForm = { name: string; intervalHours: number | null; startDate: string; endDate: string };

function DropSheet({
  item,
  open,
  onClose,
}: {
  item: DropTypeRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = item !== null;

  const [form, setForm] = useState<DropForm>({
    name: "",
    intervalHours: null,
    startDate: "",
    endDate: "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              name: item.name,
              intervalHours: item.interval_hours ?? null,
              startDate: item.start_date ?? "",
              endDate: item.end_date ?? "",
            }
          : { name: "", intervalHours: null, startDate: "", endDate: "" },
      );
      setConfirmDelete(false);
    }
  }, [open, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? api.updateDropType(item!.id, {
            intervalHours: form.intervalHours,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
          })
        : api.createDropType(form.name.trim(), form.intervalHours, form.startDate || null, form.endDate || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      qc.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      toast.success(isEdit ? "Gota actualizada." : "Gota guardada.");
      onClose();
    },
    onError: () => toast.error("No se pudo guardar."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteDropType(item!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drop-types"] });
      qc.invalidateQueries({ queryKey: ["drop-types/archived"] });
      qc.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      toast.success("Gota archivada.");
      onClose();
    },
    onError: () => toast.error("No se pudo archivar."),
  });

  return (
    <MobileSheet
      open={open}
      title={isEdit ? "Editar gota" : "Nueva gota"}
      description={isEdit ? `Editando ${item?.name ?? ""}` : "Agrega un tipo de gota a tu perfil."}
      onClose={onClose}
    >
      <div className="space-y-4">
        {isEdit ? (
          <p className="text-[17px] font-semibold text-[var(--text-primary)]">{item?.name}</p>
        ) : (
          <TextInput
            placeholder="Nombre (ej. Systane Ultra)"
            value={form.name}
            autoFocus
            rows={1}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        )}

        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Intervalo</p>
          <IntervalPills
            selected={form.intervalHours}
            onChange={(v) => setForm((f) => ({ ...f, intervalHours: v }))}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Ciclo (opcional)</p>
          <DateRangePicker
            from={form.startDate || null}
            to={form.endDate || null}
            onChange={(f, t) => setForm((fm) => ({ ...fm, startDate: f ?? "", endDate: t ?? "" }))}
          />
        </div>

        <Button
          className="w-full"
          disabled={saveMutation.isPending || (!isEdit && !form.name.trim())}
          type="button"
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar gota"}
        </Button>

        {isEdit && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full py-2 text-[13px] text-[var(--error)] opacity-60 hover:opacity-100 transition-opacity"
          >
            Archivar gota
          </button>
        )}

        {isEdit && confirmDelete && (
          <ArchiveConfirm
            label="¿Archivar esta gota? Tu historial se mantiene intacto."
            isPending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </div>
    </MobileSheet>
  );
}

// ─── Drops Panel ─────────────────────────────────────────────────────────────

function DropsPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: dropTypes = [], isLoading } = useQuery({
    queryKey: ["drop-types"],
    queryFn: api.getDropTypes,
  });

  const [editingItem, setEditingItem] = useState<DropTypeRecord | null | "new">(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="section-label mb-0">
          Gotas guardadas
          {dropTypes.length > 0 && (
            <span className="ml-1.5 mono text-[11px] font-normal text-[var(--text-faint)]">({dropTypes.length})</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setEditingItem("new")}
          aria-label="Agregar gota"
          className="flex h-7 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-el)] px-2.5 text-[12px] font-medium text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] active:scale-[0.96]"
          style={{ transition: "background-color 150ms ease-out, border-color 150ms ease-out, transform 120ms ease-out" }}
        >
          <PlusIcon size={10} weight="bold" />
          Agregar
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-[16px]" />
          ))}
        </div>
      ) : dropTypes.length === 0 ? (
        <EmptyAdd
          label="Agregar primera gota"
          description="Registra los tipos de gota que usas"
          icon={<EyeIcon size={20} color="var(--accent)" weight="fill" />}
          onClick={() => setEditingItem("new")}
        />
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
                {dropTypes.map((dt) => {
                  const detail = [
                    intervalLabel(dt.interval_hours),
                    dt.start_date || dt.end_date
                      ? `${dt.start_date ?? "—"} → ${dt.end_date ?? "∞"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ");
                  return (
                    <SortableRow
                      key={dt.id}
                      item={dt}
                      name={dt.name}
                      detail={detail}
                      isOnly={dropTypes.length === 1}
                      onClick={() => setEditingItem(dt)}
                      icon={
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                          <EyeIcon size={16} color="var(--accent)" weight="fill" />
                        </div>
                      }
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}

      <ArchivedItems
        label="Gota"
        queryKey={["drop-types"]}
        archivedQueryKey={["drop-types/archived"]}
        fetchArchived={api.getArchivedDropTypes}
        unarchive={api.unarchiveDropType}
        renderItem={(item) => (
          <span className="text-[14px] text-[var(--text-muted)]">{item.name}</span>
        )}
      />

      <button
        type="button"
        onClick={() => {
          navigate("/register");
          setTimeout(
            () => window.dispatchEvent(new CustomEvent("quickactions:open", { detail: { sheet: "drop" } })),
            50,
          );
        }}
        className="flex min-h-[56px] w-full items-center gap-3 overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] px-4 transition-colors hover:border-[var(--accent)]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
          <NotePencilIcon size={16} color="var(--accent)" weight="fill" />
        </div>
        <span className="flex-1 text-left text-[15px] text-[var(--text-primary)]">Volver a Registrar</span>
        <CaretRightIcon size={14} color="var(--text-faint)" />
      </button>

      <DropSheet
        item={editingItem === "new" ? null : editingItem}
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
      />
    </div>
  );
}

// ─── Med Sheet ────────────────────────────────────────────────────────────────

type MedForm = {
  name: string;
  dosage: string;
  frequency: string;
  notes: string;
  startDate: string;
  endDate: string;
  phases: MedicationPhase[];
  times: string[];
};

const EMPTY_MED_FORM: MedForm = {
  name: "",
  dosage: "",
  frequency: "",
  notes: "",
  startDate: "",
  endDate: "",
  phases: [],
  times: [],
};

function parsePhasesJson(json: string | null | undefined): MedicationPhase[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function MedSheet({
  item,
  open,
  onClose,
}: {
  item: MedicationRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = item !== null;

  const [form, setForm] = useState<MedForm>(EMPTY_MED_FORM);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              name: item.name,
              dosage: item.dosage ?? "",
              frequency: item.frequency ?? "",
              notes: item.notes ?? "",
              startDate: item.start_date ?? "",
              endDate: item.end_date ?? "",
              phases: parsePhasesJson(item.phases_json),
              times: parseTimesJson(item.times_json),
            }
          : EMPTY_MED_FORM,
      );
      setConfirmDelete(false);
    }
  }, [open, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        dosage: form.dosage.trim() || undefined,
        frequency: form.frequency.trim() || undefined,
        notes: form.notes.trim() || undefined,
        startDate: form.startDate.trim() || null,
        endDate: form.endDate.trim() || null,
        phasesJson: form.phases.length > 0 ? JSON.stringify(form.phases) : null,
        timesJson: form.times.length > 0 ? form.times : null,
      };
      return isEdit ? api.updateMedication(item!.id, body) : api.createMedication(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      toast.success(isEdit ? "Medicamento actualizado." : "Medicamento guardado.");
      onClose();
    },
    onError: () => toast.error("No se pudo guardar el medicamento."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteMedication(item!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["medications/archived"] });
      toast.success("Medicamento archivado.");
      onClose();
    },
    onError: () => toast.error("No se pudo archivar."),
  });

  return (
    <MobileSheet
      open={open}
      title={isEdit ? "Editar medicamento" : "Nuevo medicamento"}
      description={isEdit ? `Editando ${item?.name ?? ""}` : "Agrega un medicamento a tu perfil."}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Nombre</p>
          <TextInput
            placeholder="ej. Ciclosporina 0.1%"
            value={form.name}
            autoFocus={!isEdit}
            rows={1}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Dosis</p>
          <TextInput
            placeholder="ej. 1 gota, 600mg"
            value={form.dosage}
            rows={1}
            onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Frecuencia</p>
          <TextInput
            placeholder="ej. 2 veces al día"
            value={form.frequency}
            rows={1}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Horarios (Google Calendar)</p>
          <TimesPicker
            value={form.times}
            onChange={(times) => setForm((f) => ({ ...f, times }))}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Notas</p>
          <TextInput
            placeholder="opcional"
            value={form.notes}
            rows={2}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Ciclo (opcional)</p>
          <DateRangePicker
            from={form.startDate || null}
            to={form.endDate || null}
            onChange={(f, t) => setForm((fm) => ({ ...fm, startDate: f ?? "", endDate: t ?? "" }))}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-faint)]">Fases (opcional)</p>
          <div className="space-y-2">
            {form.phases.map((phase, i) => (
              <div key={i} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-el)] p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Etiqueta (ej. Fase 1)"
                    value={phase.label}
                    onChange={(e) => setForm((f) => {
                      const phases = [...f.phases];
                      phases[i] = { ...phases[i], label: e.target.value };
                      return { ...f, phases };
                    })}
                    className="flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-faint)]"
                  />
                  <button
                    type="button"
                    aria-label="Eliminar fase"
                    onClick={() => setForm((f) => ({ ...f, phases: f.phases.filter((_, j) => j !== i) }))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--error)] opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Dosis (ej. 1g)"
                  value={phase.dosage}
                  onChange={(e) => setForm((f) => {
                    const phases = [...f.phases];
                    phases[i] = { ...phases[i], dosage: e.target.value };
                    return { ...f, phases };
                  })}
                  className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-faint)]"
                />
                <DateRangePicker
                  from={phase.start_date || null}
                  to={phase.end_date || null}
                  onChange={(s, e) => setForm((f) => {
                    const phases = [...f.phases];
                    phases[i] = { ...phases[i], start_date: s ?? "", end_date: e ?? null };
                    return { ...f, phases };
                  })}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm((f) => ({
                ...f,
                phases: [...f.phases, { label: "", dosage: "", start_date: "", end_date: null }],
              }))}
              className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[var(--border)] py-2 text-[13px] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              <PlusIcon size={12} weight="bold" />
              Agregar fase
            </button>
          </div>
        </div>
        <Button
          className="w-full"
          disabled={saveMutation.isPending || !form.name.trim()}
          type="button"
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar medicamento"}
        </Button>

        {isEdit && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full py-2 text-[13px] text-[var(--error)] opacity-60 hover:opacity-100 transition-opacity"
          >
            Archivar medicamento
          </button>
        )}

        {isEdit && confirmDelete && (
          <ArchiveConfirm
            label="¿Archivar este medicamento? Tu historial de tomas se mantiene intacto."
            isPending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </div>
    </MobileSheet>
  );
}

// ─── Medications Panel ────────────────────────────────────────────────────────

function MedicationsPanel() {
  const qc = useQueryClient();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: api.getMedications,
  });

  const [editingItem, setEditingItem] = useState<MedicationRecord | null | "new">(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">
            Pastillas y medicamentos
            {medications.length > 0 && (
              <span className="ml-1.5 mono text-[11px] font-normal text-[var(--text-faint)]">({medications.length})</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setEditingItem("new")}
            aria-label="Agregar medicamento"
            className="flex h-7 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-el)] px-2.5 text-[12px] font-medium text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] active:scale-[0.96]"
            style={{ transition: "background-color 150ms ease-out, border-color 150ms ease-out, transform 120ms ease-out" }}
          >
            <PlusIcon size={10} weight="bold" />
            Agregar
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-[16px]" />
            ))}
          </div>
        ) : medications.length === 0 ? (
          <EmptyAdd
            label="Agregar primer medicamento"
            description="Registra tus medicamentos y dosis"
            icon={<PillIcon size={20} color="var(--accent)" weight="fill" />}
            onClick={() => setEditingItem("new")}
          />
        ) : (
          <>
            {medications.length > 1 && (
              <p className="text-[12px] text-[var(--text-muted)]">Mantén presionado para reordenar.</p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={medications.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                <ul className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
                  {medications.map((med) => {
                    const detail = [med.dosage, med.frequency].filter(Boolean).join(" · ");
                    const times = parseTimesJson(med.times_json);
                    return (
                      <SortableRow
                        key={med.id}
                        item={med}
                        name={med.name}
                        detail={detail || undefined}
                        isOnly={medications.length === 1}
                        onClick={() => setEditingItem(med)}
                        icon={
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                            <PillIcon size={16} color="var(--accent)" weight="fill" />
                          </div>
                        }
                      >
                        {times.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {times.map((t) => (
                              <span key={t} className="inline-flex rounded-[6px] bg-[var(--surface-el)] px-1.5 py-0.5 mono text-[11px] text-[var(--accent)] leading-none">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {med.phases_json && <MedPhaseTimeline phasesJson={med.phases_json} />}
                        {med.notes && (
                          <span className="text-[12px] text-[var(--text-faint)] leading-tight pt-0.5">
                            {med.notes}
                          </span>
                        )}
                      </SortableRow>
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </>
        )}

        <ArchivedItems
          label="Medicamento"
          queryKey={["medications"]}
          archivedQueryKey={["medications/archived"]}
          fetchArchived={api.getArchivedMedications}
          unarchive={api.unarchiveMedication}
          renderItem={(item) => (
            <span className="text-[14px] text-[var(--text-muted)]">{item.name}</span>
          )}
        />
      </div>

      <MedSheet
        item={editingItem === "new" ? null : editingItem}
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TreatmentsPage() {
  const [tab, setTab] = useState<"drops" | "pills">(
    () => new URLSearchParams(window.location.search).get("tab") === "pills" ? "pills" : "drops",
  );
  const reducedMotion = useReducedMotion();

  return (
    <section className="space-y-6">
      <SegmentedControl
        label="Tipo de tratamiento"
        options={[
          { label: "Gotas", value: "drops" },
          { label: "Pastillas", value: "pills" },
        ]}
        value={tab}
        onChange={setTab}
        tone="quiet"
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
        >
          {tab === "drops" ? <DropsPanel /> : <MedicationsPanel />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}