/**
 * StackedSheet — iOS Health-style stacked bottom sheets.
 *
 * Each layer slides up on top of the previous one. Background layers scale back
 * (scale 0.93, y -10px from top-center) and receive a dim overlay, matching the
 * iOS navigation sheet pattern. Only the active (top) layer is interactive.
 *
 * ## Two usage modes
 *
 * ### Declarative — caller owns the layers array
 * Use when the set of possible layers is known upfront and driven by local state.
 *
 * ```tsx
 * const [view, setView] = useState<"list" | "detail">("list");
 *
 * <StackedSheet
 *   open={open}
 *   onClose={onClose}
 *   layers={[
 *     { key: "list",   title: "Items",  content: <List onSelect={() => setView("detail")} /> },
 *     ...(view === "detail" ? [{ key: "detail", title: "Detail", content: <Detail /> }] : []),
 *   ]}
 *   onPop={() => setView("list")}
 * />
 * ```
 *
 * ### Imperative — useSheetStack manages the stack
 * Use when layers are pushed/popped in response to user actions.
 * Keys are auto-suffixed with a counter, so re-pushing the same key always animates.
 *
 * ```tsx
 * const stack = useSheetStack();
 *
 * const handleSelect = (item: Item) => {
 *   stack.push({
 *     key: "detail",
 *     title: item.name,
 *     content: <Detail item={item} onSaved={() => stack.pop()} />,
 *   });
 * };
 *
 * <StackedSheet
 *   open={open}
 *   onClose={onClose}
 *   stack={stack}
 *   baseLayer={{ key: "list", title: "Items", content: <List onSelect={handleSelect} /> }}
 * />
 * ```
 *
 * ## Back / close behaviour
 * - X button on active layer with layers below → calls back action (pop)
 * - X button on base layer (only layer) → calls onClose
 * - Backdrop tap → always calls onClose (closes entire stack)
 * - Per-layer `onBack` overrides the global pop for that specific layer
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SheetStackState } from "@/lib/hooks/use-sheet-stack";

export type SheetLayer = {
  /** Unique identifier. In imperative mode, useSheetStack auto-suffixes to guarantee AnimatePresence animates re-pushes of the same key. */
  key: string;
  title: string;
  description?: string;
  content: ReactNode;
  /** Merged with the global panelClassName. Use to override height per layer, e.g. "!h-[80dvh]". */
  panelClassName?: string;
  /** Replaces the default pop action for this layer's back button and X button. */
  onBack?: () => void;
};

/** Declarative mode: caller owns and computes the full layers array. */
type DeclarativeProps = {
  layers: SheetLayer[];
  /** Called when the active layer's back button or X is pressed and layers.length > 1. */
  onPop?: () => void;
  stack?: never;
  baseLayer?: never;
};

/** Imperative mode: useSheetStack manages pushed layers; baseLayer is the permanent bottom layer. */
type ImperativeProps = {
  stack: SheetStackState;
  /** Permanent bottom layer prepended to stack.layers. Not poppable — only closeable via onClose. */
  baseLayer?: SheetLayer;
  layers?: never;
  onPop?: never;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Applied to all layer panels. Per-layer panelClassName takes precedence. */
  panelClassName?: string;
} & (DeclarativeProps | ImperativeProps);

const PANEL_SPRING = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.85 };
const BACKDROP_FADE = { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const };

export function StackedSheet(props: Props) {
  const { open, onClose, panelClassName } = props;

  const resolvedLayers: SheetLayer[] = props.stack
    ? [...(props.baseLayer ? [props.baseLayer] : []), ...props.stack.layers]
    : (props.layers ?? []);

  const resolvedOnPop = props.stack ? props.stack.pop : props.onPop;

  const id = useId();
  const [mounted, setMounted] = useState(open);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    if (open) setMounted(true);
  }, [open]);

  return mounted
    ? createPortal(
        <>
          <AnimatePresence>
            {open && (
              <motion.button
                key="stacked-backdrop"
                aria-label="Cerrar modal"
                className="sheet-backdrop"
                style={{ zIndex: 80 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={BACKDROP_FADE}
                type="button"
                onClick={onClose}
              />
            )}
          </AnimatePresence>

          <AnimatePresence
            onExitComplete={() => {
              if (!openRef.current) setMounted(false);
            }}
          >
            {(open ? resolvedLayers : []).map((layer, index) => {
              const depth = resolvedLayers.length - 1 - index;
              const isActive = depth === 0;
              const titleId = `${id}-${layer.key}-title`;
              const descId = `${id}-${layer.key}-desc`;
              const backAction = layer.onBack ?? resolvedOnPop;
              const hasBack = isActive && resolvedLayers.length > 1 && !!backAction;
              const xAction = hasBack ? backAction : onClose;

              return (
                <motion.section
                  key={layer.key}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  aria-describedby={descId}
                  className={cn("sheet-panel", panelClassName, layer.panelClassName)}
                  style={{
                    zIndex: 81 + index,
                    transformOrigin: "top center",
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  initial={{ y: "100%" }}
                  animate={{
                    y: depth === 0 ? 0 : -depth * 10,
                    scale: 1 - depth * 0.07,
                  }}
                  exit={{ y: "100%" }}
                  transition={PANEL_SPRING}
                >
                  {!isActive && (
                    <div
                      className="pointer-events-none absolute inset-0 bg-black/20"
                      style={{ borderRadius: "inherit", zIndex: 2 }}
                    />
                  )}

                  <div className="sheet-handle" style={{ opacity: isActive ? 1 : 0.4 }} />

                  {isActive && (
                    <button
                      aria-label={hasBack ? "Volver" : "Cerrar"}
                      className="sheet-close-btn"
                      type="button"
                      onClick={xAction}
                    >
                      <XIcon size={16} weight="bold" />
                    </button>
                  )}

                  <header className={cn("mb-6", isActive && "pr-10")}>
                    {hasBack && (
                      <button
                        aria-label="Volver"
                        className="mb-3 flex items-center gap-1.5 text-[13px] text-[var(--accent)] -ml-0.5"
                        type="button"
                        onClick={backAction}
                      >
                        <ArrowLeftIcon size={16} weight="bold" /> Volver
                      </button>
                    )}
                    <h2 id={titleId} className="screen-title text-[17px]">
                      {layer.title}
                    </h2>
                    {layer.description && (
                      <p id={descId} className="screen-subtitle text-[13px]">
                        {layer.description}
                      </p>
                    )}
                  </header>

                  <div className="sheet-body">{layer.content}</div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </>,
        document.body,
      )
    : null;
}
