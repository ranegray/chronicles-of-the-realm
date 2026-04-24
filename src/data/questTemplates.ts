import type { DungeonBiome, NpcRole, QuestReward, QuestType, UnlockEffect } from "../game/types";

export interface QuestTemplate {
  id: string;
  type: QuestType;
  preferredRoles: NpcRole[];
  titleTemplate: string;
  descriptionTemplate: string;
  target: string;
  requiredCount: number;
  biome?: DungeonBiome;
  reward: QuestReward;
  unlockEffect?: UnlockEffect;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: "qt_slay_goblins",
    type: "slayEnemy",
    preferredRoles: ["elder", "quartermaster"],
    titleTemplate: "The Warrens Press Close",
    descriptionTemplate:
      "Slay {count} goblins in the warrens beneath us. The young ones grow bold.",
    target: "goblin",
    requiredCount: 4,
    biome: "goblinWarrens",
    reward: { gold: 30, xp: 25, relationshipGain: 1 }
  },
  {
    id: "qt_slay_crypt",
    type: "slayEnemy",
    preferredRoles: ["elder", "healer"],
    titleTemplate: "Quiet the Crypts",
    descriptionTemplate:
      "Lay low {count} restless dead in the crypts. The wells run cold for it.",
    target: "crypt",
    requiredCount: 3,
    biome: "crypt",
    reward: { gold: 35, xp: 30, relationshipGain: 1 }
  },
  {
    id: "qt_extract_pearl",
    type: "extractMaterial",
    preferredRoles: ["enchanter", "alchemist"],
    titleTemplate: "Brine for the Workbench",
    descriptionTemplate:
      "Bring back {count} brine pearl from the sunken temple. Extract alive.",
    target: "temple",
    requiredCount: 1,
    biome: "sunkenTemple",
    reward: { gold: 50, xp: 40, relationshipGain: 1 },
    unlockEffect: { role: "enchanter", serviceLevelIncrease: 1 }
  },
  {
    id: "qt_extract_ore",
    type: "extractMaterial",
    preferredRoles: ["blacksmith"],
    titleTemplate: "Ore for the Forge",
    descriptionTemplate:
      "Bring back {count} ore chunk from the old mine. The forge has been cold.",
    target: "mine",
    requiredCount: 3,
    biome: "oldMine",
    reward: { gold: 40, xp: 30, relationshipGain: 1 },
    unlockEffect: { role: "blacksmith", serviceLevelIncrease: 1 }
  },
  {
    id: "qt_open_chest",
    type: "openChest",
    preferredRoles: ["enchanter", "trader"],
    titleTemplate: "An Old Lock",
    descriptionTemplate: "Open {count} sealed chest in any biome and return.",
    target: "any",
    requiredCount: 1,
    reward: { gold: 25, xp: 20, relationshipGain: 1 }
  },
  {
    id: "qt_scout_treasure",
    type: "scoutRoom",
    preferredRoles: ["cartographer"],
    titleTemplate: "Map a Hoard",
    descriptionTemplate: "Scout {count} treasure rooms and return alive.",
    target: "treasure",
    requiredCount: 2,
    reward: { gold: 20, xp: 20, relationshipGain: 1 },
    unlockEffect: { role: "cartographer", serviceLevelIncrease: 1 }
  },
  {
    id: "qt_find_sign",
    type: "findSign",
    preferredRoles: ["elder", "healer"],
    titleTemplate: "A Pilgrim's Last Mark",
    descriptionTemplate: "Find {count} pilgrim's sign in the ruined keep.",
    target: "keep",
    requiredCount: 1,
    biome: "ruinedKeep",
    reward: { gold: 35, xp: 30, relationshipGain: 1 }
  },
  {
    id: "qt_survive_depth",
    type: "surviveDepth",
    preferredRoles: ["quartermaster", "elder"],
    titleTemplate: "Walk the Long Hall",
    descriptionTemplate: "Visit {count} rooms in any single dungeon and extract.",
    target: "any",
    requiredCount: 6,
    reward: { gold: 30, xp: 25, relationshipGain: 1 }
  },
  {
    id: "qt_fungal_heart",
    type: "extractMaterial",
    preferredRoles: ["alchemist"],
    titleTemplate: "A Stranger Bloom",
    descriptionTemplate:
      "Recover {count} blooming fungal heart from the caverns. Whole, unbroken.",
    target: "fungal",
    requiredCount: 1,
    biome: "fungalCaverns",
    reward: { gold: 60, xp: 45, relationshipGain: 1 },
    unlockEffect: { role: "alchemist", serviceLevelIncrease: 1 }
  },
  {
    id: "qt_mini_boss_keep",
    type: "defeatMiniBoss",
    preferredRoles: ["elder"],
    titleTemplate: "The Watcher in the Keep",
    descriptionTemplate: "Defeat {count} elite watcher in the ruined keep.",
    target: "keep",
    requiredCount: 1,
    biome: "ruinedKeep",
    reward: { gold: 70, xp: 60, relationshipGain: 2 }
  }
];
