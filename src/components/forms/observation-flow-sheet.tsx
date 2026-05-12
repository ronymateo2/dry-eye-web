import { useCallback, useEffect, useMemo } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { StackedSheet, type SheetLayer } from "@/components/layout/stacked-sheet";
import { useSheetStack } from "@/lib/hooks/use-sheet-stack";
import { ObservationsListSheet } from "./observations-list-sheet";
import { LogOccurrenceSheet } from "./log-occurrence-sheet";
import { ObservationSheet } from "./observation-sheet";
import type { ObservationRecord } from "@/types/domain";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ObservationFlowSheet({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const { layers: stackLayers, push, pop, clear } = useSheetStack();

  useEffect(() => {
    if (!open) clear();
  }, [open, clear]);

  const handleOccurrenceSaved = useCallback(() => {
    window.dispatchEvent(new CustomEvent("history:refresh"));
    queryClient.invalidateQueries({ queryKey: ["history"] });
    queryClient.invalidateQueries({ queryKey: ["observations"] });
    queryClient.invalidateQueries({ queryKey: ["observation-occurrences"] });
    pop();
  }, [pop, queryClient]);

  const handleSelectObs = useCallback(
    (obs: ObservationRecord) => {
      push({
        key: `log-${obs.id}`,
        title: "Registrar ocurrencia",
        description: "Registra cuando ocurre esta observacion.",
        content: (
          <LogOccurrenceSheet
            observation={{ ...obs, propertiesSchema: obs.properties_schema }}
            onSaved={handleOccurrenceSaved}
          />
        ),
      });
    },
    [push, handleOccurrenceSaved],
  );

  const handleEditObs = useCallback(
    (obs: ObservationRecord) => {
      push({
        key: `edit-${obs.id}`,
        title: "Editar observacion",
        description: "Modifica esta observacion y sus propiedades.",
        content: (
          <ObservationSheet
            initialObservation={{
              id: obs.id,
              title: obs.title,
              eye: obs.eye,
              body_zone: obs.body_zone,
              body_zone_custom: obs.body_zone_custom,
              category: obs.category,
              propertiesSchema: obs.properties_schema ?? undefined,
            }}
            onSaved={() => pop()}
          />
        ),
      });
    },
    [push, pop],
  );

  const handleCreateNew = useCallback(() => {
    push({
      key: "new",
      title: "Nueva observacion",
      description: "Registra algo que notaste.",
      content: (
        <ObservationSheet
          onSaved={(obs) => {
            pop();
            push({
              key: `log-${obs.id}`,
              title: "Registrar ocurrencia",
              description: "Registra cuando ocurre esta observacion.",
              content: (
                <LogOccurrenceSheet
                  observation={obs}
                  onSaved={handleOccurrenceSaved}
                />
              ),
            });
          }}
        />
      ),
    });
  }, [push, pop, handleOccurrenceSaved]);

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

  return (
    <StackedSheet
      open={open}
      onClose={onClose}
      stack={{ layers: stackLayers, push, pop, clear }}
      baseLayer={baseLayer}
      panelClassName="!h-[95dvh]"
    />
  );
}
