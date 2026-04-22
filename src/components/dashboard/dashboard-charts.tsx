import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

type CorrelationPoint = {
  sleepHours: number;
  masseterPain: number;
};

type TriggerZoneStat = {
  triggerType: TriggerType;
  avgEyelidPain: number;
  avgTemplePain: number;
  days: number;
};

type DashboardChartsProps = {
  trendPoints: TrendPoint[];
  correlationPoints: CorrelationPoint[];
};

const TRIGGER_LABELS: Record<TriggerType, string> = {
  climate: "Clima",
  humidifier: "Humidif.",
  stress: "Estres",
  screens: "Pantallas",
  tv: "TV",
  ergonomics: "Ergonom.",
  exercise: "Ejercicio",
  other: "Otro",
};

const tooltipStyle = {
  background: "rgba(18,16,8,0.96)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  color: "var(--text-primary)",
  fontSize: "12px",
} as const;

const WINDOW_OPTIONS = [7, 14, 30] as const;
type WindowDays = (typeof WINDOW_OPTIONS)[number];
const PAN_STEP = 7;

export function DashboardTrendChart({
  trendPoints,
}: Pick<DashboardChartsProps, "trendPoints">) {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const [windowEnd, setWindowEnd] = useState(trendPoints.length - 1);

  const clampedEnd = Math.min(windowEnd, trendPoints.length - 1);
  const start = Math.max(0, clampedEnd - windowDays + 1);
  const visiblePoints = trendPoints.slice(start, clampedEnd + 1);

  const painKeys = [
    "eyelidPain",
    "templePain",
    "masseterPain",
    "cervicalPain",
    "orbitalPain",
  ] as const;
  const maxPain = visiblePoints.reduce((max, p) => {
    const vals = painKeys
      .map((k) => p[k])
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.max(max, ...vals) : max;
  }, 0);
  const yMax = Math.max(4, Math.ceil(maxPain) + 1);

  const canPanLeft = start > 0;
  const canPanRight = clampedEnd < trendPoints.length - 1;

  function handleWindowChange(days: WindowDays) {
    setWindowDays(days);
    setWindowEnd(trendPoints.length - 1);
  }

  function panLeft() {
    setWindowEnd((prev) => Math.max(windowDays - 1, prev - PAN_STEP));
  }

  function panRight() {
    setWindowEnd((prev) => Math.min(trendPoints.length - 1, prev + PAN_STEP));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {WINDOW_OPTIONS.map((d) => (
            <button
              key={d}
              className="mono flex h-[48px] min-w-[44px] items-center justify-center rounded-[var(--radius-full)] border px-3 text-[12px] transition-colors"
              style={
                windowDays === d
                  ? {
                      borderColor: "var(--accent)",
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                    }
                  : { borderColor: "var(--border)", color: "var(--text-muted)" }
              }
              onClick={() => handleWindowChange(d)}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <button
            className="flex h-[48px] w-[48px] items-center justify-center rounded-[var(--radius-full)] border text-[18px] transition-colors"
            disabled={!canPanLeft}
            style={
              canPanLeft
                ? { borderColor: "var(--border)", color: "var(--text-muted)" }
                : {
                    borderColor: "var(--border)",
                    color: "var(--text-faint)",
                    opacity: 0.4,
                  }
            }
            onClick={panLeft}
          >
            ←
          </button>
          <button
            className="flex h-[48px] w-[48px] items-center justify-center rounded-[var(--radius-full)] border text-[18px] transition-colors"
            disabled={!canPanRight}
            style={
              canPanRight
                ? { borderColor: "var(--border)", color: "var(--text-muted)" }
                : {
                    borderColor: "var(--border)",
                    color: "var(--text-faint)",
                    opacity: 0.4,
                  }
            }
            onClick={panRight}
          >
            →
          </button>
        </div>
      </div>
      <div className="h-[220px] rounded-[12px] bg-[linear-gradient(180deg,rgba(37,32,20,0.9),rgba(28,24,16,0.55))] p-2">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={visiblePoints}
            margin={{ top: 12, right: 12, left: -14, bottom: 0 }}
          >
            <CartesianGrid stroke="rgba(46,39,24,0.8)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="var(--text-faint)"
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            />
            <YAxis
              domain={[0, yMax]}
              stroke="var(--text-faint)"
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              tickCount={Math.min(6, yMax + 1)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => value.toFixed(1)}
              labelStyle={{ color: "var(--text-muted)" }}
            />
            <Line
              connectNulls
              dataKey="eyelidPain"
              dot={false}
              name="Parpados"
              stroke="var(--pain-low)"
              strokeWidth={1.5}
            />
            <Line
              connectNulls
              dataKey="templePain"
              dot={false}
              name="Sienes"
              stroke="var(--pain-mid)"
              strokeWidth={1.5}
            />
            <Line
              connectNulls
              dataKey="masseterPain"
              dot={false}
              name="Masetero"
              stroke="var(--pain-high)"
              strokeWidth={1.5}
            />
            <Line
              connectNulls
              dataKey="cervicalPain"
              dot={false}
              name="Cervical"
              stroke="#d0c040"
              strokeWidth={1.5}
            />
            <Line
              connectNulls
              dataKey="orbitalPain"
              dot={false}
              name="Orbital"
              stroke="#f08050"
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DashboardCorrelationChart({
  correlationPoints,
}: Pick<DashboardChartsProps, "correlationPoints">) {
  return (
    <div className="h-[200px] rounded-[12px] bg-[linear-gradient(180deg,rgba(37,32,20,0.9),rgba(28,24,16,0.55))] p-2">
      <ResponsiveContainer height="100%" width="100%">
        <ScatterChart margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(46,39,24,0.8)" strokeDasharray="3 3" />
          <XAxis
            dataKey="sleepHours"
            domain={[0, 12]}
            name="Sueno"
            stroke="var(--text-faint)"
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            tickCount={7}
            unit="h"
          />
          <YAxis
            dataKey="masseterPain"
            domain={[0, 10]}
            name="Masetero"
            stroke="var(--text-faint)"
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            tickCount={6}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ stroke: "var(--border)" }}
            formatter={(value: number, name: string) =>
              name === "Sueno" ? `${value.toFixed(1)}h` : value.toFixed(1)
            }
            labelFormatter={() => ""}
          />
          <ReferenceLine stroke="rgba(212,162,76,0.5)" x={6} />
          <Scatter data={correlationPoints} fill="var(--accent)" name="Sueno" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

type DropsDayPoint = {
  dayKey: string;
  label: string;
  quantities: Record<string, number>;
};

const DROP_TYPE_COLORS = [
  "var(--accent)",
  "var(--pain-low)",
  "var(--pain-mid)",
  "#c97b4b",
  "#c8d450",
  "#d06050",
];

type DropsWindowOption = "7d" | "30d";

export function DashboardDropsChart({
  dropTypes,
  points,
}: {
  dropTypes: string[];
  points: DropsDayPoint[];
}) {
  const [window, setWindow] = useState<DropsWindowOption>("7d");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set(dropTypes));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  function toggleType(typeName: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeName)) {
        next.delete(typeName);
      } else {
        next.add(typeName);
      }
      return next;
    });
  }

  function toggleAll() {
    setActiveTypes((prev) => (prev.size === dropTypes.length ? new Set() : new Set(dropTypes)));
  }

  const allSelected = activeTypes.size === dropTypes.length;
  const noneSelected = activeTypes.size === 0;
  const visibleDropTypes = dropTypes.filter((t) => activeTypes.has(t));
  const visiblePoints = window === "7d" ? points.slice(-7) : points;
  const chartData: Array<Record<string, string | number>> = visiblePoints.map((p) => ({ label: p.label, ...p.quantities }));

  const maxTotal = chartData.reduce((max, row) => {
    const total = visibleDropTypes.reduce((s, t) => s + (typeof row[t] === "number" ? (row[t] as number) : 0), 0);
    return Math.max(max, total);
  }, 0);
  const yMax = Math.max(4, Math.ceil(maxTotal) + 1);

  const filterLabel = noneSelected
    ? "Ninguno"
    : allSelected
      ? "Todos"
      : activeTypes.size === 1
        ? Array.from(activeTypes)[0]
        : `${activeTypes.size} tipos`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {(["7d", "30d"] as DropsWindowOption[]).map((opt) => (
          <button
            key={opt}
            className="mono flex h-[48px] min-w-[44px] items-center justify-center rounded-[var(--radius-full)] border px-3 text-[12px] transition-colors"
            style={
              window === opt
                ? { borderColor: "var(--accent)", background: "var(--accent-dim)", color: "var(--accent)" }
                : { borderColor: "var(--border)", color: "var(--text-muted)" }
            }
            onClick={() => setWindow(opt)}
          >
            {opt}
          </button>
        ))}

        <div className="relative ml-auto" ref={dropdownRef}>
          <button
            className="flex h-[48px] items-center gap-2 rounded-[var(--radius-full)] border px-3 text-[12px] transition-colors"
            style={
              !allSelected || noneSelected
                ? { borderColor: "var(--accent)", background: "var(--accent-dim)", color: "var(--accent)" }
                : { borderColor: "var(--border)", color: "var(--text-muted)" }
            }
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <span>{filterLabel}</span>
            <svg
              fill="none"
              height="10"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 10 10"
              width="10"
              style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
            >
              <polyline points="1,3 5,7 9,3" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[180px] rounded-[14px] border py-1 shadow-xl"
              style={{
                background: "rgba(18,16,8,0.97)",
                borderColor: "var(--border)",
                backdropFilter: "blur(12px)",
              }}
            >
              <button
                className="flex h-[44px] w-full items-center gap-3 px-4 text-[12px] transition-colors"
                style={{ color: allSelected ? "var(--accent)" : "var(--text-muted)" }}
                onClick={toggleAll}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border"
                  style={{
                    borderColor: allSelected ? "var(--accent)" : "var(--border)",
                    background: allSelected ? "var(--accent-dim)" : "transparent",
                  }}
                >
                  {allSelected && (
                    <svg fill="none" height="8" stroke="var(--accent)" strokeWidth="2.5" viewBox="0 0 8 8" width="8">
                      <polyline points="1,4 3,6 7,2" />
                    </svg>
                  )}
                </span>
                Todos
              </button>

              <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />

              {dropTypes.map((typeName, i) => {
                const color = DROP_TYPE_COLORS[i % DROP_TYPE_COLORS.length];
                const isActive = activeTypes.has(typeName);
                return (
                  <button
                    key={typeName}
                    className="flex h-[44px] w-full items-center gap-3 px-4 text-[12px] transition-colors"
                    style={{ color: isActive ? "var(--text-primary)" : "var(--text-faint)" }}
                    onClick={() => toggleType(typeName)}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors"
                      style={{
                        borderColor: isActive ? color : "var(--border)",
                        background: isActive ? `${color}33` : "transparent",
                      }}
                    >
                      {isActive && (
                        <svg fill="none" height="8" stroke={color} strokeWidth="2.5" viewBox="0 0 8 8" width="8">
                          <polyline points="1,4 3,6 7,2" />
                        </svg>
                      )}
                    </span>
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="truncate">{typeName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="h-[220px] rounded-[12px] bg-[linear-gradient(180deg,rgba(37,32,20,0.9),rgba(28,24,16,0.55))] p-2">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="rgba(46,39,24,0.8)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--text-faint)"
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              interval={window === "30d" ? 4 : 0}
            />
            <YAxis
              domain={[0, yMax]}
              stroke="var(--text-faint)"
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              tickCount={Math.min(6, yMax + 1)}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(value: number) => value}
              labelStyle={{ color: "var(--text-muted)", marginBottom: 4 }}
            />
            {visibleDropTypes.map((typeName, i) => (
              <Bar
                key={typeName}
                dataKey={typeName}
                fill={DROP_TYPE_COLORS[dropTypes.indexOf(typeName) % DROP_TYPE_COLORS.length]}
                name={typeName}
                stackId="drops"
                radius={i === visibleDropTypes.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type WeekdayDropAvg = {
  weekday: number;
  label: string;
  avg: number | null;
  uniqueDays: number;
};

export function DashboardDropsWeekdayChart({ data }: { data: WeekdayDropAvg[] }) {
  const maxAvg = Math.max(...data.map((d) => d.avg ?? 0), 0.1);
  const todayIso = (new Date().getDay() + 6) % 7;

  return (
    <div className="flex gap-[6px]">
      {data.map((day) => {
        const barH = day.avg !== null ? Math.max(3, (day.avg / maxAvg) * 80) : 0;
        const isToday = day.weekday === todayIso;
        return (
          <div
            key={day.weekday}
            className="flex flex-1 flex-col items-center"
            style={{ gap: "6px" }}
          >
            <span
              className="mono"
              style={{
                fontSize: "11px",
                color: day.avg !== null ? "var(--text-muted)" : "var(--text-faint)",
                minHeight: "14px",
                lineHeight: "14px",
              }}
            >
              {day.avg !== null ? day.avg.toFixed(1) : "--"}
            </span>
            <div style={{ width: "100%", height: "80px", display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  width: "100%",
                  height: `${barH}px`,
                  background: isToday ? "var(--accent)" : "rgba(212,162,76,0.28)",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.35s cubic-bezier(0,0,0.2,1)",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isToday ? "var(--accent)" : "var(--text-faint)",
                fontWeight: isToday ? 600 : 400,
              }}
            >
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardTriggerPainChart({ stats }: { stats: TriggerZoneStat[] }) {
  const chartData = stats.map((item) => ({
    label: TRIGGER_LABELS[item.triggerType],
    parpados: item.avgEyelidPain,
    sienes: item.avgTemplePain,
    days: item.days,
  }));

  const maxVal = chartData.reduce((max, row) => Math.max(max, row.parpados, row.sienes), 0);
  const yMax = Math.max(1, Math.ceil(maxVal) + 1);

  return (
    <div className="h-[220px] rounded-[12px] bg-[linear-gradient(180deg,rgba(37,32,20,0.9),rgba(28,24,16,0.55))] p-2">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="rgba(46,39,24,0.8)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--text-faint)"
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
          />
          <YAxis
            domain={[0, yMax]}
            stroke="var(--text-faint)"
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            tickCount={Math.min(6, yMax + 1)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={(value: number) => value.toFixed(1)}
            labelStyle={{ color: "var(--text-muted)", marginBottom: 4 }}
          />
          <Bar dataKey="parpados" fill="var(--pain-low)" name="Parpados" radius={[3, 3, 0, 0]} />
          <Bar dataKey="sienes" fill="var(--pain-mid)" name="Sienes" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
