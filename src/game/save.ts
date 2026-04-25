import type {
  CombatState,
  DungeonLogEntry,
  DungeonRoom,
  DungeonRun,
  ExtractionPoint,
  ExtractionState,
  ExtractionVariant,
  GameState,
  Inventory,
  ItemInstance,
  RoomSearchState,
  RunSummary,
  ScoutedRoomInfo,
  ThreatState
} from "./types";
import { SAVE_VERSION, STORAGE_KEY, THREAT_RULES } from "./constants";
import { createEmptyInventory } from "./inventory";
import { createInitialThreatState, getThreatLevelFromPoints } from "./threat";
import { createDefaultSearchState } from "./dungeonGenerator";
import { normalizeMaterialVault } from "./materials";
import { initializeVillageProgression } from "./villageProgression";
import { initializeQuestChainsForVillage } from "./questChains";
import { createRng } from "./rng";
import { initializeCharacterProgression } from "./characterProgression";

export function defaultGameState(): GameState {
  return {
    version: SAVE_VERSION,
    stash: createEmptyInventory(),
    preparedInventory: createEmptyInventory(),
    completedRuns: [],
    runSummaries: [],
    pendingRunPreparations: [],
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
  const village = normalizeVillage(state.village);

  const normalized: GameState = {
    ...base,
    ...state,
    version: SAVE_VERSION,
    player: normalizeCharacter(state.player),
    stash,
    preparedInventory: normalizeInventory(state.preparedInventory) ?? createEmptyInventory(),
    village,
    completedRuns,
    runSummaries: normalizeRunSummaries(state.runSummaries),
    lastRunSummary: normalizeRunSummary(state.lastRunSummary),
    activeRun,
    activeCombat,
    pendingRunPreparations: Array.isArray(state.pendingRunPreparations) ? state.pendingRunPreparations as GameState["pendingRunPreparations"] : [],
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
    items: Array.isArray(value.items) ? value.items.map(normalizeItem).filter(Boolean) as Inventory["items"] : [],
    gold: typeof value.gold === "number" && Number.isFinite(value.gold) ? value.gold : 0,
    materials: normalizeMaterialVault(value.materials)
  };
}

function normalizeCharacter(value: unknown): GameState["player"] {
  if (!isRecord(value)) return undefined;
  const character = value as unknown as GameState["player"];
  if (!character) return undefined;
  const equipped = isRecord(value.equipped)
    ? {
        weapon: normalizeItem(value.equipped.weapon),
        offhand: normalizeItem(value.equipped.offhand),
        armor: normalizeItem(value.equipped.armor),
        trinket1: normalizeItem(value.equipped.trinket1),
        trinket2: normalizeItem(value.equipped.trinket2)
      }
    : {};
  return initializeCharacterProgression({
    character: {
      ...character,
      equipped
    }
  });
}

function normalizeItem(value: unknown): ItemInstance | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.instanceId !== "string" || typeof value.templateId !== "string") return undefined;
  const item = value as unknown as ItemInstance;
  const states = Array.isArray(item.states) ? [...item.states] : [];
  if (item.protected && !states.some(state => state.id === "protected")) {
    states.push({ id: "protected", source: "debug", appliedAt: 0 });
  }
  return {
    ...item,
    affixes: Array.isArray(item.affixes) ? item.affixes : [],
    states,
    tags: Array.isArray(item.tags) ? item.tags : []
  };
}

function normalizeVillage(value: unknown): GameState["village"] {
  if (!isRecord(value)) return undefined;
  const npcs = Array.isArray(value.npcs) ? value.npcs as NonNullable<GameState["village"]>["npcs"] : [];
  const quests = Array.isArray(value.quests) ? value.quests as NonNullable<GameState["village"]>["quests"] : [];
  let village = initializeVillageProgression({
    village: {
      name: typeof value.name === "string" ? value.name : "Hearthglen",
      npcs,
      quests,
      questChains: Array.isArray(value.questChains) ? value.questChains as NonNullable<GameState["village"]>["questChains"] : [],
      unlockFlags: isRecord(value.unlockFlags) ? value.unlockFlags as Record<string, boolean> : {},
      renown: typeof value.renown === "number" ? value.renown : 0,
      completedUpgradeIds: Array.isArray(value.completedUpgradeIds) ? value.completedUpgradeIds as string[] : [],
      discoveredRecipeIds: Array.isArray(value.discoveredRecipeIds) ? value.discoveredRecipeIds as string[] : [],
      completedRunPreparationIds: Array.isArray(value.completedRunPreparationIds) ? value.completedRunPreparationIds as string[] : []
    }
  });
  if (village.npcs.length > 0 && village.questChains.length === 0) {
    village = initializeQuestChainsForVillage({ village, rng: createRng(`migrate-chains:${village.name}`) });
  }
  return village;
}

