import type { ServiceDefinition, ServiceLevelDefinition, ServiceUnlock } from "../game/types";

function unlock(id: string, type: ServiceUnlock["type"], label: string, description: string, extra: Partial<ServiceUnlock> = {}): ServiceUnlock {
  return { id, type, label, description, ...extra };
}

const blacksmithLevels: ServiceLevelDefinition[] = [
  {
    level: 1,
    title: "Village Smith",
    description: "Repair common gear and forge simple blades.",
    unlocks: [
      unlock("blacksmith-l1-repair", "serviceAction", "Repair Gear", "Repair common gear between runs.", { actionId: "repairGear" }),
      unlock("blacksmith-l1-shortblade", "recipe", "Iron Shortblade", "Craft a reliable recovered-iron blade.", { recipeId: "recipe-iron-shortblade" })
    ]
  },
  {
    level: 2,
    title: "Tempered Hands",
    description: "Forge uncommon weapons and reinforce a weapon before a run.",
    upgradeCost: { gold: 20, materials: { ironOre: 4, scrapIron: 2 } },
    requirements: [{ type: "materialCount", key: "ironOre", value: 4, description: "Bring back 4 Iron Ore." }],
    unlocks: [
      unlock("blacksmith-l2-keen-dagger", "recipe", "Keen Scout's Dagger", "Craft an uncommon light blade.", { recipeId: "recipe-keen-scout-dagger" }),
      unlock("blacksmith-l2-reinforce-weapon", "runPreparation", "Weapon Reinforcement", "Reinforce one equipped weapon for the next dungeon run.", { runPreparationId: "prep-reinforced-weapon" })
    ]
  },
  {
    level: 3,
    title: "Armor Mender",
    description: "Craft armor and shields from dungeon salvage.",
    upgradeCost: { gold: 35, materials: { rawhide: 3, oathIron: 3 } },
    unlocks: [
      unlock("blacksmith-l3-buckler", "recipe", "Reinforced Buckler", "Craft a compact shield.", { recipeId: "recipe-reinforced-buckler" }),
      unlock("blacksmith-l3-leather", "recipe", "Reinforced Leather", "Craft better light armor.", { recipeId: "recipe-reinforced-leather" })
    ]
  },
  {
    level: 4,
    title: "Master Temper",
    description: "Reinforce armor and work rare weapon bases.",
    upgradeCost: { gold: 60, materials: { emberglassShard: 1, blackQuartz: 2 } },
    unlocks: [
      unlock("blacksmith-l4-armor-prep", "runPreparation", "Reinforced Armor", "Add a one-run armor bonus.", { runPreparationId: "prep-reinforced-armor" })
    ]
  },
  {
    level: 5,
    title: "Forge-Sworn",
    description: "Forge masterwork kit and improve one carried item before a run.",
    upgradeCost: { gold: 100, materials: { emberglassShard: 2, oathIron: 5 } },
    unlocks: [
      unlock("blacksmith-l5-masterwork", "unlockFlag", "Masterwork Forge", "The forge can support future masterwork gear.", { unlockFlag: "blacksmith-masterwork" })
    ]
  }
];

const alchemistLevels: ServiceLevelDefinition[] = [
  {
    level: 1,
    title: "Kettle-Keeper",
    description: "Brew weak healing draughts.",
    unlocks: [
      unlock("alchemist-l1-draught", "recipe", "Weak Healing Draught", "Craft basic healing draughts.", { recipeId: "recipe-weak-healing-draught" }),
      unlock("alchemist-l1-packed-draught", "runPreparation", "Packed Healing Draught", "Start the next run with a small potion.", { runPreparationId: "prep-starter-healing-draught" })
    ]
  },
  {
    level: 2,
    title: "Field Brewer",
    description: "Brew antidotes and stamina tonics.",
    upgradeCost: { gold: 18, materials: { glowcapSpores: 4, paleWax: 2 } },
    unlocks: [
      unlock("alchemist-l2-antidote", "recipe", "Antidote Recipe", "Unlocks basic antidotes.", { recipeId: "recipe-basic-antidote" }),
      unlock("alchemist-l2-stamina", "recipe", "Stamina Tonic", "Craft a short-run vigor tonic.", { recipeId: "recipe-stamina-tonic" })
    ]
  },
  {
    level: 3,
    title: "Hazard Mixer",
    description: "Brew biome resistance tonics.",
    upgradeCost: { gold: 32, materials: { fungalHeart: 1, saltstone: 3 } },
    unlocks: [
      unlock("alchemist-l3-resistance", "recipe", "Resistance Tonic", "Craft a hazard-facing tonic.", { recipeId: "recipe-resistance-tonic" })
    ]
  },
  {
    level: 4,
    title: "Deep Delver's Flask",
    description: "Brew stronger healing and trap-sense tonics.",
    upgradeCost: { gold: 55, materials: { livingMycelium: 1, brinePearl: 1 } },
    unlocks: [
      unlock("alchemist-l4-strong", "recipe", "Strong Healing Draught", "Craft stronger healing draughts.", { recipeId: "recipe-strong-healing-draught" })
    ]
  },
  {
    level: 5,
    title: "Master Distiller",
    description: "Prepare rare elixirs and smoke for desperate returns.",
    upgradeCost: { gold: 90, materials: { livingMycelium: 2, emberglassShard: 1 } },
    unlocks: [
      unlock("alchemist-l5-smoke", "runPreparation", "Extraction Smoke", "Reduce starting threat for a harder push.", { runPreparationId: "prep-smoke-cover" })
    ]
  }
];

