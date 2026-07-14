import { describe, expect, it, beforeEach } from "vitest";
import { defaultGameState, loadGame, saveGame } from "../game/save";
import { generateVillage } from "../game/npcGenerator";
import { createRng } from "../game/rng";
import { SAVE_VERSION } from "../game/constants";
import type { GameState } from "../game/types";

describe("save migration v3", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates v2 saves with material, service, quest-chain, and prep defaults", () => {
    const village = generateVillage(createRng("legacy-v2"));
    const legacy = {
      ...defaultGameState(),
      version: 2,
      stash: { items: [], gold: 12 },
      village: {
        name: village.name,
        npcs: village.npcs.map(({ service, activeQuestChainIds, completedQuestChainIds, ...npc }) => {
          void service; void activeQuestChainIds; void completedQuestChainIds;
          return npc;
        }),
        quests: [],
        unlockFlags: {}
      },
      pendingRunPreparations: undefined
    } as unknown as GameState;

    saveGame(legacy);
    const loaded = loadGame()!;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.stash.materials).toEqual({});
    expect(loaded.village?.renown).toBe(0);
    expect(loaded.village?.questChains.length).toBeGreaterThan(0);
    expect(loaded.village?.npcs[0]?.service).toBeDefined();
    expect(loaded.pendingRunPreparations).toEqual([]);
  });
});
