import {
  DashboardCorrelationChart,
  DashboardDropsChart,
  DashboardDropsWeekdayChart,
  DashboardTrendChart,
  DashboardTriggerPainChart,
} from "@/components/dashboard/dashboard-charts";
import type { TriggerType, TherapyCorrelation } from "@/types/domain";
import { painColor } from "@/lib/pain";

type TrendPoint = {
  dayKey: string;
  label: string;
  eyelidPain: number | null;
  templePain: number | null;
  masseterPain: number | null;
  cervicalPain: number | null;
  orbitalPain: number | null;
};

type DropsDayPoint = {
  dayKey: string;
  label: string;
  quantities: Record<string, number>;
};

type CorrelationPoint = {
  sleepHours: number;
  masseterPain: number;
};

type TriggerStat = {
  triggerType: TriggerType;
  days: number;
};

type TriggerZoneStat = {
  triggerType: TriggerType;
  avgEyelidPain: number;
  avgTemplePain: number;
  days: number;
};

type WeekdayDropAvg = {
  weekday: number;
  label: string;
  avg: number | null;
  uniqueDays: number;
};

export type DashboardSummaryData = {
  ok: true;
  timezone: string;
  trend: {
    points: TrendPoint[];
    daysWithData: number;
    average7d: number | null;
    average30d: number | null;
  };
  drops: {
    dropTypes: string[];
    points: DropsDayPoint[];
  };
  dropsByWeekday: WeekdayDropAvg[];
  highPainTriggerStats: TriggerStat[];
  triggerZonePainStats: TriggerZoneStat[];
};

export type DashboardCorrelationsData = {
  ok: true;
  timezone: string;
  correlation: {
    minimumRequired: number;
    sampleSize: number;
    spearman: number | null;
    insight: string;
    points: CorrelationPoint[];
  };
  therapyCorrelation: TherapyCorrelation | null;
};

const TRIGGER_LABELS: Record<TriggerType, string> = {
  climate: "Clima",
  humidifier: "Humidificador",
  stress: "Estres",
  screens: "Pantallas",
  tv: "TV",
  ergonomics: "Ergonomia",
  exercise: "Ejercicio",
  other: "Otro",
};

function formatAverage(value: number | null) {
  if (value === null) return "--";
  return value.toFixed(1);
}

