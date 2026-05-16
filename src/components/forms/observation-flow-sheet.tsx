import { useCallback, useEffect, useMemo } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { StackedSheet, type SheetLayer } from "@/components/layout/stacked-sheet";
import { useSheetStack } from "@/lib/hooks/use-sheet-stack";
import { ObservationsListSheet } from "./observations-list-sheet";
import { ObservationDetailSheet } from "./observation-detail-sheet";
import { LogOccurrenceSheet } from "./log-occurrence-sheet";
import { ObservationSheet } from "./observation-sheet";
import type { ObservationRecord, PrevOccurrence } from "@/types/domain";

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
    queryClient.invalidateQueries({ queryKey: ["observation-prev"] });
    pop();
  }, [pop, queryClient]);

  const pushLogOccurrence = useCallback(
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

  const pushEditObs = useCallback(
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
              use_intensity: obs.use_intensity,
              use_duration: obs.use_duration,
            }}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["observations"] });
              pop();
              pop();
            }}
          />
        ),
      });
    },
    [push, pop, queryClient],
  );

  const pushEditOccurrence = useCallback(
    (obs: ObservationRecord, occ: PrevOccurrence) => {
      push({
        key: `edit-occ-${occ.id}`,
        title: "Editar registro",
        description: "Modifica los datos de esta ocurrencia.",
        content: (
          <LogOccurrenceSheet
            observation={{ ...obs, propertiesSchema: obs.properties_schema }}
            initialOccurrence={occ}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["observation-prev", obs.id] });
              queryClient.invalidateQueries({ queryKey: ["observations"] });
              pop();
            }}
          />
        ),
      });
    },
    [push, pop, queryClient],
  );

  // Tap card body → opens instance list
  const handleSelectObs = useCallback(
    (obs: ObservationRecord) => {
      push({
        key: `detail-${obs.id}`,
        title: obs.title,
        description: "Registros de esta observacion.",
        content: (
          <ObservationDetailSheet
            observation={obs}
            onLogNew={() => pushLogOccurrence(obs)}
            onEdit={() => pushEditObs(obs)}
            onEditOccurrence={(occ) => pushEditOccurrence(obs, occ)}
          />
        ),
      });
    },
    [push, pushLogOccurrence, pushEditObs, pushEditOccurrence],
  );

  // + button → log occurrence directly
  const handleLogNew = useCallback(
    (obs: ObservationRecord) => {
      pushLogOccurrence(obs);
    },
    [pushLogOccurrence],
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
          onLogNew={handleLogNew}
          onCreateNew={handleCreateNew}
        />
      ),
    }),
    [handleSelectObs, handleLogNew, handleCreateNew],
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
