import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SleepHoursInput } from "@/components/ui/sleep-hours-input";
import { SleepQualitySelector } from "@/components/ui/sleep-quality-selector";
import { StatusBanner } from "@/components/ui/status-banner";
import { api } from "@/lib/api";
import type { ActionState, SleepQuality } from "@/types/domain";

function parseSleepHours(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  const clamped = Math.min(12, Math.max(0, parsed));
  return Math.round(Math.round(clamped / 0.5) * 0.5 * 10) / 10;
}

function SleepSheetSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div className="h-4 w-32 rounded-md bg-[var(--surface)]" />
          <div className="h-7 w-16 rounded-md bg-[var(--surface)]" />
        </div>
        <div className="h-[168px] rounded-[16px] border border-[var(--border)] bg-[var(--surface)]" />
        <div className="h-3 w-52 rounded-md bg-[var(--surface)]" />
      </div>
      <div className="space-y-3">
        <div className="h-3 w-36 rounded-md bg-[var(--surface)]" />
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[72px] rounded-[10px] bg-[var(--surface)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

type SleepSheetProps = {
  onSaved: () => void;
};

export function SleepSheet({ onSaved }: SleepSheetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sleepHours, setSleepHours] = useState("8");
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    api.getTodaySleep()
      .then((record) => {
        if (record) {
          setExistingId(record.id);
          setIsUpdating(true);
          setSleepHours(String(record.sleep_hours));
          setSleepQuality(record.sleep_quality as SleepQuality);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    const hours = parseSleepHours(sleepHours);
    if (hours === null) {
      setState({ status: "error", message: "Ingresa horas validas." });
      return;
    }
    if (sleepQuality === null) {
      setState({ status: "error", message: "Selecciona la calidad del sueno." });
      return;
    }

    const input = {
      id: existingId ?? crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
      sleepHours: hours,
      sleepQuality,
    };

    setIsPending(true);
    try {
      await api.saveSleep(input);
      onSaved();
    } catch {
      setState({ status: "error", message: "No se pudo guardar. Intenta de nuevo." });
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
      {isLoading ? (
        <SleepSheetSkeleton />
      ) : (
        <>
          {state.status !== "idle" && state.message ? (
            <StatusBanner state={state} />
          ) : null}
          <SleepHoursInput value={sleepHours} onChange={setSleepHours} />
          <SleepQualitySelector value={sleepQuality} onChange={setSleepQuality} />
        </>
      )}
      <Button
        className="w-full"
        disabled={isPending || isLoading}
        type="button"
        onClick={handleSave}
      >
        {isPending ? "Guardando..." : isUpdating ? "Actualizar sueno" : "Guardar sueno"}
      </Button>
    </div>
  );
}