export function DashboardScreen({ summary, correlations }: { summary: DashboardSummaryData | undefined; correlations: DashboardCorrelationsData | undefined }) {
  const hasTrendData = summary ? summary.trend.daysWithData > 0 : false;
  const hasDropsData = summary ? summary.drops.dropTypes.length > 0 : false;
  const hasCorrelationChart = correlations ? correlations.correlation.sampleSize >= correlations.correlation.minimumRequired : false;
  const hasTriggerStats = summary ? summary.highPainTriggerStats.length > 0 : false;
  const hasTriggerZoneStats = summary ? summary.triggerZonePainStats.length > 0 : false;

  return (
    <section className="space-y-10">
      <p className="text-center text-[13px] text-[var(--text-muted)] italic">
        Basado en datos de los ultimos 90 dias
      </p>

      <section>
        <p className="section-label">Promedio por dia</p>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {summary && summary.dropsByWeekday.some((d) => d.avg !== null) ? (
            <DashboardDropsWeekdayChart data={summary.dropsByWeekday} />
          ) : (
            <div className="h-[120px] rounded-[12px] chart-bg" />
          )}
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">
            {summary && summary.dropsByWeekday.some((d) => d.avg !== null)
              ? "Gotas promedio por dia de la semana."
              : "Registra gotas para ver el patron semanal."}
          </p>
        </div>
      </section>

      <section>
        <p className="section-label">Gotas por dia</p>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {hasDropsData && summary ? (
            <DashboardDropsChart
              dropTypes={summary.drops.dropTypes}
              points={summary.drops.points}
            />
          ) : (
            <div className="mb-4 h-[220px] rounded-[12px] chart-bg" />
          )}
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">
            {hasDropsData
              ? "Gotas registradas por tipo."
              : "Registra gotas para ver el consumo por tipo."}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="section-label">Tendencia</p>
          <div className="rounded-[999px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--text-muted)] mono">
            7d {formatAverage(summary?.trend.average7d ?? null)} / 30d{" "}
            {formatAverage(summary?.trend.average30d ?? null)}
          </div>
        </div>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {hasTrendData && summary ? (
            <DashboardTrendChart trendPoints={summary.trend.points} />
          ) : (
            <div className="mb-4 h-[220px] rounded-[12px] chart-bg" />
          )}
          <p className="text-[13px] text-[var(--text-muted)]">
            {hasTrendData && summary
              ? `Datos en ${summary.trend.daysWithData} dias dentro de la ventana de 30 dias.`
              : "Registra al menos 1 dia para activar la tendencia de dolor por zona."}
          </p>
        </div>
      </section>

      <section>
        <p className="section-label">Triggers ↔ parpados y sienes</p>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {hasTriggerZoneStats && summary ? (
            <DashboardTriggerPainChart stats={summary.triggerZonePainStats} />
          ) : (
            <div className="mb-4 h-[220px] rounded-[12px] chart-bg" />
          )}
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">
            {hasTriggerZoneStats
              ? "Dolor promedio en parpados y sienes por tipo de trigger."
              : "Registra triggers para ver su impacto en parpados y sienes."}
          </p>
        </div>
      </section>

      <section>
        <p className="section-label">Triggers en dolor alto</p>
        {hasTriggerStats && summary ? (
          <div className="space-y-3 text-[13px] text-[var(--text-muted)]">
            {summary.highPainTriggerStats.map((item, index) => (
              <div
                key={item.triggerType}
                className={
                  index < summary.highPainTriggerStats.length - 1
                    ? "flex items-center justify-between border-b border-[var(--border)] pb-3"
                    : "flex items-center justify-between"
                }
              >
                <span>{TRIGGER_LABELS[item.triggerType]}</span>
                <span className="mono">{item.days} dias</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--text-muted)]">
            Aun no hay coincidencias de triggers en dias de dolor alto (general 7-10).
          </p>
        )}
      </section>

      {correlations && (
        <>
          <section>
            <p className="section-label">Correlacion sueno ↔ dolor</p>
            <p className="mb-3 text-[15px] text-[var(--text-primary)]">
              {correlations.correlation.insight}
            </p>
            <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
              {hasCorrelationChart ? (
                <DashboardCorrelationChart correlationPoints={correlations.correlation.points} />
              ) : (
                <div className="mb-4 h-[200px] rounded-[12px] chart-bg" />
              )}
              <p className="mono text-[12px] text-[var(--text-muted)]">
                {correlations.correlation.spearman !== null
                  ? `rho = ${correlations.correlation.spearman.toFixed(3)}`
                  : "rho = --"}{" "}
                · n = {correlations.correlation.sampleSize} · minimo{" "}
                {correlations.correlation.minimumRequired}
              </p>
            </div>
          </section>

          {correlations.therapyCorrelation && correlations.therapyCorrelation.therapyDays >= 3 && (() => {
            const tc = correlations.therapyCorrelation;
            const delta = +(tc.avgPainBaseline - tc.avgPainAfterTherapy).toFixed(2);
            return (
              <section>
                <p className="section-label">Impacto de terapia miofascial</p>
                <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-5 space-y-3">
                  <p className="text-[12px] text-[var(--text-faint)]">{tc.therapyDays} sesiones registradas</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[12px] bg-[var(--surface)] p-3">
                      <p className="section-label mb-1">Dolor siguiente día</p>
                      <p className="mono text-[22px] font-medium" style={{ color: painColor(tc.avgPainAfterTherapy) }}>
                        {tc.avgPainAfterTherapy.toFixed(1)}
                      </p>
                    </div>
                    <div className="rounded-[12px] bg-[var(--surface)] p-3">
                      <p className="section-label mb-1">Línea base</p>
                      <p className="mono text-[22px] font-medium" style={{ color: painColor(tc.avgPainBaseline) }}>
                        {tc.avgPainBaseline.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="text-[13px]" style={{ color: delta > 0 ? "var(--pain-low)" : "var(--text-muted)" }}>
                    {delta > 0
                      ? `La terapia se asocia con ${delta} pts menos de dolor al dia siguiente.`
                      : "No se observa reduccion de dolor post-terapia aun."}
                  </p>
                </div>
              </section>
            );
          })()}
        </>
      )}
    </section>
  );
}
