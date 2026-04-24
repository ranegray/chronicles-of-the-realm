import { CRAFTING_RECIPES, getCraftingRecipe } from "../data/craftingRecipes";
import type { CraftingRecipe, GameState, ItemInstance, NpcRole, ResourceCost } from "./types";
import type { Rng } from "./rng";
import { addItem, instanceFromTemplateId } from "./inventory";
import { addMaterials, canAffordResourceCost, missingResourceCost, spendResourceCost } from "./materials";

export function getUnlockedRecipes(params: {
  gameState: GameState;
  npcId?: string;
  role?: NpcRole;
}): CraftingRecipe[] {
  const village = params.gameState.village;
  if (!village) return [];
  const npcs = village.npcs.filter(npc =>
    params.npcId ? npc.id === params.npcId : params.role ? npc.role === params.role : true
  );
  const unlockedIds = new Set(village.discoveredRecipeIds ?? []);
  for (const npc of npcs) {
    for (const id of npc.service?.unlockedRecipeIds ?? []) unlockedIds.add(id);
  }
  return CRAFTING_RECIPES.filter(recipe => {
    if (!unlockedIds.has(recipe.id)) return false;
    const npc = npcs.find(entry => entry.role === recipe.stationRole);
    if (!npc) return false;
    return (npc.service?.level ?? npc.serviceLevel) >= recipe.requiredServiceLevel;
  });
}

export function canCraftRecipe(params: {
  gameState: GameState;
  recipeId: string;
}): {
  canCraft: boolean;
  reason?: string;
  missing?: ResourceCost;
} {
  if (params.gameState.activeRun) {
    return { canCraft: false, reason: "Crafting is only available in the village." };
  }
  const recipe = getCraftingRecipe(params.recipeId);
  if (!recipe) return { canCraft: false, reason: "Unknown recipe." };
  if (!getUnlockedRecipes({ gameState: params.gameState }).some(entry => entry.id === recipe.id)) {
    return { canCraft: false, reason: "Recipe is locked." };
  }
  const cost = recipeToResourceCost(recipe);
  if (!canAffordResourceCost({ inventory: params.gameState.stash, cost })) {
    return { canCraft: false, reason: "Missing resources.", missing: missingResourceCost({ inventory: params.gameState.stash, cost }) };
  }
  return { canCraft: true };
}

export function craftRecipe(params: {
  gameState: GameState;
  recipeId: string;
  rng: Rng;
  now?: number;
}): {
  gameState: GameState;
  craftedItems: ItemInstance[];
  success: boolean;
  message: string;
} {
  void params.now;
  const gate = canCraftRecipe(params);
  if (!gate.canCraft) {
    return { gameState: params.gameState, craftedItems: [], success: false, message: gate.reason ?? "Cannot craft." };
  }
  const recipe = getCraftingRecipe(params.recipeId)!;
  const spend = spendResourceCost({ inventory: params.gameState.stash, cost: recipeToResourceCost(recipe) });
  if (!spend.success) {
    return { gameState: params.gameState, craftedItems: [], success: false, message: "Missing resources." };
  }
  let stash = spend.inventory;
  const craftedItems: ItemInstance[] = [];
  for (const output of recipe.outputs) {
    if (output.itemTemplateId) {
      const item = instanceFromTemplateId(output.itemTemplateId, params.rng, output.quantity);
      craftedItems.push(item);
      stash = addItem(stash, item);
    }
    if (output.materialId) {
      stash = addMaterials({ inventory: stash, materials: { [output.materialId]: output.quantity } });
    }
  }
  return {
    gameState: { ...params.gameState, stash },
    craftedItems,
    success: true,
    message: `Crafted ${recipe.name}.`
  };
}

function recipeToResourceCost(recipe: CraftingRecipe): ResourceCost {
  const cost: ResourceCost = {};
  if (recipe.goldCost) cost.gold = recipe.goldCost;
  for (const ingredient of recipe.ingredients) {
    if (ingredient.materialId) {
      cost.materials = {
        ...(cost.materials ?? {}),
        [ingredient.materialId]: (cost.materials?.[ingredient.materialId] ?? 0) + ingredient.quantity
      };
    }
    if (ingredient.itemTemplateId) {
      cost.itemTemplateIds = [
        ...(cost.itemTemplateIds ?? []),
        ...Array.from({ length: ingredient.quantity }, () => ingredient.itemTemplateId!)
      ];
    }
  }
  return cost;
}
