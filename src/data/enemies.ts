import type { EnemyDefinition } from "../game/types";

export const ENEMIES: EnemyDefinition[] = [
  // -- Crypt --
  {
    id: "crypt_bone_rat",
    name: "Bone Rat",
    biome: "crypt", tier: 1,
    hp: 6, armor: 0, accuracy: 2, evasion: 11,
    damageDice: { count: 1, sides: 4 },
    xpReward: 4,
    lootTags: ["crypt", "small"],
    description: "A rat skeleton, bound by old crypt-grease. Skitters."
  },
  {
    id: "crypt_grave_wisp",
    name: "Grave Wisp",
    biome: "crypt", tier: 1,
    hp: 8, armor: 0, accuracy: 4, evasion: 13,
    damageDice: { count: 1, sides: 6 },
    xpReward: 6,
    lootTags: ["crypt", "spirit"],
    description: "A pale flame trailing the breath of someone long dead."
  },
  {
    id: "crypt_rusted_skeleton",
    name: "Rusted Skeleton",
    biome: "crypt", tier: 1,
    hp: 14, armor: 1, accuracy: 3, evasion: 10,
    damageDice: { count: 1, sides: 6, modifier: 1 },
    xpReward: 8,
    lootTags: ["crypt"],
    description: "A skeleton in flaking iron, still gripping a notched blade."
  },
  {
    id: "crypt_hollow_acolyte",
    name: "Hollow Acolyte",
    biome: "crypt", tier: 1,
    hp: 12, armor: 0, accuracy: 4, evasion: 11,
    damageDice: { count: 1, sides: 6 },
    xpReward: 9,
    lootTags: ["crypt", "spirit"],
    description: "A robed corpse murmuring through stitched lips."
  },

  // -- Goblin Warrens --
  {
    id: "goblin_candle",
    name: "Candle Goblin",
    biome: "goblinWarrens", tier: 1,
    hp: 7, armor: 0, accuracy: 3, evasion: 12,
    damageDice: { count: 1, sides: 4, modifier: 1 },
    xpReward: 4,
    lootTags: ["goblin", "small"],
    description: "A small goblin clutching a tallow stub."
  },
  {
    id: "goblin_snare",
    name: "Snare Goblin",
    biome: "goblinWarrens", tier: 1,
    hp: 9, armor: 0, accuracy: 4, evasion: 12,
    damageDice: { count: 1, sides: 6 },
    xpReward: 6,
    lootTags: ["goblin"],
    description: "A wiry trapper with a noose of braided hair."
  },
  {
    id: "goblin_tunnel_sneak",
    name: "Tunnel Sneak",
    biome: "goblinWarrens", tier: 1,
    hp: 8, armor: 0, accuracy: 5, evasion: 14,
    damageDice: { count: 1, sides: 6, modifier: 1 },
    xpReward: 7,
    lootTags: ["goblin"],
    description: "A goblin with kohl-darkened eyes, fast and quiet."
  },
  {
    id: "goblin_warrens_brute",
    name: "Warrens Brute",
    biome: "goblinWarrens", tier: 1,
    hp: 18, armor: 1, accuracy: 3, evasion: 10,
    damageDice: { count: 1, sides: 8, modifier: 1 },
    xpReward: 12,
    lootTags: ["goblin", "brute"],
    description: "A barrel-chested goblin swinging a stone hammer."
  },

  // -- Fungal Caverns --
  {
    id: "fungal_sporeling",
    name: "Sporeling",
    biome: "fungalCaverns", tier: 1,
    hp: 6, armor: 0, accuracy: 2, evasion: 11,
    damageDice: { count: 1, sides: 4 },
    xpReward: 4,
    lootTags: ["fungal", "small"],
    description: "A bouncing fungal pod that bursts when threatened."
  },
  {
    id: "fungal_myconid_crawler",
    name: "Myconid Crawler",
    biome: "fungalCaverns", tier: 1,
    hp: 10, armor: 0, accuracy: 3, evasion: 11,
    damageDice: { count: 1, sides: 6 },
    xpReward: 6,
    lootTags: ["fungal"],
    description: "A flat-capped fungus crawling on root-fingers."
  },
  {
    id: "fungal_glowcap_lasher",
    name: "Glowcap Lasher",
    biome: "fungalCaverns", tier: 1,
    hp: 14, armor: 0, accuracy: 4, evasion: 12,
    damageDice: { count: 1, sides: 6, modifier: 2 },
    xpReward: 9,
    lootTags: ["fungal"],
    description: "A bright fungus whose stalks lash like whips."
  },
  {
    id: "fungal_cave_beetle",
    name: "Sickly Cave Beetle",
    biome: "fungalCaverns", tier: 1,
    hp: 12, armor: 2, accuracy: 3, evasion: 10,
    damageDice: { count: 1, sides: 6 },
    xpReward: 8,
    lootTags: ["fungal", "beetle"],
    description: "A pallid beetle the size of a wash bucket."
  },

  // -- Ruined Keep --
  {
    id: "keep_oathless_guard",
    name: "Oathless Guard",
    biome: "ruinedKeep", tier: 1,
    hp: 16, armor: 2, accuracy: 4, evasion: 11,
    damageDice: { count: 1, sides: 8 },
    xpReward: 10,
    lootTags: ["keep", "armor"],
    description: "A ghost-soldier in dented plate, repeating an old order."
  },
  {
    id: "keep_cracked_gargoyle",
    name: "Cracked Gargoyle",
    biome: "ruinedKeep", tier: 1,
    hp: 18, armor: 3, accuracy: 3, evasion: 10,
    damageDice: { count: 1, sides: 8, modifier: 1 },
    xpReward: 12,
    lootTags: ["keep", "stone"],
    description: "A weathered statue that does not stand still when watched."
  },
  {
    id: "keep_dust_hound",
    name: "Dust Hound",
    biome: "ruinedKeep", tier: 1,
    hp: 10, armor: 0, accuracy: 5, evasion: 13,
    damageDice: { count: 1, sides: 6, modifier: 1 },
    xpReward: 7,
    lootTags: ["keep", "beast"],
    description: "A long-limbed dog of grey ash, breathing hard."
  },
  {
    id: "keep_fallen_squire",
    name: "Fallen Squire",
    biome: "ruinedKeep", tier: 1,
    hp: 14, armor: 1, accuracy: 4, evasion: 12,
    damageDice: { count: 1, sides: 6 },
    xpReward: 9,
    lootTags: ["keep"],
    description: "A young dead, still polishing a phantom helm."
  },

  // -- Old Mine --
  {
    id: "mine_pick_gnoll",
    name: "Pick Gnoll",
    biome: "oldMine", tier: 1,
    hp: 14, armor: 0, accuracy: 3, evasion: 11,
    damageDice: { count: 1, sides: 6, modifier: 1 },
    xpReward: 8,
    lootTags: ["mine"],
    description: "A scavenger in mine-leathers swinging a stolen pick."
  },
  {
    id: "mine_cave_leech",
    name: "Cave Leech",
    biome: "oldMine", tier: 1,
    hp: 8, armor: 0, accuracy: 4, evasion: 12,
    damageDice: { count: 1, sides: 4, modifier: 1 },
    xpReward: 5,
    lootTags: ["mine", "beast"],
    description: "A black, glistening leech the length of a forearm."
  },
  {
    id: "mine_oreback_beetle",
    name: "Oreback Beetle",
    biome: "oldMine", tier: 1,
    hp: 16, armor: 3, accuracy: 2, evasion: 9,
    damageDice: { count: 1, sides: 6 },
    xpReward: 10,
    lootTags: ["mine", "beetle"],
    description: "A heavy beetle whose shell carries seams of ore."
  },
  {
    id: "mine_blind_prospector",
    name: "Blind Prospector Shade",
    biome: "oldMine", tier: 1,
    hp: 12, armor: 0, accuracy: 4, evasion: 12,
    damageDice: { count: 1, sides: 6 },
    xpReward: 8,
    lootTags: ["mine", "spirit"],
    description: "A hollow-eyed shade still measuring an old vein."
  },

  // -- Sunken Temple --
  {
    id: "temple_brine_slime",
    name: "Brine Slime",
    biome: "sunkenTemple", tier: 1,
    hp: 12, armor: 0, accuracy: 2, evasion: 9,
    damageDice: { count: 1, sides: 6 },
    xpReward: 6,
    lootTags: ["temple"],
    description: "A salt-crusted slime that sloshes through worn channels."
  },
  {
    id: "temple_drowned_initiate",
    name: "Drowned Initiate",
    biome: "sunkenTemple", tier: 1,
    hp: 14, armor: 1, accuracy: 3, evasion: 11,
    damageDice: { count: 1, sides: 6 },
    xpReward: 9,
    lootTags: ["temple", "spirit"],
    description: "A sodden corpse in temple robes, eyes pale as oyster meat."
  },
  {
    id: "temple_coral_imp",
    name: "Coral Imp",
    biome: "sunkenTemple", tier: 1,
    hp: 9, armor: 1, accuracy: 4, evasion: 13,
    damageDice: { count: 1, sides: 4, modifier: 2 },
    xpReward: 7,
    lootTags: ["temple"],
    description: "A small coral-ribbed thing that giggles like wet glass."
  },
  {
    id: "temple_tidebound_husk",
    name: "Tidebound Husk",
    biome: "sunkenTemple", tier: 1,
    hp: 18, armor: 2, accuracy: 3, evasion: 10,
    damageDice: { count: 1, sides: 8, modifier: 1 },
    xpReward: 12,
    lootTags: ["temple", "brute"],
    description: "A hulking thing of barnacle and bone, dripping seawater."
  }
];

export function getEnemy(id: string) {
  const e = ENEMIES.find(x => x.id === id);
  if (!e) throw new Error(`Unknown enemy: ${id}`);
  return e;
}
