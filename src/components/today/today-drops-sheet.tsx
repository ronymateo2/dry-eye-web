import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PencilSimpleIcon, TrashIcon, PlusIcon, EyedropperIcon } from "@phosphor-icons/react";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DropEye } from "@/types/domain";
import { dispatchQuickAction } from "./helpers";

type RecentDrop = { id: string; logged_at: string; quantity: number; eye: string };

const EYE_OPTIONS = [
  { label: "Izq", value: "left" as DropEye },
  { label: "Der", value: "right" as DropEye },
  { label: "Ambos", value: "both" as DropEye },
];

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function eyeLabel(eye: string): string {
  return eye === "left" ? "Izq" : eye === "right" ? "Der" : "Ambos";
}

type EditState = {
  dropTypeId: string;
  eye: DropEye;
  quantity: number;
  time: string;
};

export function TodayDropsSheet({
  open,
  onClose,
  initialDropTypeId,
}: {
  open: boolean;
  onClose: () => void;
  initialDropTypeId: string;
}) {
  const queryClient = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState(initialDropTypeId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const { data: dropTypes = [] } = useQuery({
    queryKey: ["drop-types"],
    queryFn: api.getDropTypes,
    staleTime: 120_000,
  });

  const { data: drops = [], isFetching } = useQuery({
    queryKey: ["drops/recent", selectedTypeId],
    queryFn: () => api.getRecentDrops(selectedTypeId, 24),
    staleTime: 30_000,
    enabled: !!selectedTypeId,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteDrop,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["drops/recent", selectedTypeId] });
      const prev = queryClient.getQueryData<RecentDrop[]>(["drops/recent", selectedTypeId]);
      queryClient.setQueryData<RecentDrop[]>(
        ["drops/recent", selectedTypeId],
        (old) => old?.filter((d) => d.id !== id) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["drops/recent", selectedTypeId], ctx.prev);
      toast.error("No se pudo eliminar. Intenta de nuevo.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["drops/recent", selectedTypeId] });
      queryClient.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      queryClient.invalidateQueries({ queryKey: ["drops/last"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: EditState }) => {
      const [hh, mm] = state.time.split(":").map(Number);
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      return api.saveDrop({
        id,
        dropTypeId: state.dropTypeId,
        loggedAt: d.toISOString(),
        quantity: state.quantity,
        eye: state.eye,
      });
    },
    onSuccess: (_data, { state }) => {
      setEditingId(null);
      setEditState(null);
      queryClient.invalidateQueries({ queryKey: ["drops/recent", selectedTypeId] });
      if (state.dropTypeId !== selectedTypeId) {
        queryClient.invalidateQueries({ queryKey: ["drops/recent", state.dropTypeId] });
      }
      queryClient.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      queryClient.invalidateQueries({ queryKey: ["drops/last"] });
    },
    onError: () => toast.error("No se pudo guardar. Intenta de nuevo."),
  });

  function startEdit(drop: RecentDrop) {
    setEditingId(drop.id);
    setEditState({
      dropTypeId: selectedTypeId,
      eye: ["left", "right", "both"].includes(drop.eye) ? (drop.eye as DropEye) : "both",
      quantity: drop.quantity,
      time: formatTime(drop.logged_at),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  const sorted = [...drops].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
  );

  const selectedTypeName = dropTypes.find((t) => t.id === selectedTypeId)?.name ?? "";
  const countLabel = drops.length === 1 ? "1 dosis hoy" : `${drops.length} dosis hoy`;

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Dosis de hoy"
      description={selectedTypeName ? `${selectedTypeName} · ${countLabel}` : countLabel}
    >
      <div className="space-y-4">
        {/* Type selector */}
        {dropTypes.length > 1 && (
          <div className="space-y-1.5">
            <p className="section-label">Tipo de gota</p>
            <select
              value={selectedTypeId}
              onChange={(e) => {
                setSelectedTypeId(e.target.value);
                setEditingId(null);
                setEditState(null);
              }}
              className={cn(
                "w-full rounded-[var(--radius-md)] border border-[var(--border)]",
                "bg-[var(--surface)] px-3 py-2.5 text-[15px] font-medium text-[var(--text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40",
              )}
            >
              {dropTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Drop list */}
        <div className="space-y-1">
          {isFetching && drops.length === 0 && (
            <p className="py-6 text-center text-[14px] text-[var(--text-faint)]">Cargando…</p>
          )}
          {!isFetching && drops.length === 0 && (
            <p className="py-6 text-center text-[14px] text-[var(--text-faint)]">
              Sin dosis en las últimas 24h
            </p>
          )}

          {sorted.map((drop) => {
            const isEditing = editingId === drop.id;
            return (
              <div
                key={drop.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
              >
                {/* Row */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatTime(drop.logged_at)}
                  </span>
                  <span className="flex-1 text-[13px] text-[var(--text-muted)]">
                    {eyeLabel(drop.eye)} · ×{drop.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Editar dosis"
                    onClick={() => (isEditing ? cancelEdit() : startEdit(drop))}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                      isEditing
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "text-[var(--text-faint)] hover:bg-[var(--surface-el)] hover:text-[var(--text-muted)]",
                    )}
                  >
                    <PencilSimpleIcon size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar dosis"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(drop.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-faint)] transition-colors hover:bg-[var(--error)]/10 hover:text-[var(--error)] disabled:opacity-40"
                  >
                    <TrashIcon size={14} weight="bold" />
                  </button>
                </div>

                {/* Inline edit form */}
                {isEditing && editState && (
                  <div className="border-t border-[var(--border)] px-3 pb-3 pt-3 space-y-3">
                    {/* Drop type */}
                    {dropTypes.length > 1 && (
                      <div className="space-y-1.5">
                        <p className="section-label">Gota</p>
                        <select
                          value={editState.dropTypeId}
                          onChange={(e) => setEditState({ ...editState, dropTypeId: e.target.value })}
                          className={cn(
                            "w-full rounded-[var(--radius-md)] border border-[var(--border)]",
                            "bg-[var(--surface-el)] px-3 py-2 text-[14px] font-medium text-[var(--text-primary)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40",
                          )}
                        >
                          {dropTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Eye */}
                    <div className="space-y-1.5">
                      <p className="section-label">Ojo</p>
                      <SegmentedControl
                        options={EYE_OPTIONS}
                        value={editState.eye}
                        onChange={(v) => setEditState({ ...editState, eye: v })}
                        tone="quiet"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <p className="section-label">Cantidad</p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label="Reducir cantidad"
                          onClick={() => setEditState({ ...editState, quantity: Math.max(1, editState.quantity - 1) })}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-el)] text-[var(--text-muted)] hover:bg-[var(--border)] active:opacity-70"
                        >
                          −
                        </button>
                        <span className="min-w-[2ch] text-center font-mono text-[18px] font-semibold text-[var(--text-primary)]">
                          {editState.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Aumentar cantidad"
                          onClick={() => setEditState({ ...editState, quantity: editState.quantity + 1 })}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-el)] text-[var(--text-muted)] hover:bg-[var(--border)] active:opacity-70"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="space-y-1.5">
                      <p className="section-label">Hora</p>
                      <input
                        type="time"
                        value={editState.time}
                        onChange={(e) => setEditState({ ...editState, time: e.target.value })}
                        className={cn(
                          "rounded-[var(--radius-md)] border border-[var(--border)]",
                          "bg-[var(--surface-el)] px-3 py-2 font-mono text-[14px] text-[var(--text-primary)]",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40",
                        )}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="plain-muted"
                        size="sm"
                        onClick={cancelEdit}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="tinted"
                        size="sm"
                        disabled={editMutation.isPending}
                        onClick={() => editMutation.mutate({ id: drop.id, state: editState })}
                        className="flex-1"
                      >
                        {editMutation.isPending ? "…" : "Guardar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-1">
          <Button
            variant="gray"
            size="lg"
            className="w-full"
            onClick={() => {
              onClose();
              setTimeout(() => dispatchQuickAction("drop", { dropTypeId: selectedTypeId }), 300);
            }}
          >
            <EyedropperIcon size={16} weight="bold" className="mr-1.5" />
            <PlusIcon size={14} weight="bold" className="mr-1" />
            Nueva dosis
          </Button>
        </div>
      </div>
    </MobileSheet>
  );
}
