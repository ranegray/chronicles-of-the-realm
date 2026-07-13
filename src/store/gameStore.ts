import { create } from "zustand";
import type {
  Character,
  DungeonRun,
  GameSettings,
  GameState,
  Inventory,
  ItemInstance,
  CharacterProgressionState,
  EquipmentChangePreview,
  EquipmentSlotName,
  ItemState,
  ItemStateId,
  Quest,
  RunSummary,
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
import { defaultGameState, loadGame, resetGame, saveGame } from "../game/save";
import { addItem, calculateInventoryWeight, createEmptyInventory, instanceFromTemplateId, removeItem } from "../game/inventory";
import { getConsumableHealFormula, rollConsumableHealAmount } from "../game/itemEffects";
import { getEnemy } from "../data/enemies";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";
import { applyExtractionRewards, applyXpAndLevel, resolveAbandonOutcome, resolveDeathOutcome, type DeathSummary, type ExtractionRewardSummary } from "../game/progression";
import { appendRunSummary, buildRunSummary } from "../game/runSummary";
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
import { createRng, randomSeed } from "../game/rng";
import { initializeVillageProgression, upgradeNpcService as upgradeNpcServiceBase } from "../game/villageProgression";
import { initializeQuestChainsForVillage, advanceQuestChainAfterQuestClaim } from "../game/questChains";
import { craftRecipe as craftRecipeBase } from "../game/crafting";
import { performServiceAction as performServiceActionBase } from "../game/services";
import {
  purchaseRunPreparation as purchaseRunPreparationBase,
  purchaseInsurance as purchaseInsuranceBase,
  cancelInsurance as cancelInsuranceBase,
  setKeepsake as setKeepsakeBase,
  clearKeepsake as clearKeepsakeBase
} from "../game/runPreparation";
import { applyQuestReward } from "../game/villageRewards";
import {
  awardCharacterXp,
  initializeCharacterProgression,
  refundTalents as refundTalentsBase
} from "../game/characterProgression";
import { learnTalent as learnTalentBase } from "../game/talents";
import { previewEquipmentChange as previewEquipmentChangeBase } from "../game/equipment";
import { addItemState, removeItemState } from "../game/itemStates";
import { playSfx, setAudioMuted } from "../game/audio";
import { createDelveRun, applyDelveAction } from "../game/delve/delveRun";
import type { DelveAction, DelveRunDeps, DelveRunState } from "../game/delve/types";

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

  // Village
  enterVillage: () => void;
  toggleQuestActive: (questId: string) => void;
  openMerchant: (npcId: string) => void;

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
  upgradeNpcService: (npcId: string) => void;
  craftRecipe: (recipeId: string) => void;
  performServiceAction: (
    npcId: string,
    actionId: import("../game/types").ServiceActionId,
    options?: {
      targetItemInstanceId?: string;
      recipeId?: string;
    }
  ) => void;
  purchaseRunPreparation: (npcId: string, optionId: string) => void;
  clearPendingRunPreparation: (preparedModifierId: string) => void;
  purchaseInsurance: (itemInstanceId: string) => void;
  cancelInsurance: () => void;
  setKeepsake: (itemInstanceId: string) => void;
  clearKeepsake: () => void;

  // The Delve (v0.5 run layer) — the only way to run a dungeon
  startDelveRun: (placeId: string) => void;
  performDelveAction: (action: DelveAction) => void;
  resolveDelveRunEnd: () => void;
  abandonDelveRun: () => void;

  // v0.4 integration wrappers
  awardXp: (xp: number) => void;
  learnTalent: (talentId: string) => void;
  refundTalents: () => void;
  setActiveCombatActions: (actionIds: string[]) => void;
  equipItem: (itemInstanceId: string, slot: EquipmentSlotName) => void;
  unequipItem: (slot: EquipmentSlotName) => void;
  previewEquipmentChange: (itemInstanceId: string, slot: EquipmentSlotName) => EquipmentChangePreview | undefined;
  repairDamagedItem: (itemInstanceId: string) => void;
  applyItemStateFromService: (itemInstanceId: string, stateId: ItemStateId) => void;

  // Dev tools
  debugGiveGold: () => void;
  debugHealPlayer: () => void;
  debugSpawnTestLoot: () => void;
  debugKillPlayer: () => void;
  debugCompleteQuest: () => void;
}

