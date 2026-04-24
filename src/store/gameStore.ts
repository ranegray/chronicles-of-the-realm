import { create } from "zustand";
import type {
  Character,
  CombatState,
  DungeonRoom,
  DungeonRun,
  GameSettings,
  GameState,
  Inventory,
  ItemInstance,
  Quest,
  QuestEvent,
  ScreenId,
  VillageState
} from "../game/types";
import {
  CharacterCreationService,
  type CharacterDraft,
  createEmptyDraft
} from "../game/characterCreation";
import { generateVillage } from "../game/npcGenerator";
import { seedVillageQuests } from "../game/questGenerator";
import { applyQuestEventToList } from "../game/questGenerator";
import { generateDungeonRun, getRoomById } from "../game/dungeonGenerator";
import { defaultGameState, loadGame, resetGame, saveGame } from "../game/save";
import { addItem, calculateInventoryWeight, createEmptyInventory, instanceFromTemplateId, removeItem } from "../game/inventory";
import { getConsumableHealAmount } from "../game/itemEffects";
import { generateLootForRoomLootTableId, rollGold } from "../game/lootGenerator";
import { getLootTableForBiome } from "../data/lootTables";
import { getEncounter } from "../data/encounters";
import { getEnemy } from "../data/enemies";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";
import { startCombat as startCombatBase, resolvePlayerAction, type CombatAction } from "../game/combat";
import { applyAbandonPenalty, applyDeathPenalty, applyExtractionRewards, applyXpAndLevel, type DeathSummary, type ExtractionRewardSummary } from "../game/progression";
import { recalculateCharacterStats } from "../game/characterMath";
import {
  canMerchantUpgrade,
  getBuyPrice,
  getMerchantStock,
  getSellValue,
  getUpgradeCost,
  slotForItem,
  upgradeItem,
  type EquipmentSlotId
} from "../game/merchants";
import type { Rng } from "../game/rng";
import { createRng, randomSeed } from "../game/rng";

export interface GameStore {
  screen: ScreenId;
  state: GameState;
  draft: CharacterDraft | null;
  activeMerchantId?: string;
  lastExtractionSummary?: ExtractionRewardSummary;
  lastDeathSummary?: DeathSummary;
  lastRoomMessage?: string;
  lastVillageMessage?: string;

  // Boot
  boot: () => void;
  goToScreen: (screen: ScreenId) => void;
  resetSave: () => void;
  newGame: () => void;
  continueGame: () => void;

  // Settings
  setOnboardingComplete: () => void;
  updateSettings: (s: Partial<GameSettings>) => void;

  // Character creation
  startCharacterCreation: () => void;
  draftSelectAncestry: (id: Character["ancestryId"]) => void;
  draftSelectClass: (id: Character["classId"]) => void;
  draftSetName: (name: string) => void;
  draftRollScores: () => void;
  draftRerollScores: () => void;
  draftAutoAssign: () => void;
  draftSelectKit: (kitId: string) => void;
  finalizeCharacter: () => void;

  // Village / dungeon
  enterVillage: () => void;
  toggleQuestActive: (questId: string) => void;
  startDungeonRun: (questIds?: string[]) => void;
  abandonRun: () => void;
  openMerchant: (npcId: string) => void;

  // Dungeon actions
  moveToRoom: (roomId: string) => void;
  searchRoom: () => void;
  lootRoom: () => void;
  attemptExtract: () => void;
  descendDungeon: () => void;
  takeItemFromRoom: (item: ItemInstance) => void;

  // Combat
  engageCurrentRoomCombat: () => void;
  performCombatAction: (action: CombatAction) => void;
  closeCombatVictory: () => void;
  closeCombatFlee: () => void;

  // Inventory / village actions
  useStashConsumable: (itemInstanceId: string) => void;
  equipItemFromStash: (itemInstanceId: string, preferredSlot?: EquipmentSlotId) => void;
  unequipItemToStash: (slot: EquipmentSlotId) => void;
  packItemForRun: (itemInstanceId: string) => void;
  unpackPreparedItem: (itemInstanceId: string) => void;
  buyMerchantItem: (templateId: string) => void;
  sellStashItem: (itemInstanceId: string) => void;
  upgradeEquippedItem: (slot: EquipmentSlotId) => void;
  claimQuestReward: (questId: string) => void;
}

interface RoomScratch {
  loot?: ItemInstance[];
  goldFound?: number;
  searched?: boolean;
}

const roomScratch = new Map<string, RoomScratch>();

function persist(state: GameState) {
  saveGame(state);
}

