import { describe, it, expect } from "vitest";
import {
  NOISE_LOUDNESS,
  bfsDistances,
  bfsPath,
  emitNoise,
  graphDistance,
  hunterHears,
  moveNoiseLoudness,
  type RoomAdjacency
} from "../game/delve/noise";
import type { NoiseEvent } from "../game/delve/types";

// A simple line graph: a - b - c - d - e
const line: RoomAdjacency = {
  a: ["b"],
  b: ["a", "c"],
  c: ["b", "d"],
  d: ["c", "e"],
  e: ["d"]
};

// A branching graph with an isolated room.
const branch: RoomAdjacency = {
  hub: ["north", "south"],
  north: ["hub"],
  south: ["hub"],
  island: []
};

function noise(overrides: Partial<NoiseEvent> = {}): NoiseEvent {
  return { roomId: "a", loudness: 2, cause: "search", ...overrides };
}

describe("delve noise", () => {
  it("exposes fixed loudness for non-move causes", () => {
    expect(NOISE_LOUDNESS).toEqual({
      search: 2,
      fightBeat: 3,
      lockwork: 3,
      flee: 4,
      crank: 4
    });
  });

  describe("moveNoiseLoudness", () => {
    it("is 1 by default", () => {
      expect(moveNoiseLoudness({ packRatio: 0.2, lightState: "bright" })).toBe(1);
    });

    it("adds 1 for an overloaded pack", () => {
      expect(moveNoiseLoudness({ packRatio: 0.61, lightState: "bright" })).toBe(2);
    });

    it("adds 1 more in the dark", () => {
      expect(moveNoiseLoudness({ packRatio: 0.61, lightState: "dark" })).toBe(3);
    });

    it("stacks dark penalty even with a light pack", () => {
      expect(moveNoiseLoudness({ packRatio: 0.1, lightState: "dark" })).toBe(2);
    });

    it("does not add the pack penalty at exactly 60%", () => {
      expect(moveNoiseLoudness({ packRatio: 0.6, lightState: "bright" })).toBe(1);
    });
  });

  describe("bfsDistances / graphDistance", () => {
    it("computes distance 0 for the origin room", () => {
      const distances = bfsDistances(line, "a");
      expect(distances.a).toBe(0);
    });

    it("computes correct distances along a line graph", () => {
      const distances = bfsDistances(line, "a");
      expect(distances).toEqual({ a: 0, b: 1, c: 2, d: 3, e: 4 });
    });

    it("graphDistance matches bfsDistances", () => {
      expect(graphDistance(line, "a", "d")).toBe(3);
      expect(graphDistance(line, "c", "c")).toBe(0);
    });

    it("returns undefined distance for an unreachable room", () => {
      expect(graphDistance(branch, "hub", "island")).toBeUndefined();
    });
  });

  describe("bfsPath", () => {
    it("returns a single-room path for the same room", () => {
      expect(bfsPath(line, "b", "b")).toEqual(["b"]);
    });

    it("returns the shortest path along a line", () => {
      expect(bfsPath(line, "a", "e")).toEqual(["a", "b", "c", "d", "e"]);
    });

    it("returns undefined for an unreachable room", () => {
      expect(bfsPath(branch, "hub", "island")).toBeUndefined();
    });
  });

  describe("emitNoise", () => {
    it("passes the event through unchanged", () => {
      const event = noise({ roomId: "c", loudness: 3, cause: "flee" });
      expect(emitNoise(event)).toEqual(event);
    });
  });

  describe("hunterHears", () => {
    it("hears when loudness >= distance", () => {
      const event = noise({ roomId: "a", loudness: 2 });
      expect(hunterHears(event, "a", line)).toBe(true); // distance 0
      expect(hunterHears(event, "b", line)).toBe(true); // distance 1
      expect(hunterHears(event, "c", line)).toBe(true); // distance 2, equal
    });

    it("does not hear when loudness < distance", () => {
      const event = noise({ roomId: "a", loudness: 2 });
      expect(hunterHears(event, "d", line)).toBe(false); // distance 3
    });

    it("never hears across unreachable rooms", () => {
      const event = noise({ roomId: "hub", loudness: 99 });
      expect(hunterHears(event, "island", branch)).toBe(false);
    });
  });
});
