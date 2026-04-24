import { describe, it, expect } from "vitest";
import { applyDeathPenalty, applyExtractionRewards } from "../game/progression";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { generateVillage } from "../game/npcGenerator";
import { seedVillageQuests } from "../game/questGenerator";
import { addItem, createEmptyInventory, instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";

function buildPlayer() {
  let d = createEmptyDraft("p");
  d = CharacterCreationService.setName(d, "Tester");
  d = CharacterCreationService.selectAncestry(d, "human");
  d = CharacterCreationService.selectClass(d, "scout");
  d = CharacterCreationService.rollAllAbilityScores(d);
  d = CharacterCreationService.autoAssignScoresForClass(d);
  d = CharacterCreationService.chooseStarterKit(d, "scout_bow_dagger");
  return CharacterCreationService.finalizeCharacter(d).character;
}

describe("progression", () => {
  it("death loses raid inventory and unprotected loadout", () => {
    const run = generateDungeonRun({ seed: "death" });
    const rng = createRng("d");
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("material_bone_dust", rng, 3));
    run.loadoutSnapshot = [instanceFromTemplateId("weapon_short_sword", rng), { ...instanceFromTemplateId("trinket_pilgrim_charm", rng), protected: true }];
    const { run: dead, summary } = applyDeathPenalty(run);
    expect(dead.status).toBe("dead");
    expect(dead.raidInventory.items).toHaveLength(0);
    expect(summary.itemsLost.length).toBeGreaterThan(0);
    expect(dead.loadoutSnapshot.every(i => i.protected)).toBe(true);
  });

  it("extraction restores player HP to full and clears wounded", () => {
    const player = buildPlayer();
    const hurt = { ...player, hp: 1, wounded: true };
    const run = generateDungeonRun({ seed: "heal" });
    const villageRng = createRng("v");
    let village = generateVillage(villageRng);
    village = seedVillageQuests(village, villageRng);
    const result = applyExtractionRewards({
      player: hurt, village, stash: createEmptyInventory(), run, rng: createRng("r")
    });
    expect(result.player.hp).toBe(result.player.maxHp);
    expect(result.player.wounded).toBeUndefined();
  });

  it("extraction moves loot to stash and leaves completed quests ready to turn in", () => {
    const player = buildPlayer();
    const villageRng = createRng("village");
    let village = generateVillage(villageRng);
    village = seedVillageQuests(village, villageRng);

    // Mark first quest as active+completed for the test
    village.quests[0]!.status = "completed";
    village.quests[0]!.currentCount = village.quests[0]!.requiredCount;

    const run = generateDungeonRun({ seed: "ext", activeQuestIds: [village.quests[0]!.id] });
    const rng = createRng("loot-extract");
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("material_bone_dust", rng, 2));
    run.raidInventory = { ...run.raidInventory, gold: 5 };

    const result = applyExtractionRewards({
      player, village, stash: createEmptyInventory(), run, rng
    });
    expect(result.stash.items.length).toBeGreaterThanOrEqual(1);
    expect(result.summary.questsCompleted.length).toBe(1);
    expect(result.summary.goldGained).toBeGreaterThanOrEqual(5);
    expect(result.village.quests[0]!.status).toBe("completed");
  });
});
