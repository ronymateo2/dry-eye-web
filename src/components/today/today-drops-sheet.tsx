import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TrashIcon, PencilSimpleIcon, EyedropperIcon, CaretRightIcon } from "@phosphor-icons/react";
import { StackedSheet } from "@/components/layout/stacked-sheet";
import { useSheetStack } from "@/lib/hooks/use-sheet-stack";
import { DropSheet } from "@/components/forms/drop-sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DropEye } from "@/types/domain";
import { dispatchQuickAction } from "./helpers";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

const EYE_SHORT: Record<string, string> = { left: "IZQ", right: "DER", both: "AMB" };
const EYE_LABEL: Record<string, string> = { left: "Ojo izq.", right: "Ojo der.", both: "Ambos ojos" };

type RecentDrop = { id: string; logged_at: string; quantity: number; eye: string };

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isToday(isoStr: string): boolean {
  return new Date(isoStr).toDateString() === new Date().toDateString();
}

function isYesterday(isoStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(isoStr).toDateString() === yesterday.toDateString();
}

/* ─── Drop type accordion group ────────────────────────────────────────── */

function DropTypeGroup({
  typeId,
  typeName,
  initialExpanded,
  show24h,
  onEdit,
  onDelete,
}: {
  typeId: string;
  typeName: string;
  initialExpanded: boolean;
  show24h: boolean;
  onEdit: (drop: RecentDrop, typeId: string) => void;
  onDelete: (drop: RecentDrop, typeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const badgeAnim = useAnimation();

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

  const visible = show24h ? sorted : sorted.filter((d) => isToday(d.logged_at));

  useEffect(() => {
    if (visible.length > 0) {
      void badgeAnim.start({ scale: [1, 1.28, 1], transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] } });
    }
  }, [visible.length, badgeAnim]);

  if (visible.length === 0) return null;

  const lastDrop = visible[0];

  return (
    <div>
      <button
        className="w-full flex items-center gap-3 py-3.5 text-left rounded-lg transition-[background-color,transform] duration-150 ease-out active:bg-[var(--surface-el)] active:scale-[0.99]"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${typeName}, ${visible.length} dosis`}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: "var(--pain-low)" }}
        />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--text-primary)]">
          {typeName}
        </span>
        <motion.span
          animate={badgeAnim}
          className="overflow-hidden inline-flex items-center justify-center rounded-full min-w-[32px] px-2 py-0.5 text-[12px] font-semibold tabular-nums mono"
          style={{
            color: "var(--pain-low)",
            background: "color-mix(in srgb, var(--pain-low) 12%, transparent)",
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={visible.length}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="block"
            >
              {visible.length}×
            </motion.span>
          </AnimatePresence>
        </motion.span>
        <span className="mono text-[13px] font-medium tabular-nums text-[var(--text-muted)]">
          {formatTime(lastDrop.logged_at)}
        </span>
        <span className="mono w-[30px] shrink-0 text-right text-[11px] uppercase tracking-[0.08em] text-[var(--text-faint)]">
          {EYE_SHORT[lastDrop.eye] ?? "—"}
        </span>
        <div
          className="shrink-0 text-[var(--text-faint)] will-change-transform"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: `transform 220ms ${EASE_OUT}`,
          }}
        >
          <CaretRightIcon size={14} />
        </div>
      </button>

      <div
        className="grid"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          transition: `grid-template-rows 260ms ${EASE_OUT}, opacity 180ms ${EASE_OUT}`,
        }}
      >
        <div className="overflow-hidden">
          <div className="rounded-[12px] bg-[var(--surface-el)] mb-3 overflow-hidden divide-y divide-[var(--border)]">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((drop) => (
                <motion.div
                  key={drop.id}
                  layout
                  initial={false}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="mono text-[14px] font-semibold tabular-nums text-[var(--text-primary)] w-[46px] shrink-0">
                      {formatTime(drop.logged_at)}
                    </span>
                    <span className="flex-1 text-[13px] text-[var(--text-muted)]">
                      {EYE_LABEL[drop.eye] ?? drop.eye}
                      <span className="text-[var(--text-faint)]"> · ×{drop.quantity}</span>
                      {isYesterday(drop.logged_at) && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-faint)]">Ayer</span>
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label="Editar dosis"
                      onClick={() => onEdit(drop, typeId)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        "transition-[background-color,color,transform] duration-[120ms] ease-out",
                        "text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--surface)]",
                        "active:scale-[0.88]",
                      )}
                    >
                      <PencilSimpleIcon size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar dosis"
                      onClick={() => onDelete(drop, typeId)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        "transition-[background-color,color,transform] duration-[120ms] ease-out",
                        "text-[var(--text-faint)] hover:text-[var(--error)]",
                        "active:scale-[0.88]",
                      )}
                    >
                      <TrashIcon size={14} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
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
  const [show24h, setShow24h] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ["drops/recent-all"] });
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

  const handleDelete = useCallback(
    (drop: RecentDrop, typeId: string) => {
      const typeName = dropTypes.find((t) => t.id === typeId)?.name ?? "";
      stack.push({
        key: "confirm-delete",
        title: "Eliminar dosis",
        description: `${typeName} · ${formatTime(drop.logged_at)}`,
        panelClassName: "!h-auto",
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
    [stack, dropTypes, deleteMutation],
  );

  const baseContent = (
    <div>
      <div className="mb-4 flex justify-center">
        <div
          className="inline-flex rounded-full p-0.5"
          style={{ background: "var(--surface-el)" }}
        >
          {([false, true] as const).map((is24h) => {
            const isActive = show24h === is24h;
            return (
              <button
                key={String(is24h)}
                type="button"
                onClick={() => setShow24h(is24h)}
                className="relative px-5 py-1.5 rounded-full text-[12px] font-semibold tracking-[0.02em] transition-colors duration-150 ease-out z-[1]"
                style={{ color: isActive ? "var(--text-primary)" : "var(--text-faint)" }}
              >
                {isActive && (
                  <motion.div
                    layoutId="seg-thumb"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "var(--surface)" }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0.08 }}
                  />
                )}
                <span className="relative z-[1]">{is24h ? "Últimas 24h" : "Hoy"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {dropTypes.map((t) => (
          <DropTypeGroup
            key={t.id}
            typeId={t.id}
            typeName={t.name}
            initialExpanded={t.id === initialDropTypeId}
            show24h={show24h}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

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
      baseLayer={{ key: "drops-today", title: "Dosis de hoy", description: show24h ? "Últimas 24 horas" : "Solo hoy", content: baseContent }}
    />
  );
}
