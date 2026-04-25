export const SAVE_VERSION = 4;
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

export const CHARACTER_PROGRESSION_RULES = {
  maxLevel: 10,
  xpByLevel: {
    1: 0,
    2: 100,
    3: 250,
    4: 450,
    5: 700,
    6: 1000,
    7: 1350,
    8: 1750,
    9: 2200,
    10: 2700
  },
  talentPointsByLevel: {
    1: 0,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 1,
    7: 1,
    8: 1,
    9: 1,
    10: 1
  },
  hpGainByClass: {
    warrior: 5,
    scout: 3,
    arcanist: 2,
    warden: 4,
    devout: 3
  },
  allowRespec: true,
  respecCost: {
    baseGold: 25,
    perSpentTalentPoint: 10
  }
} as const;

export const TALENT_RULES = {
  maxTalentTier: 3,
  defaultTalentCost: 1,
  activeCombatActionSlots: 3,
  tierUnlockLevels: {
    1: 2,
    2: 4,
    3: 7
  },
  maxLearnedCapstones: 1,
  allowChangingActiveCombatActionsInDungeon: false
} as const;

export const COMBAT_ACTION_RULES = {
  defaultCooldownTurns: 0,
  maxCooldownTurns: 4,
  baseActiveActionSlots: 3,
  classActionThreatCosts: {
    warrior: 0,
    scout: 0,
    arcanist: 2,
    warden: 0,
    devout: 0
  },
  oncePerCombatResetOnNewCombat: true
} as const;

export const AFFIX_RULES = {
  maxAffixesByRarity: {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4
  },
  affixSlotsByRarity: {
    common: { prefixes: 0, suffixes: 0 },
    uncommon: { prefixes: 1, suffixes: 0 },
    rare: { prefixes: 1, suffixes: 1 },
    epic: { prefixes: 2, suffixes: 1 },
    legendary: { prefixes: 2, suffixes: 2 }
  },
  valueMultiplierPerAffixRarity: {
    common: 1,
    uncommon: 1.15,
    rare: 1.35,
    epic: 1.75,
    legendary: 2.4
  },
  preventDuplicateExclusiveGroups: true,
  classBiasedAffixChance: 0.2,
  biomeAffixChance: 0.18
} as const;

export const ITEM_STATE_RULES = {
  generationChanceByRarity: {
    common: 0.02,
    uncommon: 0.06,
    rare: 0.12,
    epic: 0.2,
    legendary: 0.35
  },
  stateWeightsByRarity: {
    common: { fragile: 60, damaged: 40 },
    uncommon: { fragile: 30, damaged: 30, contraband: 20, bound: 10, cursed: 10 },
    rare: { fragile: 15, contraband: 25, bound: 20, cursed: 20, protected: 10, damaged: 10 },
    epic: { contraband: 25, bound: 20, cursed: 20, protected: 20, fragile: 10, damaged: 5 },
    legendary: { protected: 25, bound: 25, cursed: 20, contraband: 20, fragile: 10 }
  },
  contraband: {
    valueMultiplier: 1.5,
    threatGainOnRoomEntry: 2,
    extractionComplicationBonus: 0.08
  },
  fragile: {
    breakChanceOnDeath: 0.65,
    breakChanceOnExtractionComplication: 0.2
  },
  cursed: {
    cannotDropDuringRun: true,
    threatGainOnSearch: 2,
    valueMultiplier: 1.25
  },
  protected: { survivesDeath: true },
  bound: { cannotSell: true, survivesExtraction: true },
  damaged: {
    valueMultiplier: 0.6,
    statPenaltyMultiplier: 0.75
  },
  reinforced: {
    durationRuns: 1,
    valueMultiplier: 1.1
  }
} as const;

export const BUILD_SUMMARY_RULES = {
  highRiskThreshold: 4,
  lowDefenseArmorThreshold: 3,
  lowDamagePowerThreshold: 4,
  lowExtractionSafetyThreshold: 3,
  equippedItemScoreWeights: {
    rarity: 10,
    affix: 5,
    state: 3
  },
  buildTagThresholds: {
    melee: 6,
    ranged: 6,
    magic: 6,
    defensive: 6,
    evasive: 6,
    scouting: 6,
    trapHandling: 6,
    extraction: 6,
    carryCapacity: 6,
    healing: 6,
    highRisk: 4,
    lootFocused: 5
  }
} as const;

