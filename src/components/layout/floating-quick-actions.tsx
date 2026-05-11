import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PlusIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { MobileSheet } from "./mobile-sheet";
import { QuickActionsSheet } from "./quick-actions-sheet";
import { cn } from "@/lib/utils";

const DropSheet = lazy(() => import("@/components/forms/drop-sheet").then((m) => ({ default: m.DropSheet })));
const SleepSheet = lazy(() => import("@/components/forms/sleep-sheet").then((m) => ({ default: m.SleepSheet })));
const HygieneSheet = lazy(() => import("@/components/forms/hygiene-sheet").then((m) => ({ default: m.HygieneSheet })));
const ObservationsListSheet = lazy(() => import("@/components/forms/observations-list-sheet").then((m) => ({ default: m.ObservationsListSheet })));
const LogOccurrenceSheet = lazy(() => import("@/components/forms/log-occurrence-sheet").then((m) => ({ default: m.LogOccurrenceSheet })));
const ObservationSheet = lazy(() => import("@/components/forms/observation-sheet").then((m) => ({ default: m.ObservationSheet })));
const TherapySheet = lazy(() => import("@/components/forms/therapy-sheet").then((m) => ({ default: m.TherapySheet })));
const MedicationSessionSheet = lazy(() => import("@/components/forms/medication-session-sheet").then((m) => ({ default: m.MedicationSessionSheet })));
const VialSheet = lazy(() => import("@/components/forms/vial-sheet").then((m) => ({ default: m.VialSheet })));

type Sheet = "drop" | "sleep" | "obs_list" | "obs_log" | "obs_new" | "hygiene" | "therapy" | "medication-intake" | "pain" | "vial" | null;

export function FloatingQuickActions() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selectedObservation, setSelectedObservation] = useState<{ id: string; title: string; eye: string } | null>(null);
  const [initialDropTypeId, setInitialDropTypeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const { sheet: s, dropTypeId } = (e as CustomEvent<{ sheet: Sheet; dropTypeId?: string }>).detail;
      setSheet(s);
      setInitialDropTypeId(dropTypeId);
      setMenuOpen(false);
    };
    window.addEventListener("quickactions:open", handler);
    return () => window.removeEventListener("quickactions:open", handler);
  }, []);

  const isTodayPage = pathname === "/today";
  const isVisible = isTodayPage || pathname === "/history";
  const fabBottomOffsetClass =
    "bottom-[calc(var(--tabbar-height)+var(--safe-bottom-nav)+20px)]";

  const queryClient = useQueryClient();
  const closeAll = () => { setSheet(null); setMenuOpen(false); setSelectedObservation(null); setInitialDropTypeId(undefined); };
  const savedAndClose = () => {
    window.dispatchEvent(new CustomEvent("history:refresh"));
    queryClient.invalidateQueries({ queryKey: ["history"] });
    queryClient.invalidateQueries({ queryKey: ["medications"] });
    queryClient.invalidateQueries({ queryKey: ["medication-intakes/last-per-med"] });
    queryClient.invalidateQueries({ queryKey: ["observation-occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["vials/active"] });
    queryClient.invalidateQueries({ queryKey: ["vials/history"] });
    closeAll();
  };

  const handleSelect = (s: Sheet) => {
    if (s === "pain") {
      navigate("/register");
      setMenuOpen(false);
    } else {
      setSheet(s);
    }
  };

  return (
    <>
      <QuickActionsSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleSelect}
      />

      {isVisible && <div className={cn("pointer-events-none fixed inset-x-0 z-30", fabBottomOffsetClass)}>
        <div className="mx-auto flex w-[min(100%,480px)] flex-col items-end px-[var(--screen-padding)]">
          <div className="pointer-events-auto">
            <motion.button
              aria-label="Acciones rápidas"
              aria-expanded={menuOpen}
              animate={{ rotate: menuOpen ? 45 : 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-200 active:scale-[0.90]",
                menuOpen
                  ? "border-transparent bg-[var(--accent)] text-[var(--btn-primary-text)] shadow-[0_0_0_6px_var(--accent-dim),0_8px_20px_var(--fab-shadow)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] shadow-[0_8px_18px_rgba(0,0,0,0.20)] hover:bg-[var(--surface-el)]",
              )}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <PlusIcon size={22} />
            </motion.button>
          </div>
        </div>
      </div>}

      <Suspense fallback={null}>
        <MobileSheet open={sheet === "sleep"} title="Sueno de hoy" description="Registra o actualiza tu sueno de hoy." onClose={closeAll}>
          <SleepSheet onSaved={savedAndClose} />
        </MobileSheet>
        <MobileSheet open={sheet === "drop"} title="Registrar gota" description="Registra rapidamente una aplicacion." panelClassName="!h-[92dvh]" onClose={closeAll}>
          <DropSheet onSaved={savedAndClose} initialDropTypeId={initialDropTypeId} />
        </MobileSheet>
        <MobileSheet open={sheet === "hygiene"} title="Higiene Palpebral" description="Registra tu sesion de higiene palpebral." panelClassName="!h-[95dvh]" onClose={closeAll}>
          <HygieneSheet onSaved={savedAndClose} onClose={closeAll} />
        </MobileSheet>
        <MobileSheet open={sheet === "obs_list"} title="Observaciones" description="Selecciona una observacion para registrar." panelClassName="!h-[95dvh]" onClose={closeAll}>
          <ObservationsListSheet
            onSelectObservation={(obs) => { setSelectedObservation(obs); setSheet("obs_log"); }}
            onCreateNew={() => setSheet("obs_new")}
          />
        </MobileSheet>
        <MobileSheet open={sheet === "obs_log"} title="Registrar ocurrencia" description="Registra cuando ocurre esta observacion." onClose={closeAll} panelClassName="!h-[95dvh]" onBack={() => setSheet("obs_list")}>
          {selectedObservation && <LogOccurrenceSheet observation={selectedObservation} onSaved={savedAndClose} />}
        </MobileSheet>
        <MobileSheet open={sheet === "obs_new"} title="Nueva observacion" description="Registra algo que notaste." onClose={closeAll}>
          <ObservationSheet onSaved={(obs) => { setSelectedObservation(obs); setSheet("obs_log"); }} />
        </MobileSheet>
        <MobileSheet open={sheet === "therapy"} title="Registrar terapia" description="Registra una sesion de terapia miofascial." onClose={closeAll}>
          <TherapySheet onSaved={savedAndClose} />
        </MobileSheet>
        <MobileSheet open={sheet === "medication-intake"} title="Registrar pastilla" description="Registra una toma de medicamento." onClose={closeAll} panelClassName="!h-[92dvh]">
          <MedicationSessionSheet onSaved={savedAndClose} />
        </MobileSheet>
        <MobileSheet open={sheet === "vial"} title="Abrir vial" description="Vincula un vial a una gota ya registrada." onClose={closeAll} panelClassName="!h-[85dvh]">
          <VialSheet onClose={closeAll} />
        </MobileSheet>
      </Suspense>
    </>
  );
}