const cartographerLevels: ServiceLevelDefinition[] = [
  {
    level: 1,
    title: "Path Sketcher",
    description: "Reveal extra information near the entrance.",
    unlocks: [
      unlock("cartographer-l1-room-hint", "runPreparation", "Marked First Passage", "Reveal one extra room hint.", { runPreparationId: "prep-extra-room-hint" })
    ]
  },
  {
    level: 2,
    title: "Tunnel Reader",
    description: "Improve scouting by reading old tunnel logic.",
    upgradeCost: { gold: 18, materials: { bannerThread: 2, snareCord: 2 } },
    unlocks: [
      unlock("cartographer-l2-scouting", "scoutingBonus", "Improved Scouting", "Scouting rolls gain a small village bonus.", { value: 1 })
    ]
  },
  {
    level: 3,
    title: "Exit Seeker",
    description: "Mark vague extraction direction at dungeon start.",
    upgradeCost: { gold: 35, materials: { moonlitThread: 1, coralShard: 2 } },
    unlocks: [
      unlock("cartographer-l3-extraction-hint", "runPreparation", "Extraction Hint", "Begin a run with a vague sense of where extraction may be.", { runPreparationId: "prep-extraction-hint" })
    ]
  },
  {
    level: 4,
    title: "Route Planner",
    description: "Prepare cleaner routes for dangerous runs.",
    upgradeCost: { gold: 60, materials: { blackQuartz: 1, drownedSilk: 2 } },
    unlocks: [
      unlock("cartographer-l4-threat", "runPreparation", "Quiet Route", "Start with slightly lower dungeon threat.", { runPreparationId: "prep-quiet-route" })
    ]
  },
  {
    level: 5,
    title: "Realm Mapper",
    description: "Choose a dungeon biome before a run.",
    upgradeCost: { gold: 100, materials: { brinePearl: 2, moonlitThread: 2 } },
    unlocks: [
      unlock("cartographer-l5-biome", "biomeChoice", "Biome Choice", "Choose a target biome before a run.", { unlockFlag: "cartographer-biome-choice" })
    ]
  }
];

const enchanterLevels: ServiceLevelDefinition[] = [
  {
    level: 1,
    title: "Charm Reader",
    description: "Identify strange trinkets.",
    unlocks: [
      unlock("enchanter-l1-identify", "serviceAction", "Identify Item", "Read unknown charms and trinkets.", { actionId: "identifyItem" })
    ]
  },
  {
    level: 2,
    title: "Ward Scribe",
    description: "Prepare a minor trap ward.",
    upgradeCost: { gold: 22, materials: { blackQuartz: 1, moonlitThread: 1 } },
    unlocks: [
      unlock("enchanter-l2-trap-ward", "runPreparation", "Trap Ward", "The first trap that would damage you next run is reduced.", { runPreparationId: "prep-trap-ward" }),
      unlock("enchanter-l2-ward-charm", "recipe", "Minor Ward Charm", "Craft a simple protective charm.", { recipeId: "recipe-minor-ward-charm" })
    ]
  },
  {
    level: 3,
    title: "Rune-Toucher",
    description: "Add small blessings to gear.",
    upgradeCost: { gold: 40, materials: { emberglassShard: 1, bannerThread: 2 } },
    unlocks: [
      unlock("enchanter-l3-enchant", "serviceAction", "Minor Enchantment", "Add a modest enchantment to eligible gear.", { actionId: "minorEnchant" }),
      unlock("enchanter-l3-ember", "recipe", "Emberglass Focus", "Craft a small magical focus.", { recipeId: "recipe-emberglass-focus" })
    ]
  },
  {
    level: 4,
    title: "Thread-Binder",
    description: "Protect one item from death loss for one run.",
    upgradeCost: { gold: 70, materials: { drownedSilk: 3, blackQuartz: 2 } },
    unlocks: [
      unlock("enchanter-l4-protect", "runPreparation", "Item Protection", "Protect one item for a run.", { runPreparationId: "prep-protect-one-item" })
    ]
  },
  {
    level: 5,
    title: "Name-Binder",
    description: "Reroll a minor affix on rare or lower gear.",
    upgradeCost: { gold: 110, materials: { brinePearl: 2, emberglassShard: 2 } },
    unlocks: [
      unlock("enchanter-l5-reroll", "serviceAction", "Reroll Minor Affix", "Reroll a modest gear affix.", { actionId: "rerollMinorAffix" })
    ]
  }
];

