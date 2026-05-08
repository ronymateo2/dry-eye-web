import type { MedicationPhase } from "@/types/domain";

export function formatPhaseDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "");
}

export function PhaseListInline({ phasesJson }: { phasesJson: string }) {
  let phases: MedicationPhase[] = [];
  try {
    const parsed = JSON.parse(phasesJson);
    if (!Array.isArray(parsed)) return null;
    phases = parsed;
  } catch { return null; }
  if (phases.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const currentIdx = phases.findIndex(
    (p) => today >= p.start_date && (p.end_date === null || today <= p.end_date),
  );

  const current = currentIdx >= 0 ? phases[currentIdx] : null;
  const next = currentIdx >= 0 ? phases[currentIdx + 1] : phases.find((p) => today < p.start_date);
  const past = currentIdx > 0 ? phases[currentIdx - 1] : null;

  return (
    <div className="space-y-1 pt-1">
      {current && (
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
          <span className="text-[12px] text-[var(--text-muted)] leading-tight">
            {current.dosage}
            {current.label && ` · ${current.label}`}
            {current.end_date && ` · hasta ${formatPhaseDate(current.end_date)}`}
          </span>
        </div>
      )}
      {next && (
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-[var(--text-faint)] bg-transparent" />
          <span className="text-[11px] text-[var(--text-faint)] leading-tight">
            {next.dosage}
            {next.label && ` · ${next.label}`}
            {` · empieza ${formatPhaseDate(next.start_date)}`}
          </span>
        </div>
      )}
      {!current && !next && past && (
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-faint)] opacity-50" />
          <span className="text-[11px] text-[var(--text-faint)] leading-tight">
            {past.dosage}
            {past.label && ` · ${past.label}`}
            {` · terminó ${formatPhaseDate(past.end_date ?? past.start_date)}`}
          </span>
        </div>
      )}
      {phases.length > 2 && (
        <span className="block pl-3 text-[11px] text-[var(--text-faint)]">
          +{phases.length - (current && next ? 2 : current || next ? 1 : 0)} fases
        </span>
      )}
    </div>
  );
}
