import { useEffect, useState } from "react";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { ObservationsListSheet } from "./observations-list-sheet";
import { LogOccurrenceSheet } from "./log-occurrence-sheet";
import { ObservationSheet } from "./observation-sheet";
import type { PropertyDef } from "@/types/domain";

type ObsView = "list" | "log" | "edit" | "new";

type SelectedObs = {
  id: string;
  title: string;
  eye: string;
  body_zone?: string | null;
  category?: string | null;
  notes?: string | null;
  propertiesSchema?: PropertyDef[] | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const SHEET_META: Record<ObsView, { title: string; description: string; panel?: string; back?: ObsView }> = {
  list: { title: "Observaciones", description: "Selecciona una observacion para registrar.", panel: "!h-[95dvh]" },
  log:  { title: "Registrar ocurrencia", description: "Registra cuando ocurre esta observacion.", panel: "!h-[95dvh]", back: "list" },
  edit: { title: "Editar observacion",   description: "Modifica esta observacion y sus propiedades.", panel: "!h-[95dvh]", back: "list" },
  new:  { title: "Nueva observacion",    description: "Registra algo que notaste." },
};

export function ObservationFlowSheet({ open, onClose, onSaved }: Props) {
  const [view, setView] = useState<ObsView>("list");
  const [selectedObs, setSelectedObs] = useState<SelectedObs | null>(null);

  useEffect(() => {
    if (!open) {
      setView("list");
      setSelectedObs(null);
    }
  }, [open]);

  return (
    <>
      {(["list", "log", "edit", "new"] as ObsView[]).map((v) => {
        const meta = SHEET_META[v];
        return (
          <MobileSheet
            key={v}
            open={open && view === v}
            title={meta.title}
            description={meta.description}
            panelClassName={meta.panel}
            onClose={onClose}
            onBack={meta.back ? () => setView(meta.back!) : undefined}
          >
            {v === "list" && (
              <ObservationsListSheet
                onSelectObservation={(obs) => {
                  setSelectedObs({ ...obs, propertiesSchema: obs.properties_schema });
                  setView("log");
                }}
                onEditObservation={(obs) => {
                  setSelectedObs({ ...obs, propertiesSchema: obs.properties_schema });
                  setView("edit");
                }}
                onCreateNew={() => setView("new")}
              />
            )}
            {v === "log" && selectedObs && (
              <LogOccurrenceSheet observation={selectedObs} onSaved={onSaved} />
            )}
            {v === "new" && (
              <ObservationSheet
                onSaved={(obs) => {
                  setSelectedObs(obs);
                  setView("log");
                }}
              />
            )}
            {v === "edit" && selectedObs && (
              <ObservationSheet
                initialObservation={{
                  id: selectedObs.id,
                  title: selectedObs.title,
                  eye: selectedObs.eye,
                  body_zone: selectedObs.body_zone,
                  category: selectedObs.category,
                  notes: selectedObs.notes,
                  propertiesSchema: selectedObs.propertiesSchema ?? undefined,
                }}
                onSaved={(obs) => {
                  setSelectedObs((prev) => (prev ? { ...prev, ...obs } : null));
                  setView("list");
                }}
              />
            )}
          </MobileSheet>
        );
      })}
    </>
  );
}
