import type { CombatState, DungeonRun, GameState, Inventory, RunSummary } from "./types";
import { SAVE_VERSION, STORAGE_KEY } from "./constants";
import { createEmptyInventory } from "./inventory";

export function defaultGameState(): GameState {
  return {
    version: SAVE_VERSION,
    stash: { items: [], gold: 0 },
    preparedInventory: { items: [], gold: 0 },
    completedRuns: [],
    runSummaries: [],
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
    const parsed = JSON.parse(raw) as unknown;
    const migrated = migrateSaveIfNeeded(parsed);
    if (!migrated) return null;
    saveGame(migrated);
    return migrated;
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

export function migrateSaveIfNeeded(state: unknown): GameState | null {
  if (!isRecord(state)) return null;

  const base = defaultGameState();
  const stash = normalizeInventory(state.stash);
  if (!stash) return null;

  const completedRuns = Array.isArray(state.completedRuns)
    ? state.completedRuns.map(normalizeRun).filter(Boolean) as DungeonRun[]
    : [];
  const activeRun = normalizeRun(state.activeRun);
  const activeCombat = activeRun ? normalizeCombat(state.activeCombat, activeRun) : undefined;

  const normalized: GameState = {
    ...base,
    ...state,
    version: SAVE_VERSION,
    stash,
    preparedInventory: normalizeInventory(state.preparedInventory) ?? createEmptyInventory(),
    completedRuns,
    runSummaries: normalizeRunSummaries(state.runSummaries),
    lastRunSummary: normalizeRunSummary(state.lastRunSummary),
    activeRun,
    activeCombat,
    settings: {
      ...base.settings,
      ...(isRecord(state.settings) ? state.settings : {})
    }
  } as GameState;

  return normalized;
}

export function hasSave(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    return migrateSaveIfNeeded(JSON.parse(raw)) !== null;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeInventory(value: unknown): Inventory | null {
  if (!isRecord(value)) return null;
  return {
    items: Array.isArray(value.items) ? value.items as Inventory["items"] : [],
    gold: typeof value.gold === "number" && Number.isFinite(value.gold) ? value.gold : 0
  };
}

function normalizeRun(value: unknown): DungeonRun | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.runId !== "string") return undefined;
  if (typeof value.seed !== "string") return undefined;
  if (!Array.isArray(value.roomGraph) || value.roomGraph.length === 0) return undefined;
  if (typeof value.currentRoomId !== "string") return undefined;
  if (!value.roomGraph.some(room => isRecord(room) && room.id === value.currentRoomId)) return undefined;

  return {
    ...value,
    generatorVersion: typeof value.generatorVersion === "number" ? value.generatorVersion : 1,
    status: value.status === "extracted" || value.status === "dead" || value.status === "abandoned"
      ? value.status
      : "active",
    startedAt: typeof value.startedAt === "number" ? value.startedAt : Date.now(),
    visitedRoomIds: Array.isArray(value.visitedRoomIds) ? value.visitedRoomIds as string[] : [value.currentRoomId],
    raidInventory: normalizeInventory(value.raidInventory) ?? createEmptyInventory(),
    loadoutSnapshot: Array.isArray(value.loadoutSnapshot) ? value.loadoutSnapshot as DungeonRun["loadoutSnapshot"] : [],
    activeQuestIds: Array.isArray(value.activeQuestIds) ? value.activeQuestIds as string[] : [],
    questProgressAtStart: isRecord(value.questProgressAtStart) ? value.questProgressAtStart as Record<string, number> : {},
    xpGained: typeof value.xpGained === "number" ? value.xpGained : 0,
    roomsVisitedBeforeDepth: typeof value.roomsVisitedBeforeDepth === "number" ? value.roomsVisitedBeforeDepth : 0,
    roomsCompletedBeforeDepth: typeof value.roomsCompletedBeforeDepth === "number" ? value.roomsCompletedBeforeDepth : 0,
    dangerLevel: typeof value.dangerLevel === "number" ? value.dangerLevel : 1
  } as DungeonRun;
}

function normalizeCombat(value: unknown, run: DungeonRun): CombatState | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.encounterId !== "string") return undefined;
  if (typeof value.fromRoomId !== "string") return undefined;
  if (!run.roomGraph.some(room => room.id === value.fromRoomId)) return undefined;
  return {
    encounterId: value.encounterId,
    enemies: Array.isArray(value.enemies) ? value.enemies as CombatState["enemies"] : [],
    playerDefending: Boolean(value.playerDefending),
    turn: typeof value.turn === "number" ? value.turn : 1,
    log: Array.isArray(value.log) ? value.log as string[] : [],
    over: Boolean(value.over),
    outcome: value.outcome === "victory" || value.outcome === "defeat" || value.outcome === "fled"
      ? value.outcome
      : undefined,
    fromRoomId: value.fromRoomId
  };
}

function normalizeRunSummaries(value: unknown): RunSummary[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord) as unknown as RunSummary[];
}

function normalizeRunSummary(value: unknown): RunSummary | undefined {
  return isRecord(value) ? value as unknown as RunSummary : undefined;
}
