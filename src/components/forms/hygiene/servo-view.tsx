import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { HygieneRecord } from "@/types/domain";

export function ServoView({
  records,
}: {
  records: HygieneRecord[];
}) {
  const {
    trajectoryData,
    distributionData,
    insight,
    dayCount,
    calibratedDayCount,
  } = useMemo(() => {
    const completed = records
      .filter((r) => r.status === "completed")
      .slice()
      .reverse();

    const ys = completed.map((r) => r.deviationValue ?? 0);
    const { slope, intercept } = (() => {
      const n = ys.length;
      if (n < 2) return { slope: 0, intercept: 0 };
      const sumX = (n * (n - 1)) / 2;
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = ys.reduce((s, y, i) => s + i * y, 0);
      const sumX2 = ys.reduce((s, _, i) => s + i * i, 0);
      const denom = n * sumX2 - sumX * sumX;
      if (denom === 0) return { slope: 0, intercept: sumY / n };
      return {
        slope: (n * sumXY - sumX * sumY) / denom,
        intercept: (sumY - ((n * sumXY - sumX * sumY) / denom) * sumX) / n,
      };
    })();

    const trajectoryData = completed.map((r, i) => ({
      label: `${r.dayKey.slice(5).replace("-", "/")} ${r.loggedAt.slice(11, 16)}`,
      friction: r.deviationValue,
      trend: Math.max(
        0,
        Math.min(5, Math.round((slope * i + intercept) * 10) / 10),
      ),
    }));

    const counts = [0, 0, 0, 0, 0, 0];
    for (const r of completed) {
      if (r.deviationValue !== null && r.deviationValue >= 0 && r.deviationValue <= 5)
        counts[r.deviationValue]++;
    }
    const distributionData = counts.map((count, val) => ({
      val: String(val),
      count,
    }));

    const calibrated = completed.filter((r) => r.deviationValue !== null && r.deviationValue > 0);
    let insight: string | null = null;
    if (calibrated.length >= 4) {
      const half = Math.floor(calibrated.length / 2);
      const firstAvg =
        calibrated.slice(0, half).reduce((a, b) => a + (b.deviationValue ?? 0), 0) /
        half;
      const secondAvg =
        calibrated.slice(half).reduce((a, b) => a + (b.deviationValue ?? 0), 0) /
        (calibrated.length - half);
      if (secondAvg < firstAvg - 0.5)
        insight = "Está costando menos con el tiempo. El hábito se está formando.";
      else if (secondAvg > firstAvg + 0.5)
        insight = "Está costando más últimamente. Eso significa que sigues moviéndote a pesar del esfuerzo.";
      else
        insight = "El esfuerzo se mantiene estable. Buen ritmo.";
    }

    return {
      trajectoryData,
      distributionData,
      insight,
      dayCount: completed.length,
      calibratedDayCount: completed.filter((r) => r.deviationValue !== null && r.deviationValue > 0).length,
    };
  }, [records]);

  const tooltipStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 11,
    color: "var(--text-primary)",
  };

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
      {/* Trajectory chart */}
      <div
        className="rounded-[var(--radius-lg)] p-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--text-muted)" }}
        >
          Dificultad en el Tiempo
        </p>

        {dayCount < 2 ? (
          <div className="flex h-[100px] items-center justify-center">
            <p
              className="text-center text-[13px]"
              style={{ color: "var(--text-faint)" }}
            >
              Registra al menos 2 sesiones para ver la trayectoria.
            </p>
          </div>
        ) : (
          <div className="h-[120px]">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                data={trajectoryData}
                margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-faint)", fontSize: 8 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[0, 2, 4]}
                  tick={{ fill: "var(--text-faint)", fontSize: 8 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val: number) => [val, "Dificultad"]}
                />
                <Line
                  connectNulls={false}
                  dataKey="friction"
                  dot={{ fill: "var(--accent)", r: 3, strokeWidth: 0 }}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  type="monotone"
                />
                {calibratedDayCount >= 3 && (
                  <Line
                    connectNulls
                    dataKey="trend"
                    dot={false}
                    stroke="var(--accent)"
                    strokeWidth={1}
                    strokeDasharray="3 2"
                    strokeOpacity={0.45}
                    type="monotone"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-2 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
              Dificultad diaria
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="h-[2px] w-[14px]"
              style={{ background: "var(--accent)", opacity: 0.45 }}
            />
            <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
              Tendencia
            </span>
          </div>
        </div>
        {calibratedDayCount < 3 && dayCount >= 2 && (
          <p
            className="mt-1 text-[11px] italic"
            style={{ color: "var(--text-faint)" }}
          >
            Registra al menos 3 sesiones con calibración para ver la tendencia.
          </p>
        )}
      </div>

      {/* Distribution chart */}
      <div
        className="rounded-[var(--radius-lg)] p-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--text-muted)" }}
        >
          Distribución de Dificultad
        </p>
        <div className="h-[100px]">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={distributionData}
              margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
            >
              <XAxis
                dataKey="val"
                tick={{ fill: "var(--text-faint)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-faint)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                formatter={(val: number) => [val, "Veces"]}
              />
              <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {insight && (
        <p
          className="text-center text-[12px] italic leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          "{insight}"
        </p>
      )}

      <p
        className="text-center text-[12px] italic leading-relaxed"
        style={{ color: "var(--text-faint)" }}
      >
        "Cuando cuesta más, no es un fallo. Es el hábito construyéndose. Con el
        tiempo cuesta menos."
      </p>
    </div>
  );
}
