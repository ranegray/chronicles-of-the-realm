import type {
  Character,
  DungeonRun,
  Quest,
  VillageState,
  ItemInstance,
  Inventory
} from "./types";
import { moveRaidInventoryToStash, createEmptyInventory } from "./inventory";
import { instanceFromTemplateId } from "./inventory";
import type { Rng } from "./rng";

export interface ExtractionRewardSummary {
  goldGained: number;
  xpGained: number;
  itemsSecured: ItemInstance[];
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
    xpGained: 0,
    itemsSecured: [...run.raidInventory.items],
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
  nextPlayer.xp += summary.xpGained;
  nextPlayer.hp = nextPlayer.maxHp;
  if (nextPlayer.wounded) nextPlayer = { ...nextPlayer, wounded: undefined };

  // Stash carries gold; also add quest gold
  nextStash = { ...nextStash, gold: nextStash.gold + summary.goldGained - run.raidInventory.gold };
  // (raid gold was already moved into stash by moveRaidInventoryToStash)

  return { player: nextPlayer, village: nextVillage, stash: nextStash, summary };
}

export interface DeathSummary {
  itemsLost: ItemInstance[];
  goldLost: number;
}

export function applyDeathPenalty(run: DungeonRun): { run: DungeonRun; summary: DeathSummary } {
  const summary: DeathSummary = {
    itemsLost: [...run.raidInventory.items, ...run.loadoutSnapshot.filter(i => !i.protected)],
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
  const summary: DeathSummary = {
    itemsLost: [...run.raidInventory.items],
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
