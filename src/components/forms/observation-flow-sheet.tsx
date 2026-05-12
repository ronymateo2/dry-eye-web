import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StackedSheet, type SheetLayer } from "@/components/layout/stacked-sheet";
import { ObservationsListSheet } from "./observations-list-sheet";
import { LogOccurrenceSheet } from "./log-occurrence-sheet";
import { ObservationSheet } from "./observation-sheet";
import type { PropertyDef } from "@/types/domain";

type SelectedObs = {
  id: string;
  title: string;
  eye: string;
  body_zone?: string | null;
  body_zone_custom?: string | null;
  category?: string | null;
  propertiesSchema?: PropertyDef[] | null;
};

type Secondary =
  | { type: "log"; obs: SelectedObs }
  | { type: "new" }
  | { type: "edit"; obs: SelectedObs };

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ObservationFlowSheet({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [secondary, setSecondary] = useState<Secondary | null>(null);

  useEffect(() => {
    if (!open) setSecondary(null);
  }, [open]);

  const handleOccurrenceSaved = () => {
    window.dispatchEvent(new CustomEvent("history:refresh"));
    queryClient.invalidateQueries({ queryKey: ["history"] });
    queryClient.invalidateQueries({ queryKey: ["observations"] });
    queryClient.invalidateQueries({ queryKey: ["observation-occurrences"] });
    setSecondary(null);
  };

  const layers: SheetLayer[] = [
    {
      key: "list",
      title: "Observaciones",
      description: "Selecciona una observacion para registrar.",
      content: (
        <ObservationsListSheet
          onSelectObservation={(obs) =>
            setSecondary({ type: "log", obs: { ...obs, propertiesSchema: obs.properties_schema } })
          }
          onEditObservation={(obs) =>
            setSecondary({ type: "edit", obs: { ...obs, propertiesSchema: obs.properties_schema } })
          }
          onCreateNew={() => setSecondary({ type: "new" })}
        />
      ),
    },
  ];

  if (secondary?.type === "log") {
    layers.push({
      key: "log",
      title: "Registrar ocurrencia",
      description: "Registra cuando ocurre esta observacion.",
      content: <LogOccurrenceSheet observation={secondary.obs} onSaved={handleOccurrenceSaved} />,
    });
  } else if (secondary?.type === "new") {
    layers.push({
      key: "new",
      title: "Nueva observacion",
      description: "Registra algo que notaste.",
      content: (
        <ObservationSheet
          onSaved={(obs) => setSecondary({ type: "log", obs })}
        />
      ),
    });
  } else if (secondary?.type === "edit") {
    layers.push({
      key: "edit",
      title: "Editar observacion",
      description: "Modifica esta observacion y sus propiedades.",
      content: (
        <ObservationSheet
          initialObservation={{
            id: secondary.obs.id,
            title: secondary.obs.title,
            eye: secondary.obs.eye,
            body_zone: secondary.obs.body_zone,
            body_zone_custom: secondary.obs.body_zone_custom,
            category: secondary.obs.category,
            propertiesSchema: secondary.obs.propertiesSchema ?? undefined,
          }}
          onSaved={() => setSecondary(null)}
        />
      ),
    });
  }

  return (
    <StackedSheet
      open={open}
      onClose={onClose}
      layers={layers}
      onPop={() => setSecondary(null)}
      panelClassName="!h-[95dvh]"
    />
  );
}
