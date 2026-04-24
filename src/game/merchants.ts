import type { EquipmentSlots, ItemInstance, ItemTemplate, NpcRole } from "./types";
import { getItemTemplate, ITEM_TEMPLATES } from "../data/items";

export type EquipmentSlotId = keyof EquipmentSlots;

const ROLE_STOCK: Record<NpcRole, string[]> = {
  blacksmith: [
    "weapon_short_sword",
    "weapon_longblade",
    "weapon_hand_axe",
    "weapon_iron_mace",
    "shield_oak_buckler",
    "armor_padded_coat",
    "armor_heavy_gambeson",
    "armor_traveler_leathers"
  ],
  alchemist: [
    "consumable_small_draught",
    "consumable_strong_draught",
    "consumable_herbal_poultice",
    "consumable_trail_ration"
  ],
  enchanter: [
    "scroll_spark",
    "trinket_minor_ward",
    "trinket_binding_charm",
    "trinket_emberglass"
  ],
  quartermaster: [
    "consumable_trail_ration",
    "consumable_small_draught",
    "armor_hide_jerkin",
    "weapon_hunting_bow"
  ],
  cartographer: [
    "trinket_cartographer_ink",
    "trinket_silk_picks",
    "trinket_snare_wire",
    "consumable_trail_ration"
  ],
  elder: [
    "consumable_small_draught",
    "trinket_pilgrim_charm"
  ],
  healer: [
    "consumable_herbal_poultice",
    "consumable_small_draught",
    "consumable_strong_draught",
    "trinket_pilgrim_charm"
  ],
  trader: [
    "consumable_trail_ration",
    "consumable_small_draught",
    "gem_river_stone",
    "trinket_cartographer_ink"
  ]
};

const SERVICE_TWO_STOCK = new Set([
  "weapon_keen_dagger",
  "weapon_stout_iron_mace",
  "armor_reinforced_leather",
  "trinket_emberglass"
]);

export function getMerchantStock(role: NpcRole, serviceLevel: number): ItemTemplate[] {
  const stockIds = new Set(ROLE_STOCK[role]);
  if (serviceLevel >= 2) {
    for (const item of ITEM_TEMPLATES) {
      if (SERVICE_TWO_STOCK.has(item.id)) stockIds.add(item.id);
    }
  }
  return [...stockIds].map(id => getItemTemplate(id));
}

export function getBuyPrice(item: ItemTemplate, serviceLevel: number): number {
  const discount = Math.min(0.2, Math.max(0, serviceLevel - 1) * 0.05);
  return Math.max(1, Math.ceil(item.value * (1.15 - discount)));
}

export function getSellValue(item: ItemInstance): number {
  return Math.max(1, Math.floor(item.value * item.quantity * 0.5));
}

export function canMerchantUpgrade(role: NpcRole, item: ItemInstance): boolean {
  if (role === "blacksmith") {
    return item.category === "weapon" || item.category === "armor" || item.category === "shield";
  }
  if (role === "enchanter") {
    return item.category === "trinket" || item.category === "scroll";
  }
  return false;
}

export function getUpgradeCost(item: ItemInstance): number {
  const nextLevel = (item.upgradeLevel ?? 0) + 1;
  return Math.max(12, item.value + nextLevel * 18);
}

export function upgradeItem(item: ItemInstance): ItemInstance {
  const nextLevel = (item.upgradeLevel ?? 0) + 1;
  const stats = { ...(item.stats ?? {}) };

  if (item.category === "weapon") {
    stats.accuracy = (stats.accuracy ?? 0) + 1;
  } else if (item.category === "armor" || item.category === "shield") {
    stats.armor = (stats.armor ?? 0) + 1;
  } else if (item.category === "trinket") {
    stats.magicPower = (stats.magicPower ?? 0) + 1;
  }

  const baseName = item.name.replace(/\s\+\d+$/, "");
  return {
    ...item,
    name: `${baseName} +${nextLevel}`,
    value: item.value + Math.ceil(getUpgradeCost(item) * 0.4),
    stats,
    upgradeLevel: nextLevel
  };
}

export function slotForItem(item: ItemInstance): EquipmentSlotId | undefined {
  if (item.category === "weapon") return "weapon";
  if (item.category === "armor") return "armor";
  if (item.category === "shield") return "offhand";
  if (item.category === "trinket") return "trinket1";
  return undefined;
}
