import type { Inventory, MaterialId, MaterialVault, ResourceCost } from "./types";
import { getMaterialDefinition } from "../data/materials";

export function createEmptyMaterialVault(): MaterialVault {
  return {};
}

export function normalizeMaterialVault(value: unknown): MaterialVault {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: MaterialVault = {};
  for (const [key, amount] of Object.entries(value)) {
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      out[key as MaterialId] = Math.floor(amount);
    }
  }
  return out;
}

export function getMaterialCount(params: {
  inventory: Inventory;
  materialId: MaterialId;
}): number {
  return params.inventory.materials?.[params.materialId] ?? 0;
}

export function addMaterials(params: {
  inventory: Inventory;
  materials: MaterialVault;
}): Inventory {
  const next: MaterialVault = { ...(params.inventory.materials ?? {}) };
  for (const [id, amount] of Object.entries(params.materials) as [MaterialId, number][]) {
    if (!amount || amount <= 0) continue;
    next[id] = (next[id] ?? 0) + amount;
  }
  return { ...params.inventory, materials: pruneMaterialVault(next) };
}

export function removeMaterials(params: {
  inventory: Inventory;
  materials: MaterialVault;
}): Inventory {
  const next: MaterialVault = { ...(params.inventory.materials ?? {}) };
  for (const [id, amount] of Object.entries(params.materials) as [MaterialId, number][]) {
    if (!amount || amount <= 0) continue;
    next[id] = Math.max(0, (next[id] ?? 0) - amount);
  }
  return { ...params.inventory, materials: pruneMaterialVault(next) };
}

export function canAffordResourceCost(params: {
  inventory: Inventory;
  cost: ResourceCost;
}): boolean {
  return missingResourceCost(params).gold === undefined &&
    Object.keys(missingResourceCost(params).materials ?? {}).length === 0 &&
    (missingResourceCost(params).itemTemplateIds?.length ?? 0) === 0;
}

export function spendResourceCost(params: {
  inventory: Inventory;
  cost: ResourceCost;
}): {
  inventory: Inventory;
  success: boolean;
  missing?: ResourceCost;
} {
  const missing = missingResourceCost(params);
  if (missing.gold !== undefined || Object.keys(missing.materials ?? {}).length > 0 || (missing.itemTemplateIds?.length ?? 0) > 0) {
    return { inventory: params.inventory, success: false, missing };
  }

  let inventory: Inventory = {
    ...params.inventory,
    gold: params.inventory.gold - (params.cost.gold ?? 0)
  };
  if (params.cost.materials) {
    inventory = removeMaterials({ inventory, materials: params.cost.materials });
  }
  if (params.cost.itemTemplateIds?.length) {
    const removeIds = [...params.cost.itemTemplateIds];
    inventory = {
      ...inventory,
      items: inventory.items.filter(item => {
        const idx = removeIds.indexOf(item.templateId);
        if (idx === -1) return true;
        removeIds.splice(idx, 1);
        return false;
      })
    };
  }
  return { inventory, success: true };
}

export function missingResourceCost(params: {
  inventory: Inventory;
  cost: ResourceCost;
}): ResourceCost {
  const missing: ResourceCost = {};
  if ((params.cost.gold ?? 0) > params.inventory.gold) {
    missing.gold = (params.cost.gold ?? 0) - params.inventory.gold;
  }
  for (const [id, amount] of Object.entries(params.cost.materials ?? {}) as [MaterialId, number][]) {
    const have = params.inventory.materials?.[id] ?? 0;
    if (have < amount) {
      missing.materials = { ...(missing.materials ?? {}), [id]: amount - have };
    }
  }
  const missingItems: string[] = [];
  for (const templateId of params.cost.itemTemplateIds ?? []) {
    if (!params.inventory.items.some(item => item.templateId === templateId)) {
      missingItems.push(templateId);
    }
  }
  if (missingItems.length > 0) missing.itemTemplateIds = missingItems;
  return missing;
}

export function formatResourceCost(cost: ResourceCost): string {
  const parts: string[] = [];
  if (cost.gold) parts.push(`${cost.gold}g`);
  for (const [id, amount] of Object.entries(cost.materials ?? {}) as [MaterialId, number][]) {
    const name = getMaterialDefinition(id).name;
    parts.push(`${amount} ${name}`);
  }
  for (const id of cost.itemTemplateIds ?? []) parts.push(id);
  return parts.length > 0 ? parts.join(", ") : "Free";
}

export function formatMaterialVault(materials: MaterialVault): string {
  const parts: string[] = [];
  for (const [id, amount] of Object.entries(materials) as [MaterialId, number][]) {
    if (!amount || amount <= 0) continue;
    parts.push(`${amount} ${getMaterialDefinition(id).name}`);
  }
  return parts.join(", ");
}

export function mergeMaterialVaults(...vaults: MaterialVault[]): MaterialVault {
  return vaults.reduce((acc, vault) => {
    for (const [id, amount] of Object.entries(vault) as [MaterialId, number][]) {
      if (amount > 0) acc[id] = (acc[id] ?? 0) + amount;
    }
    return acc;
  }, {} as MaterialVault);
}

function pruneMaterialVault(vault: MaterialVault): MaterialVault {
  const out: MaterialVault = {};
  for (const [id, amount] of Object.entries(vault) as [MaterialId, number][]) {
    if (amount > 0) out[id] = amount;
  }
  return out;
}
