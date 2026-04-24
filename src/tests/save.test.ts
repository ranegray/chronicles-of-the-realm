import { describe, it, expect, beforeEach } from "vitest";
import { defaultGameState, hasSave, loadGame, resetGame, saveGame } from "../game/save";
import { SAVE_VERSION, STORAGE_KEY } from "../game/constants";

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
});
