import { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { DropIcon, PlusIcon, NotePencilIcon, MoonIcon, EyeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "./mobile-sheet";
import { cn } from "@/lib/utils";

const DropSheet = lazy(() => import("@/components/forms/drop-sheet").then((m) => ({ default: m.DropSheet })));
const SleepSheet = lazy(() => import("@/components/forms/sleep-sheet").then((m) => ({ default: m.SleepSheet })));
const HygieneSheet = lazy(() => import("@/components/forms/hygiene-sheet").then((m) => ({ default: m.HygieneSheet })));
const ObservationsListSheet = lazy(() => import("@/components/forms/observations-list-sheet").then((m) => ({ default: m.ObservationsListSheet })));
const LogOccurrenceSheet = lazy(() => import("@/components/forms/log-occurrence-sheet").then((m) => ({ default: m.LogOccurrenceSheet })));
const ObservationSheet = lazy(() => import("@/components/forms/observation-sheet").then((m) => ({ default: m.ObservationSheet })));

type Sheet = "drop" | "sleep" | "obs_list" | "obs_log" | "obs_new" | "hygiene" | null;

const ACTION_ITEMS = [
  { sheet: "drop" as Sheet, Icon: DropIcon, label: "Gota" },
  { sheet: "sleep" as Sheet, Icon: MoonIcon, label: "Sueño" },
  { sheet: "hygiene" as Sheet, Icon: EyeIcon, label: "Higiene" },
  { sheet: "obs_list" as Sheet, Icon: NotePencilIcon, label: "Observación" },
];

export function FloatingQuickActions() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selectedObservation, setSelectedObservation] = useState<{ id: string; title: string; eye: string } | null>(null);

  const isRegisterPage = pathname === "/register";
  const isVisible = isRegisterPage || pathname === "/history";
  const fabBottomOffsetClass =
    isRegisterPage
      ? "bottom-[calc(var(--tabbar-height)+var(--safe-bottom-nav)+var(--sticky-cta-height)+16px)]"
      : "bottom-[calc(var(--tabbar-height)+var(--safe-bottom-nav)+20px)]";

  if (!isVisible) return null;

  const closeAll = () => { setSheet(null); setMenuOpen(false); setSelectedObservation(null); };
  const savedAndClose = () => { window.dispatchEvent(new CustomEvent("history:refresh")); closeAll(); };

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="fab-backdrop"
            className="fixed inset-0 z-[29] bg-[rgba(0,0,0,0.06)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className={cn("pointer-events-none fixed inset-x-0 z-30", fabBottomOffsetClass)}>
        <div className="mx-auto flex w-[min(100%,480px)] flex-col items-end px-[var(--screen-padding)]">
          <div className="pointer-events-auto flex flex-col items-end gap-3">
            <AnimatePresence>
              {menuOpen && ACTION_ITEMS.map(({ sheet: s, Icon, label }, i) => {
                const reverseI = ACTION_ITEMS.length - 1 - i;
                return (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{
                      opacity: 1, y: 0, scale: 1,
                      transition: { type: "spring", stiffness: 340, damping: 26, delay: reverseI * 0.04 },
                    }}
                    exit={{
                      opacity: 0, y: 6, scale: 0.94,
                      transition: { duration: 0.13, ease: "easeIn", delay: reverseI * 0.03 },
                    }}
                  >
                    <Button
                      className="min-w-[132px] justify-start gap-2.5 border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_20px_rgba(0,0,0,0.22)]"
                      variant="subtle"
                      onClick={() => setSheet(s)}
                    >
                      <Icon size={18} color="var(--accent)" /> {label}
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <button
              aria-label="Acciones rapidas"
              aria-expanded={menuOpen}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-[0.90]",
                menuOpen
                  ? "rotate-45 border-transparent bg-[var(--accent)] text-[var(--btn-primary-text)] shadow-[0_0_0_6px_var(--accent-dim),0_8px_20px_var(--fab-shadow)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] shadow-[0_8px_18px_rgba(0,0,0,0.20)] hover:bg-[var(--surface-el)]",
              )}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <PlusIcon size={22} />
            </button>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <MobileSheet open={sheet === "sleep"} title="Sueno de hoy" description="Registra o actualiza tu sueno de hoy." onClose={closeAll}>
          <SleepSheet onSaved={savedAndClose} />
        </MobileSheet>
        <MobileSheet open={sheet === "drop"} title="Registrar gota" description="Registra rapidamente una aplicacion." panelClassName="!h-[92dvh]" onClose={closeAll}>
          <DropSheet onSaved={savedAndClose} />
        </MobileSheet>
        <MobileSheet open={sheet === "hygiene"} title="Higiene Palpebral" description="Registra tu sesion de higiene palpebral." panelClassName="!h-[95dvh]" onClose={closeAll}>
          <HygieneSheet onSaved={savedAndClose} onClose={closeAll} />
        </MobileSheet>
        <MobileSheet open={sheet === "obs_list"} title="Observaciones" description="Selecciona una observacion para registrar." onClose={closeAll}>
          <ObservationsListSheet
            onSelectObservation={(obs) => { setSelectedObservation(obs); setSheet("obs_log"); }}
            onCreateNew={() => setSheet("obs_new")}
          />
        </MobileSheet>
        <MobileSheet open={sheet === "obs_log"} title="Registrar ocurrencia" description="Registra cuando ocurre esta observacion." onClose={closeAll} onBack={() => setSheet("obs_list")}>
          {selectedObservation && <LogOccurrenceSheet observation={selectedObservation} onSaved={savedAndClose} />}
        </MobileSheet>
        <MobileSheet open={sheet === "obs_new"} title="Nueva observacion" description="Registra algo que notaste." onClose={closeAll}>
          <ObservationSheet onSaved={(obs) => { setSelectedObservation(obs); setSheet("obs_log"); }} />
        </MobileSheet>
      </Suspense>
    </>
  );
}
