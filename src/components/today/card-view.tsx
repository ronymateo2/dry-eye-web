import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { DayProjectionSheet } from "@/components/register/day-projection-sheet";
import { TopographicBg } from "@/components/ui/topographic-bg";
import { ViewDayButton, ViewToggle } from "./view-toggle";
import { TimelineRow } from "./timeline-row";
import { VialRow } from "./vial-row";
import { useScheduleData } from "./use-schedule-data";
import { useDiscardVial } from "./use-discard-vial";

export function CardView({
  data,
  view,
  setView,
}: {
  data: ReturnType<typeof useScheduleData>;
  view: "card" | "hero";
  setView: (v: "card" | "hero") => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [projectionOpen, setProjectionOpen] = useState(false);

  const discardMutation = useDiscardVial(() => setConfirmingId(null));

  const { activeVials, scheduled, now, daySlots } = data;

  if (activeVials.length === 0 && scheduled.length === 0) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
        <TopographicBg position="calc(100% + 20px) -10px" size="600px" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-3">
          <p className="section-label mb-0">Próximas dosis</p>
          <div className="flex shrink-0 items-center gap-2">
            {scheduled.length > 0 && <ViewDayButton onClick={() => setProjectionOpen(true)} />}
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>

        {scheduled.length > 0 && (
          <div className="space-y-0">
            {scheduled.map((entry, i) => (
              <TimelineRow
                key={entry.drop_type_id}
                entry={entry}
                index={i}
                now={now}
                vial={null}
              />
            ))}
          </div>
        )}

        {activeVials.length > 0 && scheduled.length > 0 && (
          <div className="h-px bg-[var(--border)]" />
        )}

        {activeVials.length > 0 && (
          <div className="space-y-0.5">
            <p className="section-label mb-0">Viales activos</p>
            <div className="space-y-0">
              <AnimatePresence initial={false}>
                {activeVials.map((vial, i) => (
                  <VialRow
                    key={vial.id}
                    vial={vial}
                    index={i}
                    now={now}
                    isConfirming={confirmingId === vial.id}
                    onRequestDiscard={() =>
                      setConfirmingId((prev) => (prev === vial.id ? null : vial.id))
                    }
                    onCancel={() => setConfirmingId(null)}
                    onConfirmDiscard={() => discardMutation.mutate(vial.id)}
                    isPending={discardMutation.isPending && confirmingId === vial.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
        </div>
      </div>

      <DayProjectionSheet
        open={projectionOpen}
        onClose={() => setProjectionOpen(false)}
        slots={daySlots}
        now={now}
      />
    </>
  );
}
