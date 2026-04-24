import { describe, expect, it } from "vitest";
import { defaultGameState } from "../game/save";
import { generateVillage } from "../game/npcGenerator";
import { createRng } from "../game/rng";
import { initializeVillageProgression } from "../game/villageProgression";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { getAvailableRunPreparationOptions, purchaseRunPreparation, applyRunPreparationsToRun } from "../game/runPreparation";
import type { Character } from "../game/types";

describe("run preparation", () => {
  it("lists unlocked preparations and purchases one", () => {
    const village = initializeVillageProgression({ village: generateVillage(createRng("prep-village")) });
    const alchemist = village.npcs.find(npc => npc.role === "alchemist")!;
    const gameState = { ...defaultGameState(), village, stash: { items: [], gold: 20, materials: { commonHerbs: 1 } } };
    expect(getAvailableRunPreparationOptions({ gameState }).map(option => option.id)).toContain("prep-starter-healing-draught");
    const result = purchaseRunPreparation({ gameState, optionId: "prep-starter-healing-draught", npcId: alchemist.id, now: 1 });
    expect(result.success).toBe(true);
    expect(result.gameState.pendingRunPreparations).toHaveLength(1);
    expect(result.gameState.stash.gold).toBe(15);
  });

  it("applies start-with-item and carry-capacity preparations", () => {
    const run = generateDungeonRun({ seed: "prep-run" });
    const character = {
      derivedStats: { carryCapacity: 20, maxHp: 10, armor: 0, accuracy: 0, evasion: 0, critChance: 0, magicPower: 0, trapSense: 0 }
    } as Character;
    const result = applyRunPreparationsToRun({
      run,
      character,
      rng: createRng("prep-apply"),
      preparations: [
        {
          id: "p1",
          optionId: "prep-starter-healing-draught",
          sourceNpcId: "npc",
          effect: { type: "startWithItem", itemTemplateId: "consumable_small_draught", quantity: 1, durationRuns: 1 },
          createdAt: 1,
          consumed: false
        },
        {
          id: "p2",
          optionId: "prep-expanded-pack",
          sourceNpcId: "npc",
          effect: { type: "increaseCarryCapacity", amount: 5, durationRuns: 1 },
          createdAt: 1,
          consumed: false
        }
      ]
    });
    expect(result.run.raidInventory.items[0]?.templateId).toBe("consumable_small_draught");
    expect(result.character.derivedStats.carryCapacity).toBe(25);
    expect(result.appliedPreparations.every(prep => prep.consumed)).toBe(true);
  });
});
