import { describe, it, expect } from "vitest";
import { buildRunSummary } from "../game/runSummary";
import { applyDeathPenalty } from "../game/progression";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { generateVillage } from "../game/npcGenerator";
import { addItem, instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";

describe("buildRunSummary death", () => {
  it("fills deathExtractionDistance and raidValueLost on death", () => {
    const run = generateDungeonRun({ seed: "summary-death" });
    const rng = createRng("items");
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("material_bone_dust", rng, 3));
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("consumable_small_draught", rng, 1));
    run.raidInventory = { ...run.raidInventory, gold: 8 };
    // Simulate a death in a later room.
    run.currentRoomId = run.roomGraph[Math.floor(run.roomGraph.length / 2)]!.id;

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
    // Extraction exists somewhere — distance must be finite.
    expect(summary.deathExtractionDistance).toBeGreaterThanOrEqual(0);
  });

  it("omits death-specific fields on successful extraction", () => {
    const run = generateDungeonRun({ seed: "summary-extract" });
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
