import type { GameState } from "./types";
import { SAVE_VERSION, STORAGE_KEY } from "./constants";
import { createEmptyInventory } from "./inventory";

export function defaultGameState(): GameState {
  return {
    version: SAVE_VERSION,
    stash: { items: [], gold: 0 },
    preparedInventory: { items: [], gold: 0 },
    completedRuns: [],
    settings: {
      onboardingComplete: false,
      textSpeed: "normal"
    }
  };
}

export function loadGame(): GameState | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameState;
    return migrateSaveIfNeeded(parsed);
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to save game:", err);
  }
}

export function resetGame(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function migrateSaveIfNeeded(state: GameState): GameState {
  const normalized: GameState = {
    ...state,
    preparedInventory: state.preparedInventory ?? createEmptyInventory()
  };
  if (normalized.version === SAVE_VERSION) return normalized;
  // Future migrations go here.
  return { ...normalized, version: SAVE_VERSION };
}

export function hasSave(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}
