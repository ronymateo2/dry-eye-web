import { describe, it, expect } from "vitest";
import {
  timeAgo,
  getCountdown,
  isLoggedToday,
  isCompletedToday,
  getNextMs,
  buildDayProjection,
  getVialStatus,
} from "./domain";
import type { DropScheduleEntry } from "@/types/domain";
import type { ActiveVialEntry } from "./domain";

const HOUR = 3_600_000;

function entry(over: Partial<DropScheduleEntry> = {}): DropScheduleEntry {
  return {
    drop_type_id: "d1",
    name: "Gota",
    interval_hours: 4,
    last_logged_at: null,
    ...over,
  };
}

describe("timeAgo", () => {
  const now = new Date("2026-06-04T12:00:00Z").getTime();
  it("null when no date", () => expect(timeAgo(null, now)).toBeNull());
  it("ahora under a minute", () =>
    expect(timeAgo(new Date(now - 30_000).toISOString(), now)).toBe("ahora"));
  it("minutes", () =>
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString(), now)).toBe("hace 5m"));
  it("hours", () =>
    expect(timeAgo(new Date(now - 3 * HOUR).toISOString(), now)).toBe("hace 3h"));
  it("days", () =>
    expect(timeAgo(new Date(now - 49 * HOUR).toISOString(), now)).toBe("hace 2d"));
});

describe("getNextMs", () => {
  it("infinity without interval or last log", () => {
    expect(getNextMs(entry({ interval_hours: null }))).toBe(Number.POSITIVE_INFINITY);
    expect(getNextMs(entry({ last_logged_at: null }))).toBe(Number.POSITIVE_INFINITY);
  });
  it("last + interval", () => {
    const last = "2026-06-04T08:00:00Z";
    expect(getNextMs(entry({ last_logged_at: last, interval_hours: 4 }))).toBe(
      new Date(last).getTime() + 4 * HOUR,
    );
  });
});

describe("getCountdown", () => {
  const now = new Date("2026-06-04T12:00:00Z").getTime();
  it("overdue when next in past", () => {
    const r = getCountdown(new Date(now - 5 * HOUR).toISOString(), 4, now);
    expect(r.overdue).toBe(true);
    expect(r.progress).toBe(1);
    expect(r.label).toContain("hace");
  });
  it("pending when next in future", () => {
    const r = getCountdown(new Date(now - 1 * HOUR).toISOString(), 4, now);
    expect(r.overdue).toBe(false);
    expect(r.progress).toBeCloseTo(0.25, 5);
    expect(r.label).toBe("3h 0m");
  });
});

describe("isLoggedToday / isCompletedToday", () => {
  const now = new Date("2026-06-04T12:00:00Z").getTime();
  it("logged today true same day", () => {
    expect(isLoggedToday(entry({ last_logged_at: new Date(now - HOUR).toISOString() }), now)).toBe(true);
  });
  it("logged today false other day", () => {
    expect(isLoggedToday(entry({ last_logged_at: new Date(now - 48 * HOUR).toISOString() }), now)).toBe(false);
  });
  it("completed when next dose falls tomorrow", () => {
    const e = entry({ last_logged_at: new Date(now - HOUR).toISOString(), interval_hours: 24 });
    expect(isCompletedToday(e, now)).toBe(true);
  });
  it("not completed when next dose still today", () => {
    const e = entry({ last_logged_at: new Date(now - HOUR).toISOString(), interval_hours: 4 });
    expect(isCompletedToday(e, now)).toBe(false);
  });
});

describe("buildDayProjection", () => {
  it("skips entries without interval/last log", () => {
    expect(buildDayProjection([entry({ interval_hours: null })])).toEqual([]);
  });
  it("slots sorted ascending and within today", () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayStart = start.getTime();
    const todayEnd = todayStart + 86_400_000;
    const slots = buildDayProjection([
      entry({ last_logged_at: new Date(todayStart + HOUR).toISOString(), interval_hours: 4 }),
    ]);
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(s.time).toBeGreaterThanOrEqual(todayStart);
      expect(s.time).toBeLessThan(todayEnd);
    }
    const times = slots.map((s) => s.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

describe("getVialStatus", () => {
  const now = new Date("2026-06-04T12:00:00Z").getTime();
  function vial(over: Partial<ActiveVialEntry> = {}): ActiveVialEntry {
    return {
      id: "v1",
      drop_type_id: "d1",
      drop_type_name: "Gota",
      started_at: new Date(now - HOUR).toISOString(),
      ended_at: null,
      status: "active",
      vial_duration: 24,
      ...over,
    };
  }
  it("active well within duration", () => {
    const r = getVialStatus(vial(), now);
    expect(r.isExpired).toBe(false);
    expect(r.isWarning).toBe(false);
    expect(r.rightLabel).toContain("vence en");
  });
  it("warning under 2h left", () => {
    const r = getVialStatus(vial({ started_at: new Date(now - 23 * HOUR).toISOString() }), now);
    expect(r.isExpired).toBe(false);
    expect(r.isWarning).toBe(true);
  });
  it("expired past duration", () => {
    const r = getVialStatus(vial({ started_at: new Date(now - 25 * HOUR).toISOString() }), now);
    expect(r.isExpired).toBe(true);
    expect(r.rightLabel).toContain("vencido");
  });
});
