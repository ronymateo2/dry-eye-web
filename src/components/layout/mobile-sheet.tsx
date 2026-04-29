import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type MobileSheetProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  panelClassName?: string;
};

const PANEL_SPRING = { type: "spring" as const, stiffness: 340, damping: 32 };
const BACKDROP_FADE = { duration: 0.22, ease: "easeOut" as const };

export function MobileSheet({
  open,
  title,
  description,
  onClose,
  onBack,
  children,
  panelClassName,
}: MobileSheetProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={() => setMounted(false)}>
      {open && (
        <>
          <motion.button
            key="backdrop"
            aria-label="Cerrar modal"
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_FADE}
            type="button"
            onClick={onClose}
          />
          <motion.section
            key="panel"
            aria-describedby={descId}
            aria-labelledby={titleId}
            aria-modal="true"
            className={cn("sheet-panel", panelClassName)}
            role="dialog"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={PANEL_SPRING}
          >
            <div className="sheet-handle" />
            <button
              aria-label="Cerrar"
              className="sheet-close-btn"
              type="button"
              onClick={onClose}
            >
              <XIcon size={16} weight="bold" />
            </button>
            <header className="mb-6 pr-10">
              {onBack && (
                <button
                  aria-label="Volver"
                  className="mb-3 flex items-center gap-1.5 text-[13px] text-[var(--accent)] -ml-0.5"
                  type="button"
                  onClick={onBack}
                >
                  <ArrowLeftIcon size={16} weight="bold" /> Volver
                </button>
              )}
              <h2 id={titleId} className="screen-title text-[17px]">
                {title}
              </h2>
              <p id={descId} className="screen-subtitle text-[13px]">
                {description}
              </p>
            </header>
            <div className="sheet-body">{children}</div>
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
