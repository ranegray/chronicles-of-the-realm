import { describe, it, expect } from "vitest";
import { rollAbilityScore, rollDie, rollDice, rollD20 } from "../game/dice";
import { createRng } from "../game/rng";

describe("dice", () => {
  it("rollDie returns within sides", () => {
    const r = createRng("die");
    for (let i = 0; i < 200; i++) {
      const v = rollDie(6, r);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it("rollDice respects formula", () => {
    const r = createRng("dice");
    const v = rollDice({ count: 2, sides: 6, modifier: 1 }, r);
    expect(v).toBeGreaterThanOrEqual(3);
    expect(v).toBeLessThanOrEqual(13);
  });

  it("rollAbilityScore drops the lowest die", () => {
    const r = createRng("ability");
    for (let i = 0; i < 100; i++) {
      const result = rollAbilityScore(r);
      expect(result.rolls).toHaveLength(4);
      expect(result.dropped).toHaveLength(1);
      expect(result.kept).toHaveLength(3);
      expect(result.total).toEqual(result.kept.reduce((s, x) => s + x, 0));
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(18);
    }
  });

  it("rollD20 within range", () => {
    const r = createRng("d20");
    for (let i = 0; i < 200; i++) {
      const v = rollD20(r);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
    }
  });
});
