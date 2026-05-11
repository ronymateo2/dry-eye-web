import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DropsPanel } from "@/components/treatments/drops-panel";
import { MedicationsPanel } from "@/components/treatments/medications-panel";

export default function TreatmentsPage() {
  const [tab, setTab] = useState<"drops" | "pills">(
    () => new URLSearchParams(window.location.search).get("tab") === "pills" ? "pills" : "drops",
  );
  const reducedMotion = useReducedMotion();

  return (
    <section className="space-y-6">
      <SegmentedControl
        options={[
          { label: "Gotas", value: "drops" },
          { label: "Pastillas", value: "pills" },
        ]}
        value={tab}
        onChange={setTab}
        tone="quiet"
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
        >
          {tab === "drops" ? <DropsPanel /> : <MedicationsPanel />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
