import { useMemo } from "react";
import type { HygieneRecord } from "@/types/domain";

export function VictoriasView({
  records,
  cycleStartKey,
}: {
  records: HygieneRecord[];
  cycleStartKey: string;
}) {
  const todayKey = new Date().toLocaleDateString("en-CA");

  const byDay = useMemo(() => {
    const map = new Map<string, HygieneRecord[]>();
    for (const r of records) {
      const arr = map.get(r.dayKey) ?? [];
      arr.push(r);
      map.set(r.dayKey, arr);
    }
    return map;
  }, [records]);

  const { days, startOffset } = useMemo(() => {
    const start = new Date(cycleStartKey + "T00:00:00Z");
    const offset = (start.getUTCDay() + 6) % 7;
    const d21 = Array.from({ length: 21 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d;
    });
    return { days: d21, startOffset: offset };
  }, [cycleStartKey]);

  function getDayInfo(d: Date) {
    const key = d.toISOString().slice(0, 10);
    const rec = byDay.get(key)?.[0];
    const completed = rec?.status === "completed";
    const isToday = key === todayKey;
    const isFuture = key > todayKey;
    const sessionCount = completed ? (rec?.completedCount ?? 1) : 0;

    if (!completed)
      return {
        completed: false,
        friction: null as null | "low" | "high" | "uncalibrated",
        isToday,
        isFuture,
        sessionCount: 0,
      };

    let friction: "low" | "high" | "uncalibrated";
    if (rec?.deviationValue == null || rec.deviationValue === 0) {
      friction = "uncalibrated";
    } else {
      friction = rec.deviationValue <= 2 ? "low" : "high";
    }

    return { completed, friction, isToday, isFuture: false, sessionCount };
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--text-faint)" }}
      >
        Ciclo actual — 21 días calendario desde el inicio
      </p>

      {/* Calendar grid */}
      <div className="flex flex-col gap-2">
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {["L", "M", "M", "J", "V", "S", "D"].map((label, i) => (
            <div key={i} className="flex h-7 items-center justify-center">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {Array.from(
          { length: Math.ceil((startOffset + 21) / 7) },
          (_, row) => (
            <div key={row} className="grid grid-cols-7 gap-y-2">
              {Array.from({ length: 7 }, (_, col) => {
                const cellIndex = row * 7 + col;
                const dayIndex = cellIndex - startOffset;
                const d = dayIndex >= 0 && dayIndex < 21 ? days[dayIndex] : null;

                if (!d) return <div key={col} className="h-[44px]" />;

                const { completed, friction, isToday, isFuture, sessionCount } = getDayInfo(d);
                const dayNum = d.getUTCDate();

                const borderColor = completed
                  ? friction === "low"
                    ? "var(--accent)"
                    : friction === "high"
                      ? "#cc3f30"
                      : "rgba(212,162,76,0.35)"
                  : "transparent";

                const bgColor = completed
                  ? isToday
                    ? "var(--accent)"
                    : "var(--accent-dim)"
                  : "transparent";

                const textColor = completed
                  ? isToday
                    ? "#121008"
                    : "var(--accent)"
                  : isFuture
                    ? "var(--text-faint)"
                    : "var(--text-faint)";

                return (
                  <div
                    key={col}
                    className="relative flex items-center justify-center"
                    style={{ opacity: isFuture ? 0.35 : 1 }}
                  >
                    <div
                      className="flex h-[42px] w-[42px] items-center justify-center rounded-full"
                      style={{
                        background: bgColor,
                        border: completed ? `2px solid ${borderColor}` : "none",
                        boxShadow: isToday
                          ? "0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)"
                          : "none",
                      }}
                    >
                      <span
                        className="text-[14px] font-semibold tabular-nums"
                        style={{ color: textColor }}
                      >
                        {dayNum}
                      </span>
                    </div>
                    {sessionCount > 1 && (
                      <div
                        className="absolute -right-[3px] -top-[3px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-[3px]"
                        style={{
                          background: "var(--accent)",
                          fontSize: 9,
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: "#121008",
                          lineHeight: 1,
                        }}
                      >
                        +{sessionCount - 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {[
          { borderColor: "var(--accent)", label: "Baja fricción" },
          { borderColor: "#cc3f30", label: "Alta fricción" },
          { borderColor: "rgba(212,162,76,0.35)", label: "Sin calibrar" },
        ].map(({ borderColor, label }) => (
          <div key={label} className="flex items-center gap-[7px]">
            <div
              className="h-[12px] w-[12px] rounded-full"
              style={{
                border: `2px solid ${borderColor}`,
                background: "var(--accent-dim)",
              }}
            />
            <span
              className="text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <p
        className="text-center text-[12px] italic leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        "No cuentes los días sin acción. El servo no trabaja con ausencias —
        solo con señales positivas."
      </p>
    </div>
  );
}