function notifyQuestEvent(state: GameState, event: QuestEvent): GameState {
  if (!state.village) return state;
  const newQuests = applyQuestEventToList(state.village.quests, event);
  return { ...state, village: { ...state.village, quests: newQuests } };
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "mainMenu",
  state: defaultGameState(),
  draft: null,

  boot: () => {
    const loaded = loadGame();
    if (loaded) {
      set({ state: loaded });
    }
  },

  goToScreen: screen => set({ screen }),

  resetSave: () => {
    resetGame();
    roomScratch.clear();
    set({
      screen: "mainMenu",
      state: defaultGameState(),
      draft: null,
      activeMerchantId: undefined,
      lastDeathSummary: undefined,
      lastExtractionSummary: undefined,
      lastRoomMessage: undefined,
      lastVillageMessage: undefined
    });
  },

  newGame: () => {
    resetGame();
    roomScratch.clear();
    const fresh = defaultGameState();
    set({
      state: fresh,
      draft: null,
      activeMerchantId: undefined,
      lastDeathSummary: undefined,
      lastExtractionSummary: undefined,
      lastRoomMessage: undefined,
      lastVillageMessage: undefined
    });
    if (!fresh.settings.onboardingComplete) {
      set({ screen: "onboarding" });
    } else {
      get().startCharacterCreation();
    }
  },

  continueGame: () => {
    const s = get().state;
    if (!s.player) {
      get().startCharacterCreation();
    } else if (s.activeCombat && !s.activeCombat.over) {
      set({ screen: "combat" });
    } else if (s.activeRun && s.activeRun.status === "active") {
      set({ screen: "dungeon" });
    } else {
      set({ screen: "village" });
    }
  },

  setOnboardingComplete: () => {
    const next: GameState = {
      ...get().state,
      settings: { ...get().state.settings, onboardingComplete: true }
    };
    set({ state: next });
    persist(next);
  },

  updateSettings: partial => {
    const next: GameState = {
      ...get().state,
      settings: { ...get().state.settings, ...partial }
    };
    set({ state: next });
    persist(next);
  },

  startCharacterCreation: () => {
    set({ draft: createEmptyDraft(), screen: "characterCreation" });
  },

  draftSelectAncestry: id => {
    const d = get().draft;
    if (!d) return;
    set({ draft: CharacterCreationService.selectAncestry(d, id) });
  },

  draftSelectClass: id => {
    const d = get().draft;
    if (!d) return;
    set({ draft: CharacterCreationService.selectClass(d, id) });
  },

  draftSetName: name => {
    const d = get().draft;
    if (!d) return;
    set({ draft: CharacterCreationService.setName(d, name) });
  },

  draftRollScores: () => {
    const d = get().draft;
    if (!d) return;
    set({ draft: CharacterCreationService.rollAllAbilityScores(d) });
  },

  draftRerollScores: () => {
    const d = get().draft;
    if (!d) return;
    set({ draft: CharacterCreationService.rerollAllAbilityScores(d) });
  },

  draftAutoAssign: () => {
    const d = get().draft;
    if (!d) return;
    set({ draft: CharacterCreationService.autoAssignScoresForClass(d) });
  },

  draftSelectKit: kitId => {
    const d = get().draft;
    if (!d) return;
    set({ draft: CharacterCreationService.chooseStarterKit(d, kitId) });
  },

  finalizeCharacter: () => {
    const d = get().draft;
    if (!d) return;
    if (!CharacterCreationService.isReadyToFinalize(d)) return;

    const finalized = CharacterCreationService.finalizeCharacter(d);
    const villageRng = createRng(`village:${finalized.character.id}`);
    let village = generateVillage(villageRng);
    village = seedVillageQuests(village, villageRng);
    const equippedIds = new Set(Object.values(finalized.character.equipped).filter(Boolean).map(item => item!.instanceId));
    const starterStash = finalized.equipment.filter(item => !equippedIds.has(item.instanceId));
    let stash = get().state.stash.items.length === 0 ? createEmptyInventory() : get().state.stash;
    for (const item of starterStash) {
      stash = addItem(stash, item);
    }

    const next: GameState = {
      ...get().state,
      player: finalized.character,
      village,
      stash,
      preparedInventory: createEmptyInventory()
    };
    next.stash = { items: next.stash.items, gold: next.stash.gold + 25 };
    set({ state: next, draft: null, screen: "village" });
    persist(next);
  },

  enterVillage: () => set({ screen: "village" }),

  openMerchant: npcId => set({ activeMerchantId: npcId, screen: "merchant", lastVillageMessage: undefined }),

  toggleQuestActive: questId => {
    const s = get().state;
    if (!s.village) return;
    const newQuests: Quest[] = s.village.quests.map(q =>
      q.id === questId
        ? { ...q, status: q.status === "available" ? "active" : q.status === "active" ? "available" : q.status }
        : q
    );
    const next: GameState = { ...s, village: { ...s.village, quests: newQuests } };
    set({ state: next });
    persist(next);
  },

  startDungeonRun: questIds => {
    const s = get().state;
    if (!s.player) return;
    const seed = randomSeed();
    const activeIds: string[] = questIds ??
      (s.village?.quests.filter(q => q.status === "active").map(q => q.id) ?? []);

    const run = generateDungeonRun({ seed, activeQuestIds: activeIds });
    run.raidInventory = s.preparedInventory ?? createEmptyInventory();
    run.loadoutSnapshot = collectLoadoutSnapshot(s.player);
    roomScratch.clear();
    const next: GameState = { ...s, activeRun: run, preparedInventory: createEmptyInventory() };
    set({ state: next, screen: "dungeon", lastRoomMessage: `You enter the ${run.biome} (${run.seed}).` });
    persist(next);
  },

  abandonRun: () => {
    const s = get().state;
    if (!s.activeRun) return;
    const { run, summary } = applyAbandonPenalty(s.activeRun);
    const player = s.player ? { ...s.player, hp: s.player.maxHp, wounded: undefined } : s.player;
    const next: GameState = {
      ...s,
      player,
      activeRun: undefined,
      completedRuns: [...s.completedRuns, run]
    };
    set({ state: next, lastDeathSummary: summary, screen: "runSummary" });
    persist(next);
  },

  moveToRoom: roomId => {
    const s = get().state;
    const run = s.activeRun;
    if (!run) return;
    const current = getRoomById(run.roomGraph, run.currentRoomId);
    const target = getRoomById(run.roomGraph, roomId);
    if (!current || !target || !current.connectedRoomIds.includes(roomId)) return;

    const updatedRooms: DungeonRoom[] = run.roomGraph.map(r =>
      r.id === roomId ? { ...r, visited: true } : r
    );
    let next: GameState = {
      ...s,
      activeRun: {
        ...run,
        currentRoomId: roomId,
        roomGraph: updatedRooms,
        visitedRoomIds: run.visitedRoomIds.includes(roomId)
          ? run.visitedRoomIds
          : [...run.visitedRoomIds, roomId]
      }
    };

    next = notifyQuestEvent(next, {
      kind: "roomScouted",
      roomType: target.type,
      biome: target.biome
    });
    next = notifyQuestEvent(next, {
      kind: "depthReached",
      roomCount: next.activeRun!.visitedRoomIds.length,
      biome: target.biome
    });

    set({ state: next, lastRoomMessage: undefined });
    persist(next);

    if (target.type === "trap" && !target.completed) {
      resolveTrapRoom(get, set, roomId);
      return;
    }

    // Auto-trigger encounters on entering a combat room
    if ((target.type === "combat" || target.type === "boss" || target.type === "eliteCombat") && !target.completed) {
      maybeStartCombatForRoom(get, set, target);
    }
  },

  searchRoom: () => {
    const s = get().state;
    if (!s.activeRun) return;
    const run = s.activeRun;
    const room = getRoomById(run.roomGraph, run.currentRoomId);
    if (!room) return;
    const scratch = roomScratch.get(room.id) ?? {};
    if (scratch.searched) {
      set({ lastRoomMessage: "You have searched here already." });
      return;
    }
    const rng = createRng(`search:${run.seed}:${room.id}`);
    const items: ItemInstance[] = [];
    let gold = 0;
    if (room.lootTableId) {
      const count = room.type === "lockedChest" ? 2 : 1;
      items.push(...generateLootForRoomLootTableId(room.lootTableId, rng, count));
      gold = rollGold(rng, run.tier);
    } else if (room.type === "shrine") {
      gold = rollGold(rng, run.tier);
    }
    scratch.loot = items;
    scratch.goldFound = gold;
    scratch.searched = true;
    roomScratch.set(room.id, scratch);

    let next = s;
    if (room.type === "lockedChest") {
      next = notifyQuestEvent(next, { kind: "chestOpened", biome: room.biome });
    }
    set({
      state: next,
      lastRoomMessage:
        items.length === 0 && gold === 0
          ? "Nothing of worth in this room."
          : `Found ${items.length} item(s)${gold > 0 ? ` and ${gold} gold` : ""}.`
    });
  },

  lootRoom: () => {
    const s = get().state;
    if (!s.activeRun || !s.player) return;
    const run = s.activeRun;
    const room = getRoomById(run.roomGraph, run.currentRoomId);
    if (!room) return;
    const scratch = roomScratch.get(room.id);
    if (!scratch) {
      set({ lastRoomMessage: "Search the room first." });
      return;
    }
    const items = scratch.loot ?? [];
    const gold = scratch.goldFound ?? 0;
    let raid = run.raidInventory;
    const cap = s.player.derivedStats.carryCapacity;
    const remaining: ItemInstance[] = [];
    let next = s;
    for (const item of items) {
      const w = calculateInventoryWeight(raid) + item.weight * item.quantity;
      if (w <= cap) {
        raid = addItem(raid, item);
        next = notifyQuestEvent(next, { kind: "itemRetrieved", templateId: item.templateId, biome: room.biome });
        for (const tag of item.tags ?? []) {
          next = notifyQuestEvent(next, { kind: "materialCollected", tag, biome: room.biome });
        }
        if (item.tags?.includes("sign")) {
          next = notifyQuestEvent(next, { kind: "signFound", biome: room.biome });
        }
      } else {
        remaining.push(item);
      }
    }
    raid = { ...raid, gold: raid.gold + gold };
    scratch.loot = remaining;
    scratch.goldFound = 0;
    roomScratch.set(room.id, scratch);

    const updatedRooms = run.roomGraph.map(r =>
      r.id === room.id ? { ...r, completed: true } : r
    );
    next = {
      ...next,
      activeRun: { ...run, raidInventory: raid, roomGraph: updatedRooms }
    };
    set({
      state: next,
      lastRoomMessage:
        remaining.length > 0
          ? "You take what you can carry. Some loot is left behind."
          : "Loot taken into your raid pack."
    });
    persist(next);
  },

  takeItemFromRoom: (item: ItemInstance) => {
    const s = get().state;
    if (!s.activeRun || !s.player) return;
    const run = s.activeRun;
    const room = getRoomById(run.roomGraph, run.currentRoomId);
    if (!room) return;
    const scratch = roomScratch.get(room.id);
    if (!scratch || !scratch.loot) return;
    const remaining = scratch.loot.filter(i => i.instanceId !== item.instanceId);
    const cap = s.player.derivedStats.carryCapacity;
    const newWeight = calculateInventoryWeight(run.raidInventory) + item.weight * item.quantity;
    if (newWeight > cap) {
      set({ lastRoomMessage: "Too heavy to carry." });
      return;
    }
    let raid = addItem(run.raidInventory, item);
    let next: GameState = { ...s, activeRun: { ...run, raidInventory: raid } };
    next = notifyQuestEvent(next, { kind: "itemRetrieved", templateId: item.templateId, biome: room.biome });
    for (const tag of item.tags ?? []) {
      next = notifyQuestEvent(next, { kind: "materialCollected", tag, biome: room.biome });
    }
    if (item.tags?.includes("sign")) {
      next = notifyQuestEvent(next, { kind: "signFound", biome: room.biome });
    }
    scratch.loot = remaining;
    if (remaining.length === 0 && (scratch.goldFound ?? 0) === 0) {
      const updatedRooms = next.activeRun!.roomGraph.map(r =>
        r.id === room.id ? { ...r, completed: true } : r
      );
      next = { ...next, activeRun: { ...next.activeRun!, roomGraph: updatedRooms } };
    }
    set({ state: next, lastRoomMessage: `You pocket the ${item.name}.` });
    persist(next);
  },

  attemptExtract: () => {
    const s = get().state;
    if (!s.activeRun || !s.player || !s.village) return;
    const run = s.activeRun;
    const room = getRoomById(run.roomGraph, run.currentRoomId);
    if (!room || !room.extractionPoint) return;

    const rng = createRng(`extract:${run.seed}`);
    const result = applyExtractionRewards({
      player: s.player,
      village: s.village,
      stash: s.stash,
      run,
      rng
    });
    const finishedRun: DungeonRun = { ...run, status: "extracted", raidInventory: createEmptyInventory() };
    let leveledPlayer = applyXpAndLevel(result.player);

    const next: GameState = {
      ...s,
      player: leveledPlayer,
      village: result.village,
      stash: result.stash,
      activeRun: undefined,
      completedRuns: [...s.completedRuns, finishedRun]
    };
    set({ state: next, lastExtractionSummary: result.summary, screen: "runSummary" });
    persist(next);
  },

  descendDungeon: () => {
    const s = get().state;
    if (!s.activeRun || !s.player) return;
    const run = s.activeRun;
    const room = getRoomById(run.roomGraph, run.currentRoomId);
    if (!room || room.type !== "boss" || !room.completed) return;

    const nextTier = run.tier + 1;
    const nextSeed = `${run.seed}:depth:${nextTier}`;
    const nextRun = generateDungeonRun({
      seed: nextSeed,
      biome: run.biome,
      tier: nextTier,
      activeQuestIds: run.activeQuestIds
    });
    nextRun.raidInventory = run.raidInventory;
    nextRun.loadoutSnapshot = run.loadoutSnapshot;
    nextRun.dangerLevel = nextTier;
    roomScratch.clear();

    const next: GameState = {
      ...s,
      activeRun: nextRun
    };
    set({
      state: next,
      screen: "dungeon",
      lastRoomMessage: `You descend below the boss chamber. Depth ${nextTier} begins.`
    });
    persist(next);
  },

  engageCurrentRoomCombat: () => {
    const s = get().state;
    if (!s.activeRun || !s.player) return;
    const run = s.activeRun;
    const room = getRoomById(run.roomGraph, run.currentRoomId);
    if (!room || room.completed || !room.encounterId) return;
    if (!(room.type === "combat" || room.type === "boss" || room.type === "eliteCombat")) return;
    maybeStartCombatForRoom(get, set, room);
  },

  performCombatAction: action => {
    const s = get().state;
    const combat = s.activeCombat;
    if (!s.player || !combat) return;
    const rng = createRng(`combat:${s.activeRun?.seed ?? "x"}:${combat.encounterId}:${combat.turn}`);
    const result = resolvePlayerAction(combat, s.player, action, rng, s.activeRun?.raidInventory.items ?? []);
    let nextPlayer: Character = result.player;
    let nextRun = s.activeRun;

    // Remove consumed items
    if (result.consumedItems.length > 0) {
      const equipped = { ...nextPlayer.equipped };
      if (nextRun) {
        let raidInventory = nextRun.raidInventory;
        for (const id of result.consumedItems) {
          raidInventory = removeItem(raidInventory, id, 1);
        }
        nextRun = { ...nextRun, raidInventory };
      }
      for (const id of result.consumedItems) {
        for (const slot of ["weapon", "offhand", "armor", "trinket1", "trinket2"] as const) {
          const it = equipped[slot];
          if (it && it.instanceId === id) {
            const newQty = it.quantity - 1;
            if (newQty <= 0) {
              equipped[slot] = undefined;
            } else {
              equipped[slot] = { ...it, quantity: newQty };
            }
          }
        }
      }
      nextPlayer = { ...nextPlayer, equipped };
    }

    const nextState: GameState = { ...s, player: nextPlayer, activeRun: nextRun, activeCombat: result.combat };
    set({ state: nextState });
    persist(nextState);

    if (result.combat.over) {
      handleCombatOutcome(get, set);
    }
  },

  closeCombatVictory: () => {
    const s = get().state;
    const combat = s.activeCombat;
    if (!s.player || !combat || !s.activeRun) {
      const clearedState: GameState = { ...s, activeCombat: undefined };
      set({ state: clearedState, screen: "dungeon" });
      persist(clearedState);
      return;
    }
    const run = s.activeRun;
    const room = getRoomById(run.roomGraph, combat.fromRoomId);
    if (!room) {
      const clearedState: GameState = { ...s, activeCombat: undefined };
      set({ state: clearedState, screen: "dungeon" });
      persist(clearedState);
      return;
    }
    const updatedRooms = run.roomGraph.map(r =>
      r.id === room.id ? { ...r, completed: true } : r
    );
    let next: GameState = {
      ...s,
      activeCombat: undefined,
      activeRun: { ...run, roomGraph: updatedRooms }
    };
    // Generate room and enemy loot
    const rng = createRng(`combatLoot:${run.seed}:${room.id}`);
    const lootMessages: string[] = [];
    if (room.lootTableId) {
      const items = generateLootForRoomLootTableId(room.lootTableId, rng, 1);
      const cap = s.player.derivedStats.carryCapacity;
      let raid = next.activeRun!.raidInventory;
      for (const item of items) {
        const w = calculateInventoryWeight(raid) + item.weight * item.quantity;
        if (w <= cap) {
          raid = addItem(raid, item);
          lootMessages.push(item.name);
          next = notifyQuestEvent(next, { kind: "materialCollected", tag: item.tags?.[0] ?? "any", biome: room.biome });
        }
      }
      next = { ...next, activeRun: { ...next.activeRun!, raidInventory: raid } };
    }
    const enc = getEncounter(combat.encounterId);
    let xpGain = 0;
    for (const enemyId of enc.enemyIds) {
      const def = getEnemy(enemyId);
      xpGain += def.xpReward;
      next = notifyQuestEvent(next, { kind: "enemySlain", enemyId, biome: room.biome });
      if (room.type === "boss" || room.type === "eliteCombat") {
        next = notifyQuestEvent(next, { kind: "miniBossDefeated", biome: room.biome });
      }
    }
    const enemyDrops = rollCombatDrops(room, run, rng);
    if (enemyDrops.length > 0 && next.activeRun && next.player) {
      const cap = next.player.derivedStats.carryCapacity;
      let raid = next.activeRun.raidInventory;
      for (const item of enemyDrops) {
        const w = calculateInventoryWeight(raid) + item.weight * item.quantity;
        if (w <= cap) {
          raid = addItem(raid, item);
          lootMessages.push(item.name);
          next = notifyQuestEvent(next, { kind: "itemRetrieved", templateId: item.templateId, biome: room.biome });
          for (const tag of item.tags ?? []) {
            next = notifyQuestEvent(next, { kind: "materialCollected", tag, biome: room.biome });
          }
          if (item.tags?.includes("sign")) {
            next = notifyQuestEvent(next, { kind: "signFound", biome: room.biome });
          }
        } else {
          lootMessages.push(`${item.name} left behind`);
        }
      }
      next = { ...next, activeRun: { ...next.activeRun!, raidInventory: raid } };
    }
    if (next.player) {
      const xpd: Character = { ...next.player, xp: next.player.xp + xpGain };
      next = { ...next, player: xpd };
    }
    const lootText = lootMessages.length > 0 ? ` Found: ${lootMessages.join(", ")}.` : "";
    const descendText = room.type === "boss" ? " A stair descends beyond the chamber." : "";
    set({ state: next, screen: "dungeon", lastRoomMessage: `Victory! You gained ${xpGain} XP.${lootText}${descendText}` });
    persist(next);
  },

  closeCombatFlee: () => {
    const s = get().state;
    const next: GameState = { ...s, activeCombat: undefined };
    set({ state: next, screen: "dungeon", lastRoomMessage: "You broke away. The room is still dangerous." });
    persist(next);
  },

  useStashConsumable: itemInstanceId => {
    const s = get().state;
    if (!s.player) return;
    const item = s.stash.items.find(i => i.instanceId === itemInstanceId);
    if (!item) return;
    const heal = getConsumableHealAmount(item);
    if (heal <= 0) {
      set({ lastVillageMessage: `${item.name} cannot be used here.` });
      return;
    }
    if (s.player.hp >= s.player.maxHp) {
      set({ lastVillageMessage: `${s.player.name} is already at full health.` });
      return;
    }
    const player = { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + heal), wounded: undefined };
    const next: GameState = {
      ...s,
      player,
      stash: removeItem(s.stash, itemInstanceId, 1)
    };
    set({ state: next, lastVillageMessage: `${item.name} restored ${heal} HP.` });
    persist(next);
  },

  equipItemFromStash: (itemInstanceId, preferredSlot) => {
    const s = get().state;
    if (!s.player) return;
    const item = s.stash.items.find(i => i.instanceId === itemInstanceId);
    if (!item) return;
    let slot = preferredSlot ?? slotForItem(item);
    if (!slot) {
      set({ lastVillageMessage: `${item.name} cannot be equipped.` });
      return;
    }
    if (item.category === "trinket" && !preferredSlot) {
      slot = s.player.equipped.trinket1 ? "trinket2" : "trinket1";
    }
    if (item.category === "trinket" && slot !== "trinket1" && slot !== "trinket2") {
      set({ lastVillageMessage: `${item.name} needs a trinket slot.` });
      return;
    }

    const oldItem = s.player.equipped[slot];
    let stash = removeItem(s.stash, itemInstanceId, item.quantity);
    if (oldItem) stash = addItem(stash, oldItem);
    const player = recalculatePlayer({
      ...s.player,
      equipped: { ...s.player.equipped, [slot]: item }
    });
    const next: GameState = { ...s, player, stash };
    set({ state: next, lastVillageMessage: `${item.name} equipped.` });
    persist(next);
  },

  unequipItemToStash: slot => {
    const s = get().state;
    if (!s.player) return;
    const item = s.player.equipped[slot];
    if (!item) return;
    const equipped = { ...s.player.equipped, [slot]: undefined };
    const player = recalculatePlayer({ ...s.player, equipped });
    const next: GameState = {
      ...s,
      player,
      stash: addItem(s.stash, item)
    };
    set({ state: next, lastVillageMessage: `${item.name} moved to stash.` });
    persist(next);
  },

  packItemForRun: itemInstanceId => {
    const s = get().state;
    if (!s.player) return;
    const item = s.stash.items.find(i => i.instanceId === itemInstanceId);
    if (!item) return;
    const nextWeight = calculateInventoryWeight(s.preparedInventory) + item.weight * item.quantity;
    if (nextWeight > s.player.derivedStats.carryCapacity) {
      set({ lastVillageMessage: `${item.name} would overfill the raid pack.` });
      return;
    }
    const next: GameState = {
      ...s,
      stash: removeItem(s.stash, itemInstanceId, item.quantity),
      preparedInventory: addItem(s.preparedInventory, item)
    };
    set({ state: next, lastVillageMessage: `${item.name} packed for the next delve.` });
    persist(next);
  },

  unpackPreparedItem: itemInstanceId => {
    const s = get().state;
    const item = s.preparedInventory.items.find(i => i.instanceId === itemInstanceId);
    if (!item) return;
    const next: GameState = {
      ...s,
      preparedInventory: removeItem(s.preparedInventory, itemInstanceId, item.quantity),
      stash: addItem(s.stash, item)
    };
    set({ state: next, lastVillageMessage: `${item.name} returned to stash.` });
    persist(next);
  },

  buyMerchantItem: templateId => {
    const s = get().state;
    const merchant = getActiveMerchant(get());
    if (!merchant) return;
    const stock = getMerchantStock(merchant.role, merchant.serviceLevel);
    const template = stock.find(item => item.id === templateId);
    if (!template) return;
    const price = getBuyPrice(template, merchant.serviceLevel);
    if (s.stash.gold < price) {
      set({ lastVillageMessage: `Need ${price} gold for ${template.name}.` });
      return;
    }
    const item = instanceFromTemplateId(templateId, createRng(`buy:${merchant.id}:${templateId}:${Date.now()}`), 1);
    const next: GameState = {
      ...s,
      stash: addItem({ ...s.stash, gold: s.stash.gold - price }, item)
    };
    set({ state: next, lastVillageMessage: `Bought ${template.name} for ${price} gold.` });
    persist(next);
  },

  sellStashItem: itemInstanceId => {
    const s = get().state;
    if (!getActiveMerchant(get())) return;
    const item = s.stash.items.find(i => i.instanceId === itemInstanceId);
    if (!item) return;
    const value = getSellValue(item);
    const next: GameState = {
      ...s,
      stash: { ...removeItem(s.stash, itemInstanceId, item.quantity), gold: s.stash.gold + value }
    };
    set({ state: next, lastVillageMessage: `Sold ${item.name} for ${value} gold.` });
    persist(next);
  },

  upgradeEquippedItem: slot => {
    const s = get().state;
    if (!s.player) return;
    const merchant = getActiveMerchant(get());
    const item = s.player.equipped[slot];
    if (!merchant || !item || !canMerchantUpgrade(merchant.role, item)) return;
    if ((item.upgradeLevel ?? 0) >= merchant.serviceLevel) {
      set({ lastVillageMessage: `${merchant.name} cannot improve ${item.name} further yet.` });
      return;
    }
    const cost = getUpgradeCost(item);
    if (s.stash.gold < cost) {
      set({ lastVillageMessage: `Need ${cost} gold to upgrade ${item.name}.` });
      return;
    }
    const upgraded = upgradeItem(item);
    const player = recalculatePlayer({
      ...s.player,
      equipped: { ...s.player.equipped, [slot]: upgraded }
    });
    const next: GameState = {
      ...s,
      player,
      stash: { ...s.stash, gold: s.stash.gold - cost }
    };
    set({ state: next, lastVillageMessage: `${upgraded.name} upgraded for ${cost} gold.` });
    persist(next);
  },

  claimQuestReward: questId => {
    const s = get().state;
    if (!s.player || !s.village) return;
    const quest = s.village.quests.find(q => q.id === questId);
    if (!quest || quest.status !== "completed") return;
    let stash = { ...s.stash, gold: s.stash.gold + (quest.reward.gold ?? 0) };
    const rng = createRng(`questReward:${quest.id}`);
    for (const templateId of quest.reward.itemTemplateIds ?? []) {
      stash = addItem(stash, instanceFromTemplateId(templateId, rng, 1));
    }
    let village: VillageState = {
      ...s.village,
      npcs: s.village.npcs.map(npc =>
        npc.id === quest.npcId && quest.reward.relationshipGain
          ? { ...npc, relationship: npc.relationship + quest.reward.relationshipGain }
          : { ...npc }
      ),
      quests: s.village.quests.map(q => q.id === questId ? { ...q, status: "claimed" } : q)
    };
    if (quest.unlockEffect) {
      const effect = quest.unlockEffect;
      village = {
        ...village,
        unlockFlags: effect.unlockFlag
          ? { ...village.unlockFlags, [effect.unlockFlag]: true }
          : village.unlockFlags,
        npcs: village.npcs.map(npc =>
          effect.role && npc.role === effect.role && effect.serviceLevelIncrease
            ? { ...npc, serviceLevel: npc.serviceLevel + effect.serviceLevelIncrease! }
            : npc
        )
      };
    }
    const playerWithXp = applyXpAndLevel({ ...s.player, xp: s.player.xp + (quest.reward.xp ?? 0) });
    const next: GameState = { ...s, player: playerWithXp, village, stash };
    set({ state: next, lastVillageMessage: `${quest.title} turned in.` });
    persist(next);
  }
}));

