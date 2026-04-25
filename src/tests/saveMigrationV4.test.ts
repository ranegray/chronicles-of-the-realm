import { beforeEach, describe, expect, it } from "vitest";
import { defaultGameState, loadGame, saveGame } from "../game/save";
import { SAVE_VERSION, STORAGE_KEY } from "../game/constants";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { generateVillage } from "../game/npcGenerator";
import { addItem, instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { Character, GameState, RunSummary } from "../game/types";

function buildPlayer(): Character {
  let draft = createEmptyDraft("migration-v4");
  draft = CharacterCreationService.setName(draft, "Migrator");
  draft = CharacterCreationService.selectAncestry(draft, "human");
  draft = CharacterCreationService.selectClass(draft, "warrior");
  draft = CharacterCreationService.rollAllAbilityScores(draft);
  draft = CharacterCreationService.autoAssignScoresForClass(draft);
  draft = CharacterCreationService.chooseStarterKit(draft, "warrior_sword_shield");
  return CharacterCreationService.finalizeCharacter(draft).character;
}

describe("save migration v4", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates v3 saves with progression and v4 item fields", () => {
    const rng = createRng("migration-v4-items");
    const player = buildPlayer();
    const { progression, ...legacyPlayer } = {
      ...player,
      level: 4,
      xp: 450,
      equipped: {
        ...player.equipped,
        weapon: stripV4ItemFields({
          ...instanceFromTemplateId("weapon_short_sword", rng),
          protected: true
        })
      }
    };
    void progression;

    const stashItem = stripV4ItemFields(instanceFromTemplateId("trinket_pilgrim_charm", rng));
    const raidItem = stripV4ItemFields(instanceFromTemplateId("material_bone_dust", rng, 2));
    const loadoutItem = stripV4ItemFields({
      ...instanceFromTemplateId("shield_oak_buckler", rng),
      protected: true
    });
    const village = generateVillage(createRng("migration-v4-village"));
    const run = generateDungeonRun({ seed: "migration-v4-run", biome: "crypt", tier: 1 });
    const { delveStrain, ...legacyRunFields } = run;
    void delveStrain;
    run.raidInventory = addItem(run.raidInventory, raidItem);
    run.loadoutSnapshot = [loadoutItem];
    run.appliedRunPreparations = [{
      id: "prep-1",
      optionId: "cartographer-extra-scouting",
      sourceNpcId: village.npcs[0]!.id,
      effect: {
        type: "improveScouting",
        amount: 1,
        durationRuns: 1
      },
      createdAt: 123,
      consumed: true
    }];
    run.dungeonLog = [{
      id: "log-1",
      timestamp: 123,
      message: "Legacy log entry.",
      type: "info"
    }];

    const runSummary: RunSummary = {
      id: "summary-1",
      runId: run.runId,
      seed: run.seed,
      biome: run.biome,
      tier: run.tier,
      startedAt: run.startedAt,
      endedAt: run.startedAt + 100,
      reason: "dead",
      reasonText: "Legacy death.",
      roomsVisited: 2,
      roomsCompleted: 1,
      lootExtracted: [stripV4ItemFields(instanceFromTemplateId("gem_dim_quartz", rng))],
      lootLost: [stripV4ItemFields(instanceFromTemplateId("consumable_small_draught", rng))],
      gearLost: [loadoutItem],
      materialsExtracted: {},
      materialsLost: {},
      goldGained: 0,
      goldLost: 5,
      xpGained: 10,
      itemValueExtracted: 4,
      itemValueLost: 8,
      raidValueLost: 8,
      questProgress: [],
      questsCompleted: [],
      questRewards: [stripV4ItemFields(instanceFromTemplateId("material_bone_dust", rng))],
      unlocksApplied: []
    };

    const legacy = {
      ...defaultGameState(),
      version: 3,
      player: legacyPlayer,
      stash: { items: [stashItem], gold: 25 },
      village: {
        ...village,
        renown: 7,
        completedRunPreparationIds: ["cartographer-extra-scouting"]
      },
      activeRun: {
        ...legacyRunFields,
        raidInventory: run.raidInventory,
        loadoutSnapshot: run.loadoutSnapshot,
        appliedRunPreparations: run.appliedRunPreparations,
        dungeonLog: run.dungeonLog
      },
      runSummaries: [runSummary],
      lastRunSummary: runSummary,
      pendingRunPreparations: run.appliedRunPreparations
    } as unknown as GameState;

    saveGame(legacy);
    const loaded = loadGame()!;

    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.player?.level).toBe(4);
    expect(loaded.player?.xp).toBe(450);
    expect(loaded.player?.progression).toMatchObject({
      level: 4,
      xp: 450,
      totalXpEarned: 450,
      unspentTalentPoints: 3,
      spentTalentPoints: 0,
      learnedTalentIds: [],
      activeCombatActionIds: [],
      unlockedPassiveIds: [],
      unlockedBuildFlags: {}
    });

    expect(loaded.stash.items[0]).toMatchObject({ affixes: [], states: [], tags: [] });
    expect(loaded.player?.equipped.weapon?.affixes).toEqual([]);
    expect(loaded.player?.equipped.weapon?.states?.some(state => state.id === "protected")).toBe(true);
    expect(loaded.activeRun?.raidInventory.items[0]).toMatchObject({ affixes: [], states: [], tags: [] });
    expect(loaded.activeRun?.loadoutSnapshot[0]?.states?.some(state => state.id === "protected")).toBe(true);
    expect(loaded.runSummaries[0]?.lootExtracted[0]).toMatchObject({ affixes: [], states: [], tags: [] });
    expect(loaded.lastRunSummary?.questRewards[0]).toMatchObject({ affixes: [], states: [], tags: [] });

    expect(loaded.activeRun?.threat).toBeDefined();
    expect(loaded.activeRun?.delveStrain).toMatchObject({ points: 0, level: 0, changes: [] });
    expect(loaded.activeRun?.knownRoomIntel).toBeDefined();
    expect(loaded.activeRun?.dungeonLog[0]?.message).toBe("Legacy log entry.");
    expect(loaded.activeRun?.appliedRunPreparations).toEqual(run.appliedRunPreparations);
    expect(loaded.pendingRunPreparations).toEqual(run.appliedRunPreparations);
    expect(loaded.village?.renown).toBe(7);
    expect(loaded.village?.npcs[0]?.service).toBeDefined();
    expect(loaded.village?.questChains).toBeDefined();
    expect(loaded.village?.completedRunPreparationIds).toEqual(["cartographer-extra-scouting"]);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(SAVE_VERSION);
  });
});

function stripV4ItemFields<T extends { affixes?: unknown; states?: unknown; tags?: unknown }>(item: T): T {
  const { affixes, states, tags, ...legacy } = item;
  void affixes;
  void states;
  void tags;
  return legacy as T;
}
