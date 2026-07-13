import { describe, it, expect } from "vitest";
import { getThreatLevelFromPoints, getThreatModifiers } from "../game/threat";
import { THREAT_RULES } from "../game/constants";

describe("threat", () => {
  it("converts points to expected levels at each threshold", () => {
    expect(getThreatLevelFromPoints(0)).toBe(0);
    expect(getThreatLevelFromPoints(19)).toBe(0);
    expect(getThreatLevelFromPoints(20)).toBe(1);
    expect(getThreatLevelFromPoints(39)).toBe(1);
    expect(getThreatLevelFromPoints(40)).toBe(2);
    expect(getThreatLevelFromPoints(64)).toBe(2);
    expect(getThreatLevelFromPoints(65)).toBe(3);
    expect(getThreatLevelFromPoints(89)).toBe(3);
    expect(getThreatLevelFromPoints(90)).toBe(4);
    expect(getThreatLevelFromPoints(119)).toBe(4);
    expect(getThreatLevelFromPoints(120)).toBe(5);
    expect(getThreatLevelFromPoints(500)).toBe(5);
  });

  it("clamps negative points to level 0", () => {
    expect(getThreatLevelFromPoints(-50)).toBe(0);
  });

  it("returns modifiers for each level", () => {
    for (const level of [0, 1, 2, 3, 4, 5] as const) {
      const mods = getThreatModifiers(level);
      expect(mods.level).toBe(level);
      expect(mods.label).toBe(THREAT_RULES.thresholds[level].label);
    }
  });
});
