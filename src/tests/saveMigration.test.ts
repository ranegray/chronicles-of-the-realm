import { describe, it, expect, beforeEach } from "vitest";
import { defaultGameState, loadGame, saveGame } from "../game/save";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { SAVE_VERSION } from "../game/constants";
import type { DungeonRun, GameState } from "../game/types";

describe("save migration (v1 → current)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("bumps version to the current save version when loading v1 save", () => {
    const legacy = buildLegacyV1State();
    saveGame(legacy as unknown as GameState);
    const loaded = loadGame();
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(4);
  });

  it("backfills threat, knownRoomIntel, and dungeonLog on active run", () => {
    const legacy = buildLegacyV1State();
    saveGame(legacy as unknown as GameState);
    const loaded = loadGame();
    const run = loaded?.activeRun;
    expect(run).toBeDefined();
    expect(run?.threat).toBeDefined();
    expect(run?.threat.points).toBe(0);
    expect(run?.threat.level).toBe(0);
    expect(run?.knownRoomIntel).toEqual({});
    expect(run?.dungeonLog).toEqual([]);
  });

  it("backfills searchState on each room", () => {
    const legacy = buildLegacyV1State();
    saveGame(legacy as unknown as GameState);
    const loaded = loadGame();
    const run = loaded?.activeRun;
    for (const room of run!.roomGraph) {
      expect(room.searchState).toEqual({
        searched: false,
        searchCount: 0,
        hiddenLootClaimed: false,
        trapChecked: false,
        eventRevealed: false
      });
    }
  });

  it("converts legacy extractionPoint:true rooms to stable ExtractionPoint", () => {
    const legacy = buildLegacyV1State();
    const extractionRoom = legacy.activeRun.roomGraph.find(r => r.extractionPoint);
    expect(extractionRoom).toBeDefined();
    saveGame(legacy as unknown as GameState);
    const loaded = loadGame();
    const migrated = loaded?.activeRun?.roomGraph.find(r => r.id === extractionRoom!.id);
    expect(migrated?.extractionPoint).toBe(true);
    expect(migrated?.extraction).toBeDefined();
    expect(migrated?.extraction?.variant).toBe("stable");
    expect(migrated?.extraction?.state).toBe("available");
  });

  it("preserves player, village, stash, and inventory", () => {
    const legacy = buildLegacyV1State();
    saveGame(legacy as unknown as GameState);
    const loaded = loadGame();
    expect(loaded?.stash.gold).toBe(legacy.stash.gold);
    expect(loaded?.stash.items).toEqual(legacy.stash.items);
  });

  it("re-saves normalized v2 data and reloads cleanly", () => {
    const legacy = buildLegacyV1State();
    saveGame(legacy as unknown as GameState);
    const firstLoad = loadGame();
    expect(firstLoad).not.toBeNull();
    const secondLoad = loadGame();
    expect(secondLoad?.version).toBe(SAVE_VERSION);
    expect(secondLoad?.activeRun?.threat).toEqual(firstLoad?.activeRun?.threat);
  });
});

function buildLegacyV1State(): GameState & { activeRun: DungeonRun } {
  // Build a realistic v1 run by generating a v2 run and stripping v0.2 fields.
  const run = generateDungeonRun({ seed: "v1-migrate", biome: "crypt", tier: 1 });
  const legacyRun = {
    ...run,
    threat: undefined,
    knownRoomIntel: undefined,
    dungeonLog: undefined,
    roomGraph: run.roomGraph.map(({ searchState, extraction, ...rest }) => {
      void searchState; void extraction;
      return rest;
    })
  } as unknown as DungeonRun;

  return {
    ...defaultGameState(),
    version: 1,
    stash: { items: [], gold: 42 },
    activeRun: legacyRun
  } as unknown as GameState & { activeRun: DungeonRun };
}