export const INVENTORY_RULES = {
  defaultCarryCapacity: 20,
  maxStackSize: 99
};

export const VILLAGE_PROGRESSION_RULES = {
  startingServiceLevel: 1,
  maxServiceLevel: 5,
  startingRenown: 0,
  serviceXpThresholds: {
    1: 0,
    2: 50,
    3: 125,
    4: 250,
    5: 450
  },
  relationshipThresholds: {
    stranger: 0,
    trusted: 25,
    ally: 60,
    devoted: 100
  },
  generatedQuestRefreshOnExtraction: true,
  maxAvailableQuestsPerNpc: 2,
  maxActiveQuests: 4,
  defaultRelationshipGainOnQuest: 10,
  defaultServiceXpOnQuest: 25,
  defaultVillageRenownOnChainStep: 5
} as const;

export const MATERIAL_RULES = {
  defaultMaterialVault: {},
  maxMaterialStackDisplay: 999,
  roomMaterialRolls: {
    entrance: 0,
    combat: 1,
    eliteCombat: 2,
    treasure: 3,
    trap: 1,
    shrine: 1,
    npcEvent: 1,
    questObjective: 2,
    lockedChest: 3,
    extraction: 0,
    boss: 4,
    empty: 1
  },
  rarityWeightsByTier: {
    1: { common: 82, uncommon: 16, rare: 2, epic: 0 },
    2: { common: 68, uncommon: 25, rare: 7, epic: 0 },
    3: { common: 52, uncommon: 32, rare: 14, epic: 2 },
    4: { common: 38, uncommon: 36, rare: 22, epic: 4 },
    5: { common: 26, uncommon: 38, rare: 28, epic: 8 }
  },
  biomeMaterialProfiles: {
    crypt: {
      common: ["graveDust", "boneShards", "paleWax"],
      uncommon: ["moonlitThread"],
      rare: ["emberglassShard"]
    },
    goblinWarrens: {
      common: ["scrapIron", "snareCord", "tunnelCharcoal"],
      uncommon: ["rawhide"],
      rare: ["emberglassShard"]
    },
    fungalCaverns: {
      common: ["glowcapSpores", "commonHerbs"],
      uncommon: ["fungalHeart"],
      rare: ["livingMycelium"]
    },
    ruinedKeep: {
      common: ["oathIron", "bannerThread", "crackedScale"],
      uncommon: ["moonlitThread"],
      rare: ["blackQuartz"]
    },
    oldMine: {
      common: ["ironOre", "saltstone", "scrapIron"],
      uncommon: ["blackQuartz"],
      rare: ["emberglassShard"]
    },
    sunkenTemple: {
      common: ["coralShard", "drownedSilk", "saltstone"],
      uncommon: ["brinePearl"],
      rare: ["moonlitThread"]
    }
  }
} as const;

export const CRAFTING_RULES = {
  craftFromStashOnly: true,
  craftedItemsGoToStash: true,
  allowCraftingDuringActiveRun: false,
  defaultCraftingGoldMultiplier: 1,
  minimumServiceLevelForRecipes: {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5
  },
  maxRecipeOutputs: 3
} as const;

export const SERVICE_ACTION_RULES = {
  repairGear: {
    baseGoldCost: 5,
    rarityMultiplier: {
      common: 1,
      uncommon: 2,
      rare: 4,
      epic: 8,
      legendary: 12
    }
  },
  reinforceItem: {
    durationRuns: 1,
    armorBonus: 1,
    weaponAccuracyBonus: 1,
    maxReinforcedItemsAtOnce: 1
  },
  identifyItem: { baseGoldCost: 8 },
  rerollMinorAffix: {
    baseGoldCost: 25,
    allowedRarities: ["uncommon", "rare"]
  },
  healWounded: { baseGoldCost: 10 },
  sellLoot: {
    defaultValueMultiplier: 0.5,
    traderLevelBonusPerLevel: 0.05
  }
} as const;

