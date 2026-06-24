import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIDGET_CONFIG,
  reconcileWidgetConfig,
  WIDGET_IDS,
} from "./widget-config";

describe("reconcileWidgetConfig", () => {
  it("returns all known widgets visible when stored is empty", () => {
    expect(reconcileWidgetConfig([])).toEqual(DEFAULT_WIDGET_CONFIG);
  });

  it("drops unknown ids and appends missing known widgets", () => {
    const result = reconcileWidgetConfig([
      { id: "ghost", visible: true },
      { id: "medications", visible: false },
    ]);
    expect(result[0]).toEqual({ id: "medications", visible: false });
    expect(result.map((e) => e.id).sort()).toEqual([...WIDGET_IDS].sort());
    expect(result.every((e) => WIDGET_IDS.includes(e.id))).toBe(true);
  });

  it("dedupes repeated ids, keeping the first", () => {
    const result = reconcileWidgetConfig([
      { id: "symptoms", visible: false },
      { id: "symptoms", visible: true },
    ]);
    expect(result.filter((e) => e.id === "symptoms")).toHaveLength(1);
    expect(result.find((e) => e.id === "symptoms")?.visible).toBe(false);
  });
});
