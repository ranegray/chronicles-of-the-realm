import { describe, it, expect } from "vitest";
import { createRng } from "../game/rng";

describe("rng", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng("seed-1");
    const b = createRng("seed-1");
    const a1 = [a.nextFloat(), a.nextFloat(), a.nextInt(0, 100), a.nextInt(0, 100)];
    const b1 = [b.nextFloat(), b.nextFloat(), b.nextInt(0, 100), b.nextInt(0, 100)];
    expect(a1).toEqual(b1);
  });

  it("differs for different seeds", () => {
    const a = createRng("seed-A");
    const b = createRng("seed-B");
    expect(a.nextFloat()).not.toEqual(b.nextFloat());
  });

  it("nextInt is within bounds inclusive", () => {
    const r = createRng("bounds");
    for (let i = 0; i < 200; i++) {
      const v = r.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it("pickWeighted respects weights at scale", () => {
    const r = createRng("weights");
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 5000; i++) {
      const v = r.pickWeighted([
        { value: "a", weight: 1 },
        { value: "b", weight: 9 }
      ]);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    // b should appear ~9x more than a
    expect(counts.b!).toBeGreaterThan(counts.a! * 5);
  });

  it("shuffle is deterministic and length-preserving", () => {
    const arr = [1, 2, 3, 4, 5];
    const a = createRng("s").shuffle(arr);
    const b = createRng("s").shuffle(arr);
    expect(a).toEqual(b);
    expect(a.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
