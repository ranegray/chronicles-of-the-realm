import { describe, it, expect } from "vitest";
import { extractionDistances, nextStepToKnownExtraction, shortestDistance } from "../game/pathing";
import { createInitialDelveStrainState, createInitialThreatState } from "../game/threat";
import type { DungeonRoom, DungeonRun } from "../game/types";

function room(partial: Partial<DungeonRoom> & { id: string }): DungeonRoom {
  return {
    id: partial.id,
    type: partial.type ?? "empty",
    biome: "crypt",
    title: partial.title ?? partial.id,
    description: "",
    dangerRating: 0,
    connectedRoomIds: partial.connectedRoomIds ?? [],
    visited: partial.visited ?? false,
    completed: false,
    extractionPoint: partial.extractionPoint
  };
}

function makeRun(rooms: DungeonRoom[], visitedIds: string[], currentId: string): DungeonRun {
  return {
    runId: "r", seed: "s", generatorVersion: 1, biome: "crypt", tier: 1,
    status: "active", startedAt: 0, currentRoomId: currentId,
    roomGraph: rooms, visitedRoomIds: visitedIds,
    raidInventory: { items: [], gold: 0 },
    loadoutSnapshot: [], activeQuestIds: [],
    questProgressAtStart: {}, xpGained: 0,
    roomsVisitedBeforeDepth: 0, roomsCompletedBeforeDepth: 0,
    dangerLevel: 1,
    threat: createInitialThreatState(0),
    delveStrain: createInitialDelveStrainState(0),
    knownRoomIntel: {},
    dungeonLog: []
  };
}

describe("pathing", () => {
  /*
    Graph:
      A - B - C (extraction)
          |
          D (extraction, unvisited)
  */
  const rooms = [
    room({ id: "A", connectedRoomIds: ["B"], visited: true }),
    room({ id: "B", connectedRoomIds: ["A", "C", "D"], visited: true }),
    room({ id: "C", connectedRoomIds: ["B"], extractionPoint: true, visited: true }),
    room({ id: "D", connectedRoomIds: ["B"], extractionPoint: true, visited: false })
  ];

  it("shortestDistance finds the nearest extraction through all rooms", () => {
    const run = makeRun(rooms, ["A", "B", "C"], "A");
    const d = shortestDistance(run, "A", r => r.extractionPoint === true, false);
    expect(d).toBe(2);
  });

  it("shortestDistance respects throughVisitedOnly when asked", () => {
    const run = makeRun(rooms, ["A", "B"], "A");
    const dAll = shortestDistance(run, "A", r => r.extractionPoint === true, false);
    const dVisited = shortestDistance(run, "A", r => r.extractionPoint === true, true);
    expect(dAll).toBe(2);
    // D and C are both 2 rooms away but neither is visited.
    expect(dVisited).toBeUndefined();
  });

  it("extractionDistances returns absolute + knownVisited", () => {
    const run = makeRun(rooms, ["A", "B", "C"], "A");
    const { absolute, knownVisited } = extractionDistances(run, "A");
    expect(absolute).toBe(2);
    expect(knownVisited).toBe(2);
  });

  it("nextStepToKnownExtraction points toward visited extraction", () => {
    const run = makeRun(rooms, ["A", "B", "C"], "A");
    const step = nextStepToKnownExtraction(run, "A");
    expect(step).toBe("B");
  });

  it("nextStepToKnownExtraction returns undefined on standing-on-extraction", () => {
    const run = makeRun(rooms, ["A", "B", "C"], "C");
    expect(nextStepToKnownExtraction(run, "C")).toBeUndefined();
  });

  it("nextStepToKnownExtraction returns undefined when no known extraction", () => {
    const run = makeRun(rooms, ["A", "B"], "A");
    expect(nextStepToKnownExtraction(run, "A")).toBeUndefined();
  });
});
