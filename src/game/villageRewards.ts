import type { DungeonRun, GameState, MaterialId, Quest, UnlockEffect, VillageState } from "./types";
import { addItem, createEmptyInventory, instanceFromTemplateId, moveRaidInventoryToStash } from "./inventory";
import { addMaterials } from "./materials";
import { createRng } from "./rng";
import { addNpcRelationship, addNpcServiceXp, applyServiceUnlocks } from "./villageProgression";

export function applyExtractionVillageRewards(params: {
  gameState: GameState;
  extractedRun: DungeonRun;
  now?: number;
}): {
  gameState: GameState;
  messages: string[];
} {
  const move = moveRaidInventoryToStash(params.extractedRun.raidInventory, params.gameState.stash);
  const materialTotal = Object.values(params.extractedRun.raidInventory.materials ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
  const messages = materialTotal > 0 ? [`Secured ${materialTotal} material${materialTotal === 1 ? "" : "s"}.`] : [];
  return {
    gameState: { ...params.gameState, stash: move.stash, activeRun: { ...params.extractedRun, raidInventory: createEmptyInventory() } },
    messages
  };
}

export function applyQuestReward(params: {
  gameState: GameState;
  questId: string;
  now?: number;
}): {
  gameState: GameState;
  success: boolean;
  messages: string[];
} {
  const village = params.gameState.village;
  const player = params.gameState.player;
  if (!village || !player) return { gameState: params.gameState, success: false, messages: ["No village or player."] };
  const quest = village.quests.find(entry => entry.id === params.questId);
  if (!quest || quest.status !== "completed") {
    return { gameState: params.gameState, success: false, messages: ["Quest is not ready."] };
  }
  let gameState = params.gameState;
  let stash = { ...gameState.stash, gold: gameState.stash.gold + (quest.reward.gold ?? 0) };
  if (quest.reward.materials) stash = addMaterials({ inventory: stash, materials: quest.reward.materials });
  const rng = createRng(`questReward:${quest.id}`);
  for (const templateId of quest.reward.itemTemplateIds ?? []) {
    stash = addItem(stash, instanceFromTemplateId(templateId, rng, 1));
  }
  let nextVillage: VillageState = {
    ...village,
    renown: (village.renown ?? 0) + (quest.reward.villageRenown ?? 0),
    discoveredRecipeIds: Array.from(new Set([...(village.discoveredRecipeIds ?? []), ...(quest.reward.discoveredRecipeIds ?? [])])),
    quests: village.quests.map(entry => entry.id === quest.id ? { ...entry, status: "claimed" } : entry)
  };
  if (quest.reward.relationshipGain) {
    nextVillage = addNpcRelationship({ village: nextVillage, npcId: quest.npcId, amount: quest.reward.relationshipGain });
  }
  if (quest.reward.serviceXp) {
    nextVillage = addNpcServiceXp({ village: nextVillage, npcId: quest.npcId, amount: quest.reward.serviceXp });
  }
  gameState = {
    ...gameState,
    stash,
    player: { ...player, xp: player.xp + (quest.reward.xp ?? 0) },
    village: nextVillage
  };
  if (quest.unlockEffect) {
    gameState = applyUnlockEffect({ gameState, effect: quest.unlockEffect, sourceNpcId: quest.npcId, now: params.now });
  }
  return {
    gameState,
    success: true,
    messages: [`${quest.title} turned in.`]
  };
}

export function applyUnlockEffect(params: {
  gameState: GameState;
  effect: UnlockEffect;
  sourceNpcId?: string;
  now?: number;
}): GameState {
  const village = params.gameState.village;
  if (!village) return params.gameState;
  let nextVillage: VillageState = {
    ...village,
    unlockFlags: params.effect.unlockFlag
      ? { ...(village.unlockFlags ?? {}), [params.effect.unlockFlag]: true }
      : village.unlockFlags,
    discoveredRecipeIds: Array.from(new Set([...(village.discoveredRecipeIds ?? []), ...(params.effect.unlockRecipeIds ?? [])]))
  };
  const targetNpc = (questNpc: Quest | undefined) => questNpc?.npcId;
  void targetNpc;
  nextVillage = {
    ...nextVillage,
    npcs: nextVillage.npcs.map(npc => {
      const matches = (params.effect.npcId && npc.id === params.effect.npcId) ||
        (params.effect.role && npc.role === params.effect.role) ||
        (!params.effect.npcId && !params.effect.role && npc.id === params.sourceNpcId);
      if (!matches) return npc;
      let nextNpc = npc;
      if (params.effect.serviceLevelIncrease) {
        const level = Math.min(5, (npc.service?.level ?? npc.serviceLevel) + params.effect.serviceLevelIncrease) as typeof npc.serviceLevel;
        nextNpc = {
          ...nextNpc,
          serviceLevel: level,
          service: { ...nextNpc.service, level }
        };
      }
      if (params.effect.serviceXpGain) {
        nextNpc = { ...nextNpc, service: { ...nextNpc.service, xp: (nextNpc.service?.xp ?? 0) + params.effect.serviceXpGain } };
      }
      nextNpc = applyServiceUnlocks({
        npc: nextNpc,
        unlocks: [
          ...(params.effect.unlockActionIds ?? []).map(id => ({
            id: `effect-action-${id}`,
            type: "serviceAction" as const,
            label: id,
            description: "Unlocked by quest progress.",
            actionId: id
          })),
          ...(params.effect.unlockRecipeIds ?? []).map(id => ({
            id: `effect-recipe-${id}`,
            type: "recipe" as const,
            label: id,
            description: "Unlocked by quest progress.",
            recipeId: id
          })),
          ...(params.effect.unlockRunPreparationIds ?? []).map(id => ({
            id: `effect-prep-${id}`,
            type: "runPreparation" as const,
            label: id,
            description: "Unlocked by quest progress.",
            runPreparationId: id
          }))
        ]
      });
      return nextNpc;
    })
  };
  return { ...params.gameState, village: nextVillage };
}

export function countMaterialReward(materials: Record<MaterialId, number> | undefined): number {
  return Object.values(materials ?? {}).reduce((sum, amount) => sum + amount, 0);
}
