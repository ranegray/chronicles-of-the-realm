import { RUN_PREPARATION_OPTIONS, getRunPreparationOption } from "../data/runPreparationOptions";
import { INSURANCE_RATE, RUN_PREPARATION_RULES } from "./constants";
import type { Character, GameState, ItemInstance, PreparedRunModifier, RunPreparationOption } from "./types";
import { createRng, makeId } from "./rng";
import { canAffordResourceCost, spendResourceCost } from "./materials";

export function getAvailableRunPreparationOptions(params: {
  gameState: GameState;
}): RunPreparationOption[] {
  const village = params.gameState.village;
  if (!village) return [];
  const unlocked = new Set<string>();
  for (const npc of village.npcs) {
    for (const id of npc.service?.unlockedRunPreparationIds ?? []) unlocked.add(id);
  }
  return RUN_PREPARATION_OPTIONS.filter(option => {
    if (!unlocked.has(option.id)) return false;
    const npc = village.npcs.find(entry => entry.role === option.sourceRole);
    return Boolean(npc && (npc.service?.level ?? npc.serviceLevel) >= option.requiredServiceLevel);
  });
}

export function canPurchaseRunPreparation(params: {
  gameState: GameState;
  optionId: string;
}): {
  canPurchase: boolean;
  reason?: string;
  cost?: RunPreparationOption["cost"];
} {
  if (params.gameState.delveRun) return { canPurchase: false, reason: "Prepare after returning to the village." };
  const option = getRunPreparationOption(params.optionId);
  if (!option) return { canPurchase: false, reason: "Unknown preparation." };
  if (!getAvailableRunPreparationOptions({ gameState: params.gameState }).some(entry => entry.id === option.id)) {
    return { canPurchase: false, reason: "Preparation is locked." };
  }
  const pending = params.gameState.pendingRunPreparations ?? [];
  if (pending.length >= RUN_PREPARATION_RULES.maxPreparedModifiers) {
    return { canPurchase: false, reason: "Preparation slots are full.", cost: option.cost };
  }
  if (option.oncePerRun && pending.some(prep => prep.optionId === option.id && !prep.consumed)) {
    return { canPurchase: false, reason: "Already prepared for the next run.", cost: option.cost };
  }
  const maxForRole = RUN_PREPARATION_RULES.maxByServiceRole[option.sourceRole];
  const roleCount = pending.filter(prep => {
    const source = params.gameState.village?.npcs.find(npc => npc.id === prep.sourceNpcId);
    return source?.role === option.sourceRole && !prep.consumed;
  }).length;
  if (roleCount >= maxForRole) {
    return { canPurchase: false, reason: "That service has already prepared you for this run.", cost: option.cost };
  }
  if (!canAffordResourceCost({ inventory: params.gameState.stash, cost: option.cost })) {
    return { canPurchase: false, reason: "Missing resources.", cost: option.cost };
  }
  return { canPurchase: true, cost: option.cost };
}

export function purchaseRunPreparation(params: {
  gameState: GameState;
  optionId: string;
  npcId: string;
  now?: number;
}): {
  gameState: GameState;
  success: boolean;
  message: string;
} {
  const gate = canPurchaseRunPreparation(params);
  if (!gate.canPurchase) return { gameState: params.gameState, success: false, message: gate.reason ?? "Cannot prepare." };
  const option = getRunPreparationOption(params.optionId)!;
  const npc = params.gameState.village?.npcs.find(entry => entry.id === params.npcId);
  if (!npc || npc.role !== option.sourceRole) {
    return { gameState: params.gameState, success: false, message: "Wrong villager for that preparation." };
  }
  const spend = spendResourceCost({ inventory: params.gameState.stash, cost: option.cost });
  if (!spend.success) return { gameState: params.gameState, success: false, message: "Missing resources." };
  const rngSeed = `${option.id}:${params.npcId}:${params.now ?? Date.now()}`;
  const idRng = createRng(rngSeed);
  const modifier: PreparedRunModifier = {
    id: makeId(idRng, "prep"),
    optionId: option.id,
    sourceNpcId: params.npcId,
    effect: { ...option.effect },
    createdAt: params.now ?? Date.now(),
    consumed: false
  };
  return {
    gameState: {
      ...params.gameState,
      stash: spend.inventory,
      pendingRunPreparations: [...(params.gameState.pendingRunPreparations ?? []), modifier]
    },
    success: true,
    message: `${option.name} prepared for the next run.`
  };
}

// applyRunPreparationsToRun (start-with-item, carry-capacity, protect-one-item,
// etc. effects applied at run start) was deleted with the old dungeon-run
// layer in the v0.5 demolition (issue #38) — nothing calls it, since the
// delve engine doesn't consume PreparedRunModifiers yet (that wiring is
// village-integration follow-up work, same ticket). Purchasing, keepsake,
// and insurance below are unaffected; they're pure village-side bookkeeping.

