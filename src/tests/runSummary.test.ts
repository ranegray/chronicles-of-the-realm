import { describe, it, expect } from "vitest";
import { buildRunSummary } from "../game/runSummary";
import { applyDeathPenalty } from "../game/progression";
import { generateVillage } from "../game/npcGenerator";
import { addItem, createEmptyInventory, instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { DungeonRoom, DungeonRun } from "../game/types";

function room(partial: Partial<DungeonRoom> & { id: string }): DungeonRoom {
  return {
    id: partial.id,
    type: partial.type ?? "empty",
    biome: "crypt",
    title: partial.id,
    description: "",
    dangerRating: 0,
    connectedRoomIds: partial.connectedRoomIds ?? [],
    visited: partial.visited ?? false,
    completed: false,
    extractionPoint: partial.extractionPoint
  };
}

/** Hand-built fixture with a real room graph (A - B - C-extraction), used
 *  only here to exercise buildRunSummary's BFS-derived death-distance stat.
 *  The delve-run adapter gameStore.ts actually builds always has an empty
 *  roomGraph, so this stat is permanently undefined in the live game today
 *  — see the report note in gameStore.ts's buildDelveRunAdapter comment. */
function buildFakeRun(seed: string, currentRoomId: string): DungeonRun {
  const rooms = [
    room({ id: "A", connectedRoomIds: ["B"], visited: true }),
    room({ id: "B", connectedRoomIds: ["A", "C"], visited: true }),
    room({ id: "C", connectedRoomIds: ["B"], extractionPoint: true, visited: true })
  ];
  return {
    runId: seed,
    seed,
    biome: "crypt",
    tier: 1,
    status: "active",
    startedAt: 0,
    currentRoomId,
    roomGraph: rooms,
    visitedRoomIds: ["A", "B", "C"],
    raidInventory: createEmptyInventory(),
    loadoutSnapshot: [],
    activeQuestIds: [],
    questProgressAtStart: {},
    xpGained: 0,
    roomsVisitedBeforeDepth: 0,
    roomsCompletedBeforeDepth: 0
  };
}

describe("buildRunSummary death", () => {
  it("fills deathExtractionDistance and raidValueLost on death", () => {
    const run = buildFakeRun("summary-death", "A");
    const rng = createRng("items");
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("material_bone_dust", rng, 3));
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("consumable_small_draught", rng, 1));
    run.raidInventory = { ...run.raidInventory, gold: 8 };

    const { run: dead, summary: deathSummary } = applyDeathPenalty(run);
    const village = generateVillage(createRng("village"));
    const summary = buildRunSummary({
      run: dead,
      village,
      reason: "dead",
      reasonText: "You fell.",
      death: deathSummary
    });
    expect(summary.reason).toBe("dead");
    expect(summary.raidValueLost).toBeGreaterThan(0);
    expect(summary.itemValueLost).toBeGreaterThanOrEqual(0);
    // Extraction exists two rooms away — distance must be finite.
    expect(summary.deathExtractionDistance).toBe(2);
  });

  it("omits death-specific fields on successful extraction", () => {
    const run = buildFakeRun("summary-extract", "A");
    const village = generateVillage(createRng("v"));
    const summary = buildRunSummary({
      run,
      village,
      reason: "extracted",
      reasonText: "You walked out alive."
    });
    expect(summary.deathExtractionDistance).toBeUndefined();
    expect(summary.raidValueLost).toBe(0);
  });
});
