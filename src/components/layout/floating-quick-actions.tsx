import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PlusIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { MobileSheet } from "./mobile-sheet";
import { QuickActionsSheet } from "./quick-actions-sheet";
import { vialKeys } from "@/features/drops";
import { medicationKeys } from "@/features/medications";
import { observationKeys } from "@/features/observations";
import { symptomKeys } from "@/features/symptoms";
import { historyKeys } from "@/features/history";
import { cn } from "@/lib/utils";

const DropSheet = lazy(() => import("@/components/forms/drop-sheet").then((m) => ({ default: m.DropSheet })));
const SleepSheet = lazy(() => import("@/components/forms/sleep-sheet").then((m) => ({ default: m.SleepSheet })));
const HygieneSheet = lazy(() => import("@/components/forms/hygiene-sheet").then((m) => ({ default: m.HygieneSheet })));
const ObservationFlowSheet = lazy(() => import("@/components/forms/observation-flow-sheet").then((m) => ({ default: m.ObservationFlowSheet })));
const TherapySheet = lazy(() => import("@/components/forms/therapy-sheet").then((m) => ({ default: m.TherapySheet })));
const MedicationSessionSheet = lazy(() => import("@/components/forms/medication-session-sheet").then((m) => ({ default: m.MedicationSessionSheet })));
const VialSheet = lazy(() => import("@/components/forms/vial-sheet").then((m) => ({ default: m.VialSheet })));
const SymptomsSheet = lazy(() => import("@/components/forms/symptoms-sheet").then((m) => ({ default: m.SymptomsSheet })));

type Sheet = "drop" | "sleep" | "obs" | "hygiene" | "therapy" | "medication-intake" | "pain" | "vial" | "symptoms" | null;

export function FloatingQuickActions() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [obsMounted, setObsMounted] = useState(false);
  const [initialDropTypeId, setInitialDropTypeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const { sheet: s, dropTypeId } = (e as CustomEvent<{ sheet: Sheet; dropTypeId?: string }>).detail;
      setSheet(s);
      if (s === "obs") setObsMounted(true);
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
  const closeAll = () => { setSheet(null); setMenuOpen(false); setInitialDropTypeId(undefined); };
  const savedAndClose = () => {
    window.dispatchEvent(new CustomEvent("history:refresh"));
    queryClient.invalidateQueries({ queryKey: historyKeys.all });
    queryClient.invalidateQueries({ queryKey: medicationKeys.list() });
    queryClient.invalidateQueries({ queryKey: medicationKeys.intakesLastPerMed() });
    queryClient.invalidateQueries({ queryKey: medicationKeys.intakesToday() });
    queryClient.invalidateQueries({ queryKey: observationKeys.occurrences() });
    queryClient.invalidateQueries({ queryKey: vialKeys.active() });
    queryClient.invalidateQueries({ queryKey: vialKeys.history() });
    queryClient.invalidateQueries({ queryKey: symptomKeys.today() });
    closeAll();
  };

  const handleSelect = (s: Sheet) => {
    if (s === "pain") {
      navigate("/register");
      setMenuOpen(false);
    } else {
      setSheet(s as Sheet);
      if (s === "obs") setObsMounted(true);
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
        {obsMounted && <ObservationFlowSheet open={sheet === "obs"} onClose={closeAll} />}
        <MobileSheet open={sheet === "therapy"} title="Registrar terapia" description="Registra una sesion de terapia miofascial." onClose={closeAll}>
          <TherapySheet onSaved={savedAndClose} />
        </MobileSheet>
        <MobileSheet open={sheet === "medication-intake"} title="Registrar pastilla" description="Registra una toma de medicamento." onClose={closeAll} panelClassName="!h-[92dvh]">
          <MedicationSessionSheet onSaved={savedAndClose} />
        </MobileSheet>
        <MobileSheet open={sheet === "vial"} title="Abrir vial" description="Vincula un vial a una gota ya registrada." onClose={closeAll} panelClassName="!h-[85dvh]">
          <VialSheet onClose={closeAll} />
        </MobileSheet>
        <MobileSheet open={sheet === "symptoms"} title="Registrar síntomas" description="¿Cómo se siente tu ojo ahora?" onClose={closeAll} panelClassName="!h-[95dvh]">
          <SymptomsSheet onSaved={savedAndClose} />
        </MobileSheet>
      </Suspense>
    </>
  );
}