export const RUN_PREPARATION_RULES = {
  maxPreparedModifiers: 3,
  maxByServiceRole: {
    blacksmith: 1,
    alchemist: 1,
    enchanter: 1,
    cartographer: 1,
    healer: 1,
    quartermaster: 1,
    trader: 0,
    elder: 0
  },
  consumeOnRunStart: true,
  defaultDurationRuns: 1
} as const;

export const QUEST_CHAIN_RULES = {
  minStepsPerChain: 3,
  maxStepsPerChain: 5,
  autoCreateFirstStepQuest: true,
  chainQuestClaimRequiresExtraction: true,
  serviceXpByStepIndex: {
    0: 25,
    1: 35,
    2: 50,
    3: 75,
    4: 100
  },
  relationshipGainByStepIndex: {
    0: 8,
    1: 10,
    2: 15,
    3: 20,
    4: 25
  }
} as const;

// ---------------------------------------------------------------------------
// v0.2: Threat
// ---------------------------------------------------------------------------

export const THREAT_RULES = {
  maxLevel: 5,

  thresholds: [
    { level: 0, minPoints: 0, label: "Quiet" },
    { level: 1, minPoints: 20, label: "Stirring" },
    { level: 2, minPoints: 40, label: "Watching" },
    { level: 3, minPoints: 65, label: "Hunting" },
    { level: 4, minPoints: 90, label: "Swarming" },
    { level: 5, minPoints: 120, label: "Awakened" }
  ],

  gains: {
    enteredNewRoom: 8,
    revisitedRoom: 1,
    searchedRoom: 3,
    failedTrap: 10,
    triggeredTrap: 14,
    openedNoisyChest: 8,
    eventMinor: 4,
    eventMajor: 12,
    fledCombat: 8,
    extendedCombatAfterRound: 5,
    extendedCombatPerRound: 2,
    unstableExtractionComplication: 10
  },

  modifiersByLevel: {
    0: {
      level: 0,
      label: "Quiet",
      description: "The dungeon has not noticed you.",
      encounterDangerBonus: 0,
      eliteEncounterChanceBonus: 0,
      trapDifficultyBonus: 0,
      trapDamageBonus: 0,
      fleeChancePenalty: 0,
      ambushChance: 0,
      extractionComplicationChance: 0
    },
    1: {
      level: 1,
      label: "Stirring",
      description: "Something moves in the walls.",
      encounterDangerBonus: 1,
      eliteEncounterChanceBonus: 0.03,
      trapDifficultyBonus: 1,
      trapDamageBonus: 0,
      fleeChancePenalty: 0.03,
      ambushChance: 0.04,
      extractionComplicationChance: 0.03
    },
    2: {
      level: 2,
      label: "Watching",
      description: "The dungeon feels aware of your presence.",
      encounterDangerBonus: 2,
      eliteEncounterChanceBonus: 0.07,
      trapDifficultyBonus: 2,
      trapDamageBonus: 1,
      fleeChancePenalty: 0.06,
      ambushChance: 0.08,
      extractionComplicationChance: 0.07
    },
    3: {
      level: 3,
      label: "Hunting",
      description: "The halls seem to bend against you.",
      encounterDangerBonus: 3,
      eliteEncounterChanceBonus: 0.12,
      trapDifficultyBonus: 4,
      trapDamageBonus: 2,
      fleeChancePenalty: 0.1,
      ambushChance: 0.12,
      extractionComplicationChance: 0.12
    },
    4: {
      level: 4,
      label: "Swarming",
      description: "The dungeon sends teeth and claws through every passage.",
      encounterDangerBonus: 4,
      eliteEncounterChanceBonus: 0.18,
      trapDifficultyBonus: 6,
      trapDamageBonus: 3,
      fleeChancePenalty: 0.16,
      ambushChance: 0.18,
      extractionComplicationChance: 0.2
    },
    5: {
      level: 5,
      label: "Awakened",
      description: "The dungeon is fully awake. Escape is urgent.",
      encounterDangerBonus: 6,
      eliteEncounterChanceBonus: 0.25,
      trapDifficultyBonus: 8,
      trapDamageBonus: 5,
      fleeChancePenalty: 0.25,
      ambushChance: 0.25,
      extractionComplicationChance: 0.32
    }
  }
} as const;

