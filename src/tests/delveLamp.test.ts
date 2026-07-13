import { describe, it, expect } from "vitest";
import { OIL_COSTS, getLightState, refillFromFlask, spendOil } from "../game/delve/lamp";
import type { LampState } from "../game/delve/types";

function lamp(overrides: Partial<LampState> = {}): LampState {
  return { oil: 20, capacity: 20, flasksPacked: 0, ...overrides };
}

describe("delve lamp", () => {
  it("spends the correct oil cost per action", () => {
    expect(spendOil(lamp({ oil: 20 }), "move").oil).toBe(19);
    expect(spendOil(lamp({ oil: 20 }), "search").oil).toBe(18);
    expect(spendOil(lamp({ oil: 20 }), "listen").oil).toBe(19);
    expect(spendOil(lamp({ oil: 20 }), "encounterBeat").oil).toBe(19);
    expect(spendOil(lamp({ oil: 20 }), "disarm").oil).toBe(18);
    expect(spendOil(lamp({ oil: 20 }), "crank").oil).toBe(19);
    expect(spendOil(lamp({ oil: 20 }), "consultMap").oil).toBe(19);
  });

  it("exposes the full cost table", () => {
    expect(OIL_COSTS).toEqual({
      move: 1,
      search: 2,
      listen: 1,
      encounterBeat: 1,
      disarm: 2,
      crank: 1,
      consultMap: 1
    });
  });

  it("floors oil at zero instead of going negative", () => {
    const result = spendOil(lamp({ oil: 1 }), "search");
    expect(result.oil).toBe(0);
  });

  it("does not mutate the input lamp", () => {
    const original = lamp({ oil: 20 });
    const result = spendOil(original, "move");
    expect(original.oil).toBe(20);
    expect(result).not.toBe(original);
  });

  it("refills to capacity and consumes a flask", () => {
    const result = refillFromFlask(lamp({ oil: 3, capacity: 20, flasksPacked: 2 }));
    expect(result.oil).toBe(20);
    expect(result.flasksPacked).toBe(1);
  });

  it("refill is a no-op when no flasks are packed", () => {
    const before = lamp({ oil: 3, capacity: 20, flasksPacked: 0 });
    const result = refillFromFlask(before);
    expect(result).toEqual(before);
  });

  describe("getLightState", () => {
    it("is bright above the dim threshold", () => {
      expect(getLightState(lamp({ oil: 20, capacity: 20 }))).toBe("bright");
      expect(getLightState(lamp({ oil: 6, capacity: 20 }))).toBe("bright"); // > 25%
    });

    it("is dim at exactly 25% of capacity", () => {
      expect(getLightState(lamp({ oil: 5, capacity: 20 }))).toBe("dim");
    });

    it("is dim just above zero", () => {
      expect(getLightState(lamp({ oil: 1, capacity: 20 }))).toBe("dim");
    });

    it("is dark at exactly zero oil", () => {
      expect(getLightState(lamp({ oil: 0, capacity: 20 }))).toBe("dark");
    });

    it("handles a non-default capacity", () => {
      expect(getLightState(lamp({ oil: 10, capacity: 40 }))).toBe("dim"); // == 25%
      expect(getLightState(lamp({ oil: 11, capacity: 40 }))).toBe("bright");
    });
  });
});
