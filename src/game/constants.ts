export const SAVE_VERSION = 1;
export const DUNGEON_GENERATOR_VERSION = 1;
export const STORAGE_KEY = "chronicles-of-the-realm:save";

export const ABILITY_NAMES = [
  "might",
  "agility",
  "endurance",
  "intellect",
  "will",
  "presence"
] as const;

export const CHARACTER_CREATION = {
  abilityRolls: {
    diceCount: 4,
    diceSides: 6,
    dropLowest: 1,
    rerollLimit: 3
  },
  startingLevel: 1,
  startingGold: 25
};

export const RUN_RULES = {
  tierOneMinRooms: 10,
  tierOneMaxRooms: 16,
  minExtractionRooms: 1,
  baseExtractionRoomChance: 0.12,
  bossRoomChanceTierOne: 0.15,
  maxDungeonDepth: 3,
  deathLosesRaidInventory: true,
  deathLosesLoadout: true
};

export const COMBAT_RULES = {
  d20Sides: 20,
  naturalCrit: 20,
  naturalFumble: 1,
  critMultiplier: 2,
  defendDamageReduction: 0.5,
  fleeBaseChance: 0.45
};

export const LOOT_RULES = {
  maxAffixesByRarity: {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4
  },
  rarityWeightsTierOne: {
    common: 78,
    uncommon: 18,
    rare: 4,
    epic: 0,
    legendary: 0
  }
};

export const INVENTORY_RULES = {
  defaultCarryCapacity: 20,
  maxStackSize: 99
};
