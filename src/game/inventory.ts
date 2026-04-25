import type { Inventory, ItemInstance, ItemTemplate } from "./types";
import { INVENTORY_RULES } from "./constants";
import { getItemTemplate } from "../data/items";
import type { Rng } from "./rng";
import { makeId } from "./rng";

export function createEmptyInventory(): Inventory {
  return { items: [], gold: 0, materials: {} };
}

export function instanceFromTemplate(
  template: ItemTemplate,
  rng: Rng,
  quantity = 1
): ItemInstance {
  return {
    instanceId: makeId(rng, "item"),
    templateId: template.id,
    name: template.name,
    category: template.category,
    rarity: template.rarity,
    description: template.description,
    value: template.value,
    weight: template.weight,
    stackable: template.stackable,
    quantity,
    stats: template.stats ? { ...template.stats } : undefined,
    tags: template.tags ? [...template.tags] : [],
    affixes: [],
    states: []
  };
}

export function instanceFromTemplateId(
  templateId: string,
  rng: Rng,
  quantity = 1
): ItemInstance {
  return instanceFromTemplate(getItemTemplate(templateId), rng, quantity);
}

export function calculateInventoryWeight(inv: Inventory): number {
  return inv.items.reduce((sum, it) => sum + it.weight * it.quantity, 0);
}

export function canCarryItem(
  inv: Inventory,
  item: ItemInstance,
  capacity: number
): boolean {
  const current = calculateInventoryWeight(inv);
  return current + item.weight * item.quantity <= capacity;
}

export function addItem(inv: Inventory, item: ItemInstance): Inventory {
  if (item.stackable) {
    const existing = inv.items.find(
      i => i.templateId === item.templateId && i.stackable
    );
    if (existing) {
      const newQty = Math.min(
        INVENTORY_RULES.maxStackSize,
        existing.quantity + item.quantity
      );
      return {
        ...inv,
        items: inv.items.map(i =>
          i.instanceId === existing.instanceId ? { ...i, quantity: newQty } : i
        )
      };
    }
  }
  return { ...inv, items: [...inv.items, item] };
}

export function removeItem(inv: Inventory, instanceId: string, quantity = 1): Inventory {
  const item = inv.items.find(i => i.instanceId === instanceId);
  if (!item) return inv;
  if (item.quantity > quantity) {
    return {
      ...inv,
      items: inv.items.map(i =>
        i.instanceId === instanceId ? { ...i, quantity: i.quantity - quantity } : i
      )
    };
  }
  return { ...inv, items: inv.items.filter(i => i.instanceId !== instanceId) };
}

export function moveRaidInventoryToStash(
  raid: Inventory,
  stash: Inventory
): { stash: Inventory; raid: Inventory } {
  let next = stash;
  for (const item of raid.items) {
    next = addItem(next, item);
  }
  next = {
    ...next,
    gold: next.gold + raid.gold,
    materials: { ...(next.materials ?? {}) }
  };
  for (const [id, amount] of Object.entries(raid.materials ?? {})) {
    next.materials = {
      ...(next.materials ?? {}),
      [id]: (next.materials?.[id as keyof typeof next.materials] ?? 0) + (amount ?? 0)
    };
  }
  return { stash: next, raid: createEmptyInventory() };
}

export function inventoryHasTag(inv: Inventory, tag: string): boolean {
  return inv.items.some(i => i.tags?.includes(tag));
}

export function countItemsByTag(inv: Inventory, tag: string): number {
  return inv.items.reduce(
    (sum, i) => sum + (i.tags?.includes(tag) ? i.quantity : 0),
    0
  );
}

export function findItemsByTemplateId(inv: Inventory, templateId: string): ItemInstance[] {
  return inv.items.filter(i => i.templateId === templateId);
}
