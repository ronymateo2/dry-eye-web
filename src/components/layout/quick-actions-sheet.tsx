import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
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

const ACTIONS = [...PRIMARY_ACTIONS, ...SECONDARY_ACTIONS];

const PANEL_SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.15 };
const BACKDROP_FADE = { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const };
const ITEM_EASE = [0.23, 1, 0.32, 1] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (sheet: Sheet) => void;
};

export function QuickActionsSheet({ open, onClose, onSelect }: Props) {
  const [mounted, setMounted] = useState(open);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const listVariants = {
    hidden: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.03,
        staggerDirection: -1,
      },
    },
    visible: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.05,
        delayChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0.15 : 0.35, ease: ITEM_EASE },
    },
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={() => setMounted(false)}>
      {open && (
        <>
          <motion.button
            key="qs-backdrop"
            aria-label="Cerrar acciones rápidas"
            className="sheet-backdrop"
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

            <motion.div
              className="action-sheet-list"
              variants={listVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {ACTIONS.map(({ sheet, Icon, label }) => (
                <motion.button
                  key={sheet}
                  type="button"
                  aria-label={label}
                  className="action-row"
                  variants={itemVariants}
                  whileHover={{ opacity: 0.85 }}
                  whileTap={{ scale: reducedMotion ? 1 : 0.97, opacity: reducedMotion ? 1 : 0.7 }}
                  onClick={() => { onSelect(sheet); onClose(); }}
                >
                  <Icon size={20} color="var(--accent)" />
                  <span className="action-row-label">{label}</span>
                </motion.button>
              ))}
            </motion.div>

            <div className="action-sheet-safe-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
