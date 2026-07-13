import { describe, it, expect } from "vitest";
import { applyDeathPenalty, resolveDeathOutcome } from "../game/progression";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { addItem, createEmptyInventory, instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { DungeonRun } from "../game/types";

function buildPlayer() {
  let d = createEmptyDraft("death-cost");
  d = CharacterCreationService.setName(d, "Tester");
  d = CharacterCreationService.selectAncestry(d, "human");
  d = CharacterCreationService.selectClass(d, "scout");
  d = CharacterCreationService.rollAllAbilityScores(d);
  d = CharacterCreationService.autoAssignScoresForClass(d);
  d = CharacterCreationService.chooseStarterKit(d, "scout_bow_dagger");
  return CharacterCreationService.finalizeCharacter(d).character;
}

/**
 * A minimal DungeonRun fixture, standing in for the delve-run adapter
 * gameStore.ts builds at run's end (see buildDelveRunAdapter). Death/
 * abandon/extraction penalty math only reads raidInventory, loadoutSnapshot,
 * activeQuestIds, keepsakeInstanceId, and insuredInstanceId — everything
 * else here is filler.
 */
function buildFakeRun(seed: string): DungeonRun {
  return {
    runId: seed,
    seed,
    biome: "goblinWarrens",
    tier: 1,
    status: "active",
    startedAt: 0,
    currentRoomId: "entry",
    roomGraph: [],
    visitedRoomIds: ["entry"],
    raidInventory: createEmptyInventory(),
    loadoutSnapshot: [],
    activeQuestIds: [],
    questProgressAtStart: {},
    xpGained: 0,
    roomsVisitedBeforeDepth: 0,
    roomsCompletedBeforeDepth: 0
  };
}

describe("death cost", () => {
  it("death loses the raid pack and all equipped gear", () => {
    const run = buildFakeRun("death-cost-full");
    const rng = createRng("dc1");
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("material_bone_dust", rng, 3));
    run.raidInventory = { ...run.raidInventory, gold: 50 };
    run.loadoutSnapshot = [
      instanceFromTemplateId("weapon_short_sword", rng),
      instanceFromTemplateId("trinket_pilgrim_charm", rng)
    ];
    const { run: dead, summary } = applyDeathPenalty(run);
    expect(dead.status).toBe("dead");
    expect(dead.raidInventory.items).toHaveLength(0);
    expect(dead.raidInventory.gold).toBe(0);
    expect(dead.loadoutSnapshot).toHaveLength(0);
    expect(summary.raidItemsLost).toHaveLength(1);
    expect(summary.gearLost).toHaveLength(2);
    expect(summary.goldLost).toBe(50);
  });

  it("quest items always survive death", () => {
    const run = buildFakeRun("death-cost-quest");
    const rng = createRng("dc2");
    const questItem = instanceFromTemplateId("quest_lost_sign", rng);
    run.raidInventory = addItem(run.raidInventory, questItem);
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("material_bone_dust", rng, 1));

    const { run: dead, summary } = applyDeathPenalty(run);
    expect(dead.raidInventory.items).toHaveLength(0);
    expect(summary.questItemsSaved.map(i => i.instanceId)).toEqual([questItem.instanceId]);
    expect(summary.raidItemsLost.some(i => i.instanceId === questItem.instanceId)).toBe(false);
    expect(summary.itemsLost.some(i => i.instanceId === questItem.instanceId)).toBe(false);
  });

  it("a designated keepsake survives death via resolveDeathOutcome", () => {
    const player = buildPlayer();
    const run = buildFakeRun("death-cost-keepsake");
    const rng = createRng("dc3");
    const keepsake = instanceFromTemplateId("trinket_minor_ward", rng); // weight 0
    run.raidInventory = addItem(run.raidInventory, keepsake);
    run.raidInventory = addItem(run.raidInventory, instanceFromTemplateId("material_bone_dust", rng, 1));
    run.keepsakeInstanceId = keepsake.instanceId;

    const { stash, summary } = resolveDeathOutcome({ run, player, stash: createEmptyInventory() });
    expect(summary.keepsakeSaved?.instanceId).toBe(keepsake.instanceId);
    expect(stash.items.some(i => i.instanceId === keepsake.instanceId)).toBe(true);
  });

  it("a non-weightless item cannot be a keepsake", () => {
    const run = buildFakeRun("death-cost-keepsake-invalid");
    const rng = createRng("dc3b");
    const heavyItem = instanceFromTemplateId("weapon_short_sword", rng); // has weight
    run.raidInventory = addItem(run.raidInventory, heavyItem);
    run.keepsakeInstanceId = heavyItem.instanceId;

    const { summary } = applyDeathPenalty(run);
    expect(summary.keepsakeSaved).toBeUndefined();
    expect(summary.raidItemsLost.some(i => i.instanceId === heavyItem.instanceId)).toBe(true);
  });

  it("insurance returns exactly the insured piece to the stash and unequips it", () => {
    const player = buildPlayer();
    const insuredWeapon = player.equipped.weapon!;
    const otherGear = player.equipped.offhand;

    const run = buildFakeRun("death-cost-insurance");
    run.loadoutSnapshot = [insuredWeapon, ...(otherGear ? [otherGear] : [])];
    run.insuredInstanceId = insuredWeapon.instanceId;

    const { player: recoveredPlayer, stash, summary } = resolveDeathOutcome({
      run,
      player,
      stash: createEmptyInventory()
    });

    expect(summary.insuranceReturned?.instanceId).toBe(insuredWeapon.instanceId);
    expect(summary.gearLost.some(i => i.instanceId === insuredWeapon.instanceId)).toBe(false);
    expect(stash.items.filter(i => i.instanceId === insuredWeapon.instanceId)).toHaveLength(1);
    expect(recoveredPlayer.equipped.weapon).toBeUndefined();
    if (otherGear) {
      expect(recoveredPlayer.equipped.offhand).toBeUndefined();
      expect(stash.items.some(i => i.instanceId === otherGear.instanceId)).toBe(false);
    }
  });
});
