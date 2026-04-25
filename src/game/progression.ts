import type {
  Character,
  DungeonRun,
  Quest,
  VillageState,
  ItemInstance,
  Inventory,
  MaterialVault
} from "./types";
import { moveRaidInventoryToStash, createEmptyInventory } from "./inventory";
import { instanceFromTemplateId } from "./inventory";
import type { Rng } from "./rng";

export interface ExtractionRewardSummary {
  goldGained: number;
  xpGained: number;
  itemsSecured: ItemInstance[];
  materialsSecured: MaterialVault;
  questsCompleted: Quest[];
  questRewards: ItemInstance[];
  unlocksApplied: string[];
}

export function applyExtractionRewards(args: {
  player: Character;
  village: VillageState;
  stash: Inventory;
  run: DungeonRun;
  rng: Rng;
}): {
  player: Character;
  village: VillageState;
  stash: Inventory;
  summary: ExtractionRewardSummary;
} {
  const { player, village, run, rng } = args;
  const summary: ExtractionRewardSummary = {
    goldGained: 0,
    xpGained: run.xpGained,
    itemsSecured: [...run.raidInventory.items],
    materialsSecured: { ...(run.raidInventory.materials ?? {}) },
    questsCompleted: [],
    questRewards: [],
    unlocksApplied: []
  };

  // Move raid inventory to stash
  const moveResult = moveRaidInventoryToStash(run.raidInventory, args.stash);
  let nextStash = moveResult.stash;
  summary.goldGained += run.raidInventory.gold;

  // Resolve completed quests
  let nextVillage: VillageState = { ...village, npcs: village.npcs.map(n => ({ ...n })), quests: village.quests.map(q => ({ ...q })) };
  for (const quest of nextVillage.quests) {
    if (quest.status === "completed" && run.activeQuestIds.includes(quest.id)) {
      summary.questsCompleted.push(quest);
    }
  }

  // Add gold and xp to player, and heal on safe return
  let nextPlayer: Character = { ...player };
  nextPlayer.hp = nextPlayer.maxHp;
  if (nextPlayer.wounded) nextPlayer = { ...nextPlayer, wounded: undefined };

  // Stash carries gold; also add quest gold
  nextStash = { ...nextStash, gold: nextStash.gold + summary.goldGained - run.raidInventory.gold };
  // (raid gold was already moved into stash by moveRaidInventoryToStash)

  return { player: nextPlayer, village: nextVillage, stash: nextStash, summary };
}

export interface DeathSummary {
  itemsLost: ItemInstance[];
  raidItemsLost: ItemInstance[];
  gearLost: ItemInstance[];
  materialsLost: MaterialVault;
  goldLost: number;
}

export function applyDeathPenalty(run: DungeonRun): { run: DungeonRun; summary: DeathSummary } {
  const raidItemsLost = [...run.raidInventory.items];
  const gearLost = run.loadoutSnapshot.filter(i => !i.protected);
  const summary: DeathSummary = {
    itemsLost: [...raidItemsLost, ...gearLost],
    raidItemsLost,
    gearLost,
    materialsLost: { ...(run.raidInventory.materials ?? {}) },
    goldLost: run.raidInventory.gold
  };
  const next: DungeonRun = {
    ...run,
    status: "dead",
    raidInventory: createEmptyInventory(),
    loadoutSnapshot: run.loadoutSnapshot.filter(i => i.protected)
  };
  return { run: next, summary };
}

export function applyAbandonPenalty(run: DungeonRun): { run: DungeonRun; summary: DeathSummary } {
  const raidItemsLost = [...run.raidInventory.items];
  const summary: DeathSummary = {
    itemsLost: raidItemsLost,
    raidItemsLost,
    gearLost: [],
    materialsLost: { ...(run.raidInventory.materials ?? {}) },
    goldLost: run.raidInventory.gold
  };
  const next: DungeonRun = {
    ...run,
    status: "abandoned",
    raidInventory: createEmptyInventory()
  };
  return { run: next, summary };
}

export function applyXpAndLevel(player: Character): Character {
  const xpToNext = 100 + (player.level - 1) * 60;
  if (player.xp >= xpToNext) {
    return {
      ...player,
      xp: player.xp - xpToNext,
      level: player.level + 1,
      maxHp: player.maxHp + 4,
      hp: player.hp + 4,
      derivedStats: { ...player.derivedStats, maxHp: player.derivedStats.maxHp + 4 }
    };
  }
  return player;
}