function persist(state: GameState) {
  saveGame(state);
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "mainMenu",
  state: defaultGameState(),
  draft: null,

  boot: () => {
    const loaded = loadGame();
    if (loaded) {
      setAudioMuted(loaded.settings.audioMuted);
      set({ state: loaded, screen: getScreenForLoadedState(loaded) });
    }
  },

  goToScreen: screen => set({ screen }),

  resetSave: () => {
    resetGame();
    setAudioMuted(false);
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
    const fresh = defaultGameState();
    setAudioMuted(fresh.settings.audioMuted);
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
    } else if (s.delveRun && s.delveRun.status === "active") {
      set({ screen: "delve" });
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
    if (partial.audioMuted !== undefined) setAudioMuted(partial.audioMuted);
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
    let village = initializeVillageProgression({ village: generateVillage(villageRng) });
    village = initializeQuestChainsForVillage({ village, rng: villageRng });
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
    next.stash = { ...next.stash, gold: next.stash.gold + 25, materials: next.stash.materials ?? {} };
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

  startDelveRun: placeId => {
    const s = get().state;
    if (!s.player) return;
    const raidPack = s.preparedInventory ?? createEmptyInventory();
    const delveRun = createDelveRun({
      placeId,
      seed: String(Date.now()),
      flasksPacked: raidPack.items
        .filter(i => i.tags?.includes("oilFlask"))
        .reduce((n, i) => n + i.quantity, 0)
    });
    const next: GameState = {
      ...s,
      delveRun,
      delveRaidPack: raidPack,
      preparedInventory: createEmptyInventory(),
      delveMeta: {
        startedAt: Date.now(),
        xpGained: 0,
        keepsakeInstanceId: resolveKeepsakeForRun(s, raidPack),
        insuredInstanceId: resolveInsuredForRun(s, s.player)
      },
      pendingKeepsakeInstanceId: undefined,
      pendingInsuredInstanceId: undefined
    };
    set({ state: next, screen: "delve" });
    persist(next);
  },

  performDelveAction: action => {
    const s = get().state;
    if (!s.delveRun || !s.player) return;
    const raidPack = s.delveRaidPack ?? createEmptyInventory();
    const deps: DelveRunDeps = {
      character: s.player,
      carriedItems: raidPack.items,
      carriedWeight: calculateInventoryWeight(raidPack),
      carryCapacity: s.player.derivedStats.carryCapacity
    };
    const result = applyDelveAction(s.delveRun, action, deps);

    let player = s.player;
    let pack = raidPack;
    let xpGained = s.delveMeta?.xpGained ?? 0;
    let terminal: "extracted" | "died" | undefined;

    for (const event of result.events) {
      switch (event.kind) {
        case "hpDelta": {
          player = { ...player, hp: Math.max(0, Math.min(player.maxHp, player.hp + event.amount)) };
          break;
        }
        case "itemsTaken": {
          for (const item of event.items) pack = addItem(pack, item);
          if (event.gold > 0) pack = { ...pack, gold: pack.gold + event.gold };
          break;
        }
        case "flaskConsumed": {
          pack = removeOneItemByTag(pack, "oilFlask");
          break;
        }
        case "itemConsumed": {
          pack = removeOneItemByTag(pack, event.tag);
          break;
        }
        case "enemyDefeated": {
          const def = tryGetEnemy(event.enemyId);
          if (def) {
            xpGained += def.xpReward;
            player = { ...player, xp: player.xp + def.xpReward };
          }
          break;
        }
        case "extracted": terminal = "extracted"; break;
        case "died": terminal = "died"; break;
        default: break;
      }
    }

    const nextMeta = { ...(s.delveMeta ?? { startedAt: Date.now(), xpGained: 0 }), xpGained };

    // Terminal statuses (extracted/died) are NOT resolved into the v0.4
    // run-summary flow here — the screen stays up long enough to show a
    // brief terminal narrative line first (Pillar 4), then calls
    // resolveDelveRunEnd() after a short pause. See that action below.
    let delveRun = result.state;
    if (terminal === "extracted") {
      delveRun = appendDelveNarrativeEntry(delveRun, "You come up into evening air.");
    } else if (terminal === "died") {
      delveRun = appendDelveNarrativeEntry(delveRun, "The dark closes over you. The Warrens keep what they took.");
    }

    const next: GameState = {
      ...s,
      player,
      delveRun,
      delveRaidPack: pack,
      delveMeta: nextMeta
    };
    set({ state: next });
    persist(next);
  },

  resolveDelveRunEnd: () => {
    const s = get().state;
    if (!s.delveRun || s.delveRun.status === "active") return;
    if (s.delveRun.status === "extracted") {
      finishDelveRunWithExtraction(get, set, s, s.delveRun);
    } else if (s.delveRun.status === "dead") {
      finishDelveRunWithDeath(get, set, s, s.delveRun);
    }
  },

  abandonDelveRun: () => {
    const s = get().state;
    if (!s.delveRun || !s.player) return;
    finishDelveRunAbandoned(get, set, s, s.delveRun);
  },

  useStashConsumable: itemInstanceId => {
    const s = get().state;
    if (!s.player) return;
    const item = s.stash.items.find(i => i.instanceId === itemInstanceId);
    if (!item) return;
    const healFormula = getConsumableHealFormula(item);
    if (!healFormula) {
      set({ lastVillageMessage: `${item.name} cannot be used here.` });
      return;
    }
    if (s.player.hp >= s.player.maxHp) {
      set({ lastVillageMessage: `${s.player.name} is already at full health.` });
      return;
    }
    const rng = createRng(`stashItem:${item.instanceId}:${Date.now()}`);
    const heal = rollConsumableHealAmount(item, rng);
    const player = { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + heal), wounded: undefined };
    const next: GameState = {
      ...s,
      player,
      stash: removeItem(s.stash, itemInstanceId, 1)
    };
    set({ state: next, lastVillageMessage: `${item.name} restored ${heal} HP.` });
    persist(next);
    playSfx("heal");
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
    playSfx("equip");
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
      stash: addItem(s.stash, item),
      pendingKeepsakeInstanceId: s.pendingKeepsakeInstanceId === itemInstanceId ? undefined : s.pendingKeepsakeInstanceId
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
    const reward = applyQuestReward({ gameState: s, questId, now: Date.now() });
    if (!reward.success) {
      set({ lastVillageMessage: reward.messages[0] ?? "Quest is not ready." });
      return;
    }
    const advanced = advanceQuestChainAfterQuestClaim({ gameState: reward.gameState, questId, now: Date.now() });
    const next: GameState = {
      ...advanced.gameState,
      player: advanced.gameState.player ? applyXpAndLevel(advanced.gameState.player) : advanced.gameState.player
    };
    const message = advanced.message ? `${reward.messages[0]} ${advanced.message}` : reward.messages[0];
    set({ state: next, lastVillageMessage: message });
    persist(next);
  },

  upgradeNpcService: npcId => {
    const result = upgradeNpcServiceBase({ gameState: get().state, npcId, now: Date.now() });
    set({ state: result.gameState, lastVillageMessage: result.message });
    persist(result.gameState);
  },

  craftRecipe: recipeId => {
    const result = craftRecipeBase({
      gameState: get().state,
      recipeId,
      rng: createRng(`craft:${recipeId}:${Date.now()}`),
      now: Date.now()
    });
    set({ state: result.gameState, lastVillageMessage: result.message });
    persist(result.gameState);
  },

  performServiceAction: (npcId, actionId, options) => {
    const result = performServiceActionBase({
      gameState: get().state,
      npcId,
      actionId,
      targetItemInstanceId: options?.targetItemInstanceId,
      recipeId: options?.recipeId,
      now: Date.now()
    });
    if (result.gameState) {
      set({ state: result.gameState, lastVillageMessage: result.message });
      persist(result.gameState);
    } else {
      set({ lastVillageMessage: result.message });
    }
  },

  purchaseRunPreparation: (npcId, optionId) => {
    const result = purchaseRunPreparationBase({ gameState: get().state, optionId, npcId, now: Date.now() });
    set({ state: result.gameState, lastVillageMessage: result.message });
    persist(result.gameState);
  },

  clearPendingRunPreparation: preparedModifierId => {
    const s = get().state;
    const next: GameState = {
      ...s,
      pendingRunPreparations: (s.pendingRunPreparations ?? []).filter(prep => prep.id !== preparedModifierId)
    };
    set({ state: next, lastVillageMessage: "Preparation cleared." });
    persist(next);
  },

  purchaseInsurance: itemInstanceId => {
    const result = purchaseInsuranceBase({ gameState: get().state, itemInstanceId });
    set({ state: result.gameState, lastVillageMessage: result.message });
    persist(result.gameState);
  },

  cancelInsurance: () => {
    const next = cancelInsuranceBase(get().state);
    set({ state: next, lastVillageMessage: "Insurance cancelled." });
    persist(next);
  },

  setKeepsake: itemInstanceId => {
    const result = setKeepsakeBase({ gameState: get().state, itemInstanceId });
    set({ state: result.gameState, lastVillageMessage: result.message });
    persist(result.gameState);
  },

  clearKeepsake: () => {
    const next = clearKeepsakeBase(get().state);
    set({ state: next, lastVillageMessage: "Keepsake cleared." });
    persist(next);
  },

  awardXp: xp => {
    const s = get().state;
    if (!s.player || xp <= 0) return;
    const result = awardCharacterXp({ character: s.player, xp });
    const player = recalculatePlayer(result.character);
    const next: GameState = { ...s, player };
    set({
      state: next,
      lastVillageMessage: result.talentPointsGained > 0
        ? `${player.name} gained ${xp} XP and ${result.talentPointsGained} talent point${result.talentPointsGained === 1 ? "" : "s"}.`
        : `${player.name} gained ${xp} XP.`
    });
    persist(next);
  },

  learnTalent: talentId => {
    const s = get().state;
    if (!s.player) return;
    const result = learnTalentBase({ character: s.player, talentId, village: s.village });
    if (!result.success) {
      set({ lastVillageMessage: result.message });
      return;
    }
    const player = recalculatePlayer(result.character);
    const next: GameState = { ...s, player };
    set({ state: next, lastVillageMessage: result.message });
    persist(next);
  },

  refundTalents: () => {
    const s = get().state;
    if (!s.player) return;
    const player = recalculatePlayer(refundTalentsBase({ character: s.player }));
    const next: GameState = { ...s, player };
    set({ state: next, lastVillageMessage: "Talents refunded." });
    persist(next);
  },

  setActiveCombatActions: actionIds => {
    const s = get().state;
    if (!s.player) return;
    const progression = initializeCharacterProgression({ character: s.player }).progression;
    const allowed = new Set(progression.activeCombatActionIds);
    for (const talentId of progression.learnedTalentIds) {
      const actionId = COMBAT_ACTION_BY_TALENT[talentId];
      if (actionId) allowed.add(actionId);
    }
    const nextProgression: CharacterProgressionState = {
      ...progression,
      activeCombatActionIds: actionIds.filter(id => allowed.has(id)).slice(0, 3)
    };
    const next: GameState = { ...s, player: { ...s.player, progression: nextProgression } as Character };
    set({ state: next, lastVillageMessage: "Combat actions updated." });
    persist(next);
  },

  equipItem: (itemInstanceId, slot) => {
    const s = get().state;
    if (s.preparedInventory.items.some(item => item.instanceId === itemInstanceId)) {
      equipPreparedItem(get, set, itemInstanceId, slot);
      return;
    }
    get().equipItemFromStash(itemInstanceId, slot);
  },

  unequipItem: slot => {
    get().unequipItemToStash(slot);
  },

  previewEquipmentChange: (itemInstanceId, slot) => {
    const s = get().state;
    if (!s.player) return undefined;
    const item = findItemInGameState(s, itemInstanceId);
    if (!item) return undefined;
    return previewEquipmentChangeBase({
      character: s.player,
      item,
      slot,
      ancestry: getAncestry(s.player.ancestryId),
      classDefinition: getClass(s.player.classId)
    });
  },

  repairDamagedItem: itemInstanceId => {
    const s = get().state;
    const next = mapItemEverywhere(s, itemInstanceId, item => removeItemState({ item, stateId: "damaged" }));
    set({ state: next, lastVillageMessage: "Damaged state repaired." });
    persist(next);
  },

  applyItemStateFromService: (itemInstanceId, stateId) => {
    const s = get().state;
    const state: ItemState = {
      id: stateId as ItemStateId,
      source: "serviceAction",
      appliedAt: Date.now()
    };
    const next = mapItemEverywhere(s, itemInstanceId, item => addItemState({ item, state }));
    set({ state: next, lastVillageMessage: `${formatTalentName(stateId)} applied to item.` });
    persist(next);
  },

  debugGiveGold: () => {
    const s = get().state;
    const next: GameState = { ...s, stash: { ...s.stash, gold: s.stash.gold + 100 } };
    set({ state: next, lastVillageMessage: "Dev: added 100 gold." });
    persist(next);
  },

  debugHealPlayer: () => {
    const s = get().state;
    if (!s.player) return;
    const player: Character = { ...s.player, hp: s.player.maxHp, wounded: undefined };
    const next: GameState = { ...s, player };
    set({ state: next, lastRoomMessage: "Dev: player healed.", lastVillageMessage: "Dev: player healed." });
    persist(next);
  },

  debugSpawnTestLoot: () => {
    const s = get().state;
    const rng = createRng(`debugLoot:${Date.now()}`);
    const item = instanceFromTemplateId("weapon_keen_dagger", rng, 1);
    const potion = instanceFromTemplateId("consumable_strong_draught", rng, 2);
    const gold = 25;
    if (s.delveRaidPack) {
      const pack = addItem(addItem({ ...s.delveRaidPack, gold: s.delveRaidPack.gold + gold }, item), potion);
      const next: GameState = { ...s, delveRaidPack: pack };
      set({ state: next, lastRoomMessage: "Dev: spawned test loot in the raid pack." });
      persist(next);
      return;
    }
    const stash = addItem(addItem({ ...s.stash, gold: s.stash.gold + gold }, item), potion);
    const next: GameState = { ...s, stash };
    set({ state: next, lastVillageMessage: "Dev: spawned test loot in the stash." });
    persist(next);
  },

  debugKillPlayer: () => {
    const s = get().state;
    if (!s.delveRun || !s.player) return;
    finishDelveRunWithDeath(get, set, s, s.delveRun);
  },

  debugCompleteQuest: () => {
    const s = get().state;
    if (!s.village) return;
    const quest = s.village.quests.find(q => q.status === "active") ??
      s.village.quests.find(q => q.status === "available");
    if (!quest) {
      set({ lastVillageMessage: "Dev: no open quest to complete." });
      return;
    }
    const quests = s.village.quests.map(q =>
      q.id === quest.id
        ? { ...q, status: "completed" as const, currentCount: q.requiredCount }
        : q
    );
    const next: GameState = { ...s, village: { ...s.village, quests } };
    set({ state: next, lastVillageMessage: `Dev: completed ${quest.title}.` });
    persist(next);
  }
}));

