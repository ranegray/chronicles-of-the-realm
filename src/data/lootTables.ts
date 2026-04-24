import type { DungeonBiome, Rarity } from "../game/types";

export interface LootEntry {
  itemTemplateId: string;
  weight: number;
  minQuantity: number;
  maxQuantity: number;
  rarityFloor?: Rarity;
}

export interface LootTable {
  id: string;
  biome: DungeonBiome | "any";
  tier: number;
  entries: LootEntry[];
}

export const LOOT_TABLES: LootTable[] = [
  {
    id: "loot_crypt_t1",
    biome: "crypt", tier: 1,
    entries: [
      { itemTemplateId: "material_bone_dust", weight: 30, minQuantity: 1, maxQuantity: 3 },
      { itemTemplateId: "consumable_small_draught", weight: 14, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "consumable_trail_ration", weight: 10, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "gem_dim_quartz", weight: 12, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "trinket_minor_ward", weight: 6, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "armor_reinforced_leather", weight: 4, minQuantity: 1, maxQuantity: 1, rarityFloor: "uncommon" },
      { itemTemplateId: "trinket_gravegold", weight: 1, minQuantity: 1, maxQuantity: 1, rarityFloor: "rare" }
    ]
  },
  {
    id: "loot_goblin_t1",
    biome: "goblinWarrens", tier: 1,
    entries: [
      { itemTemplateId: "material_goblin_tooth", weight: 28, minQuantity: 1, maxQuantity: 4 },
      { itemTemplateId: "consumable_small_draught", weight: 14, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "consumable_trail_ration", weight: 12, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "gem_river_stone", weight: 12, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "trinket_silk_picks", weight: 8, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "weapon_keen_dagger", weight: 4, minQuantity: 1, maxQuantity: 1, rarityFloor: "uncommon" }
    ]
  },
  {
    id: "loot_fungal_t1",
    biome: "fungalCaverns", tier: 1,
    entries: [
      { itemTemplateId: "material_spore_pod", weight: 28, minQuantity: 1, maxQuantity: 3 },
      { itemTemplateId: "consumable_herbal_poultice", weight: 16, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "consumable_small_draught", weight: 12, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "gem_dim_quartz", weight: 8, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "trinket_emberglass", weight: 4, minQuantity: 1, maxQuantity: 1, rarityFloor: "uncommon" },
      { itemTemplateId: "material_blooming_heart", weight: 1, minQuantity: 1, maxQuantity: 1, rarityFloor: "rare" }
    ]
  },
  {
    id: "loot_keep_t1",
    biome: "ruinedKeep", tier: 1,
    entries: [
      { itemTemplateId: "material_keep_seal", weight: 26, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "consumable_strong_draught", weight: 8, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "consumable_trail_ration", weight: 12, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "gem_dim_quartz", weight: 12, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "trinket_cartographer_ink", weight: 6, minQuantity: 1, maxQuantity: 1, rarityFloor: "uncommon" },
      { itemTemplateId: "weapon_stout_iron_mace", weight: 4, minQuantity: 1, maxQuantity: 1, rarityFloor: "uncommon" }
    ]
  },
  {
    id: "loot_mine_t1",
    biome: "oldMine", tier: 1,
    entries: [
      { itemTemplateId: "material_ore_chunk", weight: 30, minQuantity: 1, maxQuantity: 3 },
      { itemTemplateId: "gem_dim_quartz", weight: 14, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "consumable_trail_ration", weight: 10, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "consumable_small_draught", weight: 10, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "armor_reinforced_leather", weight: 4, minQuantity: 1, maxQuantity: 1, rarityFloor: "uncommon" }
    ]
  },
  {
    id: "loot_temple_t1",
    biome: "sunkenTemple", tier: 1,
    entries: [
      { itemTemplateId: "material_brine_pearl", weight: 16, minQuantity: 1, maxQuantity: 2, rarityFloor: "uncommon" },
      { itemTemplateId: "consumable_strong_draught", weight: 10, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "consumable_small_draught", weight: 14, minQuantity: 1, maxQuantity: 1 },
      { itemTemplateId: "gem_river_stone", weight: 14, minQuantity: 1, maxQuantity: 2 },
      { itemTemplateId: "trinket_emberglass", weight: 4, minQuantity: 1, maxQuantity: 1, rarityFloor: "uncommon" },
      { itemTemplateId: "key_sunken_reliquary", weight: 2, minQuantity: 1, maxQuantity: 1, rarityFloor: "rare" },
      { itemTemplateId: "weapon_whispersteel_dirk", weight: 1, minQuantity: 1, maxQuantity: 1, rarityFloor: "rare" }
    ]
  }
];

export function getLootTableForBiome(biome: DungeonBiome, tier: number): LootTable {
  const t = LOOT_TABLES.find(t => t.biome === biome && t.tier === tier) ??
    [...LOOT_TABLES]
      .filter(t => t.biome === biome && t.tier <= tier)
      .sort((a, b) => b.tier - a.tier)[0];
  if (!t) throw new Error(`No loot table for ${biome} t${tier}`);
  return t;
}

export function getLootTableById(id: string): LootTable {
  const t = LOOT_TABLES.find(t => t.id === id);
  if (!t) throw new Error(`Unknown loot table: ${id}`);
  return t;
}
