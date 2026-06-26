import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  GearIcon,
  CaretRightIcon,
  SlidersHorizontalIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { SleepStatus } from "@/components/ui/sleep-status";
import { PainCheckInCompact } from "@/components/today/pain-check-in-compact";
import { TodayWidgetList } from "@/components/today/today-widget-list";
import { TodayWidgetEditor } from "@/components/today/today-widget-editor";
import { useWidgetConfig } from "@/components/today/use-widget-config";
import { dropKeys, dropTypeKeys, vialKeys } from "@/features/drops";
import { calendarKeys } from "@/features/calendar";
import { medicationKeys } from "@/features/medications";
import { symptomKeys } from "@/features/symptoms";
import { sleepKeys } from "@/features/sleep";
import { checkInKeys } from "@/features/check-ins";
import { todayApi, todayKeys, type TodayBundle } from "@/features/today";
import { cn } from "@/lib/utils";

function seedTodayCaches(qc: QueryClient, bundle: TodayBundle) {
  const seed = (key: readonly unknown[], val: unknown) => {
    if (qc.getQueryData(key) === undefined) qc.setQueryData(key, val);
  };
  seed(checkInKeys.last(), bundle.checkInLast);
  seed(sleepKeys.today(), bundle.sleepToday);
  seed(dropKeys.lastPerType(), bundle.dropsLastPerType);
  seed(calendarKeys.eventsToday(), bundle.calendarEventsToday);
  seed(medicationKeys.list(), bundle.medications);
  seed(medicationKeys.intakesToday(), bundle.medicationIntakesToday);
  seed(medicationKeys.intakesLastPerMed(), bundle.medicationIntakesLastPerMed);
  seed(vialKeys.active(), bundle.vialsActive);
  seed(symptomKeys.today(), bundle.symptomsToday);
  seed(dropTypeKeys.list(), bundle.dropTypes);
  seed(dropKeys.today(), bundle.dropsToday);
}

const SKELETON_WIDGET_HEIGHTS = [88, 120, 72, 64, 110];

function TodaySkeleton() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--text-faint)]">
            Tus módulos
          </span>
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-el)]" />
        </div>
        <div className="space-y-5">
          {SKELETON_WIDGET_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{ height: h }}
              className="animate-pulse rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]"
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--text-faint)]">
          Siempre visible
        </span>
        <div className="space-y-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex min-h-[48px] items-center gap-3 px-2 py-1.5"
            >
              <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-[var(--surface-el)]" />
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--surface-el)]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TodayContent() {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const { config, reorder, toggleVisible, reset } = useWidgetConfig();

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--text-faint)]">
            Tus módulos
          </span>
          <button
            type="button"
            aria-pressed={editMode}
            onClick={() => setEditMode((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--text-muted)]",
              "transition-[color,transform] duration-[160ms] ease-out hover:text-[var(--accent)] active:scale-[0.96]",
            )}
          >
            {editMode ? (
              <CheckIcon size={13} weight="bold" />
            ) : (
              <SlidersHorizontalIcon size={13} />
            )}
            {editMode ? "Hecho" : "Personalizar"}
          </button>
        </div>

        <div key={editMode ? "edit" : "view"} className="anim-fade-up">
          {editMode ? (
            <TodayWidgetEditor
              config={config}
              onReorder={reorder}
              onToggle={toggleVisible}
              onReset={reset}
            />
          ) : (
            <TodayWidgetList config={config} onLongPress={() => setEditMode(true)} />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[var(--text-faint)]">
          Siempre visible
        </span>
        <div className="space-y-0.5">
          <PainCheckInCompact />
          <SleepStatus />
          <button
            type="button"
            onClick={() => navigate("/treatments")}
            className={cn(
              "flex min-h-[48px] w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left",
              "text-[15px] text-[var(--text-muted)]",
              "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
              "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
            )}
            aria-label="Gestionar tratamientos"
          >
            <GearIcon size={16} className="shrink-0" />
            Gestionar tratamientos
            <CaretRightIcon size={10} className="ml-auto shrink-0 text-[var(--text-faint)]" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function TodayPage() {
  const queryClient = useQueryClient();

  const { isPending } = useQuery({
    queryKey: todayKeys.all,
    queryFn: async () => {
      const bundle = await todayApi.getBundle();
      seedTodayCaches(queryClient, bundle);
      return bundle;
    },
    staleTime: 30_000,
  });

  if (isPending) return <TodaySkeleton />;
  return <TodayContent />;
}