const COMBAT_ACTION_BY_TALENT: Record<string, string> = {
  "warrior-shield-bash": "shield-bash",
  "warrior-cleaving-strike": "cleaving-strike",
  "scout-slip-away": "slip-away",
  "scout-ambusher": "ambush-strike",
  "arcanist-cinder-bolt": "cinder-bolt",
  "arcanist-veil-tear": "veil-tear",
  "warden-hunters-mark": "hunters-mark",
  "warden-rooting-shot": "rooting-shot",
  "devout-field-prayer": "field-prayer",
  "devout-smite-the-hollow": "smite-the-hollow"
};

function findItemInGameState(state: GameState, itemInstanceId: string): ItemInstance | undefined {
  const equipped = state.player
    ? [state.player.equipped.weapon, state.player.equipped.offhand, state.player.equipped.armor, state.player.equipped.trinket1, state.player.equipped.trinket2]
    : [];
  return [
    ...state.stash.items,
    ...state.preparedInventory.items,
    ...(state.delveRaidPack?.items ?? []),
    ...(equipped.filter(Boolean) as ItemInstance[])
  ].find(item => item.instanceId === itemInstanceId);
}

function mapItemEverywhere(
  state: GameState,
  itemInstanceId: string,
  mapper: (item: ItemInstance) => ItemInstance
): GameState {
  const mapItems = (items: ItemInstance[]) => items.map(item => item.instanceId === itemInstanceId ? mapper(item) : item);
  const equipped = state.player ? { ...state.player.equipped } : undefined;
  if (equipped) {
    for (const slot of ["weapon", "offhand", "armor", "trinket1", "trinket2"] as const) {
      const item = equipped[slot];
      if (item?.instanceId === itemInstanceId) equipped[slot] = mapper(item);
    }
  }
  const player = state.player && equipped
    ? recalculatePlayer({ ...state.player, equipped })
    : state.player;
  return {
    ...state,
    player,
    stash: { ...state.stash, items: mapItems(state.stash.items) },
    preparedInventory: { ...state.preparedInventory, items: mapItems(state.preparedInventory.items) },
    delveRaidPack: state.delveRaidPack
      ? { ...state.delveRaidPack, items: mapItems(state.delveRaidPack.items) }
      : state.delveRaidPack
  };
}

