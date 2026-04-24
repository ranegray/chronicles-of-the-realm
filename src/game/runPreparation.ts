import { RUN_PREPARATION_OPTIONS, getRunPreparationOption } from "../data/runPreparationOptions";
import { RUN_PREPARATION_RULES } from "./constants";
import type { Character, DungeonRun, GameState, PreparedRunModifier, RunPreparationOption } from "./types";
import type { Rng } from "./rng";
import { createRng, makeId } from "./rng";
import { addItem, instanceFromTemplateId } from "./inventory";
import { canAffordResourceCost, spendResourceCost } from "./materials";
import { addDungeonLogEntry } from "./dungeonLog";

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
  if (params.gameState.activeRun) return { canPurchase: false, reason: "Prepare after returning to the village." };
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

export function applyRunPreparationsToRun(params: {
  run: DungeonRun;
  character: Character;
  preparations: PreparedRunModifier[];
  rng: Rng;
}): {
  run: DungeonRun;
  character: Character;
  appliedPreparations: PreparedRunModifier[];
} {
  let run = params.run;
  let character = params.character;
  const applied: PreparedRunModifier[] = [];
  for (const prep of params.preparations.filter(entry => !entry.consumed)) {
    switch (prep.effect.type) {
      case "startWithItem":
        if (prep.effect.itemTemplateId) {
          run = {
            ...run,
            raidInventory: addItem(run.raidInventory, instanceFromTemplateId(prep.effect.itemTemplateId, params.rng, prep.effect.quantity ?? prep.effect.amount ?? 1))
          };
        }
        break;
      case "increaseCarryCapacity":
        character = {
          ...character,
          derivedStats: {
            ...character.derivedStats,
            carryCapacity: character.derivedStats.carryCapacity + (prep.effect.amount ?? 0)
          }
        };
        break;
      case "temporaryStatBonus":
        if (prep.effect.statKey && prep.effect.statKey in character.derivedStats) {
          character = {
            ...character,
            derivedStats: {
              ...character.derivedStats,
              [prep.effect.statKey]: (character.derivedStats[prep.effect.statKey as keyof Character["derivedStats"]] as number) + (prep.effect.amount ?? 0)
            }
          };
        }
        break;
      case "protectOneItem":
        run = {
          ...run,
          loadoutSnapshot: run.loadoutSnapshot.map((item, index) => index === 0 ? { ...item, protected: true } : item)
        };
        break;
      case "revealExtraRooms":
      case "improveScouting":
      case "extractionHint":
      case "trapWard":
      case "reduceStartingThreat":
        run = addDungeonLogEntry({
          run,
          type: "info",
          message: `${getRunPreparationOption(prep.optionId)?.name ?? "Preparation"} is active.`,
          roomId: run.currentRoomId,
          now: prep.createdAt
        });
        break;
    }
    applied.push({ ...prep, consumed: RUN_PREPARATION_RULES.consumeOnRunStart });
  }
  return { run: { ...run, appliedRunPreparations: applied }, character, appliedPreparations: applied };
}

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
