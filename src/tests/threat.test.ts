import { describe, it, expect } from "vitest";
import {
  applyThreatChange,
  createInitialThreatState,
  getThreatLabel,
  getThreatLevelFromPoints,
  getThreatModifiers,
  shouldTriggerAmbush
} from "../game/threat";
import { THREAT_RULES } from "../game/constants";
import { createRng } from "../game/rng";

describe("threat", () => {
  it("initial state starts at 0 points and level 0", () => {
    const state = createInitialThreatState(100);
    expect(state.points).toBe(0);
    expect(state.level).toBe(0);
    expect(state.maxLevel).toBe(5);
    expect(state.lastChangedAt).toBe(100);
    expect(state.changes).toEqual([]);
  });

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

  it("cannot drop below 0 points", () => {
    let state = createInitialThreatState(0);
    ({ threat: state } = applyThreatChange({
      threat: state, amount: -50, reason: "debug", now: 1
    }));
    expect(state.points).toBe(0);
    expect(state.level).toBe(0);
  });

  it("caps level at 5 but allows points past the level 5 threshold", () => {
    let state = createInitialThreatState(0);
    ({ threat: state } = applyThreatChange({
      threat: state, amount: 500, reason: "debug", now: 1
    }));
    expect(state.level).toBe(5);
    expect(state.points).toBe(500);
  });

  it("applyThreatChange records a ThreatChange with previous/new snapshots", () => {
    const initial = createInitialThreatState(0);
    const { threat, change } = applyThreatChange({
      threat: initial, amount: 25, reason: "enteredRoom", now: 42, message: "Deeper."
    });
    expect(threat.points).toBe(25);
    expect(threat.level).toBe(1);
    expect(change.previousPoints).toBe(0);
    expect(change.newPoints).toBe(25);
    expect(change.previousLevel).toBe(0);
    expect(change.newLevel).toBe(1);
    expect(change.reason).toBe("enteredRoom");
    expect(change.amount).toBe(25);
    expect(change.message).toBe("Deeper.");
    expect(threat.changes).toHaveLength(1);
    expect(threat.changes[0]).toEqual(change);
  });

  it("returns modifiers for each level", () => {
    for (const level of [0, 1, 2, 3, 4, 5] as const) {
      const mods = getThreatModifiers(level);
      expect(mods.level).toBe(level);
      expect(mods.label).toBe(THREAT_RULES.thresholds[level].label);
    }
  });

  it("higher threat raises ambush chance in deterministic seeded tests", () => {
    const quietTriggers = runAmbushTrials(0);
    const awakeTriggers = runAmbushTrials(5);
    expect(quietTriggers).toBeLessThan(awakeTriggers);
  });

  it("labels each level via getThreatLabel", () => {
    expect(getThreatLabel(0)).toBe("Quiet");
    expect(getThreatLabel(5)).toBe("Awakened");
  });
});

function runAmbushTrials(level: 0 | 5): number {
  let state = createInitialThreatState(0);
  const pointsByLevel = { 0: 0, 5: 120 };
  ({ threat: state } = applyThreatChange({
    threat: state, amount: pointsByLevel[level], reason: "debug", now: 1
  }));
  let triggered = 0;
  for (let i = 0; i < 400; i++) {
    const rng = createRng(`ambush:${level}:${i}`);
    if (shouldTriggerAmbush({ threat: state, rng })) triggered++;
  }
  return triggered;
}
