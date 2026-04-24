import type { ItemInstance, Rarity } from "./types";
import { LOOT_RULES } from "./constants";
import { getItemTemplate } from "../data/items";
import { getLootTableById, type LootTable, type LootEntry } from "../data/lootTables";
import { instanceFromTemplateId } from "./inventory";
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
  itemCount = 1
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
    items.push(instance);
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
