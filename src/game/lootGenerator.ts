import type { DungeonBiome, ItemGenerationContext, ItemInstance, MaterialId, MaterialRarity, MaterialVault, Rarity, RoomType } from "./types";
import { DEPTH_RULES, LOOT_RULES, MATERIAL_RULES } from "./constants";
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
  const depth = Math.max(1, tier);
  const depthBonus = depth - 1;
  const weights = {
    ...LOOT_RULES.rarityWeightsTierOne,
    common: Math.max(20, LOOT_RULES.rarityWeightsTierOne.common - depthBonus * 6),
    uncommon: LOOT_RULES.rarityWeightsTierOne.uncommon +
      depthBonus * DEPTH_RULES.lootRarityDepthBonus.uncommonEveryDepth,
    rare: LOOT_RULES.rarityWeightsTierOne.rare +
      Math.floor(depthBonus / DEPTH_RULES.lootRarityDepthBonus.rareEveryDepth) * 4,
    epic: depth >= DEPTH_RULES.lootRarityDepthBonus.epicStartsAtDepth
      ? Math.min(16, (depth - DEPTH_RULES.lootRarityDepthBonus.epicStartsAtDepth + 1) * 2)
      : 0,
    legendary: depth >= DEPTH_RULES.lootRarityDepthBonus.legendaryStartsAtDepth
      ? Math.min(8, depth - DEPTH_RULES.lootRarityDepthBonus.legendaryStartsAtDepth + 1)
      : 0
  };
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
    const effectiveTier = context?.tier ?? table.tier;
    const rolledRarity = rollRarity(effectiveTier, rng);
    const allowed = table.entries.filter(e => entryAllowedByRarity(e, rolledRarity));
    const pool = allowed.length > 0 ? allowed : table.entries;
    const entry = rng.pickWeighted(pool.map(e => ({
      value: e,
      weight: getDepthAdjustedLootWeight(e, rolledRarity, effectiveTier, context)
    })));
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
      tier: effectiveTier,
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

function getDepthAdjustedLootWeight(
  entry: LootEntry,
  rolledRarity: Rarity,
  tier: number,
  context?: Partial<ItemGenerationContext>
): number {
  const template = getItemTemplate(entry.itemTemplateId);
  if (!["weapon", "armor", "shield", "trinket"].includes(template.category)) {
    return entry.weight;
  }

  let weight = entry.weight;
  weight *= 1 + Math.min(4, Math.max(0, tier - 1) * 0.35);
  if (rolledRarity !== "common") weight *= 1.8;
  if (context?.source === "boss") weight *= 2;
  if (context?.source === "treasure" || context?.source === "event") weight *= 1.35;
  return weight;
}

export function generateLootForRoomLootTableId(
  lootTableId: string,
  rng: Rng,
  itemCount = 1,
  context?: Partial<ItemGenerationContext>
): ItemInstance[] {
  return generateLootForTable(getLootTableById(lootTableId), rng, itemCount, context);
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
