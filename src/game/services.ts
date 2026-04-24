import type { GameState, ServiceActionDefinition, ServiceActionId, ServiceActionResult } from "./types";
import { canAffordResourceCost, spendResourceCost } from "./materials";
import { craftRecipe } from "./crafting";
import { createRng } from "./rng";

export const SERVICE_ACTION_DEFINITIONS: ServiceActionDefinition[] = [
  {
    id: "repairGear",
    role: "blacksmith",
    name: "Repair Gear",
    description: "Restore worn equipment between runs.",
    requiredServiceLevel: 1,
    cost: { gold: 5 },
    effect: { type: "repairItem", message: "Gear repaired." },
    repeatable: true
  },
  {
    id: "healWounds",
    role: "healer",
    name: "Heal Wounds",
    description: "Remove wounded status and restore HP.",
    requiredServiceLevel: 1,
    cost: { gold: 10, materials: { commonHerbs: 1 } },
    effect: { type: "healWounded", message: "Wounds treated." },
    repeatable: true
  },
  {
    id: "identifyItem",
    role: "enchanter",
    name: "Identify Item",
    description: "Read a strange charm or trinket.",
    requiredServiceLevel: 1,
    cost: { gold: 8 },
    effect: { type: "identifyItem", message: "The item has been identified." },
    repeatable: true
  },
  {
    id: "minorEnchant",
    role: "enchanter",
    name: "Minor Enchantment",
    description: "Add a small ward to eligible gear.",
    requiredServiceLevel: 3,
    cost: { gold: 20, materials: { blackQuartz: 1 } },
    effect: { type: "reinforceItem", amount: 1, message: "A minor enchantment settles into the item." },
    repeatable: true
  },
  {
    id: "buyBasicSupplies",
    role: "quartermaster",
    name: "Buy Basic Supplies",
    description: "Buy simple field supplies from the quartermaster.",
    requiredServiceLevel: 1,
    cost: { gold: 3 },
    effect: { type: "revealDungeonHint", message: "Basic supplies are set aside for your next packing pass." },
    repeatable: true
  },
  {
    id: "sellLoot",
    role: "trader",
    name: "Sell Loot",
    description: "Move common loot for gold.",
    requiredServiceLevel: 1,
    effect: { type: "sellItems", message: "Loot sold." },
    repeatable: true
  }
];

export function getAvailableServiceActions(params: {
  gameState: GameState;
  npcId: string;
}): ServiceActionDefinition[] {
  const npc = params.gameState.village?.npcs.find(entry => entry.id === params.npcId);
  if (!npc) return [];
  const unlocked = new Set(npc.service?.unlockedActionIds ?? []);
  return SERVICE_ACTION_DEFINITIONS.filter(action =>
    action.role === npc.role &&
    unlocked.has(action.id) &&
    (npc.service?.level ?? npc.serviceLevel) >= action.requiredServiceLevel
  );
}

export function canPerformServiceAction(params: {
  gameState: GameState;
  npcId: string;
  actionId: ServiceActionId;
  targetItemInstanceId?: string;
}): {
  canPerform: boolean;
  reason?: string;
  cost?: ServiceActionDefinition["cost"];
} {
  if (params.gameState.activeRun) return { canPerform: false, reason: "Service actions are only available in the village." };
  const action = getAvailableServiceActions(params).find(entry => entry.id === params.actionId);
  if (!action) return { canPerform: false, reason: "Action is locked." };
  if (action.cost && !canAffordResourceCost({ inventory: params.gameState.stash, cost: action.cost })) {
    return { canPerform: false, reason: "Missing resources.", cost: action.cost };
  }
  return { canPerform: true, cost: action.cost };
}

export function performServiceAction(params: {
  gameState: GameState;
  npcId: string;
  actionId: ServiceActionId;
  targetItemInstanceId?: string;
  recipeId?: string;
  now?: number;
}): ServiceActionResult {
  const gate = canPerformServiceAction(params);
  if (!gate.canPerform) return { success: false, message: gate.reason ?? "Cannot perform action." };
  const action = getAvailableServiceActions(params).find(entry => entry.id === params.actionId)!;
  let gameState = params.gameState;
  if (action.cost) {
    const spend = spendResourceCost({ inventory: gameState.stash, cost: action.cost });
    if (!spend.success) return { success: false, message: "Missing resources." };
    gameState = { ...gameState, stash: spend.inventory };
  }

  if (action.effect.type === "healWounded" && gameState.player) {
    gameState = {
      ...gameState,
      player: { ...gameState.player, hp: gameState.player.maxHp, wounded: undefined }
    };
  }
  if (action.effect.type === "craftRecipe" && (params.recipeId || action.effect.recipeId)) {
    const result = craftRecipe({
      gameState,
      recipeId: params.recipeId ?? action.effect.recipeId!,
      rng: createRng(`service:${params.actionId}:${params.now ?? Date.now()}`),
      now: params.now
    });
    if (!result.success) return { success: false, message: result.message, gameState };
    return { success: true, message: result.message, gameState: result.gameState, createdItems: result.craftedItems, spentResources: action.cost };
  }

  return { success: true, message: action.effect.message, gameState, spentResources: action.cost };
}