function normalizeRun(value: unknown): DungeonRun | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.runId !== "string") return undefined;
  if (typeof value.seed !== "string") return undefined;
  if (!Array.isArray(value.roomGraph) || value.roomGraph.length === 0) return undefined;
  if (typeof value.currentRoomId !== "string") return undefined;
  if (!value.roomGraph.some(room => isRecord(room) && room.id === value.currentRoomId)) return undefined;

  const roomGraph = value.roomGraph.map(room => normalizeRoom(room)).filter(Boolean) as DungeonRoom[];

  return {
    ...value,
    roomGraph,
    generatorVersion: typeof value.generatorVersion === "number" ? value.generatorVersion : 1,
    status: value.status === "extracted" || value.status === "dead" || value.status === "abandoned"
      ? value.status
      : "active",
    startedAt: typeof value.startedAt === "number" ? value.startedAt : Date.now(),
    visitedRoomIds: Array.isArray(value.visitedRoomIds) ? value.visitedRoomIds as string[] : [value.currentRoomId],
    raidInventory: normalizeInventory(value.raidInventory) ?? createEmptyInventory(),
    loadoutSnapshot: Array.isArray(value.loadoutSnapshot) ? value.loadoutSnapshot.map(normalizeItem).filter(Boolean) as DungeonRun["loadoutSnapshot"] : [],
    activeQuestIds: Array.isArray(value.activeQuestIds) ? value.activeQuestIds as string[] : [],
    questProgressAtStart: isRecord(value.questProgressAtStart) ? value.questProgressAtStart as Record<string, number> : {},
    xpGained: typeof value.xpGained === "number" ? value.xpGained : 0,
    roomsVisitedBeforeDepth: typeof value.roomsVisitedBeforeDepth === "number" ? value.roomsVisitedBeforeDepth : 0,
    roomsCompletedBeforeDepth: typeof value.roomsCompletedBeforeDepth === "number" ? value.roomsCompletedBeforeDepth : 0,
    dangerLevel: typeof value.dangerLevel === "number" ? value.dangerLevel : 1,
    threat: normalizeThreatState(value.threat),
    knownRoomIntel: normalizeKnownRoomIntel(value.knownRoomIntel),
    dungeonLog: normalizeDungeonLog(value.dungeonLog),
    appliedRunPreparations: Array.isArray(value.appliedRunPreparations) ? value.appliedRunPreparations as DungeonRun["appliedRunPreparations"] : []
  } as DungeonRun;
}

function normalizeRoom(value: unknown): DungeonRoom | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.id !== "string") return undefined;

  const partial = value as Partial<DungeonRoom>;
  return {
    ...(value as unknown as DungeonRoom),
    searchState: normalizeSearchState(value.searchState),
    extraction: normalizeExtraction(value.extraction, partial)
  };
}

function normalizeSearchState(value: unknown): RoomSearchState {
  if (!isRecord(value)) return createDefaultSearchState();
  return {
    searched: Boolean(value.searched),
    searchCount: typeof value.searchCount === "number" ? value.searchCount : 0,
    hiddenLootClaimed: Boolean(value.hiddenLootClaimed),
    trapChecked: Boolean(value.trapChecked),
    eventRevealed: Boolean(value.eventRevealed)
  };
}

function normalizeThreatState(value: unknown): ThreatState {
  if (!isRecord(value)) return createInitialThreatState();
  const points = typeof value.points === "number" ? Math.max(0, value.points) : 0;
  const maxLevel = typeof value.maxLevel === "number"
    ? value.maxLevel
    : THREAT_RULES.maxLevel;
  const level = getThreatLevelFromPoints(points);
  return {
    points,
    level,
    maxLevel: maxLevel as ThreatState["maxLevel"],
    lastChangedAt: typeof value.lastChangedAt === "number" ? value.lastChangedAt : Date.now(),
    changes: Array.isArray(value.changes) ? value.changes as ThreatState["changes"] : []
  };
}

function normalizeKnownRoomIntel(value: unknown): Record<string, ScoutedRoomInfo> {
  if (!isRecord(value)) return {};
  const out: Record<string, ScoutedRoomInfo> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isRecord(entry) && typeof entry.roomId === "string") {
      out[key] = entry as unknown as ScoutedRoomInfo;
    }
  }
  return out;
}

function normalizeDungeonLog(value: unknown): DungeonLogEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(entry =>
    isRecord(entry) && typeof entry.id === "string" && typeof entry.message === "string"
  ) as unknown as DungeonLogEntry[];
}

function normalizeExtraction(
  value: unknown,
  room: Partial<DungeonRoom>
): ExtractionPoint | undefined {
  if (isRecord(value) && typeof value.id === "string" && typeof value.variant === "string") {
    return value as unknown as ExtractionPoint;
  }
  if (room.extractionPoint) {
    return legacyStableExtraction();
  }
  return undefined;
}

function legacyStableExtraction(): ExtractionPoint {
  return {
    id: "legacy-stable-extraction",
    variant: "stable" as ExtractionVariant,
    state: "available" as ExtractionState,
    title: "Clear Way Out",
    description: "A safe route leads back to the surface.",
    activationText: "You leave the dungeon with your spoils.",
    successText: "You escaped."
  };
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
    fromRoomId: value.fromRoomId,
    actionRuntimeState: Array.isArray(value.actionRuntimeState) ? value.actionRuntimeState as CombatState["actionRuntimeState"] : []
  };
}

function normalizeRunSummaries(value: unknown): RunSummary[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeRunSummary).filter(Boolean) as RunSummary[];
}

function normalizeRunSummary(value: unknown): RunSummary | undefined {
  if (!isRecord(value)) return undefined;
  return {
    ...value,
    lootExtracted: Array.isArray(value.lootExtracted) ? value.lootExtracted.map(normalizeItem).filter(Boolean) : [],
    lootLost: Array.isArray(value.lootLost) ? value.lootLost.map(normalizeItem).filter(Boolean) : [],
    gearLost: Array.isArray(value.gearLost) ? value.gearLost.map(normalizeItem).filter(Boolean) : [],
    questRewards: Array.isArray(value.questRewards) ? value.questRewards.map(normalizeItem).filter(Boolean) : []
  } as RunSummary;
}
