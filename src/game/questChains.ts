import { QUEST_CHAIN_DEFINITIONS, getQuestChainDefinitionById } from "../data/questChains";
import type {
  GameState,
  Quest,
  QuestChainDefinition,
  QuestChainState,
  QuestChainStepDefinition,
  VillageState
} from "./types";
import type { Rng } from "./rng";
import { createRng, makeId } from "./rng";
import { applyServiceUnlocks } from "./villageProgression";

export function initializeQuestChainsForVillage(params: {
  village: VillageState;
  rng: Rng;
}): VillageState {
  let village: VillageState = {
    ...params.village,
    questChains: params.village.questChains ?? [],
    quests: [...params.village.quests],
    npcs: params.village.npcs.map(npc => ({ ...npc, activeQuestChainIds: npc.activeQuestChainIds ?? [], completedQuestChainIds: npc.completedQuestChainIds ?? [] }))
  };

  for (const chain of QUEST_CHAIN_DEFINITIONS) {
    const npc = village.npcs.find(entry => entry.role === chain.npcRole);
    if (!npc) continue;
    if (village.questChains.some(state => state.chainId === chain.id)) continue;
    const stepStatuses = Object.fromEntries(
      chain.steps.map(step => [step.id, step.stepIndex === 0 ? "active" : "locked"])
    ) as QuestChainState["stepStatuses"];
    const firstStep = chain.steps[0]!;
    const quest = createQuestFromChainStep({ chain, step: firstStep, npcId: npc.id, rng: params.rng });
    const chainState: QuestChainState = {
      chainId: chain.id,
      npcId: npc.id,
      status: "active",
      currentStepIndex: 0,
      stepStatuses,
      activeQuestId: quest.id
    };
    village = {
      ...village,
      quests: [...village.quests, quest],
      questChains: [...village.questChains, chainState],
      npcs: village.npcs.map(entry =>
        entry.id === npc.id
          ? { ...entry, activeQuestChainIds: [...(entry.activeQuestChainIds ?? []), chain.id], questIds: [...entry.questIds, quest.id] }
          : entry
      )
    };
  }
  return village;
}

export function getQuestChainDefinition(chainId: string): QuestChainDefinition | undefined {
  return getQuestChainDefinitionById(chainId);
}

export function getActiveQuestChainStep(params: {
  chainState: QuestChainState;
}): QuestChainStepDefinition | undefined {
  const chain = getQuestChainDefinition(params.chainState.chainId);
  return chain?.steps[params.chainState.currentStepIndex];
}

export function createQuestFromChainStep(params: {
  chain: QuestChainDefinition;
  step: QuestChainStepDefinition;
  npcId: string;
  rng: Rng;
}): Quest {
  return {
    id: makeId(params.rng, "chainQuest"),
    title: params.step.title,
    description: params.step.description,
    npcId: params.npcId,
    type: params.step.questType,
    target: params.step.target,
    requiredCount: params.step.requiredCount,
    currentCount: 0,
    biome: params.step.biome,
    reward: { ...params.step.reward },
    unlockEffect: params.step.unlockEffect ? { ...params.step.unlockEffect } : undefined,
    status: "active",
    chainId: params.chain.id,
    chainStepId: params.step.id,
    chainStepIndex: params.step.stepIndex,
    claimOnlyAfterExtraction: params.step.claimOnlyAfterExtraction
  };
}

export function advanceQuestChainAfterQuestClaim(params: {
  gameState: GameState;
  questId: string;
  now?: number;
}): {
  gameState: GameState;
  advanced: boolean;
  completedChain?: boolean;
  message?: string;
} {
  const village = params.gameState.village;
  if (!village) return { gameState: params.gameState, advanced: false };
  const quest = village.quests.find(entry => entry.id === params.questId);
  if (!quest?.chainId || !quest.chainStepId) return { gameState: params.gameState, advanced: false };
  const chain = getQuestChainDefinition(quest.chainId);
  const chainState = village.questChains.find(entry => entry.chainId === quest.chainId);
  if (!chain || !chainState) return { gameState: params.gameState, advanced: false };

  const nextStepIndex = (quest.chainStepIndex ?? chainState.currentStepIndex) + 1;
  const completed = nextStepIndex >= chain.steps.length;
  let nextVillage: VillageState = {
    ...village,
    questChains: village.questChains.map(entry =>
      entry.chainId === chainState.chainId
        ? {
            ...entry,
            status: completed ? "completed" : "active",
            currentStepIndex: completed ? entry.currentStepIndex : nextStepIndex,
            activeQuestId: undefined,
            completedAt: completed ? params.now ?? Date.now() : entry.completedAt,
            stepStatuses: {
              ...entry.stepStatuses,
              [quest.chainStepId!]: "claimed",
              ...(completed ? {} : { [chain.steps[nextStepIndex]!.id]: "active" as const })
            }
          }
        : entry
    )
  };

  if (!completed) {
    const nextStep = chain.steps[nextStepIndex]!;
    const rng = createRng(`${quest.id}:${nextStep.id}`);
    const nextQuest = createQuestFromChainStep({ chain, step: nextStep, npcId: chainState.npcId, rng });
    nextVillage = {
      ...nextVillage,
      quests: [...nextVillage.quests, nextQuest],
      questChains: nextVillage.questChains.map(entry =>
        entry.chainId === chainState.chainId ? { ...entry, activeQuestId: nextQuest.id } : entry
      ),
      npcs: nextVillage.npcs.map(npc =>
        npc.id === chainState.npcId ? { ...npc, questIds: [...npc.questIds, nextQuest.id] } : npc
      )
    };
    return {
      gameState: { ...params.gameState, village: nextVillage },
      advanced: true,
      message: `${chain.title} advanced.`
    };
  }

  nextVillage = {
    ...nextVillage,
    npcs: nextVillage.npcs.map(npc => {
      if (npc.id !== chainState.npcId) return npc;
      let nextNpc: typeof npc = {
        ...npc,
        activeQuestChainIds: (npc.activeQuestChainIds ?? []).filter(id => id !== chain.id),
        completedQuestChainIds: Array.from(new Set([...(npc.completedQuestChainIds ?? []), chain.id]))
      };
      if (chain.completionUnlocks?.length) {
        nextNpc = applyServiceUnlocks({ npc: nextNpc, unlocks: chain.completionUnlocks });
      }
      return nextNpc;
    })
  };
  return {
    gameState: { ...params.gameState, village: nextVillage },
    advanced: true,
    completedChain: true,
    message: `${chain.title} completed.`
  };
}
