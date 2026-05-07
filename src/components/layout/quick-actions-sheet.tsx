import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  DropIcon,
  PillIcon,
  EyeIcon,
  MoonIcon,
  HeartbeatIcon,
  NotePencilIcon,
} from "@phosphor-icons/react";

type Sheet = "drop" | "sleep" | "obs_list" | "obs_log" | "obs_new" | "hygiene" | "therapy" | "medication-intake" | null;

const PRIMARY_ACTIONS = [
  { sheet: "drop" as Sheet, Icon: DropIcon, label: "Gota" },
  { sheet: "medication-intake" as Sheet, Icon: PillIcon, label: "Pastilla" },
  { sheet: "hygiene" as Sheet, Icon: EyeIcon, label: "Higiene" },
] as const;

const SECONDARY_ACTIONS = [
  { sheet: "sleep" as Sheet, Icon: MoonIcon, label: "Sueño" },
  { sheet: "therapy" as Sheet, Icon: HeartbeatIcon, label: "Terapia" },
  { sheet: "obs_list" as Sheet, Icon: NotePencilIcon, label: "Observación" },
] as const;

const PANEL_SPRING = { type: "spring" as const, stiffness: 340, damping: 32 };
const BACKDROP_FADE = { duration: 0.22, ease: "easeOut" as const };

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (sheet: Sheet) => void;
};

export function QuickActionsSheet({ open, onClose, onSelect }: Props) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={() => setMounted(false)}>
      {open && (
        <>
          <motion.button
            key="qs-backdrop"
            aria-label="Cerrar acciones rápidas"
            className="sheet-backdrop"
            style={{ zIndex: 78 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_FADE}
            type="button"
            onClick={onClose}
          />
          <motion.div
            key="qs-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Acciones rápidas"
            className="action-sheet-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={PANEL_SPRING}
          >
            <div className="sheet-handle" />

            <div className="action-sheet-list">
              {[...PRIMARY_ACTIONS, ...SECONDARY_ACTIONS].map(({ sheet, Icon, label }, i) => (
                <button
                  key={sheet}
                  type="button"
                  aria-label={label}
                  className="action-row"
                  style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                  onClick={() => { onSelect(sheet); onClose(); }}
                >
                  <Icon size={20} color="var(--text-muted)" />
                  <span className="action-row-label">{label}</span>
                </button>
              ))}
            </div>

            <div className="action-sheet-safe-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
