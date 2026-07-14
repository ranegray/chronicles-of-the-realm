import { describe, it, expect, beforeEach } from "vitest";
import { defaultGameState, hasSave, loadGame, resetGame, saveGame } from "../game/save";
import { SAVE_VERSION, STORAGE_KEY } from "../game/constants";
import { applyDelveAction, createDelveRun } from "../game/delve/delveRun";
import type { DelveRunDeps } from "../game/delve/types";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";

describe("save", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hasSave is false initially", () => {
    expect(hasSave()).toBe(false);
  });

  it("saves and loads state", () => {
    const state = { ...defaultGameState(), stash: { items: [], gold: 99 } };
    saveGame(state);
    expect(hasSave()).toBe(true);
    const loaded = loadGame();
    expect(loaded?.stash.gold).toBe(99);
  });

  it("resetGame removes save", () => {
    saveGame(defaultGameState());
    resetGame();
    expect(hasSave()).toBe(false);
    expect(loadGame()).toBeNull();
  });

  it("migrates old version", () => {
    const old = { ...defaultGameState(), version: 0 };
    saveGame(old);
    const loaded = loadGame();
    expect(loaded?.version).toBe(SAVE_VERSION);
  });

  it("backfills prepared inventory on load", () => {
    const old = { ...defaultGameState(), preparedInventory: undefined } as unknown as ReturnType<typeof defaultGameState>;
    saveGame(old);
    const loaded = loadGame();
    expect(loaded?.preparedInventory.items).toHaveLength(0);
  });

  it("backfills run summaries on load", () => {
    const old = { ...defaultGameState(), runSummaries: undefined } as unknown as ReturnType<typeof defaultGameState>;
    saveGame(old);
    const loaded = loadGame();
    expect(loaded?.runSummaries).toEqual([]);
  });

  it("ignores invalid save JSON gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    expect(hasSave()).toBe(false);
    expect(loadGame()).toBeNull();
  });

  it("ignores structurally invalid saves gracefully", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, stash: "bad" }));
    expect(hasSave()).toBe(false);
    expect(loadGame()).toBeNull();
  });

  it("round-trips an in-progress delve run through save/load (PR #39 review)", () => {
    let draft = createEmptyDraft("save-delve-1");
    draft = CharacterCreationService.setName(draft, "Delver");
    draft = CharacterCreationService.selectAncestry(draft, "human");
    draft = CharacterCreationService.selectClass(draft, "warrior");
    draft = CharacterCreationService.rollAllAbilityScores(draft);
    draft = CharacterCreationService.autoAssignScoresForClass(draft);
    draft = CharacterCreationService.chooseStarterKit(draft, "warrior_sword_shield");
    const player = CharacterCreationService.finalizeCharacter(draft).character;

    let delveRun = createDelveRun({ placeId: "goblinWarrens", seed: "save-delve-1", flasksPacked: 1 });
    const deps: DelveRunDeps = {
      character: player,
      carriedItems: [],
      carriedWeight: 0,
      carryCapacity: player.derivedStats.carryCapacity
    };
    // Move a couple of times so lamp oil, alertness, and visited rooms are
    // all mid-run (not just the pristine createDelveRun default state).
    delveRun = applyDelveAction(delveRun, { type: "move", direction: "south" }, deps).state;
    delveRun = applyDelveAction(delveRun, { type: "listen" }, deps).state;

    const state = { ...defaultGameState(), player, delveRun, delveMeta: { startedAt: 1, xpGained: 0 } };
    saveGame(state);
    const loaded = loadGame();

    expect(loaded?.delveRun).toBeDefined();
    expect(loaded?.delveRun?.status).toBe("active");
    expect(loaded?.delveRun?.currentRoomId).toBe(delveRun.currentRoomId);
    expect(loaded?.delveRun?.lamp).toEqual(delveRun.lamp);
    expect(loaded?.delveRun?.alertness).toBe(delveRun.alertness);
    expect(loaded?.delveRun?.hunters).toEqual(delveRun.hunters);
    expect(loaded?.delveRun?.visitedRoomIds).toEqual(delveRun.visitedRoomIds);
    expect(loaded?.delveRun?.narrative).toEqual(delveRun.narrative);
  });

  it("drops a delve run with a schema-drifted lamp/hunters shape instead of crashing on load", () => {
    const badRun = { placeId: "goblinWarrens", currentRoomId: "gullet", status: "active", narrative: [], lamp: "not an object", hunters: [] };
    const state = { ...defaultGameState(), delveRun: badRun } as unknown as ReturnType<typeof defaultGameState>;
    saveGame(state);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.delveRun).toBeUndefined();
  });
});