// ---------------------------------------------------------------------------
// v0.2: Scouting
// ---------------------------------------------------------------------------

export const SCOUTING_RULES = {
  baseDifficulty: 10,

  knowledgeThresholds: {
    signsOnly: 8,
    dangerKnown: 12,
    likelyType: 16,
    exactType: 21
  },

  confidenceByKnowledgeLevel: {
    unknown: 0,
    signsOnly: 0.35,
    dangerKnown: 0.5,
    likelyType: 0.7,
    exactType: 0.95
  },

  classBonuses: {
    warrior: 0,
    scout: 4,
    arcanist: 2,
    warden: 3,
    devout: 1
  },

  classSpecialties: {
    scout: ["trap", "treasure", "footprints"],
    arcanist: ["arcaneResidue", "curse", "shrine"],
    warden: ["creature", "fungus", "water", "footprints"],
    devout: ["undead", "curse", "shrine"],
    warrior: ["combat", "metal", "scraping"]
  },

  cartographerServiceBonusByLevel: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5
  },

  dangerBands: {
    safe: { min: 0, max: 0 },
    low: { min: 1, max: 2 },
    moderate: { min: 3, max: 4 },
    high: { min: 5, max: 6 },
    severe: { min: 7, max: 99 }
  },

  falseSignalBaseChance: 0.08,
  falseSignalThreatMultiplier: 0.02
} as const;

// ---------------------------------------------------------------------------
// v0.2: Extraction
// ---------------------------------------------------------------------------

export const EXTRACTION_RULES = {
  variantWeightsTierOne: {
    stable: 45,
    delayed: 25,
    guarded: 12,
    unstable: 13,
    burdened: 10
  },

  delayed: {
    minTurns: 1,
    maxTurns: 2,
    ambushChancePerTurn: 0.08
  },

  guarded: {
    tierOneGuardDangerRating: 2
  },

  unstable: {
    baseComplicationChance: 0.12,
    maxComplicationChance: 0.55,
    complicationThreatIncrease: 10
  },

  burdened: {
    weightLimitRatio: 0.75
  }
} as const;

// ---------------------------------------------------------------------------
// v0.2: Room events
// ---------------------------------------------------------------------------

export const ROOM_EVENT_RULES = {
  eventRoomChance: 0.18,

  choiceCheck: {
    d20Sides: 20,
    naturalSuccess: 20,
    naturalFailure: 1
  },

  threatChanges: {
    minorGood: -3,
    minorBad: 4,
    majorBad: 12,
    noisyAction: 8,
    forbiddenAction: 15
  },

  maxEventChoices: 4
} as const;

// ---------------------------------------------------------------------------
// v0.2: Search
// ---------------------------------------------------------------------------

export const SEARCH_RULES = {
  baseSearchThreatIncrease: 3,
  repeatSearchThreatIncrease: 5,

  hiddenLootChance: 0.18,
  hiddenLootScoutBonus: 0.08,
  hiddenLootHighIntellectBonus: 0.04,

  trapDetectionBaseDifficulty: 12,

  ambushChanceOnSearch: 0.04,
  ambushThreatMultiplier: 0.025,

  maxSearchesPerRoom: 2
} as const;

// ---------------------------------------------------------------------------
// v0.2: Traps
// ---------------------------------------------------------------------------

export const TRAP_RULES = {
  trapRoomBaseChance: 0.15,

  detectionDifficultyByTier: {
    1: 11,
    2: 13,
    3: 15,
    4: 17,
    5: 19
  },

  disarmDifficultyByTier: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20
  },

  triggerDamageByTier: {
    1: { count: 1, sides: 6, modifier: 1 },
    2: { count: 2, sides: 6, modifier: 1 },
    3: { count: 2, sides: 8, modifier: 2 },
    4: { count: 3, sides: 8, modifier: 3 },
    5: { count: 4, sides: 8, modifier: 4 }
  },

  threatIncreaseOnTrigger: 12,
  threatIncreaseOnFailedDetection: 6
} as const;

// ---------------------------------------------------------------------------
// v0.2: Dungeon log
// ---------------------------------------------------------------------------

export const DUNGEON_LOG_RULES = {
  maxEntries: 80
} as const;
