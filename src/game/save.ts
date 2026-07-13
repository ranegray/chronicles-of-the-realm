import type {
  GameState,
  Inventory,
  ItemInstance,
  RunSummary
} from "./types";
import { SAVE_VERSION, STORAGE_KEY } from "./constants";
import { createEmptyInventory } from "./inventory";
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
    runSummaries: [],
    pendingRunPreparations: [],
    settings: {
      onboardingComplete: false,
      textSpeed: "normal",
      audioMuted: false
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

/**
 * v5 (issue #38, "the demolition"): the old procedural dungeon-run engine
 * (activeRun/activeCombat and everything that shaped them — room graphs,
 * threat/strain, search/trap/event state, dungeon log) is gone. The Delve
 * (delveRun/delveRaidPack/delveMeta) is the only run layer now. Old saves
 * that still have activeRun/activeCombat simply have those fields dropped
 * on load — single-player, fresh-start-acceptable, no deeper migration
 * needed beyond "forget the old run ever existed."
 */
export function migrateSaveIfNeeded(state: unknown): GameState | null {
  if (!isRecord(state)) return null;

  const base = defaultGameState();
  const stash = normalizeInventory(state.stash);
  if (!stash) return null;

  const village = normalizeVillage(state.village);

  const normalized: GameState = {
    ...base,
    ...state,
    version: SAVE_VERSION,
    player: normalizeCharacter(state.player),
    stash,
    preparedInventory: normalizeInventory(state.preparedInventory) ?? createEmptyInventory(),
    village,
    runSummaries: normalizeRunSummaries(state.runSummaries),
    lastRunSummary: normalizeRunSummary(state.lastRunSummary),
    pendingRunPreparations: Array.isArray(state.pendingRunPreparations) ? state.pendingRunPreparations as GameState["pendingRunPreparations"] : [],
    settings: {
      ...base.settings,
      ...(isRecord(state.settings) ? state.settings : {})
    },
    delveRun: normalizeDelveRun(state.delveRun),
    delveRaidPack: normalizeInventory(state.delveRaidPack) ?? undefined,
    delveMeta: normalizeDelveMeta(state.delveMeta)
  } as GameState;
  const legacy = normalized as unknown as Record<string, unknown>;
  delete legacy.activeRun;
  delete legacy.activeCombat;
  delete legacy.completedRuns;

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

/**
 * The Delve (v0.5) is additive and optional on GameState; we don't deep-
 * validate its full shape (a heavily-nested pure-engine type) here — only
 * enough of a sanity check that a corrupt/foreign value can't wrongly route
 * the app to the delve screen on load. A malformed delve run is simply
 * dropped, same as any other unrecognized save fragment.
 */
function normalizeDelveRun(value: unknown): GameState["delveRun"] {
  if (!isRecord(value)) return undefined;
  if (typeof value.placeId !== "string") return undefined;
  if (typeof value.currentRoomId !== "string") return undefined;
  if (value.status !== "active" && value.status !== "extracted" && value.status !== "dead") return undefined;
  if (!Array.isArray(value.narrative)) return undefined;
  return value as unknown as GameState["delveRun"];
}

function normalizeDelveMeta(value: unknown): GameState["delveMeta"] {
  if (!isRecord(value)) return undefined;
  if (typeof value.startedAt !== "number") return undefined;
  return {
    startedAt: value.startedAt,
    xpGained: typeof value.xpGained === "number" ? value.xpGained : 0,
    keepsakeInstanceId: typeof value.keepsakeInstanceId === "string" ? value.keepsakeInstanceId : undefined,
    insuredInstanceId: typeof value.insuredInstanceId === "string" ? value.insuredInstanceId : undefined
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
    materialsExtracted: normalizeMaterialVault(value.materialsExtracted),
    materialsLost: normalizeMaterialVault(value.materialsLost),
    questRewards: Array.isArray(value.questRewards) ? value.questRewards.map(normalizeItem).filter(Boolean) : [],
    questItemsSaved: Array.isArray(value.questItemsSaved) ? value.questItemsSaved.map(normalizeItem).filter(Boolean) : [],
    keepsakeSaved: normalizeItem(value.keepsakeSaved),
    insuranceReturned: normalizeItem(value.insuranceReturned)
  } as RunSummary;
}