function collectLoadoutSnapshot(player: Character): ItemInstance[] {
  const slots = player.equipped;
  return [slots.weapon, slots.offhand, slots.armor, slots.trinket1, slots.trinket2].filter(
    Boolean
  ) as ItemInstance[];
}

function getActiveMerchant(store: GameStore) {
  const id = store.activeMerchantId;
  return store.state.village?.npcs.find(npc => npc.id === id);
}

function recalculatePlayer(character: Character): Character {
  return recalculateCharacterStats(
    character,
    getAncestry(character.ancestryId),
    getClass(character.classId)
  );
}

function recoverPlayerAfterDeath(player: Character, summary: DeathSummary): Character {
  const lostIds = new Set(summary.itemsLost.map(item => item.instanceId));
  const equipped = { ...player.equipped };
  for (const slot of ["weapon", "offhand", "armor", "trinket1", "trinket2"] as const) {
    const item = equipped[slot];
    if (item && lostIds.has(item.instanceId)) {
      equipped[slot] = undefined;
    }
  }
  const recalculated = recalculatePlayer({ ...player, equipped, wounded: undefined });
  return { ...recalculated, hp: recalculated.maxHp, wounded: undefined };
}

function rollCombatDrops(room: DungeonRoom, run: DungeonRun, rng: Rng): ItemInstance[] {
  const dropChance =
    room.type === "boss" ? 1 :
    room.type === "eliteCombat" ? 0.7 :
    room.type === "combat" ? 0.4 :
    0.2;

  if (rng.nextFloat() > dropChance) return [];
  const itemCount = room.type === "boss" ? 2 : 1;
  const lootTable = getLootTableForBiome(room.biome, run.tier);
  return generateLootForRoomLootTableId(lootTable.id, rng, itemCount);
}

