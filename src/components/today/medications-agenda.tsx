import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { CaretRightIcon, PillIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { parseTimesJson } from "@/components/treatments/times-picker";

function makeTodayDateAtTime(timeStr: string, now: Date): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getCountdown(nextMs: number, now: number): { label: string; overdue: boolean; color: string } {
  const diffMs = nextMs - now;
  if (diffMs <= 0) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    const label = h > 0 ? `hace ${h}h ${m}m` : `hace ${m}m`;
    return { label, overdue: true, color: "var(--dose-overdue)" };
  }
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  const label = h > 0 ? `en ${h}h ${m}m` : `en ${m}m`;
  const rawProgress = 1 - diffMs / 86_400_000;
  const color = rawProgress < 0.5 ? "var(--dose-early)" : rawProgress < 0.8 ? "var(--dose-mid)" : "var(--dose-late)";
  return { label, overdue: false, color };
}

type MedScheduleItem = {
  medicationId: string;
  name: string;
  nextSlot: Date;
  detail: string;
  badgeLabel: string;
  badgeColor: string;
  overdue: boolean;
};

function buildSchedule(
  medications: Awaited<ReturnType<typeof api.getMedications>>,
  intakes: Awaited<ReturnType<typeof api.getLastIntakePerMedication>>,
  now: number,
): MedScheduleItem[] {
  const intakeMap = new Map(
    intakes.map((i) => [i.medication_id, i.last_logged_at ? new Date(i.last_logged_at).getTime() : null]),
  );
  const nowDate = new Date(now);
  const items: MedScheduleItem[] = [];

  for (const med of medications) {
    if (!med.times_json) continue;
    const times = parseTimesJson(med.times_json);
    if (times.length === 0) continue;

    const slots = times.map((t) => makeTodayDateAtTime(t, nowDate).getTime()).sort((a, b) => a - b);
    const lastLogged = intakeMap.get(med.id) ?? null;

    const minInterval = slots.length > 1
      ? Math.min(...slots.slice(1).map((s, i) => s - slots[i]))
      : 86_400_000;
    const earlyWindowMs = minInterval / 2;

    let nextSlot: number | null = null;
    for (const slot of slots) {
      if (lastLogged == null || slot > lastLogged + earlyWindowMs) {
        nextSlot = slot;
        break;
      }
    }

    if (nextSlot == null) {
      nextSlot = slots[0] + 86_400_000;
    }

    const countdown = getCountdown(nextSlot, now);
    const nextDate = new Date(nextSlot);
    const isTomorrow = nextDate.getDate() !== nowDate.getDate();

    items.push({
      medicationId: med.id,
      name: med.name,
      nextSlot: nextDate,
      detail: isTomorrow ? `${formatTime(nextDate)} (+1)` : formatTime(nextDate),
      badgeLabel: countdown.label,
      badgeColor: countdown.color,
      overdue: countdown.overdue,
    });
  }

  return items.sort((a, b) => a.nextSlot.getTime() - b.nextSlot.getTime());
}

function MedRow({ item, index, onClick }: { item: MedScheduleItem; index: number; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group grid min-h-[34px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] px-1 py-1 text-left",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
      )}
      aria-label={`Registrar ${item.name}. Próxima dosis ${item.detail}, ${item.badgeLabel}.`}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-4 w-[3px] shrink-0 rounded-full opacity-90 transition-[height,opacity] duration-[160ms] ease-out group-hover:h-5 group-hover:opacity-100"
          style={{ background: item.badgeColor }}
        />
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span
            className="truncate text-[17px] font-medium capitalize leading-none text-[var(--text-primary)]"
          >
            {item.name}
          </span>
          <span className="shrink-0 text-[13px] leading-none text-[var(--text-faint)]">·</span>
          <span className="truncate font-mono text-[13px] leading-none tabular-nums text-[var(--text-faint)]">
            {item.detail}
          </span>
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className="font-mono text-[15px] font-medium tabular-nums transition-transform duration-[160ms] ease-out group-hover:-translate-x-0.5"
          style={{ color: item.badgeColor, transition: "color 0.4s ease, transform 160ms ease-out" }}
        >
          {item.badgeLabel}
        </span>
        <CaretRightIcon
          aria-hidden
          size={9}
          weight="bold"
          className="translate-x-0 text-[var(--text-faint)] transition-[opacity,transform] duration-[160ms] ease-out group-hover:translate-x-0.5 group-hover:opacity-70 group-focus-visible:opacity-70"
        />
      </span>
    </motion.button>
  );
}

export function MedicationsAgenda() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: api.getMedications,
    staleTime: 60_000,
  });

  const { data: intakes = [] } = useQuery({
    queryKey: ["medication-intakes/last-per-med"],
    queryFn: api.getLastIntakePerMedication,
    staleTime: 60_000,
  });

  const scheduled = useMemo(() => {
    return buildSchedule(medications, intakes, now);
  }, [medications, intakes, now]);

  const openMedSheet = (medicationId?: string) => {
    window.dispatchEvent(
      new CustomEvent("quickactions:open", {
        detail: { sheet: "medication-intake", dropTypeId: medicationId },
      }),
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-0">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Próximas pastillas</p>
        </div>
        <div className="animate-pulse space-y-2 pt-2">
          <div className="h-10 w-full rounded-[9px] bg-[var(--surface-el)]" />
          <div className="h-10 w-full rounded-[9px] bg-[var(--surface-el)]" />
        </div>
      </div>
    );
  }

  if (scheduled.length === 0) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Próximas pastillas</p>
        </div>
        <button
          type="button"
          onClick={() => openMedSheet()}
          className={cn(
            "flex min-h-[48px] w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left",
            "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
            "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
          )}
        >
          <PillIcon size={16} className="shrink-0 text-[var(--text-faint)]" weight="fill" />
          <span className="text-[15px] text-[var(--text-faint)]">
            No tienes pastillas configuradas. Toca para agregar.
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <p className="section-label mb-0">Próximas pastillas</p>
      </div>
      <div className="space-y-0">
        {scheduled.map((item, i) => (
          <MedRow key={item.medicationId} item={item} index={i} onClick={() => openMedSheet(item.medicationId)} />
        ))}
      </div>
    </div>
  );
}