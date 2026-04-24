import { describe, expect, it } from "vitest";
import { defaultGameState } from "../game/save";
import { generateVillage } from "../game/npcGenerator";
import { createRng } from "../game/rng";
import { initializeVillageProgression, canUpgradeNpcService, upgradeNpcService, addNpcRelationship, addNpcServiceXp } from "../game/villageProgression";

describe("village progression", () => {
  it("initializes NPC service state at level 1 with unlocks", () => {
    const village = initializeVillageProgression({ village: generateVillage(createRng("village-progression")) });
    const blacksmith = village.npcs.find(npc => npc.role === "blacksmith")!;
    expect(blacksmith.service.level).toBe(1);
    expect(blacksmith.service.unlockedRecipeIds).toContain("recipe-iron-shortblade");
  });

  it("blocks and then performs service upgrades with material costs", () => {
    const village = initializeVillageProgression({ village: generateVillage(createRng("upgrade")) });
    const blacksmith = village.npcs.find(npc => npc.role === "blacksmith")!;
    const blocked = canUpgradeNpcService({ gameState: { ...defaultGameState(), village }, npcId: blacksmith.id });
    expect(blocked.canUpgrade).toBe(false);

    const gameState = {
      ...defaultGameState(),
      village,
      stash: { items: [], gold: 25, materials: { ironOre: 4, scrapIron: 2 } }
    };
    const upgraded = upgradeNpcService({ gameState, npcId: blacksmith.id, now: 1 });
    expect(upgraded.success).toBe(true);
    const nextBlacksmith = upgraded.gameState.village!.npcs.find(npc => npc.id === blacksmith.id)!;
    expect(nextBlacksmith.service.level).toBe(2);
    expect(nextBlacksmith.service.unlockedRunPreparationIds).toContain("prep-reinforced-weapon");
    expect(upgraded.gameState.stash.materials?.ironOre).toBeUndefined();
  });

  it("updates relationship and service XP on the correct NPC", () => {
    let village = initializeVillageProgression({ village: generateVillage(createRng("xp")) });
    const npc = village.npcs[0]!;
    village = addNpcRelationship({ village, npcId: npc.id, amount: 10 });
    village = addNpcServiceXp({ village, npcId: npc.id, amount: 25 });
    const updated = village.npcs.find(entry => entry.id === npc.id)!;
    expect(updated.relationship).toBe(10);
    expect(updated.service.xp).toBe(25);
  });
});
