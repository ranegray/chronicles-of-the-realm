import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "../store/gameStore";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { generateDungeonRun, getRoomById } from "../game/dungeonGenerator";
import { generateVillage } from "../game/npcGenerator";
import { startCombat } from "../game/combat";
import { createRng } from "../game/rng";
import { getEncounter } from "../data/encounters";
import type { Character, ClassId, DungeonRun, GameState, Quest } from "../game/types";

function buildCharacter(seed: string, classId: ClassId = "warrior"): Character {
  let d = createEmptyDraft(`char:${seed}`);
  d = CharacterCreationService.setName(d, "Hero");
  d = CharacterCreationService.selectAncestry(d, "human");
  d = CharacterCreationService.selectClass(d, classId);
  d = CharacterCreationService.rollAllAbilityScores(d);
  d = CharacterCreationService.autoAssignScoresForClass(d);
  d = CharacterCreationService.chooseStarterKit(d, "warrior_sword_shield");
  return CharacterCreationService.finalizeCharacter(d).character;
}

function runWithCombatRoom(seed: string): DungeonRun {
  for (let i = 0; i < 40; i++) {
    const run = generateDungeonRun({ seed: `${seed}:${i}`, biome: "crypt", tier: 1 });
    const room = run.roomGraph.find(r => r.type === "combat" && r.encounterId);
    if (room) return { ...run, currentRoomId: room.id };
  }
  throw new Error("no combat room in 40 seeded attempts");
}

// Synthetic "any material" quest so we can observe the itemRetrieved/materialCollected
// events firing on take rather than on combat victory.
function materialWatcherQuest(): Quest {
  return {
    id: "watcher-quest",
    title: "Watcher",
    description: "test",
    npcId: "npc-1",
    type: "extractMaterial",
    target: "any",
    requiredCount: 100,
    currentCount: 0,
    reward: {},
    status: "active"
  };
}

function primeCombatVictory(seed: string): { roomId: string } {
  const player = buildCharacter(seed);
  const run = runWithCombatRoom(seed);
  const room = getRoomById(run.roomGraph, run.currentRoomId)!;
  const village = generateVillage(createRng(`village:${seed}`));
  village.quests = [materialWatcherQuest()];

  const rng = createRng(`combat:${seed}`);
  const enc = getEncounter(room.encounterId!);
  const combat = { ...startCombat(enc, rng, room.id, run.tier), over: true, outcome: "victory" as const };

  const state: GameState = {
    ...useGameStore.getState().state,
    player,
    village,
    activeRun: run,
    activeCombat: combat
  };
  useGameStore.setState({ state, screen: "combat" });
  return { roomId: room.id };
}

// Combat item drops are chance-based (rollCombatDrops); loop seeds until a
// victory actually deposits at least one item into pendingLoot, so item-carry
// tests (capacity overflow, single-item take) have something to work with.
function setupCombatVictoryWithItemLoot(seedBase: string): { roomId: string } {
  for (let i = 0; i < 60; i++) {
    const { roomId } = primeCombatVictory(`${seedBase}:${i}`);
    useGameStore.getState().closeCombatVictory();
    const room = getRoomById(useGameStore.getState().state.activeRun!.roomGraph, roomId)!;
    if ((room.pendingLoot?.items.length ?? 0) > 0) {
      return { roomId };
    }
  }
  throw new Error(`no combat victory produced item loot in 60 attempts for ${seedBase}`);
}