function finishRunWithDeath(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  run: DungeonRun,
  player: Character
) {
  const s = get().state;
  const { run: deadRun, summary } = applyDeathPenalty(run);
  const recoveredPlayer = recoverPlayerAfterDeath(player, summary);
  const next: GameState = {
    ...s,
    player: recoveredPlayer,
    activeRun: undefined,
    activeCombat: undefined,
    completedRuns: [...s.completedRuns, deadRun]
  };
  set({ state: next, lastDeathSummary: summary, screen: "runSummary" });
  persist(next);
}

function resolveTrapRoom(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  roomId: string
) {
  const s = get().state;
  const run = s.activeRun;
  const player = s.player;
  if (!run || !player) return;
  const room = getRoomById(run.roomGraph, roomId);
  if (!room || room.type !== "trap" || room.completed) return;

  const rng = createRng(`trap:${run.seed}:${room.id}`);
  const roll = rng.nextInt(1, 20);
  const total = roll + player.derivedStats.trapSense;
  const dc = 13 + run.tier + room.dangerRating;
  let damage = 0;
  let message = "";

  if (total >= dc + 4) {
    message = `${room.trapId ?? "The trap"} is spotted and disarmed before it bites.`;
  } else if (total >= dc) {
    damage = rng.nextInt(2, 5) + run.tier;
    message = `${room.trapId ?? "The trap"} grazes you for ${damage} damage.`;
  } else {
    damage = rng.nextInt(6, 10) + run.tier + room.dangerRating;
    message = `${room.trapId ?? "The trap"} catches you cleanly for ${damage} damage.`;
  }

  const nextPlayer: Character = {
    ...player,
    hp: Math.max(0, player.hp - damage)
  };
  const updatedRun: DungeonRun = {
    ...run,
    roomGraph: run.roomGraph.map(r =>
      r.id === room.id ? { ...r, completed: true } : r
    )
  };

  if (nextPlayer.hp <= 0) {
    finishRunWithDeath(get, set, updatedRun, nextPlayer);
    return;
  }

  const next: GameState = {
    ...s,
    player: nextPlayer,
    activeRun: updatedRun
  };
  set({ state: next, lastRoomMessage: `${message} Roll ${roll} + Trap Sense ${player.derivedStats.trapSense} vs ${dc}.` });
  persist(next);
}

function maybeStartCombatForRoom(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  room: DungeonRoom
) {
  if (!room.encounterId) return;
  const enc = getEncounter(room.encounterId);
  const rng = createRng(`enc:${room.id}:${Date.now()}`);
  const combat = startCombatBase(enc, rng, room.id);
  const next: GameState = { ...get().state, activeCombat: combat };
  set({ state: next, screen: "combat" });
  saveGame(next);
}

function handleCombatOutcome(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void
) {
  const s = get().state;
  const combat = s.activeCombat;
  if (!combat || !s.player) return;
  if (combat.outcome === "victory") {
    // Stay on combat screen so player sees log; user clicks "Continue"
    return;
  }
  if (combat.outcome === "defeat") {
    if (!s.activeRun) return;
    finishRunWithDeath(get, set, s.activeRun, s.player);
  }
  // "fled" keeps activeCombat in state until user clicks close; that flow clears it.
}
