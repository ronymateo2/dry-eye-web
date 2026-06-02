import { useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TrashIcon, PencilSimpleIcon, EyedropperIcon } from "@phosphor-icons/react";
import { StackedSheet } from "@/components/layout/stacked-sheet";
import { useSheetStack } from "@/lib/hooks/use-sheet-stack";
import { DropSheet } from "@/components/forms/drop-sheet";
import { Button } from "@/components/ui/button";
import { TimelineRow, TimelineDot, TimelineGap } from "@/components/history/timeline-ui";
import { formatTime, formatGap } from "@/components/history/utils";
import { useUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getDayKey } from "@/lib/utils";
import type { DropEye } from "@/types/domain";
import { dispatchQuickAction } from "./helpers";

const EYE_LABEL: Record<string, string> = { left: "Ojo izq.", right: "Ojo der.", both: "Ambos ojos" };
const EYE_SHORT: Record<string, string> = { left: "IZQ", right: "DER", both: "AMB" };

type RecentDrop = { id: string; logged_at: string; quantity: number; eye: string };
type TimelineDrop = RecentDrop & { typeId: string; typeName: string; occurrence: number };

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
  const user = useUser();
  const timezone = user.timezone ?? "America/Bogota";

  useEffect(() => {
    if (!open) stack.clear();
  }, [open, stack.clear]);

  const { data: dropTypes = [] } = useQuery({
    queryKey: ["drop-types"],
    queryFn: api.getDropTypes,
    staleTime: 120_000,
  });

  const recentQueries = useQueries({
    queries: dropTypes.map((t) => ({
      queryKey: ["drops/recent", t.id],
      queryFn: () => api.getRecentDrops(t.id, 24),
      staleTime: 30_000,
    })),
  });

  const todayKey = getDayKey(new Date().toISOString(), timezone);

  const rows = useMemo<TimelineDrop[]>(() => {
    const merged: Omit<TimelineDrop, "occurrence">[] = [];
    dropTypes.forEach((t, i) => {
      const drops = recentQueries[i]?.data ?? [];
      for (const d of drops) merged.push({ ...d, typeId: t.id, typeName: t.name });
    });

    const visible = merged.filter((d) => getDayKey(d.logged_at, timezone) === todayKey);

    const asc = [...visible].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );
    const counts = new Map<string, number>();
    const occById = new Map<string, number>();
    for (const d of asc) {
      const n = (counts.get(d.typeId) ?? 0) + 1;
      counts.set(d.typeId, n);
      occById.set(d.id, n);
    }

    return [...visible]
      .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
      .map((d) => ({ ...d, occurrence: occById.get(d.id) ?? 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropTypes, recentQueries.map((q) => q.dataUpdatedAt).join(","), timezone, todayKey]);

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
      queryClient.invalidateQueries({ queryKey: ["drops/recent-all"] });
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
        description: `${typeName} · ${formatTime(drop.logged_at, timezone)}`,
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
    [stack.push, stack.pop, dropTypes, timezone],
  );

  const handleDelete = useCallback(
    (drop: RecentDrop, typeId: string) => {
      const typeName = dropTypes.find((t) => t.id === typeId)?.name ?? "";
      stack.push({
        key: "confirm-delete",
        title: "Eliminar dosis",
        description: `${typeName} · ${formatTime(drop.logged_at, timezone)}`,
        content: (
          <div className="space-y-5 pb-2">
            <div className="rounded-[10px] bg-[var(--surface-el)] px-4 py-3">
              <p className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">
                Dosis a eliminar
              </p>
              <p className="text-[15px] text-[var(--text-primary)]">
                {EYE_LABEL[drop.eye] ?? drop.eye} · ×{drop.quantity}
              </p>
            </div>
            <p className="text-[13px] text-[var(--text-muted)]">Esta acción no se puede deshacer.</p>
            <div className="flex flex-col gap-2">
              <Button
                variant="tinted-error"
                size="lg"
                className="w-full"
                onClick={() => {
                  deleteMutation.mutate({ id: drop.id, typeId });
                  stack.pop();
                }}
              >
                Eliminar dosis
              </Button>
              <Button variant="plain" size="lg" className="w-full" onClick={stack.pop}>
                Cancelar
              </Button>
            </div>
          </div>
        ),
      });
    },
    [stack, dropTypes, deleteMutation, timezone],
  );

  const baseContent = (
    <div>
      <div className="relative">
        {rows.map((d, i) => {
          const next = rows[i + 1];
          const isLast = i === rows.length - 1;
          const gap = next ? formatGap(next.logged_at, d.logged_at) : null;

          return (
            <div key={d.id}>
              <TimelineRow time={formatTime(d.logged_at, timezone)}>
                <TimelineDot />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--text-primary)]">
                    {d.typeName}
                  </span>
                  <span
                    className="mono inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] px-1 text-[11px] font-normal tracking-wider text-[var(--text-faint)]"
                    style={{ background: "color-mix(in srgb, var(--surface-el) 60%, transparent)" }}
                  >
                    {d.occurrence}×
                  </span>
                  <span className="mono text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--accent)]">
                    {EYE_SHORT[d.eye] ?? "—"}
                  </span>
                  <button
                    type="button"
                    aria-label="Editar dosis"
                    onClick={() => handleEdit(d, d.typeId)}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      "transition-[background-color,color] duration-150 ease-out",
                      "text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-el)]",
                      "active:scale-90",
                    )}
                  >
                    <PencilSimpleIcon size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar dosis"
                    onClick={() => handleDelete(d, d.typeId)}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      "transition-[background-color,color] duration-150 ease-out",
                      "text-[var(--text-faint)] hover:text-[var(--error)]",
                      "active:scale-90",
                    )}
                  >
                    <TrashIcon size={14} weight="bold" />
                  </button>
                </div>
              </TimelineRow>
              {!isLast && (
                <TimelineGap>
                  <span className="mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">
                    {gap}
                  </span>
                </TimelineGap>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-[15px] text-[var(--text-muted)]">Sin gotas registradas hoy.</p>
        )}
      </div>

      <div className="pt-4">
        <Button
          variant="tinted"
          size="lg"
          className="w-full"
          onClick={() => {
            onClose();
            setTimeout(() => dispatchQuickAction("drop", { dropTypeId: initialDropTypeId }), 300);
          }}
        >
          <EyedropperIcon size={16} weight="bold" className="mr-2" />
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
      baseLayer={{ key: "drops-today", title: "Dosis de hoy", description: "Solo hoy", content: baseContent }}
    />
  );
}
