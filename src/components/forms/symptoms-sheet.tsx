import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropHalfIcon,
  FireIcon,
  SunIcon,
  WaveSineIcon,
  LightningIcon,
  CircleHalfIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react";
import { formatGap } from "@/components/history/utils";
import { SYMPTOM_STATE_LABEL, SYMPTOM_STATE_COLOR } from "@/lib/symptom-state";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { SymptomStatusToday } from "@/types/domain";
import { getDayKey } from "@/lib/utils";
import { TRIGGER_OPTIONS } from "@/lib/constants";
import { queueSymptomEntry } from "@/lib/offline/symptoms-queue";
import { calcSymptomState } from "@/lib/symptom-state";
import { cn } from "@/lib/utils";
import type { SymptomIntensities, SaveSymptomEntryInput, TriggerType } from "@/types/domain";

type Props = {
  onSaved: () => void;
};

const SYMPTOM_FIELDS: {
  key: keyof SymptomIntensities;
  label: string;
  Icon: React.ElementType;
}[] = [
    { key: "dryness", label: "Sequedad", Icon: DropHalfIcon },
    { key: "burning", label: "Ardor", Icon: FireIcon },
    { key: "photophobia", label: "Fotofobia", Icon: SunIcon },
    { key: "blurry_vision", label: "V. borrosa", Icon: WaveSineIcon },
    { key: "stinging", label: "Pinchazos", Icon: LightningIcon },
    { key: "pressure", label: "Presión", Icon: CircleHalfIcon },
  ];

const INTENSITY_COLOR: Record<number, string> = {
  0: "var(--text-faint)",
  1: "var(--pain-low)",
  2: "var(--pain-low)",
  3: "var(--pain-low)",
  4: "var(--pain-mid)",
  5: "var(--pain-mid)",
  6: "var(--pain-mid)",
  7: "var(--pain-high)",
  8: "var(--pain-high)",
  9: "var(--pain-high)",
  10: "var(--pain-high)",
};


const DEFAULT_INTENSITIES: SymptomIntensities = {
  dryness: 0,
  burning: 0,
  photophobia: 0,
  blurry_vision: 0,
  stinging: 0,
  pressure: 0,
};

