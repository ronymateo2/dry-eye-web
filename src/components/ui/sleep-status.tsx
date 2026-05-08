import { lazy, Suspense, useEffect, useState } from "react";
import { MoonIcon, CaretRightIcon } from "@phosphor-icons/react";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const SleepSheet = lazy(() =>
  import("@/components/forms/sleep-sheet").then((m) => ({ default: m.SleepSheet }))
);

const QUALITY_LABELS: Record<string, string> = {
  muy_malo: "Muy malo",
  malo: "Malo",
  regular: "Regular",
  bueno: "Bueno",
  excelente: "Excelente",
};

type SleepData = Awaited<ReturnType<typeof api.getTodaySleep>>;

export function SleepStatus() {
  const [sleep, setSleep] = useState<SleepData | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.getTodaySleep()
      .then((record) => setSleep(record))
      .catch(() => setSleep(null));
  }, []);

  const hasSleep = sleep && sleep !== null;
  const isLoading = sleep === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[48px] items-center gap-3 px-1 animate-pulse">
        <span className="h-4 w-4 rounded-full bg-[var(--surface-el)]" />
        <span className="h-3.5 w-28 rounded-sm bg-[var(--surface-el)]" />
      </div>
    );
  }

  const label = hasSleep
    ? `Sueño · ${sleep.sleep_hours}h · ${QUALITY_LABELS[sleep.sleep_quality] ?? sleep.sleep_quality}`
    : "Sueño · Sin registro";

  const sheetTitle = hasSleep ? "Editar sueño" : "Sueño de hoy";
  const sheetDescription = hasSleep
    ? "Modifica las horas y calidad de sueño de anoche."
    : "Registra las horas y calidad de sueño de anoche.";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-[48px] w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left",
          "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
          "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
        )}
        aria-label={hasSleep ? "Editar sueño de hoy" : "Registrar sueño de hoy"}
      >
        <MoonIcon size={16} className="shrink-0 text-[var(--text-muted)]" />
        <span className={cn(
          "text-[13px]",
          hasSleep ? "text-[var(--text-muted)]" : "text-[var(--text-faint)]",
        )}>
          {label}
        </span>
        <CaretRightIcon size={10} className="ml-auto shrink-0 text-[var(--text-faint)]" />
      </button>

      <MobileSheet
        description={sheetDescription}
        open={open}
        title={sheetTitle}
        onClose={() => setOpen(false)}
      >
        <Suspense fallback={null}>
          <SleepSheet
            onSaved={() => {
              setOpen(false);
              api.getTodaySleep().then((record) => setSleep(record)).catch(() => setSleep(null));
            }}
          />
        </Suspense>
      </MobileSheet>
    </>
  );
}
