import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StackedSheet, type SheetLayer } from "@/components/layout/stacked-sheet";
import { ObservationsListSheet } from "./observations-list-sheet";
import { LogOccurrenceSheet } from "./log-occurrence-sheet";
import { ObservationSheet } from "./observation-sheet";
import type { ObservationRecord, PropertyDef } from "@/types/domain";

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

  const handleSelectObs = useCallback(
    (obs: ObservationRecord) =>
      setSecondary({ type: "log", obs: { ...obs, propertiesSchema: obs.properties_schema } }),
    [],
  );

  const handleEditObs = useCallback(
    (obs: ObservationRecord) =>
      setSecondary({ type: "edit", obs: { ...obs, propertiesSchema: obs.properties_schema } }),
    [],
  );

  const handleCreateNew = useCallback(() => setSecondary({ type: "new" }), []);

  const handleOccurrenceSaved = useCallback(() => {
    window.dispatchEvent(new CustomEvent("history:refresh"));
    queryClient.invalidateQueries({ queryKey: ["history"] });
    queryClient.invalidateQueries({ queryKey: ["observations"] });
    queryClient.invalidateQueries({ queryKey: ["observation-occurrences"] });
    setSecondary(null);
  }, [queryClient]);

  const baseLayer = useMemo<SheetLayer>(
    () => ({
      key: "list",
      title: "Observaciones",
      description: "Selecciona una observacion para registrar.",
      content: (
        <ObservationsListSheet
          onSelectObservation={handleSelectObs}
          onEditObservation={handleEditObs}
          onCreateNew={handleCreateNew}
        />
      ),
    }),
    [handleSelectObs, handleEditObs, handleCreateNew],
  );

  const secondaryLayer = useMemo<SheetLayer | null>(() => {
    if (!secondary) return null;

    if (secondary.type === "log") {
      return {
        key: "log",
        title: "Registrar ocurrencia",
        description: "Registra cuando ocurre esta observacion.",
        content: (
          <LogOccurrenceSheet observation={secondary.obs} onSaved={handleOccurrenceSaved} />
        ),
      };
    }

    if (secondary.type === "new") {
      return {
        key: "new",
        title: "Nueva observacion",
        description: "Registra algo que notaste.",
        content: (
          <ObservationSheet
            onSaved={(obs) => setSecondary({ type: "log", obs })}
          />
        ),
      };
    }

    return {
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
    };
  }, [secondary, handleOccurrenceSaved]);

  const layers = useMemo<SheetLayer[]>(
    () => (secondaryLayer ? [baseLayer, secondaryLayer] : [baseLayer]),
    [baseLayer, secondaryLayer],
  );

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
