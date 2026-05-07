import { useState } from "react";
import { PillIcon, CheckIcon } from "@phosphor-icons/react";
import type { DisplayMedicationIntake, DisplayMedicationGroup } from "./types";
import { formatTime } from "./utils";

function MedicationRow({ intake }: { intake: DisplayMedicationIntake }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const hasNotes = !!intake.notes;

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-3">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(92,184,90,0.15)]">
          <CheckIcon size={11} color="var(--pain-low)" weight="bold" />
        </div>
        <span className="flex-1 truncate text-[14px] font-normal text-[var(--text-primary)]">
          {intake.medicationName || "Medicamento"}
        </span>
        {intake.dosageTaken ? (
          <span className="shrink-0 text-[13px] font-semibold text-[var(--accent)]">
            {intake.dosageTaken}
          </span>
        ) : null}
      </div>

      {hasNotes && (
        <div className="mt-0.5 pl-8">
          <button
            onClick={() => setNotesOpen((v) => !v)}
            className="text-[11px] font-medium text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)]"
          >
            {notesOpen ? "Ocultar nota" : "Ver nota"}
          </button>
          <div
            style={{
              display: "grid",
              gridTemplateRows: notesOpen ? "1fr" : "0fr",
              transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div className="overflow-hidden">
              <p className="pt-1 text-[12px] leading-snug text-[var(--text-muted)]">
                {intake.notes}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MedicationGroupCard({ item, timezone }: { item: DisplayMedicationGroup; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  return (
    <article className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 pt-3.5 pb-3">
      <div className="flex items-center justify-between gap-3 mb-0.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
          >
            <PillIcon size={15} color="var(--accent)" />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">Pastillas</p>
            <p className="mono text-[11px] text-[var(--text-muted)]">{time}</p>
          </div>
        </div>
        <div
          className="flex shrink-0 items-center gap-2 rounded-[10px] px-2.5 py-1.5"
          style={{ background: "color-mix(in srgb, var(--pain-low) 12%, transparent)" }}
        >
          <CheckIcon style={{ color: "var(--pain-low)" }} size={13} weight="bold" />
          <span className="mono text-[15px] font-semibold tabular-nums" style={{ color: "var(--pain-low)" }}>
            {item.intakes.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {item.intakes.map((intake) => (
          <MedicationRow key={intake.id} intake={intake} />
        ))}
      </div>
    </article>
  );
}

export function MedicationIntakeCard({ item, timezone }: { item: DisplayMedicationIntake; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  return (
    <article className="flex items-start gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
        <PillIcon size={16} color="var(--accent)" weight="fill" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium text-[var(--text-primary)]">
          {item.medicationName ?? "Medicamento"}
        </span>
        <span className="mono text-[11px] text-[var(--text-faint)]">
          {item.dosageTaken ? `${item.dosageTaken} · ` : ""}{time}
        </span>
        {item.notes && (
          <span className="mt-1 text-[12px] italic text-[var(--text-muted)]">"{item.notes}"</span>
        )}
      </div>
    </article>
  );
}