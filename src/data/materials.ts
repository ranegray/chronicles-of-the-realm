import type { MaterialDefinition, MaterialId } from "../game/types";

export const MATERIAL_DEFINITIONS: MaterialDefinition[] = [
  {
    id: "graveDust",
    name: "Grave Dust",
    description: "Pale dust gathered from old burial stones.",
    category: "reagent",
    rarity: "common",
    sourceBiomes: ["crypt"],
    baseValue: 2,
    tags: ["crypt", "ritual"]
  },
  {
    id: "boneShards",
    name: "Bone Shards",
    description: "Clean fragments of old bone, useful in charms and crude tools.",
    category: "bone",
    rarity: "common",
    sourceBiomes: ["crypt"],
    baseValue: 2,
    tags: ["crypt", "crafting"]
  },
  {
    id: "paleWax",
    name: "Pale Wax",
    description: "Cold wax scraped from candles that should have burned out long ago.",
    category: "reagent",
    rarity: "common",
    sourceBiomes: ["crypt"],
    baseValue: 3,
    tags: ["crypt", "alchemy"]
  },
  {
    id: "scrapIron",
    name: "Scrap Iron",
    description: "Bent iron bits scavenged from traps, cages, and broken tools.",
    category: "salvage",
    rarity: "common",
    sourceBiomes: ["goblinWarrens", "oldMine"],
    baseValue: 2,
    tags: ["smithing"]
  },
  {
    id: "snareCord",
    name: "Snare Cord",
    description: "Tough cord taken from goblin snares and pack frames.",
    category: "salvage",
    rarity: "common",
    sourceBiomes: ["goblinWarrens"],
    baseValue: 2,
    tags: ["tool", "goblin"]
  },
  {
    id: "tunnelCharcoal",
    name: "Tunnel Charcoal",
    description: "Dense black fuel that burns hot in small village forges.",
    category: "reagent",
    rarity: "common",
    sourceBiomes: ["goblinWarrens"],
    baseValue: 3,
    tags: ["fuel", "smithing"]
  },
  {
    id: "glowcapSpores",
    name: "Glowcap Spores",
    description: "Softly glowing spores used in potions and signal powders.",
    category: "herb",
    rarity: "common",
    sourceBiomes: ["fungalCaverns"],
    baseValue: 3,
    tags: ["alchemy"]
  },
  {
    id: "fungalHeart",
    name: "Fungal Heart",
    description: "A rubbery core cut from a living colony.",
    category: "monsterPart",
    rarity: "uncommon",
    sourceBiomes: ["fungalCaverns"],
    baseValue: 9,
    tags: ["alchemy", "hazard"]
  },
  {
    id: "livingMycelium",
    name: "Living Mycelium",
    description: "Silver-white threads that keep moving after they are bundled.",
    category: "reagent",
    rarity: "rare",
    sourceBiomes: ["fungalCaverns"],
    baseValue: 18,
    tags: ["alchemy", "enchanting"]
  },
  {
    id: "oathIron",
    name: "Oath Iron",
    description: "Weathered iron from banners, gates, and broken vows.",
    category: "ore",
    rarity: "common",
    sourceBiomes: ["ruinedKeep"],
    baseValue: 4,
    tags: ["smithing", "ruin"]
  },
  {
    id: "bannerThread",
    name: "Banner Thread",
    description: "Faded thread cut from old military colors.",
    category: "cloth",
    rarity: "common",
    sourceBiomes: ["ruinedKeep"],
    baseValue: 3,
    tags: ["cloth", "ward"]
  },
  {
    id: "crackedScale",
    name: "Cracked Scale",
    description: "A hard flake from something that slept under the keep.",
    category: "monsterPart",
    rarity: "common",
    sourceBiomes: ["ruinedKeep"],
    baseValue: 4,
    tags: ["armor", "monster"]
  },
  {
    id: "ironOre",
    name: "Iron Ore",
    description: "Heavy ore from the old tunnels. The blacksmith will want this.",
    category: "ore",
    rarity: "common",
    sourceBiomes: ["oldMine"],
    baseValue: 3,
    tags: ["smithing", "upgrade"]
  },
  {
    id: "saltstone",
    name: "Saltstone",
    description: "Grey-white mineral that dries wounds and sharpens bitter brews.",
    category: "reagent",
    rarity: "common",
    sourceBiomes: ["oldMine", "sunkenTemple"],
    baseValue: 3,
    tags: ["alchemy", "preserve"]
  },
  {
    id: "blackQuartz",
    name: "Black Quartz",
    description: "A dark crystal that catches torchlight and refuses to give it back.",
    category: "crystal",
    rarity: "uncommon",
    sourceBiomes: ["oldMine", "ruinedKeep"],
    baseValue: 8,
    tags: ["enchanting"]
  },
  {
    id: "brinePearl",
    name: "Brine Pearl",
    description: "A dull pearl that smells faintly of stormwater.",
    category: "relic",
    rarity: "uncommon",
    sourceBiomes: ["sunkenTemple"],
    baseValue: 10,
    tags: ["alchemy", "enchanting"]
  },
  {
    id: "coralShard",
    name: "Coral Shard",
    description: "Pink-white coral broken from a drowned altar.",
    category: "relic",
    rarity: "common",
    sourceBiomes: ["sunkenTemple"],
    baseValue: 4,
    tags: ["temple", "crafting"]
  },
  {
    id: "drownedSilk",
    name: "Drowned Silk",
    description: "Waterlogged silk that dries without losing its pale sheen.",
    category: "cloth",
    rarity: "common",
    sourceBiomes: ["sunkenTemple"],
    baseValue: 4,
    tags: ["cloth", "ward"]
  },
  {
    id: "commonHerbs",
    name: "Common Herbs",
    description: "Hardy leaves gathered near old paths and damp chamber walls.",
    category: "herb",
    rarity: "common",
    sourceBiomes: ["fungalCaverns"],
    baseValue: 2,
    tags: ["alchemy", "healing"]
  },
  {
    id: "rawhide",
    name: "Rawhide",
    description: "Tough hide fit for pack straps, grips, and quick repairs.",
    category: "salvage",
    rarity: "uncommon",
    sourceBiomes: ["goblinWarrens"],
    baseValue: 6,
    tags: ["tool", "armor"]
  },
  {
    id: "emberglassShard",
    name: "Emberglass Shard",
    description: "Warm glass that glows faintly when danger is near.",
    category: "crystal",
    rarity: "rare",
    sourceBiomes: ["crypt", "goblinWarrens", "oldMine"],
    baseValue: 20,
    tags: ["enchanting", "rare"]
  },
  {
    id: "moonlitThread",
    name: "Moonlit Thread",
    description: "Thread that keeps a cold shine even in a closed fist.",
    category: "cloth",
    rarity: "uncommon",
    sourceBiomes: ["crypt", "ruinedKeep", "sunkenTemple"],
    baseValue: 9,
    tags: ["ward", "enchanting"]
  }
];

export function getMaterialDefinition(id: MaterialId): MaterialDefinition {
  const material = MATERIAL_DEFINITIONS.find(def => def.id === id);
  if (!material) throw new Error(`Unknown material: ${id}`);
  return material;
}