function equipPreparedItem(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  itemInstanceId: string,
  slot: EquipmentSlotName
) {
  const s = get().state;
  if (!s.player) return;
  const item = s.preparedInventory.items.find(candidate => candidate.instanceId === itemInstanceId);
  if (!item) return;
  const oldItem = s.player.equipped[slot];
  let preparedInventory = removeItem(s.preparedInventory, itemInstanceId, item.quantity);
  if (oldItem) preparedInventory = addItem(preparedInventory, oldItem);
  const player = recalculatePlayer({
    ...s.player,
    equipped: { ...s.player.equipped, [slot]: item }
  });
  const next: GameState = { ...s, player, preparedInventory };
  set({ state: next, lastVillageMessage: `${item.name} equipped.` });
  persist(next);
}

function formatTalentName(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveKeepsakeForRun(state: GameState, raidInventory: Inventory): string | undefined {
  const instanceId = state.pendingKeepsakeInstanceId;
  if (!instanceId) return undefined;
  const item = raidInventory.items.find(i => i.instanceId === instanceId);
  return item && item.weight === 0 && item.quantity === 1 ? instanceId : undefined;
}

function resolveInsuredForRun(state: GameState, player: Character): string | undefined {
  const instanceId = state.pendingInsuredInstanceId;
  if (!instanceId) return undefined;
  const equipped = Object.values(player.equipped).filter(Boolean) as ItemInstance[];
  return equipped.some(item => item.instanceId === instanceId) ? instanceId : undefined;
}

function collectLoadoutSnapshot(player: Character): ItemInstance[] {
  const slots = player.equipped;
  return [slots.weapon, slots.offhand, slots.armor, slots.trinket1, slots.trinket2].filter(
    Boolean
  ) as ItemInstance[];
}

function getScreenForLoadedState(state: GameState): ScreenId {
  if (!state.player) return "mainMenu";
  if (state.delveRun?.status === "active") return "delve";
  return "village";
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

// ---------------------------------------------------------------------------
// The Delve (v0.5 run layer) — the pure engine in src/game/delve/ knows
// nothing about Character/Inventory/village progression, so the store bridges
// it to the existing v0.4 run-summary / death-cost / extraction-reward flows
// via a lightweight adapter object shaped like a (slimmed) DungeonRun. Those
// flows only ever read raidInventory, xpGained, loadoutSnapshot,
// keepsakeInstanceId, insuredInstanceId, and (on death) roomGraph/
// visitedRoomIds for the "how far from an extract" stat — all safe to fake
// or leave empty here.
//
// Quests and run preparations aren't wired into delve runs yet (that's the
// village-integration work in issue #38's follow-up), so activeQuestIds/
// questProgressAtStart are empty and roomGraph is always [] — which means
// runSummary's death-extraction-distance stat is permanently undefined for
// delve runs (see src/game/pathing.ts; it BFSes an empty graph). That's a
// known, accepted gap, not a bug — flagged in the cutover report.
// ---------------------------------------------------------------------------

function appendDelveNarrativeEntry(run: DelveRunState, text: string): DelveRunState {
  const entry = { id: `terminal_${run.actionCount}`, kind: "system" as const, text };
  return { ...run, narrative: [...run.narrative, entry] };
}

function removeOneItemByTag(inv: Inventory, tag: string): Inventory {
  const item = inv.items.find(i => i.tags?.includes(tag));
  if (!item) return inv;
  return removeItem(inv, item.instanceId, 1);
}

function tryGetEnemy(id: string) {
  try { return getEnemy(id); } catch { return undefined; }
}

function buildDelveRunAdapter(
  state: GameState,
  delveRun: DelveRunState,
  pack: Inventory,
  xpGained: number,
  status: "extracted" | "dead" | "abandoned"
): DungeonRun {
  const meta = state.delveMeta;
  return {
    runId: `delve:${delveRun.placeId}:${delveRun.seed}`,
    seed: delveRun.seed,
    biome: delveRun.placeId as DungeonRun["biome"],
    tier: delveRun.tier,
    status,
    startedAt: meta?.startedAt ?? Date.now(),
    currentRoomId: delveRun.currentRoomId,
    roomGraph: [],
    visitedRoomIds: delveRun.visitedRoomIds,
    raidInventory: pack,
    loadoutSnapshot: state.player ? collectLoadoutSnapshot(state.player) : [],
    activeQuestIds: [],
    questProgressAtStart: {},
    xpGained,
    roomsVisitedBeforeDepth: 0,
    roomsCompletedBeforeDepth: 0,
    keepsakeInstanceId: meta?.keepsakeInstanceId,
    insuredInstanceId: meta?.insuredInstanceId
  };
}

function clearDelveRunState(): Pick<GameState, "delveRun" | "delveRaidPack" | "delveMeta"> {
  return { delveRun: undefined, delveRaidPack: undefined, delveMeta: undefined };
}

function finishDelveRunWithExtraction(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  s: GameState,
  delveRun: DelveRunState
) {
  if (!s.player || !s.village) {
    const cleared: GameState = { ...s, ...clearDelveRunState() };
    set({ state: cleared, screen: "village" });
    persist(cleared);
    return;
  }
  const pack = s.delveRaidPack ?? createEmptyInventory();
  const xpGained = s.delveMeta?.xpGained ?? 0;
  const fakeRun = buildDelveRunAdapter(s, delveRun, pack, xpGained, "extracted");
  const rng = createRng(`delveExtract:${fakeRun.seed}`);
  const result = applyExtractionRewards({ player: s.player, village: s.village, stash: s.stash, run: fakeRun, rng });
  const leveledPlayer = applyXpAndLevel(result.player);
  const runSummary = buildRunSummary({
    run: fakeRun,
    village: result.village,
    reason: "extracted",
    reasonText: "You come up into evening air, the Warrens behind you.",
    extraction: result.summary
  });
  const finalState: GameState = {
    ...s,
    ...clearDelveRunState(),
    player: leveledPlayer,
    village: result.village,
    stash: result.stash,
    lastRunSummary: runSummary,
    runSummaries: appendRunSummary(s.runSummaries, runSummary)
  };
  set({ state: finalState, lastExtractionSummary: result.summary, lastDeathSummary: undefined, screen: "runSummary" });
  persist(finalState);
  playSfx("extract");
}

function finishDelveRunWithDeath(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  s: GameState,
  delveRun: DelveRunState
) {
  if (!s.player) return;
  const pack = s.delveRaidPack ?? createEmptyInventory();
  const xpGained = s.delveMeta?.xpGained ?? 0;
  const fakeRun = buildDelveRunAdapter(s, delveRun, pack, xpGained, "dead");
  const { player: recoveredPlayer, stash, summary } = resolveDeathOutcome({
    run: fakeRun,
    player: s.player,
    stash: s.stash
  });
  const runSummary = buildRunSummary({
    run: fakeRun,
    village: s.village,
    reason: "dead",
    reasonText: "The Warrens keep what they took. You do not come back up.",
    death: summary
  });
  const finalState: GameState = {
    ...s,
    ...clearDelveRunState(),
    player: recoveredPlayer,
    stash,
    lastRunSummary: runSummary,
    runSummaries: appendRunSummary(s.runSummaries, runSummary)
  };
  set({ state: finalState, lastDeathSummary: summary, lastExtractionSummary: undefined, screen: "runSummary" });
  persist(finalState);
  playSfx("death");
}

function finishDelveRunAbandoned(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  s: GameState,
  delveRun: DelveRunState
) {
  if (!s.player) return;
  const pack = s.delveRaidPack ?? createEmptyInventory();
  const xpGained = s.delveMeta?.xpGained ?? 0;
  const fakeRun = buildDelveRunAdapter(s, delveRun, pack, xpGained, "abandoned");
  const { player, stash, summary } = resolveAbandonOutcome({ run: fakeRun, player: s.player, stash: s.stash });
  const runSummary = buildRunSummary({
    run: fakeRun,
    village: s.village,
    reason: "abandoned",
    reasonText: "You cut the line and left the raid pack behind.",
    death: summary
  });
  const finalState: GameState = {
    ...s,
    ...clearDelveRunState(),
    player,
    stash,
    lastRunSummary: runSummary,
    runSummaries: appendRunSummary(s.runSummaries, runSummary)
  };
  set({ state: finalState, lastDeathSummary: summary, lastExtractionSummary: undefined, screen: "runSummary" });
  persist(finalState);
}