describe("pending loot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("combat victory deposits loot into the room's pendingLoot pool, not the raid pack", () => {
    const { roomId } = primeCombatVictory("victory-1");
    useGameStore.getState().closeCombatVictory();
    const after = useGameStore.getState().state;
    const room = getRoomById(after.activeRun!.roomGraph, roomId)!;

    // Combat always rolls at least one material for a combat room.
    expect(Object.keys(room.pendingLoot?.materials ?? {}).length).toBeGreaterThan(0);
    expect(after.activeRun!.raidInventory.items.length).toBe(0);
    expect(after.activeRun!.raidInventory.materials).toEqual({});
    // Quest event should NOT have fired on deposit.
    expect(after.village!.quests[0]!.currentCount).toBe(0);
  });

  it("lootRoom (take all) respects carry capacity and leaves overflow in the pool", () => {
    const { roomId } = setupCombatVictoryWithItemLoot("takeall-1");
    // Shrink capacity to force overflow.
    const shrunk = useGameStore.getState().state;
    const tinyCapPlayer: Character = {
      ...shrunk.player!,
      derivedStats: { ...shrunk.player!.derivedStats, carryCapacity: -1 }
    };
    useGameStore.setState({ state: { ...shrunk, player: tinyCapPlayer } });

    useGameStore.getState().lootRoom();
    const after = useGameStore.getState().state;
    const room = getRoomById(after.activeRun!.roomGraph, roomId)!;

    expect(after.activeRun!.raidInventory.items.length).toBe(0);
    expect(room.pendingLoot?.items.length ?? 0).toBeGreaterThan(0);
    expect(room.completed).toBe(true);
  });

  it("lootRoom takes everything into the raid pack when capacity allows, firing quest events", () => {
    const { roomId } = setupCombatVictoryWithItemLoot("takeall-2");
    const before = useGameStore.getState().state;
    // Give ample capacity.
    const roomyPlayer: Character = {
      ...before.player!,
      derivedStats: { ...before.player!.derivedStats, carryCapacity: 100000 }
    };
    useGameStore.setState({ state: { ...before, player: roomyPlayer } });

    useGameStore.getState().lootRoom();
    const after = useGameStore.getState().state;
    const room = getRoomById(after.activeRun!.roomGraph, roomId)!;

    expect(room.pendingLoot?.items.length ?? 0).toBe(0);
    expect(after.activeRun!.raidInventory.items.length).toBeGreaterThan(0);
    expect(room.completed).toBe(true);
    // Per-item quest events fire on take, not on the earlier deposit.
    expect(after.village!.quests[0]!.currentCount).toBeGreaterThan(0);
  });

  it("takeItemFromRoom pulls a single item out of pendingLoot into the raid pack", () => {
    const { roomId } = setupCombatVictoryWithItemLoot("single-take-1");
    const state = useGameStore.getState().state;
    const room = getRoomById(state.activeRun!.roomGraph, roomId)!;
    const item = room.pendingLoot!.items[0]!;
    const roomyPlayer: Character = {
      ...state.player!,
      derivedStats: { ...state.player!.derivedStats, carryCapacity: 100000 }
    };
    useGameStore.setState({ state: { ...state, player: roomyPlayer } });

    useGameStore.getState().takeItemFromRoom(item);
    const after = useGameStore.getState().state;
    const afterRoom = getRoomById(after.activeRun!.roomGraph, roomId)!;

    expect(after.activeRun!.raidInventory.items.some(i => i.instanceId === item.instanceId)).toBe(true);
    expect(afterRoom.pendingLoot!.items.some(i => i.instanceId === item.instanceId)).toBe(false);
  });

  it("leaveRoomLoot clears pendingLoot and marks the room completed", () => {
    const { roomId } = primeCombatVictory("leave-1");
    useGameStore.getState().closeCombatVictory();
    const before = getRoomById(useGameStore.getState().state.activeRun!.roomGraph, roomId)!;
    expect(Object.keys(before.pendingLoot?.materials ?? {}).length).toBeGreaterThan(0);

    useGameStore.getState().leaveRoomLoot();
    const after = getRoomById(useGameStore.getState().state.activeRun!.roomGraph, roomId)!;

    expect(after.pendingLoot?.items ?? []).toEqual([]);
    expect(after.pendingLoot?.gold ?? 0).toBe(0);
    expect(Object.keys(after.pendingLoot?.materials ?? {}).length).toBe(0);
    expect(after.completed).toBe(true);
    expect(useGameStore.getState().state.activeRun!.raidInventory.items.length).toBe(0);
  });
});