const healerLevels: ServiceLevelDefinition[] = [
  {
    level: 1,
    title: "Herb Tender",
    description: "Remove wounded status for gold.",
    unlocks: [
      unlock("healer-l1-heal", "serviceAction", "Heal Wounds", "Treat wounds between delves.", { actionId: "healWounds" })
    ]
  },
  {
    level: 2,
    title: "Bonesetter",
    description: "Offer small pre-run blessings.",
    upgradeCost: { gold: 16, materials: { commonHerbs: 3, boneShards: 2 } },
    unlocks: [
      unlock("healer-l2-blessing", "runPreparation", "Road Blessing", "Begin with a small defensive blessing.", { runPreparationId: "prep-road-blessing" })
    ]
  },
  {
    level: 3,
    title: "Shrine Keeper",
    description: "Prepare steadier protection for dangerous halls.",
    upgradeCost: { gold: 35, materials: { paleWax: 3, moonlitThread: 1 } },
    unlocks: [
      unlock("healer-l3-charm", "recipe", "Pilgrim Charm", "Craft a road charm.", { recipeId: "recipe-pilgrim-charm" })
    ]
  },
  {
    level: 4,
    title: "Spirit Mender",
    description: "Reduce curse bite and panic.",
    upgradeCost: { gold: 55, materials: { graveDust: 5, brinePearl: 1 } },
    unlocks: [
      unlock("healer-l4-ward", "runPreparation", "Spirit Ward", "Carry a one-run ward against harm.", { runPreparationId: "prep-spirit-ward" })
    ]
  },
  {
    level: 5,
    title: "Life-Oath Keeper",
    description: "Prepare one emergency heal per run.",
    upgradeCost: { gold: 90, materials: { livingMycelium: 1, brinePearl: 2 } },
    unlocks: [
      unlock("healer-l5-oath", "unlockFlag", "Life Oath", "Future runs can support emergency healing.", { unlockFlag: "healer-life-oath" })
    ]
  }
];

const quartermasterLevels: ServiceLevelDefinition[] = [
  {
    level: 1,
    title: "Supply Clerk",
    description: "Buy basic supplies and sell common loot.",
    unlocks: [
      unlock("quartermaster-l1-supplies", "serviceAction", "Basic Supplies", "Keep simple supplies moving.", { actionId: "buyBasicSupplies" })
    ]
  },
  {
    level: 2,
    title: "Pack Fitter",
    description: "Improve carry capacity for one run.",
    upgradeCost: { gold: 18, materials: { rawhide: 2, snareCord: 2 } },
    unlocks: [
      unlock("quartermaster-l2-pack", "runPreparation", "Expanded Pack", "Increase carry capacity for the next run.", { runPreparationId: "prep-expanded-pack" })
    ]
  },
  {
    level: 3,
    title: "Fence Contact",
    description: "Move loot at better rates.",
    upgradeCost: { gold: 35, materials: { coralShard: 2, bannerThread: 2 } },
    unlocks: [
      unlock("quartermaster-l3-tool", "recipe", "Field Repair Kit", "Craft a compact repair kit.", { recipeId: "recipe-field-repair-kit" })
    ]
  },
  {
    level: 4,
    title: "Provision Master",
    description: "Stock better tools and expedition gear.",
    upgradeCost: { gold: 60, materials: { rawhide: 4, saltstone: 3 } },
    unlocks: [
      unlock("quartermaster-l4-kit", "recipe", "Delver's Kit", "Craft a stronger utility kit.", { recipeId: "recipe-delvers-kit" })
    ]
  },
  {
    level: 5,
    title: "Deep Run Broker",
    description: "Find rare preparation supplies.",
    upgradeCost: { gold: 95, materials: { brinePearl: 1, emberglassShard: 1 } },
    unlocks: [
      unlock("quartermaster-l5-stock", "vendorInventoryTier", "Rare Supplies", "Improve future supply stock.", { value: 5 })
    ]
  }
];

export const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  {
    role: "blacksmith",
    displayName: "Blacksmith",
    description: "Weapons, armor, repair, and reinforcement.",
    levelDefinitions: blacksmithLevels
  },
  {
    role: "alchemist",
    displayName: "Alchemist",
    description: "Potions, antidotes, resistance tonics, and dungeon utility.",
    levelDefinitions: alchemistLevels
  },
  {
    role: "cartographer",
    displayName: "Cartographer",
    description: "Scouting, extraction hints, and map advantages.",
    levelDefinitions: cartographerLevels
  },
  {
    role: "enchanter",
    displayName: "Enchanter",
    description: "Identification, wards, minor enchantments, and affix control.",
    levelDefinitions: enchanterLevels
  },
  {
    role: "healer",
    displayName: "Healer",
    description: "Wounds, blessings, and recovery.",
    levelDefinitions: healerLevels
  },
  {
    role: "quartermaster",
    displayName: "Quartermaster",
    description: "Supplies, stash quality, selling, and loadout support.",
    levelDefinitions: quartermasterLevels
  }
];

export function getServiceDefinition(role: string): ServiceDefinition | undefined {
  return SERVICE_DEFINITIONS.find(def => def.role === role);
}
