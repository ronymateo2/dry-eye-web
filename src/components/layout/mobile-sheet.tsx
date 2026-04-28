import { useEffect, useId, useState } from "react";
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      <button
        aria-label="Cerrar modal"
        className={cn("sheet-backdrop", visible && "sheet-backdrop--open")}
        type="button"
        onClick={onClose}
      />
      <section
        aria-describedby={descId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "sheet-panel",
          visible && "sheet-panel--open",
          panelClassName,
        )}
        role="dialog"
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
      </section>
    </>
  );
}
