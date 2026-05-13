import { useEffect, useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TrashIcon, PencilSimpleIcon, EyedropperIcon, PlusIcon, CaretRightIcon } from "@phosphor-icons/react";
import { StackedSheet } from "@/components/layout/stacked-sheet";
import { useSheetStack } from "@/lib/hooks/use-sheet-stack";
import { DropSheet } from "@/components/forms/drop-sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DropEye } from "@/types/domain";
import { dispatchQuickAction } from "./helpers";

const EXPAND_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

const EYE_SHORT: Record<string, string> = { left: "IZQ", right: "DER", both: "AMB" };
const EYE_LABEL: Record<string, string> = { left: "Izq", right: "Der", both: "Ambos" };

type RecentDrop = { id: string; logged_at: string; quantity: number; eye: string };

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ─── Drop type accordion group ────────────────────────────────────────── */

function DropTypeGroup({
  typeId,
  typeName,
  initialExpanded,
  onEdit,
  onDelete,
}: {
  typeId: string;
  typeName: string;
  initialExpanded: boolean;
  onEdit: (drop: RecentDrop, typeId: string) => void;
  onDelete: (id: string, typeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);

  const { data: drops = [] } = useQuery({
    queryKey: ["drops/recent", typeId],
    queryFn: () => api.getRecentDrops(typeId, 24),
    staleTime: 30_000,
  });

  const sorted = useMemo(
    () =>
      [...drops].sort(
        (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
      ),
    [drops],
  );

  if (sorted.length === 0) return null;

  const lastDrop = sorted[0];

  return (
    <div>
      <button
        className="w-full flex items-center gap-3 py-2 text-left transition-transform duration-[120ms] ease-out active:scale-[0.98]"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${typeName}, ${sorted.length} dosis`}
      >
        <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-primary)]">
          {typeName}
        </span>
        <span
          className="mono inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[13px] font-medium tabular-nums"
          style={{
            color: "var(--pain-low)",
            background: "color-mix(in srgb, var(--pain-low) 12%, transparent)",
          }}
        >
          {sorted.length}×
        </span>
        <span className="mono w-[42px] shrink-0 text-right text-[12px] tabular-nums text-[var(--text-muted)]">
          {formatTime(lastDrop.logged_at)}
        </span>
        <span className="mono w-[26px] shrink-0 text-right text-[11px] uppercase tracking-[0.08em] text-[var(--text-faint)]">
          {EYE_SHORT[lastDrop.eye] ?? "—"}
        </span>
        <div
          className="shrink-0 will-change-transform"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <CaretRightIcon size={12} color="var(--text-faint)" />
        </div>
      </button>

      <div
        className="overflow-hidden will-change-[max-height,opacity]"
        style={{
          maxHeight: expanded ? 1200 : 0,
          opacity: expanded ? 1 : 0,
          transition: `max-height 250ms ${EXPAND_EASE}, opacity 200ms ${EXPAND_EASE}`,
        }}
      >
        <div className="rounded-[10px] bg-[var(--surface-el)] mb-1 overflow-hidden divide-y divide-[var(--border)]">
          {sorted.map((drop) => (
            <div key={drop.id} className="flex items-center gap-2.5 px-3 py-2.5">
              <span className="mono text-[13px] tabular-nums text-[var(--text-primary)]">
                {formatTime(drop.logged_at)}
              </span>
              <span className="flex-1 text-[13px] text-[var(--text-muted)]">
                {EYE_LABEL[drop.eye] ?? drop.eye} · ×{drop.quantity}
              </span>
              <button
                type="button"
                aria-label="Editar dosis"
                onClick={() => onEdit(drop, typeId)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                  "text-[var(--text-faint)] hover:text-[var(--text-muted)]",
                )}
              >
                <PencilSimpleIcon size={12} weight="bold" />
              </button>
              <button
                type="button"
                aria-label="Eliminar dosis"
                onClick={() => onDelete(drop.id, typeId)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-faint)] transition-colors hover:text-[var(--error)]"
              >
                <TrashIcon size={12} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────────────────── */

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
  const stack = useSheetStack();

  useEffect(() => {
    if (!open) stack.clear();
  }, [open, stack.clear]);

  const { data: dropTypes = [] } = useQuery({
    queryKey: ["drop-types"],
    queryFn: api.getDropTypes,
    staleTime: 120_000,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; typeId: string }) => api.deleteDrop(id),
    onMutate: async ({ id, typeId }) => {
      await queryClient.cancelQueries({ queryKey: ["drops/recent", typeId] });
      const prev = queryClient.getQueryData<RecentDrop[]>(["drops/recent", typeId]);
      queryClient.setQueryData<RecentDrop[]>(
        ["drops/recent", typeId],
        (old) => old?.filter((d) => d.id !== id) ?? [],
      );
      return { prev, typeId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["drops/recent", ctx.typeId], ctx.prev);
      toast.error("No se pudo eliminar. Intenta de nuevo.");
    },
    onSettled: (_data, _err, { typeId }) => {
      queryClient.invalidateQueries({ queryKey: ["drops/recent", typeId] });
      queryClient.invalidateQueries({ queryKey: ["drops/last-per-type"] });
      queryClient.invalidateQueries({ queryKey: ["drops/last"] });
    },
  });

  const handleEdit = useCallback(
    (drop: RecentDrop, typeId: string) => {
      const typeName = dropTypes.find((t) => t.id === typeId)?.name ?? "";
      stack.push({
        key: "edit",
        title: "Editar dosis",
        description: `${typeName} · ${formatTime(drop.logged_at)}`,
        content: (
          <DropSheet
            editDrop={{
              id: drop.id,
              loggedAt: drop.logged_at,
              eye: (["left", "right", "both"].includes(drop.eye) ? drop.eye : "both") as DropEye,
              quantity: drop.quantity,
              dropTypeId: typeId,
            }}
            onSaved={stack.pop}
          />
        ),
      });
    },
    [stack.push, stack.pop, dropTypes],
  );

  const baseContent = (
    <div>
      {dropTypes.map((t) => (
        <DropTypeGroup
          key={t.id}
          typeId={t.id}
          typeName={t.name}
          initialExpanded={t.id === initialDropTypeId}
          onEdit={handleEdit}
          onDelete={(id, typeId) => deleteMutation.mutate({ id, typeId })}
        />
      ))}

      <div className="pt-3">
        <Button
          variant="tinted"
          size="lg"
          className="w-full"
          onClick={() => {
            onClose();
            setTimeout(() => dispatchQuickAction("drop", { dropTypeId: initialDropTypeId }), 300);
          }}
        >
          <EyedropperIcon size={16} weight="bold" className="mr-1.5" />
          <PlusIcon size={14} weight="bold" className="mr-1" />
          Nueva dosis
        </Button>
      </div>
    </div>
  );

  return (
    <StackedSheet
      open={open}
      onClose={onClose}
      stack={stack}
      panelClassName="!h-[95dvh]"
      baseLayer={{ key: "drops-today", title: "Dosis de hoy", description: "Últimas 24 horas", content: baseContent }}
    />
  );
}
