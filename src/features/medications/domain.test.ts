import { describe, it, expect } from "vitest";
import { parseTimesJson, buildSchedule, groupRegisteredByBatch, type RegisteredSlot, type TodayIntake } from "./domain";
import type { MedicationRecord } from "@/types/domain";

const TZ = "America/Bogota";
const now = Date.now();

function med(over: Partial<MedicationRecord> = {}): MedicationRecord {
  return {
    id: "m1",
    name: "Med",
    dosage: null,
    frequency: null,
    notes: null,
    sort_order: 0,
    start_date: null,
    end_date: null,
    phases_json: null,
    times_json: null,
    ...over,
  };
}

function intake(over: Partial<TodayIntake> = {}): TodayIntake {
  return {
    id: "i1",
    medication_id: "m1",
    logged_at: new Date(now).toISOString(),
    dosage_taken: null,
    notes: null,
    ...over,
  };
}

describe("parseTimesJson", () => {
  it("empty for null/garbage", () => {
    expect(parseTimesJson(null)).toEqual([]);
    expect(parseTimesJson("not json")).toEqual([]);
    expect(parseTimesJson('{"a":1}')).toEqual([]);
  });
  it("keeps only HH:MM strings", () => {
    expect(parseTimesJson('["08:00","9","20:30",5]')).toEqual(["08:00", "20:30"]);
  });
});

describe("buildSchedule", () => {
  it("ignores meds without times", () => {
    const r = buildSchedule([med({ times_json: null })], [], now, TZ);
    expect(r.upcoming).toEqual([]);
    expect(r.registered).toEqual([]);
  });

  it("one slot per scheduled time when no intakes", () => {
    const r = buildSchedule([med({ times_json: '["08:00","20:00"]' })], [], now, TZ);
    expect(r.upcoming.length).toBe(2);
    expect(r.registered.length).toBe(0);
  });

  it("taken intake moves a slot from upcoming to registered", () => {
    const r = buildSchedule(
      [med({ times_json: '["08:00","20:00"]' })],
      [intake()],
      now,
      TZ,
    );
    expect(r.registered.length).toBe(1);
    expect(r.upcoming.length).toBe(1);
  });

  it("groups meds sharing the same slot time", () => {
    const r = buildSchedule(
      [
        med({ id: "a", name: "A", times_json: '["08:00"]' }),
        med({ id: "b", name: "B", times_json: '["08:00"]' }),
      ],
      [],
      now,
      TZ,
    );
    expect(r.upcoming.length).toBe(1);
    expect(r.upcoming[0]!.names.sort()).toEqual(["A", "B"]);
    expect(r.upcoming[0]!.medicationIds.sort()).toEqual(["a", "b"]);
  });
});

describe("groupRegisteredByBatch", () => {
  function reg(id: string, loggedAt: string): RegisteredSlot {
    return {
      key: id,
      medicationId: id,
      name: id,
      intakeId: id,
      loggedAt,
      timeLabel: "",
      dosageTaken: null,
      notes: null,
      medication: med({ id }),
    };
  }
  it("groups entries within 2s, splits beyond", () => {
    const base = new Date("2026-06-04T12:00:00Z").getTime();
    const batches = groupRegisteredByBatch([
      reg("a", new Date(base).toISOString()),
      reg("b", new Date(base + 1000).toISOString()),
      reg("c", new Date(base + 60_000).toISOString()),
    ]);
    expect(batches.length).toBe(2);
    expect(batches[0]!.map((r) => r.key)).toEqual(["a", "b"]);
    expect(batches[1]!.map((r) => r.key)).toEqual(["c"]);
  });
  it("empty input", () => expect(groupRegisteredByBatch([])).toEqual([]));
});
