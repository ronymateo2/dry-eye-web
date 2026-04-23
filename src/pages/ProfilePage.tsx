import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/layout/screen-header";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth, useUser } from "@/lib/auth";
import {
  ClockIcon,
  DotsSixVerticalIcon,
  MoonIcon,
  PencilSimpleIcon,
  PlusIcon,
  SunIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useTheme } from "@/lib/theme";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  sort_order: number | null;
};

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
            ¿Eliminar este medicamento?
          </span>
          <button
            type="button"
            onClick={onDeleteConfirm}
            className="min-h-[36px] rounded-[8px] bg-[var(--error)] px-3 text-[12px] font-medium text-white"
          >
            Eliminar
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
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onDeleteRequest}
              aria-label={`Eliminar ${med.name}`}
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

type FormState = { name: string; dosage: string; frequency: string; notes: string };
const EMPTY_FORM: FormState = { name: "", dosage: "", frequency: "", notes: "" };

export default function ProfilePage() {
  const user = useUser();
  const { signOut, refreshUser } = useAuth();
  const qc = useQueryClient();

  const { data: medications = [], isLoading: medsLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: api.getMedications,
  });

  // Medications state
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();
  const [themePending, setThemePending] = useState(false);

  // Timezone state
  const [timezone, setTimezone] = useState(user.timezone ?? "");
  const [tzSheetOpen, setTzSheetOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const [tzPending, setTzPending] = useState(false);

  const allTimezones = useMemo<string[]>(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!tzSearch.trim()) return allTimezones;
    const q = tzSearch.toLowerCase();
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
  }, [allTimezones, tzSearch]);

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
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      setSheetOpen(false);
      setForm(EMPTY_FORM);
      toast.success("Medicamento guardado.");
    },
    onError: () => toast.error("No se pudo guardar el medicamento."),
  });

  const deleteMedMutation = useMutation({
    mutationFn: (id: string) => api.deleteMedication(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      setDeletingId(null);
      toast.success("Medicamento eliminado.");
    },
    onError: () => toast.error("No se pudo eliminar."),
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

  const handleTimezoneSelect = async (tz: string) => {
    setTzPending(true);
    try {
      await api.updateMe({ timezone: tz });
      await refreshUser();
      setTimezone(tz);
      setTzSheetOpen(false);
      setTzSearch("");
      toast.success("Timezone actualizado.");
    } catch {
      toast.error("No se pudo actualizar el timezone.");
    } finally {
      setTzPending(false);
    }
  };

  const handleThemeToggle = async () => {
    setThemePending(true);
    try {
      await setTheme(theme === "dark" ? "light" : "dark");
    } catch {
      toast.error("No se pudo cambiar el tema.");
    } finally {
      setThemePending(false);
    }
  };

  const openSheet = () => {
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  return (
    <>
      <section className="space-y-8">
        <ScreenHeader
          title="Perfil"
          description="Configuración de tu cuenta."
          user={user}
          action={<Button className="px-4 text-[13px]" onClick={signOut} type="button" variant="ghost">Cerrar sesion</Button>}
        />

        {/* Información */}
        <div className="space-y-3">
          <p className="section-label">Información</p>
          <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            {user.name ? (
              <div className="flex min-h-12 items-center border-b border-[var(--border)] px-4">
                <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Nombre
                </span>
                <span className="text-[15px] text-[var(--text-primary)]">{user.name}</span>
              </div>
            ) : null}
            {user.email ? (
              <div className="flex min-h-12 items-center px-4">
                <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Email
                </span>
                <span className="mono truncate text-[13px] text-[var(--text-muted)]">{user.email}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Configuración */}
        <div className="space-y-3">
          <p className="section-label">Configuración</p>
          <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            <div className="flex min-h-[72px] items-center gap-3 px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                <ClockIcon size={16} color="var(--accent)" weight="fill" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Zona Horaria
                </span>
                <span className="mono truncate text-[14px] text-[var(--text-primary)]">{timezone}</span>
              </div>
              <button
                type="button"
                onClick={() => { setTzSearch(""); setTzSheetOpen(true); }}
                aria-label="Cambiar zona horaria"
                disabled={tzPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
              >
                <PencilSimpleIcon size={15} />
              </button>
            </div>
            <div className="flex min-h-[72px] items-center gap-3 border-t border-[var(--border)] px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
                {theme === "light"
                  ? <SunIcon size={16} color="var(--accent)" weight="fill" />
                  : <MoonIcon size={16} color="var(--accent)" weight="fill" />}
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  Tema
                </span>
                <span className="mono truncate text-[14px] text-[var(--text-primary)]">
                  {theme === "light" ? "Claro" : "Oscuro"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleThemeToggle}
                aria-label="Cambiar tema"
                disabled={themePending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-el)] text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
              >
                {theme === "light" ? <MoonIcon size={15} /> : <SunIcon size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Medicamentos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-label mb-0">Medicamentos</p>
            <button
              type="button"
              onClick={openSheet}
              aria-label="Agregar medicamento"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-el)] text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
            >
              <PlusIcon size={12} weight="bold" />
            </button>
          </div>

          {medsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-[16px]" />
              ))}
            </div>
          ) : medications.length === 0 ? (
            <button
              type="button"
              onClick={openSheet}
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
      </section>

      {/* Add medication sheet */}
      <MobileSheet
        open={sheetOpen}
        title="Nuevo medicamento"
        description="Guarda un medicamento en tu perfil."
        onClose={() => { setSheetOpen(false); setForm(EMPTY_FORM); }}
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

      {/* Timezone picker sheet */}
      <MobileSheet
        open={tzSheetOpen}
        title="Zona horaria"
        description="Selecciona tu zona horaria local."
        onClose={() => { setTzSheetOpen(false); setTzSearch(""); }}
      >
        <div className="flex flex-col gap-3">
          <TextInput
            placeholder="Buscar (ej. Bogota, Mexico_City…)"
            value={tzSearch}
            autoFocus
            rows={1}
            onChange={(e) => setTzSearch(e.target.value)}
          />
          <ul className="max-h-[45vh] overflow-y-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
            {filteredTimezones.length === 0 ? (
              <li className="flex min-h-12 items-center px-4 text-[13px] text-[var(--text-faint)]">
                Sin resultados
              </li>
            ) : (
              filteredTimezones.map((tz) => {
                const isActive = tz === timezone;
                return (
                  <li key={tz} className="border-b border-[var(--border)] last:border-b-0">
                    <button
                      type="button"
                      disabled={tzPending}
                      onClick={() => handleTimezoneSelect(tz)}
                      className="flex min-h-12 w-full items-center px-4 text-left transition-colors disabled:opacity-40"
                      style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      <span className={`mono text-[13px] ${isActive ? "font-medium" : ""}`}>{tz}</span>
                      {isActive && (
                        <span className="ml-auto text-[11px] font-medium text-[var(--accent)]">✓</span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </MobileSheet>
    </>
  );
}
