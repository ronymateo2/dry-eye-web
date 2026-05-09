import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EyedropperSampleIcon, PlusIcon, TrashIcon, PencilIcon, CheckCircleIcon, XCircleIcon, TimerIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { VialRecord } from "@/types/domain";
import { Skeleton } from "@/components/ui/skeleton";

function formatCountdown(targetIso: string): string {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "Vencido";
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  const secs = Math.floor((diffMs % 60_000) / 1_000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

function VialCountdown({ startedAt, durationHours }: { startedAt: string; durationHours: number }) {
  const endTime = new Date(new Date(startedAt).getTime() + durationHours * 3_600_000).toISOString();
  const [text, setText] = useState(() => formatCountdown(endTime));

  useEffect(() => {
    const id = setInterval(() => setText(formatCountdown(endTime)), 1_000);
    return () => clearInterval(id);
  }, [endTime]);

  const isExpired = text === "Vencido";

  return (
    <div className={cn("flex items-center gap-2 text-[13px] font-[family-name:var(--font-mono)]", isExpired ? "text-[var(--pain-high)]" : "text-[var(--accent)]")}>
      <TimerIcon size={14} />
      {text}
    </div>
  );
}

function VialForm({
  editing,
  dropTypes,
  onSave,
  onCancel,
}: {
  editing: VialRecord | null;
  dropTypes: { id: string; name: string }[];
  onSave: (input: { id: string; drop_type_id: string; duration_hours: number; name: string | null }) => void;
  onCancel: () => void;
}) {
  const [dropTypeId, setDropTypeId] = useState(editing?.drop_type_id ?? (dropTypes[0]?.id || ""));
  const [duration, setDuration] = useState(editing?.duration_hours ?? 24);
  const [name, setName] = useState(editing?.name ?? "");

  const handleSubmit = () => {
    if (!dropTypeId) return;
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      drop_type_id: dropTypeId,
      duration_hours: duration,
      name: name.trim() || null,
    });
  };

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[var(--text-faint)]">Tipo de gota</label>
        <select
          value={dropTypeId}
          onChange={(e) => setDropTypeId(e.target.value)}
          className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        >
          {dropTypes.map((dt) => (
            <option key={dt.id} value={dt.id}>{dt.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[var(--text-faint)]">Nombre del vial (opcional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Restasis mañana"
          className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[var(--text-faint)]">Duración (horas)</label>
        <input
          type="number"
          min={1}
          max={72}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSubmit} className="btn-primary flex-1">Guardar</button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-full border border-[var(--border)] bg-transparent py-3 text-[14px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-el)]">Cancelar</button>
      </div>
    </div>
  );
}

export default function VialsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<VialRecord | null | "new">(null);

  const { data: vials = [], isLoading } = useQuery({
    queryKey: ["vials"],
    queryFn: api.getVials,
  });

  const { data: dropTypes = [] } = useQuery({
    queryKey: ["drop-types"],
    queryFn: api.getDropTypes,
  });

  const { data: activeInstances = [] } = useQuery({
    queryKey: ["vial-instances/active"],
    queryFn: api.getActiveVialInstances,
  });

  const createMutation = useMutation({
    mutationFn: api.createVial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vials"] });
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { duration_hours?: number; name?: string | null } }) => api.updateVial(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vials"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteVial,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vials"] }),
  });

  const openMutation = useMutation({
    mutationFn: api.openVialInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vial-instances/active"] });
      queryClient.invalidateQueries({ queryKey: ["vial-instances/history"] });
    },
  });

  const discardMutation = useMutation({
    mutationFn: ({ id, endedAt }: { id: string; endedAt: string }) => api.discardVialInstance(id, endedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vial-instances/active"] });
      queryClient.invalidateQueries({ queryKey: ["vial-instances/history"] });
    },
  });

  const handleSave = useCallback((input: { id: string; drop_type_id: string; duration_hours: number; name: string | null }) => {
    if (editing && editing !== "new") {
      updateMutation.mutate({
        id: input.id,
        body: { duration_hours: input.duration_hours, name: input.name },
      });
    } else {
      createMutation.mutate(input);
    }
  }, [editing, updateMutation, createMutation]);

  const handleOpen = useCallback((vialId: string) => {
    openMutation.mutate({
      id: crypto.randomUUID(),
      vial_id: vialId,
      started_at: new Date().toISOString(),
    });
  }, [openMutation]);

  const handleDiscard = useCallback((id: string) => {
    discardMutation.mutate({
      id,
      endedAt: new Date().toISOString(),
    });
  }, [discardMutation]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="screen-title text-[17px]">Viales</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="btn-primary flex h-12 items-center gap-1.5 px-4 text-[15px]"
        >
          <PlusIcon size={16} weight="bold" />
          Nuevo
        </button>
      </div>

      {activeInstances.length > 0 && (
        <div className="space-y-2">
          {activeInstances.map((inst) => (
            <div key={inst.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyedropperSampleIcon size={18} className="text-[var(--accent)]" />
                  <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {inst.vial_name ?? inst.drop_type_name}
                  </span>
                </div>
                <span className="rounded-full bg-[var(--accent-dim)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.10em] text-[var(--accent)]">Activo</span>
              </div>
              <div className="flex items-center justify-between">
                <VialCountdown startedAt={inst.started_at} durationHours={inst.duration_hours} />
                <button
                  type="button"
                  onClick={() => handleDiscard(inst.id)}
                  disabled={discardMutation.isPending}
                  className="flex min-h-[48px] items-center gap-1.5 rounded-full bg-[var(--pain-high)]/10 px-4 py-2 text-[13px] font-medium text-[var(--pain-high)] transition-colors active:bg-[var(--pain-high)]/20 disabled:opacity-50"
                >
                  <XCircleIcon size={14} />
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <VialForm
          editing={editing === "new" ? null : editing}
          dropTypes={dropTypes}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-[16px]" />
          ))}
        </div>
      ) : vials.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <EyedropperSampleIcon size={32} className="mx-auto mb-3 text-[var(--text-faint)]" />
          <p className="text-[14px] text-[var(--text-muted)]">No tienes viales configurados.</p>
          <p className="text-[12px] text-[var(--text-faint)] mt-1">Crea uno para empezar a optimizar el uso de tus gotas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vials.map((vial) => (
            <div
              key={vial.id}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent-dim)]">
                <EyedropperSampleIcon size={18} className="text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[var(--text-primary)] truncate">{vial.name ?? vial.drop_type_name}</p>
                <p className="text-[12px] text-[var(--text-faint)]">{vial.duration_hours}h · {vial.drop_type_name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpen(vial.id)}
                  disabled={openMutation.isPending}
                  className="flex h-12 w-12 items-center justify-center rounded-full text-[var(--accent)] transition-colors hover:bg-[var(--accent-dim)] disabled:opacity-50"
                  aria-label="Abrir vial"
                >
                  <CheckCircleIcon size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(vial)}
                  className="flex h-12 w-12 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-el)]"
                  aria-label="Editar vial"
                >
                  <PencilIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(vial.id)}
                  disabled={deleteMutation.isPending}
                  className="flex h-12 w-12 items-center justify-center rounded-full text-[var(--pain-high)] transition-colors hover:bg-[var(--pain-high)]/10 disabled:opacity-50"
                  aria-label="Eliminar vial"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