export function SymptomsSheet({ onSaved }: Props) {
  const queryClient = useQueryClient();
  const [loggedAt, setLoggedAt] = useState<string>(new Date().toISOString());
  const [intensities, setIntensities] = useState<SymptomIntensities>(DEFAULT_INTENSITIES);
  const [selectedTriggers, setSelectedTriggers] = useState<TriggerType[]>([]);
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [loadedLast, setLoadedLast] = useState(false);

  const { data: todayStatus } = useQuery<SymptomStatusToday>({
    queryKey: ["symptoms/today"],
    queryFn: api.getSymptomStatusToday,
    staleTime: 60_000,
  });

  const latest = todayStatus?.latest ?? null;

  const loadLastValues = useCallback(() => {
    if (!latest) return;
    setIntensities({
      dryness: latest.intensities.dryness,
      burning: latest.intensities.burning,
      photophobia: latest.intensities.photophobia,
      blurry_vision: latest.intensities.blurry_vision,
      stinging: latest.intensities.stinging ?? 0,
      pressure: latest.intensities.pressure ?? 0,
    });
    setSelectedTriggers(latest.triggers ?? []);
    if (latest.note) setNote(latest.note);
    setLoadedLast(true);
  }, [latest]);

  const resetValues = useCallback(() => {
    setIntensities(DEFAULT_INTENSITIES);
    setSelectedTriggers([]);
    setNote("");
    setLoadedLast(false);
  }, []);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const setField = useCallback((key: keyof SymptomIntensities, val: number) => {
    setIntensities((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleTrigger = useCallback((val: TriggerType) => {
    setSelectedTriggers((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val],
    );
  }, []);

  const hasAnySymptom = Object.values(intensities).some((v) => (v ?? 0) > 0);

  const previewState = hasAnySymptom ? calcSymptomState(intensities) : null;

  async function handleSave() {
    if (!hasAnySymptom) return;
    setIsPending(true);
    const id = crypto.randomUUID();
    const day_key = getDayKey(loggedAt, timezone);
    const input: SaveSymptomEntryInput = {
      id,
      logged_at: loggedAt,
      day_key,
      intensities,
      triggers: selectedTriggers.length > 0 ? selectedTriggers : undefined,
      note: note.trim() || undefined,
    };

    try {
      await api.saveSymptomEntry(input);
    } catch {
      if (!navigator.onLine) {
        await queueSymptomEntry(input);
        toast.success("Guardado sin conexión. Se enviará al reconectar.");
        queryClient.invalidateQueries({ queryKey: ["symptoms/today"] });
        onSaved();
        return;
      }
      toast.error("No se pudo guardar. Intenta de nuevo.");
      setIsPending(false);
      return;
    }

    toast.success("Síntomas guardados");
    queryClient.invalidateQueries({ queryKey: ["symptoms/today"] });
    queryClient.invalidateQueries({ queryKey: ["history"] });
    onSaved();
  }

  return (
    <>
      <div className="space-y-5 pb-4">
        {/* Date/time */}
        <div className="space-y-2">
          <p className="section-label">Fecha y hora</p>
          <div className="flex items-center gap-2">
            <DateTimePicker
              value={loggedAt}
              onChange={(v) => { if (v) setLoggedAt(v); }}
              max={new Date()}
              className="flex-1"
            />
          </div>
        </div>

        {/* Symptom sliders — compact single-row per symptom */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label mb-0">1. Intensidad de síntomas</p>
          </div>

          {latest && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-[12px] bg-[var(--surface-el)] px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)]">
                  <ClockCounterClockwiseIcon size={13} color="var(--text-muted)" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug">
                    Último registro · hace {formatGap(latest.logged_at, new Date().toISOString())}
                  </p>
                  <p className="text-[14px] font-medium leading-snug flex items-center gap-1">
                    <span className="text-[var(--text-muted)]">{SYMPTOM_STATE_LABEL[latest.calculated_state]}</span>
                    {previewState && (
                      <>
                        <span className="text-[var(--text-faint)]">→</span>
                        <span style={{ color: SYMPTOM_STATE_COLOR[previewState] }}>{SYMPTOM_STATE_LABEL[previewState]}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              {loadedLast ? (
                <Button variant="tinted" size="sm" onClick={resetValues} className="shrink-0">
                  Empezar de cero
                </Button>
              ) : (
                <Button variant="tinted" size="sm" onClick={loadLastValues} className="shrink-0">
                  Cargar
                </Button>
              )}
            </div>
          )}

          {SYMPTOM_FIELDS.map(({ key, label, Icon }) => {
            const val = (intensities[key] ?? 0) as number;
            const color = INTENSITY_COLOR[val];
            return (
              <div key={key} className="grid items-center gap-3" style={{ gridTemplateColumns: "96px 1fr 36px" }}>
                <span className="flex items-center gap-2 min-w-0">
                  <Icon size={14} className="shrink-0 text-[var(--text-faint)]" />
                  <span className="truncate text-[13px] font-medium text-[var(--text-muted)]">{label}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={val}
                  aria-label={label}
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={val}
                  className="pain-range w-full"
                  style={{ "--track-bg": `linear-gradient(to right, ${color} ${val * 10}%, var(--surface-el) ${val * 10}%)`, "--thumb-color": color } as React.CSSProperties}
                  onChange={(e) => setField(key, Number(e.target.value))}
                />
                <span
                  className="mono text-right text-[15px] font-bold tabular-nums"
                  style={{ color }}
                >
                  {val}
                </span>
              </div>
            );
          })}

        </div>

        {/* Triggers */}
        <div className="space-y-2">
          <p className="section-label">2. Posibles desencadenantes <span className="font-normal text-[var(--text-faint)]">(opcional)</span></p>
          <div className="flex flex-wrap gap-2.5">
            {TRIGGER_OPTIONS.map((opt) => {
              const val = opt.value as TriggerType;
              const active = selectedTriggers.includes(val);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleTrigger(val)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[13px] font-medium transition duration-[120ms] ease-out active:scale-95",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <p className="section-label">3. Nota adicional <span className="font-normal text-[var(--text-faint)]">(opcional)</span></p>
          <textarea
            className="w-full resize-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] min-h-[80px]"
            maxLength={200}
            placeholder="¿Quieres agregar algún detalle sobre cómo te sientes?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-right text-[12px] text-[var(--text-faint)]">{note.length}/200</p>
        </div>
      </div>

      <div
        className="sticky bottom-0 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 60%, transparent)" }}
      >
        <Button
          className="w-full"
          disabled={isPending || !hasAnySymptom}
          onClick={handleSave}
        >
          <CheckCircleIcon size={16} className="mr-2 shrink-0" />
          {isPending ? "Guardando..." : "Guardar registro"}
        </Button>
      </div>
    </>
  );
}

function previewStateColor(state: string): string {
  if (state === "brote" || state === "reactivo") return "var(--pain-high)";
  if (state === "sensible") return "var(--pain-mid)";
  return "var(--pain-low)";
}
