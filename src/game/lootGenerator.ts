import type { DungeonBiome, ItemGenerationContext, ItemInstance, MaterialId, MaterialRarity, MaterialVault, Rarity, RoomType } from "./types";
import { LOOT_RULES, MATERIAL_RULES } from "./constants";
import { getItemTemplate } from "../data/items";
import { getLootTableById, type LootTable, type LootEntry } from "../data/lootTables";
import { instanceFromTemplateId } from "./inventory";
import { applyGeneratedItemProperties } from "./itemGeneration";
import type { Rng } from "./rng";

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

function rarityIndex(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}

export function rollRarity(tier: number, rng: Rng): Rarity {
  // Currently tier 1 only; future tiers can scale weights.
  void tier;
  const weights = LOOT_RULES.rarityWeightsTierOne;
  const entries = Object.entries(weights)
    .filter(([, w]) => w > 0)
    .map(([r, w]) => ({ value: r as Rarity, weight: w }));
  return rng.pickWeighted(entries);
}

function entryAllowedByRarity(entry: LootEntry, rolled: Rarity): boolean {
  if (!entry.rarityFloor) return true;
  return rarityIndex(rolled) >= rarityIndex(entry.rarityFloor);
}

export function generateLootForTable(
  table: LootTable,
  rng: Rng,
  itemCount = 1,
  context?: Partial<ItemGenerationContext>
): ItemInstance[] {
  const items: ItemInstance[] = [];
  for (let i = 0; i < itemCount; i++) {
    const rolledRarity = rollRarity(table.tier, rng);
    const allowed = table.entries.filter(e => entryAllowedByRarity(e, rolledRarity));
    const pool = allowed.length > 0 ? allowed : table.entries;
    const entry = rng.pickWeighted(pool.map(e => ({ value: e, weight: e.weight })));
    const qty = rng.nextInt(entry.minQuantity, entry.maxQuantity);
    const template = getItemTemplate(entry.itemTemplateId);
    const instance = instanceFromTemplateId(template.id, rng, qty);
    const shouldApplyGeneratedProperties = ["weapon", "armor", "shield", "trinket"].includes(instance.category) && !instance.stackable;
    if (!shouldApplyGeneratedProperties) {
      items.push(instance);
      continue;
    }

    const generationContext: ItemGenerationContext = {
      seed: context?.seed ?? rng.seed,
      biome: context?.biome ?? (table.biome === "any" ? "crypt" : table.biome),
      tier: context?.tier ?? table.tier,
      roomType: context?.roomType,
      source: context?.source ?? "treasure",
      threatLevel: context?.threatLevel,
      playerClassId: context?.playerClassId
    };
    const result = applyGeneratedItemProperties({
      item: { ...instance, rarity: rolledRarity },
      context: generationContext,
      rng: rng.forkChild(`generated:${table.id}:${i}:${instance.instanceId}`)
    });
    items.push(result.item);
  }
  return items;
}

export function generateLootForRoomLootTableId(
  lootTableId: string,
  rng: Rng,
  itemCount = 1
): ItemInstance[] {
  return generateLootForTable(getLootTableById(lootTableId), rng, itemCount);
}

export function rollGold(rng: Rng, tier: number): number {
  const min = 2 + tier * 2;
  const max = 10 + tier * 6;
  return rng.nextInt(min, max);
}

export function generateMaterialLoot(params: {
  biome: DungeonBiome;
  roomType: RoomType;
  tier: number;
  rng: Rng;
}): MaterialVault {
  const rolls = MATERIAL_RULES.roomMaterialRolls[params.roomType] ?? 0;
  if (rolls <= 0) return {};
  const vault: MaterialVault = {};
  for (let i = 0; i < rolls; i++) {
    const rarity = rollMaterialRarity(params.tier, params.rng);
    const id = pickMaterialForBiome(params.biome, rarity, params.rng);
    const quantity = rarity === "common" ? params.rng.nextInt(1, 3) : 1;
    vault[id] = (vault[id] ?? 0) + quantity;
  }
  return vault;
}

function rollMaterialRarity(tier: number, rng: Rng): MaterialRarity {
  const clampedTier = Math.min(5, Math.max(1, tier)) as keyof typeof MATERIAL_RULES.rarityWeightsByTier;
  const weights = MATERIAL_RULES.rarityWeightsByTier[clampedTier];
  return rng.pickWeighted(
    (Object.entries(weights) as [MaterialRarity, number][])
      .filter(([, weight]) => weight > 0)
      .map(([value, weight]) => ({ value, weight }))
  );
}

function pickMaterialForBiome(biome: DungeonBiome, rarity: MaterialRarity, rng: Rng): MaterialId {
  const profile = MATERIAL_RULES.biomeMaterialProfiles[biome];
  const rarityKey = rarity === "epic" ? "rare" : rarity;
  const pool = profile[rarityKey as keyof typeof profile] ?? profile.common;
  return rng.pickOne(pool) as MaterialId;
}
