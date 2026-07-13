import { describe, it, expect } from "vitest";
import { roamMoveChance, spawnHunters, tickHunters } from "../game/delve/hunters";
import type { RoomAdjacency } from "../game/delve/noise";
import { createRng } from "../game/rng";
import type { Direction, Hunter, NoiseEvent } from "../game/delve/types";

// Line graph: entrance - r1 - r2 - r3 - r4
const ROOM_ORDER = ["entrance", "r1", "r2", "r3", "r4"];
const line: RoomAdjacency = {
  entrance: ["r1"],
  r1: ["entrance", "r2"],
  r2: ["r1", "r3"],
  r3: ["r2", "r4"],
  r4: ["r3"]
};

function directionOf(fromRoomId: string, toRoomId: string): Direction | undefined {
  const fromIdx = ROOM_ORDER.indexOf(fromRoomId);
  const toIdx = ROOM_ORDER.indexOf(toRoomId);
  if (fromIdx === -1 || toIdx === -1) return undefined;
  return toIdx > fromIdx ? "east" : "west";
}

function hunter(overrides: Partial<Hunter> = {}): Hunter {
  return { id: "h1", enemyId: "goblin", roomId: "r2", state: "dormant", ...overrides };
}

describe("delve hunters", () => {
  describe("spawnHunters", () => {
    it("spawns a count within the budget, capped by eligible rooms", () => {
      const rng = createRng("spawn-1");
      const hunters = spawnHunters({
        floor: 1,
        rng,
        budget: { min: 4, max: 6 },
        eligibleRoomIds: ["a", "b", "c", "d", "e", "f"],
        enemyPool: ["goblin", "rat"]
      });
      expect(hunters.length).toBeGreaterThanOrEqual(4);
      expect(hunters.length).toBeLessThanOrEqual(6);
      const uniqueRooms = new Set(hunters.map(h => h.roomId));
      expect(uniqueRooms.size).toBe(hunters.length);
    });

    it("never spawns more hunters than eligible rooms", () => {
      const rng = createRng("spawn-2");
      const hunters = spawnHunters({
        floor: 1,
        rng,
        budget: { min: 4, max: 6 },
        eligibleRoomIds: ["a", "b"],
        enemyPool: ["goblin"]
      });
      expect(hunters.length).toBeLessThanOrEqual(2);
    });

    it("all hunters start dormant and draw enemyId from the pool", () => {
      const rng = createRng("spawn-3");
      const hunters = spawnHunters({
        floor: 1,
        rng,
        budget: { min: 3, max: 3 },
        eligibleRoomIds: ["a", "b", "c"],
        enemyPool: ["goblin", "rat"]
      });
      for (const h of hunters) {
        expect(h.state).toBe("dormant");
        expect(["goblin", "rat"]).toContain(h.enemyId);
      }
    });

    it("returns nothing when there are no eligible rooms", () => {
      const rng = createRng("spawn-4");
      const hunters = spawnHunters({
        floor: 1,
        rng,
        budget: { min: 4, max: 6 },
        eligibleRoomIds: [],
        enemyPool: ["goblin"]
      });
      expect(hunters).toEqual([]);
    });

    it("is deterministic for a fixed seed", () => {
      const opts = {
        floor: 1,
        budget: { min: 4, max: 6 },
        eligibleRoomIds: ["a", "b", "c", "d", "e", "f"],
        enemyPool: ["goblin", "rat", "ooze"]
      };
      const a = spawnHunters({ ...opts, rng: createRng("fixed-seed") });
      const b = spawnHunters({ ...opts, rng: createRng("fixed-seed") });
      expect(a.map(h => ({ ...h }))).toEqual(b.map(h => ({ ...h })));
    });
  });

  describe("tickHunters state transitions", () => {
    it("dormant hunter stays put with no noise", () => {
      const rng = createRng("tick-dormant");
      const { hunters } = tickHunters({
        hunters: [hunter({ state: "dormant", roomId: "r2" })],
        adjacency: line,
        playerRoomId: "entrance",
        noises: [],
        alertnessLevel: 0,
        rng,
        directionOf
      });
      expect(hunters[0]).toEqual(hunter({ state: "dormant", roomId: "r2" }));
    });

    it("dormant hunter becomes drawn when hearing a distant noise", () => {
      const rng = createRng("tick-draw");
      const noise: NoiseEvent = { roomId: "entrance", loudness: 4, cause: "flee" };
      const { hunters } = tickHunters({
        hunters: [hunter({ state: "dormant", roomId: "r4" })], // distance 4 from entrance
        adjacency: line,
        playerRoomId: "entrance",
        noises: [noise],
        alertnessLevel: 0,
        rng,
        directionOf
      });
      expect(hunters[0]!.state).toBe("drawn");
      expect(hunters[0]!.heardAt).toBe("entrance");
      // Wakes up but doesn't move on the same tick it wakes.
      expect(hunters[0]!.roomId).toBe("r4");
    });

    it("drawn hunter steps toward the heard room each tick and arrives", () => {
      const rng = createRng("tick-drawn-step");
      let hunters: Hunter[] = [hunter({ state: "drawn", roomId: "r4", heardAt: "entrance" })];

      // Step 1: r4 -> r3
      ({ hunters } = tickHunters({
        hunters, adjacency: line, playerRoomId: "somewhereElse", noises: [], alertnessLevel: 0, rng, directionOf
      }));
      expect(hunters[0]!.roomId).toBe("r3");
      expect(hunters[0]!.state).toBe("drawn");

      // Step 2: r3 -> r2
      ({ hunters } = tickHunters({
        hunters, adjacency: line, playerRoomId: "somewhereElse", noises: [], alertnessLevel: 0, rng, directionOf
      }));
      expect(hunters[0]!.roomId).toBe("r2");

      // Step 3: r2 -> r1
      ({ hunters } = tickHunters({
        hunters, adjacency: line, playerRoomId: "somewhereElse", noises: [], alertnessLevel: 0, rng, directionOf
      }));
      expect(hunters[0]!.roomId).toBe("r1");

      // Step 4: r1 -> entrance, arrives, becomes roaming
      ({ hunters } = tickHunters({
        hunters, adjacency: line, playerRoomId: "somewhereElse", noises: [], alertnessLevel: 0, rng, directionOf
      }));
      expect(hunters[0]!.roomId).toBe("entrance");
      expect(hunters[0]!.state).toBe("roaming");
      expect(hunters[0]!.heardAt).toBeUndefined();
    });

    it("hunter becomes hunting on hearing noise within 2 rooms and converges on the player", () => {
      const rng = createRng("tick-hunt-hear");
      const noise: NoiseEvent = { roomId: "entrance", loudness: 4, cause: "flee" };
      const { hunters, contacts } = tickHunters({
        hunters: [hunter({ state: "roaming", roomId: "r2" })], // distance 2 from entrance
        adjacency: line,
        playerRoomId: "entrance",
        noises: [noise],
        alertnessLevel: 0,
        rng,
        directionOf
      });
      expect(hunters[0]!.state).toBe("hunting");
      expect(hunters[0]!.roomId).toBe("r1"); // stepped toward player
      expect(contacts).toEqual([]);
    });

    it("hunter becomes hunting on sight when in the same room as the player", () => {
      const rng = createRng("tick-hunt-sight-same");
      const { hunters, contacts } = tickHunters({
        hunters: [hunter({ state: "roaming", roomId: "entrance" })],
        adjacency: line,
        playerRoomId: "entrance",
        noises: [],
        alertnessLevel: 0,
        rng,
        directionOf
      });
      expect(hunters[0]!.state).toBe("hunting");
      expect(contacts).toEqual(["h1"]);
    });

    it("hunter becomes hunting on sight when adjacent and alertness >= 3", () => {
      const rng = createRng("tick-hunt-sight-adj");
      const { hunters } = tickHunters({
        hunters: [hunter({ state: "roaming", roomId: "r1" })],
        adjacency: line,
        playerRoomId: "entrance",
        noises: [],
        alertnessLevel: 3,
        rng,
        directionOf
      });
      expect(hunters[0]!.state).toBe("hunting");
    });

    it("does not trigger sight-based hunting when adjacent but alertness is below 3", () => {
      const rng = createRng("tick-hunt-sight-low-alert");
      const { hunters } = tickHunters({
        hunters: [hunter({ state: "roaming", roomId: "r1" })],
        adjacency: line,
        playerRoomId: "entrance",
        noises: [],
        alertnessLevel: 2,
        rng,
        directionOf
      });
      expect(hunters[0]!.state).not.toBe("hunting");
    });

    it("hunting hunter keeps converging every tick regardless of noise", () => {
      const rng = createRng("tick-hunting-sticky");
      let hunters: Hunter[] = [hunter({ state: "hunting", roomId: "r3" })];
      ({ hunters } = tickHunters({
        hunters, adjacency: line, playerRoomId: "entrance", noises: [], alertnessLevel: 0, rng, directionOf
      }));
      expect(hunters[0]!.roomId).toBe("r2");
      expect(hunters[0]!.state).toBe("hunting");
    });

    it("reports contacts for hunters that end the tick in the player's room", () => {
      const rng = createRng("tick-contact");
      const { contacts } = tickHunters({
        hunters: [hunter({ id: "h9", state: "hunting", roomId: "r1" })],
        adjacency: line,
        playerRoomId: "entrance",
        noises: [],
        alertnessLevel: 0,
        rng,
        directionOf
      });
      expect(contacts).toEqual(["h9"]);
    });
  });

  describe("tickHunters signals", () => {
    it("signals hunters within distance 2, direction 'here' at distance 0", () => {
      const rng = createRng("signal-here");
      const { signals } = tickHunters({
        hunters: [hunter({ id: "h1", state: "hunting", roomId: "entrance" })],
        adjacency: line,
        playerRoomId: "r1", // hunter steps to r1 == player room this tick
        noises: [],
        alertnessLevel: 0,
        rng,
        directionOf
      });
      const signal = signals.find(s => s.hunterId === "h1")!;
      expect(signal.distance).toBe(0);
      expect(signal.direction).toBe("here");
    });

    it("derives direction from the first BFS step at distance 1", () => {
      const rng = createRng("signal-dir");
      const { signals } = tickHunters({
        hunters: [hunter({ id: "h1", state: "dormant", roomId: "r2" })],
        adjacency: line,
        playerRoomId: "r1",
        noises: [],
        alertnessLevel: 0,
        rng,
        directionOf
      });
      const signal = signals.find(s => s.hunterId === "h1")!;
      expect(signal.distance).toBe(1);
      expect(signal.direction).toBe("east"); // r1 -> r2 is toward higher index
    });

    it("excludes hunters farther than distance 2", () => {
      const rng = createRng("signal-far");
      const { signals } = tickHunters({
        hunters: [hunter({ id: "h1", state: "dormant", roomId: "r4" })],
        adjacency: line,
        playerRoomId: "entrance",
        noises: [],
        alertnessLevel: 0,
        rng,
        directionOf
      });
      expect(signals.find(s => s.hunterId === "h1")).toBeUndefined();
    });
  });

  describe("roamMoveChance", () => {
    it("is 0.5 at alertness 0", () => {
      expect(roamMoveChance(0)).toBeCloseTo(0.5);
    });

    it("saturates at 0.8 at high alertness", () => {
      expect(roamMoveChance(5)).toBeCloseTo(0.8);
      expect(roamMoveChance(10)).toBeCloseTo(0.8);
    });

    it("increases monotonically with alertness", () => {
      expect(roamMoveChance(3)).toBeGreaterThan(roamMoveChance(1));
    });
  });

  describe("determinism", () => {
    it("tickHunters produces identical output for a fixed seed and identical inputs", () => {
      const noise: NoiseEvent = { roomId: "r2", loudness: 2, cause: "search" };
      const baseHunters = [
        hunter({ id: "h1", state: "roaming", roomId: "r3" }),
        hunter({ id: "h2", state: "dormant", roomId: "r4" })
      ];
      const run = () =>
        tickHunters({
          hunters: baseHunters.map(h => ({ ...h })),
          adjacency: line,
          playerRoomId: "r2",
          noises: [noise],
          alertnessLevel: 1,
          rng: createRng("determinism-seed"),
          directionOf
        });
      const resultA = run();
      const resultB = run();
      expect(resultA).toEqual(resultB);
    });

    it("roaming random-walk is reproducible for a fixed seed", () => {
      const run = () =>
        tickHunters({
          hunters: [hunter({ id: "h1", state: "roaming", roomId: "r2" })],
          adjacency: line,
          playerRoomId: "somewhereElse",
          noises: [],
          alertnessLevel: 4,
          rng: createRng("roam-seed"),
          directionOf
        });
      const resultA = run();
      const resultB = run();
      expect(resultA).toEqual(resultB);
    });
  });
});
