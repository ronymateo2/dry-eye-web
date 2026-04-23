import {
  DashboardCorrelationChart,
  DashboardDropsChart,
  DashboardDropsWeekdayChart,
  DashboardTrendChart,
  DashboardTriggerPainChart,
} from "@/components/dashboard/dashboard-charts";
import type { TriggerType } from "@/types/domain";

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

export type DashboardData = {
  ok: true;
  timezone: string;
  trend: {
    points: TrendPoint[];
    daysWithData: number;
    average7d: number | null;
    average30d: number | null;
  };
  correlation: {
    minimumRequired: number;
    sampleSize: number;
    spearman: number | null;
    insight: string;
    points: CorrelationPoint[];
  };
  highPainTriggerStats: TriggerStat[];
  triggerZonePainStats: TriggerZoneStat[];
  drops: {
    dropTypes: string[];
    points: DropsDayPoint[];
  };
  dropsByWeekday: WeekdayDropAvg[];
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

export function DashboardScreen({ data }: { data: DashboardData }) {
  const hasTrendData = data.trend.daysWithData > 0;
  const hasDropsData = data.drops.dropTypes.length > 0;
  const hasCorrelationChart = data.correlation.sampleSize >= data.correlation.minimumRequired;
  const hasTriggerStats = data.highPainTriggerStats.length > 0;
  const hasTriggerZoneStats = data.triggerZonePainStats.length > 0;

  return (
    <section className="space-y-10">
      <section>
        <p className="section-label">Promedio por dia</p>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {data.dropsByWeekday.some((d) => d.avg !== null) ? (
            <DashboardDropsWeekdayChart data={data.dropsByWeekday} />
          ) : (
            <div className="h-[120px] rounded-[12px] chart-bg" />
          )}
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">
            {data.dropsByWeekday.some((d) => d.avg !== null)
              ? "Gotas promedio por dia de la semana."
              : "Registra gotas para ver el patron semanal."}
          </p>
        </div>
      </section>

      <section>
        <p className="section-label">Gotas por dia</p>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {hasDropsData ? (
            <DashboardDropsChart
              dropTypes={data.drops.dropTypes}
              points={data.drops.points}
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
            7d {formatAverage(data.trend.average7d)} / 30d{" "}
            {formatAverage(data.trend.average30d)}
          </div>
        </div>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {hasTrendData ? (
            <DashboardTrendChart trendPoints={data.trend.points} />
          ) : (
            <div className="mb-4 h-[220px] rounded-[12px] chart-bg" />
          )}
          <p className="text-[13px] text-[var(--text-muted)]">
            {hasTrendData
              ? `Datos en ${data.trend.daysWithData} dias dentro de la ventana de 30 dias.`
              : "Registra al menos 1 dia para activar la tendencia de dolor por zona."}
          </p>
        </div>
      </section>

      <section>
        <p className="section-label">Correlacion sueno ↔ dolor</p>
        <p className="mb-3 text-[15px] text-[var(--text-primary)]">
          {data.correlation.insight}
        </p>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {hasCorrelationChart ? (
            <DashboardCorrelationChart correlationPoints={data.correlation.points} />
          ) : (
            <div className="mb-4 h-[200px] rounded-[12px] chart-bg" />
          )}
          <p className="mono text-[12px] text-[var(--text-muted)]">
            {data.correlation.spearman !== null
              ? `rho = ${data.correlation.spearman.toFixed(3)}`
              : "rho = --"}{" "}
            · n = {data.correlation.sampleSize} · minimo{" "}
            {data.correlation.minimumRequired}
          </p>
        </div>
      </section>

      <section>
        <p className="section-label">Triggers ↔ parpados y sienes</p>
        <div className="rounded-[16px] bg-[var(--surface-card)] p-5">
          {hasTriggerZoneStats ? (
            <DashboardTriggerPainChart stats={data.triggerZonePainStats} />
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
        {hasTriggerStats ? (
          <div className="space-y-3 text-[13px] text-[var(--text-muted)]">
            {data.highPainTriggerStats.map((item, index) => (
              <div
                key={item.triggerType}
                className={
                  index < data.highPainTriggerStats.length - 1
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
    </section>
  );
}
