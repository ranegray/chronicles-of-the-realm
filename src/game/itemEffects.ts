import type { ItemInstance } from "./types";

export function getConsumableHealAmount(item: ItemInstance): number {
  if (item.category !== "consumable" || !item.tags?.includes("heal")) return 0;
  if (item.tags.includes("strong")) return 18;
  if (item.tags.includes("small")) return 8;
  return 6;
}