export function consumeRunPreparations(params: {
  gameState: GameState;
  runId: string;
}): GameState {
  void params.runId;
  return {
    ...params.gameState,
    pendingRunPreparations: (params.gameState.pendingRunPreparations ?? []).filter(prep => !prep.consumed)
  };
}

// --- Insurance ---
// A village service: insure one equipped gear piece per run for gold
// (priced at a fraction of the item's value). If the character dies, the
// insured piece is unequipped and returned to the stash instead of being
// lost with the rest of the raid.

export function getInsuranceCost(item: ItemInstance): number {
  return Math.max(1, Math.ceil(item.value * INSURANCE_RATE));
}

function findEquippedItem(character: Character, itemInstanceId: string): ItemInstance | undefined {
  return Object.values(character.equipped).find(
    (item): item is ItemInstance => Boolean(item) && item!.instanceId === itemInstanceId
  );
}

export function canPurchaseInsurance(params: {
  gameState: GameState;
  itemInstanceId: string;
}): { canPurchase: boolean; reason?: string; cost?: number } {
  if (params.gameState.delveRun) return { canPurchase: false, reason: "Insure gear before the next delve." };
  const character = params.gameState.player;
  if (!character) return { canPurchase: false, reason: "No active character." };
  const item = findEquippedItem(character, params.itemInstanceId);
  if (!item) return { canPurchase: false, reason: "That item isn't equipped." };
  if (params.gameState.pendingInsuredInstanceId) {
    return { canPurchase: false, reason: "Only one piece can be insured per run." };
  }
  const cost = getInsuranceCost(item);
  if (params.gameState.stash.gold < cost) {
    return { canPurchase: false, reason: "Not enough gold.", cost };
  }
  return { canPurchase: true, cost };
}

export function purchaseInsurance(params: {
  gameState: GameState;
  itemInstanceId: string;
}): { gameState: GameState; success: boolean; message: string } {
  const gate = canPurchaseInsurance(params);
  if (!gate.canPurchase || gate.cost === undefined) {
    return { gameState: params.gameState, success: false, message: gate.reason ?? "Cannot insure that item." };
  }
  const item = findEquippedItem(params.gameState.player!, params.itemInstanceId)!;
  return {
    gameState: {
      ...params.gameState,
      stash: { ...params.gameState.stash, gold: params.gameState.stash.gold - gate.cost },
      pendingInsuredInstanceId: params.itemInstanceId
    },
    success: true,
    message: `${item.name} insured for ${gate.cost}g. It returns to the stash if you die.`
  };
}

export function cancelInsurance(gameState: GameState): GameState {
  return { ...gameState, pendingInsuredInstanceId: undefined };
}

// --- Keepsake ---
// Exactly one weightless item packed for the next raid may be designated
// as a keepsake. It survives death even though the rest of the raid pack
// is lost.

function isKeepsakeEligible(item: ItemInstance): boolean {
  // "Exactly one item" — a stack of several weightless items (e.g. gems)
  // would let the whole stack ride out death, so only single, non-stacked
  // items qualify.
  return item.weight === 0 && item.quantity === 1;
}

export function getKeepsakeCandidates(gameState: GameState): ItemInstance[] {
  return gameState.preparedInventory.items.filter(isKeepsakeEligible);
}

export function canDesignateKeepsake(params: {
  gameState: GameState;
  itemInstanceId: string;
}): { canDesignate: boolean; reason?: string } {
  if (params.gameState.delveRun) return { canDesignate: false, reason: "Choose a keepsake before the next delve." };
  const item = params.gameState.preparedInventory.items.find(entry => entry.instanceId === params.itemInstanceId);
  if (!item) return { canDesignate: false, reason: "Pack the item for the next raid first." };
  if (!isKeepsakeEligible(item)) {
    return { canDesignate: false, reason: "Only a single weightless item can be a keepsake." };
  }
  return { canDesignate: true };
}

export function setKeepsake(params: {
  gameState: GameState;
  itemInstanceId: string;
}): { gameState: GameState; success: boolean; message: string } {
  const gate = canDesignateKeepsake(params);
  if (!gate.canDesignate) {
    return { gameState: params.gameState, success: false, message: gate.reason ?? "Cannot set that keepsake." };
  }
  const item = params.gameState.preparedInventory.items.find(entry => entry.instanceId === params.itemInstanceId)!;
  return {
    gameState: { ...params.gameState, pendingKeepsakeInstanceId: params.itemInstanceId },
    success: true,
    message: `${item.name} set as your keepsake. It survives even if you die.`
  };
}

export function clearKeepsake(gameState: GameState): GameState {
  return { ...gameState, pendingKeepsakeInstanceId: undefined };
}
