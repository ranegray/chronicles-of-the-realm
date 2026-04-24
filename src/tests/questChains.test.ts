import { describe, expect, it } from "vitest";
import { defaultGameState } from "../game/save";
import { generateVillage } from "../game/npcGenerator";
import { createRng } from "../game/rng";
import { initializeVillageProgression } from "../game/villageProgression";
import { initializeQuestChainsForVillage, advanceQuestChainAfterQuestClaim } from "../game/questChains";

describe("quest chains", () => {
  it("initializes chains for matching NPC roles and creates first active quests", () => {
    let village = initializeVillageProgression({ village: generateVillage(createRng("chains")) });
    village = initializeQuestChainsForVillage({ village, rng: createRng("chains") });
    expect(village.questChains.length).toBeGreaterThanOrEqual(3);
    const coldForge = village.questChains.find(chain => chain.chainId === "chain-cold-forge")!;
    expect(coldForge.status).toBe("active");
    expect(village.quests.some(quest => quest.id === coldForge.activeQuestId && quest.chainId === coldForge.chainId)).toBe(true);
  });

  it("advances to the next step after a chain quest is claimed", () => {
    let village = initializeVillageProgression({ village: generateVillage(createRng("advance")) });
    village = initializeQuestChainsForVillage({ village, rng: createRng("advance") });
    const chain = village.questChains.find(entry => entry.chainId === "chain-cold-forge")!;
    const questId = chain.activeQuestId!;
    village = {
      ...village,
      quests: village.quests.map(quest => quest.id === questId ? { ...quest, status: "claimed" as const } : quest)
    };
    const result = advanceQuestChainAfterQuestClaim({ gameState: { ...defaultGameState(), village }, questId, now: 1 });
    expect(result.advanced).toBe(true);
    const nextChain = result.gameState.village!.questChains.find(entry => entry.chainId === chain.chainId)!;
    expect(nextChain.currentStepIndex).toBe(1);
    expect(nextChain.activeQuestId).not.toBe(questId);
  });
});
