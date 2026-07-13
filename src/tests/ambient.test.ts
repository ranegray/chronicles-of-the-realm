import { describe, it, expect } from "vitest";
import {
  computeDungeonAmbientParams,
  dbToGain,
  dungeonRootFrequencies,
  COMBAT_DUCK_DB,
  VILLAGE_DRONE_GAIN_DB
} from "../game/ambient";

describe("ambient threat mapping", () => {
  it("is quiet, dark-filtered, and dissonance-free at threat 0", () => {
    const params = computeDungeonAmbientParams(0);
    expect(params.droneGainDb).toBe(-30);
    expect(params.filterHz).toBe(300);
    expect(params.dissonantGainDb).toBe(Number.NEGATIVE_INFINITY);
    expect(params.pulseActive).toBe(false);
  });

  it("gets louder and brighter monotonically as threat rises", () => {
    const levels = [0, 1, 2, 3, 4, 5].map(level => computeDungeonAmbientParams(level));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].droneGainDb).toBeGreaterThan(levels[i - 1].droneGainDb);
      expect(levels[i].filterHz).toBeGreaterThan(levels[i - 1].filterHz);
    }
  });

  it("fades in the dissonant partial starting at threat 3", () => {
    expect(computeDungeonAmbientParams(2).dissonantGainDb).toBe(Number.NEGATIVE_INFINITY);
    expect(computeDungeonAmbientParams(3).dissonantGainDb).toBeGreaterThan(Number.NEGATIVE_INFINITY);
    expect(computeDungeonAmbientParams(4).dissonantGainDb).toBeGreaterThan(
      computeDungeonAmbientParams(3).dissonantGainDb
    );
    expect(computeDungeonAmbientParams(5).dissonantGainDb).toBeGreaterThan(
      computeDungeonAmbientParams(4).dissonantGainDb
    );
  });

  it("only enables the irregular pulse at threat 5", () => {
    for (const level of [0, 1, 2, 3, 4]) {
      expect(computeDungeonAmbientParams(level).pulseActive).toBe(false);
      expect(computeDungeonAmbientParams(level).pulseRateHz).toBe(0);
    }
    const top = computeDungeonAmbientParams(5);
    expect(top.pulseActive).toBe(true);
    expect(top.pulseRateHz).toBeGreaterThan(0);
  });

  it("clamps out-of-range or non-finite threat levels", () => {
    expect(computeDungeonAmbientParams(-3)).toEqual(computeDungeonAmbientParams(0));
    expect(computeDungeonAmbientParams(99)).toEqual(computeDungeonAmbientParams(5));
    expect(computeDungeonAmbientParams(Number.NaN)).toEqual(computeDungeonAmbientParams(0));
  });

  it("converts dB to a linear gain, with -Infinity as true silence", () => {
    expect(dbToGain(0)).toBeCloseTo(1, 5);
    expect(dbToGain(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(dbToGain(-6)).toBeGreaterThan(dbToGain(-12));
  });

  it("keeps the dissonant partial a semitone below the drone root", () => {
    const freqs = dungeonRootFrequencies();
    const semitoneRatio = freqs.dissonant / freqs.root;
    expect(semitoneRatio).toBeCloseTo(2 ** (-1 / 12), 5);
    expect(freqs.detuned).toBeGreaterThan(freqs.root);
  });

  it("keeps combat duck and village bed constants in a tasteful quiet range", () => {
    expect(COMBAT_DUCK_DB).toBeLessThan(0);
    expect(VILLAGE_DRONE_GAIN_DB).toBeLessThan(-20);
  });
});
