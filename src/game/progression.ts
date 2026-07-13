import type {
  Character,
  DungeonRun,
  Quest,
  VillageState,
  ItemInstance,
  Inventory,
  MaterialVault
} from "./types";
import { moveRaidInventoryToStash, createEmptyInventory, addItem } from "./inventory";
import { instanceFromTemplateId } from "./inventory";
import type { Rng } from "./rng";
import { recalculateCharacterStats } from "./characterMath";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";

const QUEST_ITEM_TAG = "quest";
const EQUIPMENT_SLOTS = ["weapon", "offhand", "armor", "trinket1", "trinket2"] as const;

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
  questItemsSaved: ItemInstance[];
  keepsakeSaved?: ItemInstance;
  insuranceReturned?: ItemInstance;
}

function isQuestItem(item: ItemInstance): boolean {
  return item.tags?.includes(QUEST_ITEM_TAG) ?? false;
}

/**
 * Full Tarkov death rule: the raid pack and all equipped gear are lost.
 * Quest items always survive (tags include "quest") — losing them can
 * soft-lock quest chains. A designated keepsake (weightless raid-pack item)
 * and an insured piece of gear may also survive; the insured piece is
 * unequipped and returned to the stash rather than staying on the character.
 */
export function applyDeathPenalty(run: DungeonRun): { run: DungeonRun; summary: DeathSummary } {
  const allRaidItems = run.raidInventory.items;
  const questItemsSaved = allRaidItems.filter(isQuestItem);
  const keepsakeSaved = run.keepsakeInstanceId
    ? allRaidItems.find(
        item => item.instanceId === run.keepsakeInstanceId && item.weight === 0 && item.quantity === 1 && !isQuestItem(item)
      )
    : undefined;
  const savedRaidIds = new Set(
    [...questItemsSaved, ...(keepsakeSaved ? [keepsakeSaved] : [])].map(item => item.instanceId)
  );
  const raidItemsLost = allRaidItems.filter(item => !savedRaidIds.has(item.instanceId));

  const insuranceReturned = run.insuredInstanceId
    ? run.loadoutSnapshot.find(item => item.instanceId === run.insuredInstanceId)
    : undefined;
  const gearLost = run.loadoutSnapshot.filter(
    item => !item.protected && item.instanceId !== run.insuredInstanceId
  );

  const summary: DeathSummary = {
    itemsLost: [...raidItemsLost, ...gearLost],
    raidItemsLost,
    gearLost,
    materialsLost: { ...(run.raidInventory.materials ?? {}) },
    goldLost: run.raidInventory.gold,
    questItemsSaved,
    keepsakeSaved,
    insuranceReturned
  };
  const next: DungeonRun = {
    ...run,
    status: "dead",
    raidInventory: createEmptyInventory(),
    loadoutSnapshot: run.loadoutSnapshot.filter(item => item.protected)
  };
  return { run: next, summary };
}

/**
 * Pure resolution of a death: applies the penalty, moves every surviving
 * item (quest items, keepsake, insured gear) into the stash, and unequips
 * whatever the character no longer has (lost gear and the insured piece,
 * which now lives in the stash instead of on the body).
 */
export function resolveDeathOutcome(params: {
  run: DungeonRun;
  player: Character;
  stash: Inventory;
}): { run: DungeonRun; player: Character; stash: Inventory; summary: DeathSummary } {
  const { run, player, stash } = params;
  const { run: deadRun, summary } = applyDeathPenalty(run);

  const survivors: ItemInstance[] = [
    ...summary.questItemsSaved,
    ...(summary.keepsakeSaved ? [summary.keepsakeSaved] : []),
    ...(summary.insuranceReturned ? [summary.insuranceReturned] : [])
  ];
  let nextStash = stash;
  for (const item of survivors) {
    nextStash = addItem(nextStash, item);
  }

  const unequipIds = new Set([
    ...summary.gearLost.map(item => item.instanceId),
    ...(summary.insuranceReturned ? [summary.insuranceReturned.instanceId] : [])
  ]);
  const equipped = { ...player.equipped };
  for (const slot of EQUIPMENT_SLOTS) {
    const item = equipped[slot];
    if (item && unequipIds.has(item.instanceId)) {
      equipped[slot] = undefined;
    }
  }
  const recalculated = recalculateCharacterStats(
    { ...player, equipped, wounded: undefined },
    getAncestry(player.ancestryId),
    getClass(player.classId)
  );
  const recoveredPlayer: Character = { ...recalculated, hp: recalculated.maxHp, wounded: undefined };

  return { run: deadRun, player: recoveredPlayer, stash: nextStash, summary };
}

export function applyAbandonPenalty(run: DungeonRun): { run: DungeonRun; summary: DeathSummary } {
  const raidItemsLost = [...run.raidInventory.items];
  const questItemsSaved = raidItemsLost.filter(isQuestItem);
  const savedIds = new Set(questItemsSaved.map(item => item.instanceId));
  const summary: DeathSummary = {
    itemsLost: raidItemsLost.filter(item => !savedIds.has(item.instanceId)),
    raidItemsLost: raidItemsLost.filter(item => !savedIds.has(item.instanceId)),
    gearLost: [],
    materialsLost: { ...(run.raidInventory.materials ?? {}) },
    goldLost: run.raidInventory.gold,
    questItemsSaved
  };
  const next: DungeonRun = {
    ...run,
    status: "abandoned",
    raidInventory: createEmptyInventory()
  };
  return { run: next, summary };
}

/**
 * Pure resolution of an abandoned run: quest items in the raid pack
 * always survive (same soft-lock rationale as death) and are moved to
 * the stash. Equipped gear is untouched — abandoning does not cost gear.
 */
export function resolveAbandonOutcome(params: {
  run: DungeonRun;
  player: Character;
  stash: Inventory;
}): { run: DungeonRun; player: Character; stash: Inventory; summary: DeathSummary } {
  const { run, player, stash } = params;
  const { run: abandonedRun, summary } = applyAbandonPenalty(run);
  let nextStash = stash;
  for (const item of summary.questItemsSaved) {
    nextStash = addItem(nextStash, item);
  }
  const recoveredPlayer: Character = { ...player, hp: player.maxHp, wounded: undefined };
  return { run: abandonedRun, player: recoveredPlayer, stash: nextStash, summary };
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
