import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type SheetLayer = {
  key: string;
  title: string;
  description?: string;
  content: ReactNode;
  /** Per-layer panel class — merged with global panelClassName */
  panelClassName?: string;
  /** Custom back action for this layer — overrides global onPop */
  onBack?: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  layers: SheetLayer[];
  /** Default back action when active layer has no onBack */
  onPop?: () => void;
  /** Global panel class applied to all layers */
  panelClassName?: string;
};

const PANEL_SPRING = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.85 };
const BACKDROP_FADE = { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const };

export function StackedSheet({ open, onClose, layers, onPop, panelClassName }: Props) {
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
            {(open ? layers : []).map((layer, index) => {
              const depth = layers.length - 1 - index;
              const isActive = depth === 0;
              const titleId = `${id}-${layer.key}-title`;
              const descId = `${id}-${layer.key}-desc`;
              const backAction = layer.onBack ?? onPop;
              const hasBack = isActive && layers.length > 1 && !!backAction;
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
