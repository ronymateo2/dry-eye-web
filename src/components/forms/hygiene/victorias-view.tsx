import { useMemo } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { HygieneRecord } from "@/types/domain";

export function VictoriasView({
  records,
  cycleStartKey,
  onBack,
}: {
  records: HygieneRecord[];
  cycleStartKey: string;
  onBack: () => void;
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
        dot: null as null | "low" | "high" | "gray",
        isToday,
        isFuture,
        sessionCount: 0,
      };
    if (rec?.deviationValue == null || rec.deviationValue === 0)
      return { completed, dot: "gray" as const, isToday, isFuture: false, sessionCount };
    return {
      completed,
      dot: rec.deviationValue <= 2 ? ("low" as const) : ("high" as const),
      isToday,
      isFuture: false,
      sessionCount,
    };
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-opacity active:opacity-70"
          style={{
            minHeight: 48,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          type="button"
          onClick={onBack}
        >
          <ArrowLeftIcon size={13} />
          volver
        </button>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          Banco de Victorias
        </span>
      </div>

      <p
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--text-faint)" }}
      >
        Ciclo actual — 21 días calendario desde el inicio
      </p>

      {/* Calendar grid */}
      <div className="flex flex-col gap-[6px]">
        <div className="grid grid-cols-7 gap-[6px]">
          {["L", "M", "M", "J", "V", "S", "D"].map((label, i) => (
            <div key={i} className="flex items-center justify-center">
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--text-faint)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {Array.from(
          { length: Math.ceil((startOffset + 21) / 7) },
          (_, row) => (
            <div key={row} className="grid grid-cols-7 gap-[6px]">
              {Array.from({ length: 7 }, (_, col) => {
                const cellIndex = row * 7 + col;
                const dayIndex = cellIndex - startOffset;
                const d = dayIndex >= 0 && dayIndex < 21 ? days[dayIndex] : null;

                if (!d) return <div key={col} className="h-[38px]" />;

                const { completed, dot, isToday, isFuture, sessionCount } = getDayInfo(d);
                const dayNum = d.getUTCDate();
                const dotColor =
                  dot === "low"
                    ? "var(--accent)"
                    : dot === "high"
                      ? "#cc3f30"
                      : "var(--border)";

                return (
                  <div
                    key={col}
                    className="relative flex flex-col items-center pb-[8px]"
                  >
                    <div
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full"
                      style={{
                        background: completed
                          ? isToday
                            ? "var(--accent)"
                            : "var(--accent-dim)"
                          : "var(--surface-el)",
                        border: `1px solid ${
                          completed ? "rgba(212,162,76,0.55)" : "var(--border)"
                        }`,
                        opacity: isFuture ? 0.5 : 1,
                        outline: isToday ? "2px solid var(--accent)" : "none",
                        outlineOffset: 1,
                      }}
                    >
                      <span
                        className="font-mono text-[10px] font-medium"
                        style={{
                          color: completed
                            ? isToday
                              ? "#121008"
                              : "var(--accent)"
                            : "var(--text-muted)",
                        }}
                      >
                        {dayNum}
                      </span>
                    </div>
                    {dot && (
                      <div
                        className="absolute bottom-[2px] right-0 h-[5px] w-[5px] rounded-full"
                        style={{ background: dotColor }}
                      />
                    )}
                    {sessionCount > 1 && (
                      <div
                        className="absolute -right-[4px] -top-[3px] flex h-[11px] min-w-[11px] items-center justify-center rounded-full px-[2px]"
                        style={{
                          background: "var(--accent)",
                          fontSize: 6,
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
      <div className="flex items-center gap-4">
        {[
          { color: "var(--accent)", label: "Baja fricción" },
          { color: "#cc3f30", label: "Alta fricción" },
          { color: "var(--border)", label: "Sin calibrar" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-[5px]">
            <div
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: color }}
            />
            <span
              className="text-[10px]"
              style={{ color: "var(--text-faint)" }}
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
