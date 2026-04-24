import type {
  Character,
  DungeonRoom,
  DungeonRun,
  ItemInstance,
  SearchResult,
  SearchResultType
} from "./types";
import { SEARCH_RULES } from "./constants";
import { getModifier } from "./characterMath";
import { applyThreatChange, getThreatModifiers, shouldTriggerAmbush } from "./threat";
import { addDungeonLogEntry } from "./dungeonLog";
import { detectTrap, triggerTrap } from "./traps";
import { getLootTableForBiome } from "../data/lootTables";
import { generateLootForRoomLootTableId, generateMaterialLoot } from "./lootGenerator";
import { addItem, calculateInventoryWeight } from "./inventory";
import { addMaterials } from "./materials";
import type { Rng } from "./rng";
import { createRng } from "./rng";

export function canSearchRoom(room: DungeonRoom): { canSearch: boolean; reason?: string } {
  const state = room.searchState;
  if (state && state.searchCount >= SEARCH_RULES.maxSearchesPerRoom) {
    return { canSearch: false, reason: "You have searched this room as thoroughly as you can." };
  }
  return { canSearch: true };
}

export function searchCurrentRoom(params: {
  run: DungeonRun;
  character: Character;
  rng?: Rng;
  now?: number;
}): {
  run: DungeonRun;
  character: Character;
  result: SearchResult;
} {
  const { character } = params;
  const now = params.now ?? Date.now();
  let run = params.run;
  let nextCharacter = character;

  const room = run.roomGraph.find(r => r.id === run.currentRoomId);
  if (!room) {
    return { run, character: nextCharacter, result: { type: "nothing", message: "You are nowhere." } };
  }

  const gate = canSearchRoom(room);
  if (!gate.canSearch) {
    return {
      run,
      character: nextCharacter,
      result: { type: "nothing", message: gate.reason ?? "This room has nothing left." }
    };
  }

  const currentCount = room.searchState?.searchCount ?? 0;
  const rng = params.rng ?? createRng(`search:${run.seed}:${room.id}:${currentCount}`);

  // Increase threat by a tier-based amount
  const threatAmount = currentCount === 0
    ? SEARCH_RULES.baseSearchThreatIncrease
    : SEARCH_RULES.repeatSearchThreatIncrease;
  run = applyThreat(run, threatAmount, room.id, now);

  // Bump search count + mark searched
  run = updateRoomSearchState(run, room.id, prev => ({
    searched: true,
    searchCount: prev.searchCount + 1,
    hiddenLootClaimed: prev.hiddenLootClaimed,
    trapChecked: prev.trapChecked,
    eventRevealed: prev.eventRevealed
  }));

  // Trap detection path
  if (room.activeTrap && !room.activeTrap.detected && !room.activeTrap.triggered && !room.activeTrap.disarmed) {
    const detection = detectTrap({ run, character: nextCharacter, trap: room.activeTrap, rng });
    if (detection.detected) {
      run = updateRoomTrap(run, room.id, trap => ({ ...trap, detected: true }));
      run = addDungeonLogEntry({
        run, type: "trap", now, roomId: room.id,
        message: detection.message
      });
      run = updateRoomSearchState(run, room.id, prev => ({ ...prev, trapChecked: true }));
      return {
        run,
        character: nextCharacter,
        result: {
          type: "trapDetected",
          message: detection.message,
          trapResult: detection
        }
      };
    }
    // Detection failed — maybe trigger
    run = addDungeonLogEntry({
      run, type: "trap", now, roomId: room.id,
      message: detection.message
    });
    // Apply failed-detection threat penalty
    const template = room.activeTrap;
    void template;
    run = applyThreat(run, SEARCH_RULES.trapDetectionBaseDifficulty > 0 ? 0 : 0, room.id, now);
    // Trigger chance scales with threat level.
    const triggerChance = 0.25 + getThreatModifiers(run.threat.level).trapDifficultyBonus * 0.02;
    if (rng.nextFloat() < triggerChance) {
      const freshTrap = findRoom(run, room.id)?.activeTrap;
      if (freshTrap) {
        const triggered = triggerTrap({ run, character: nextCharacter, room, trap: freshTrap, rng, now });
        run = triggered.run;
        nextCharacter = triggered.character;
        run = updateRoomTrap(run, room.id, t => ({ ...t, triggered: true, detected: true }));
        run = updateRoomCompleted(run, room.id);
        return {
          run,
          character: nextCharacter,
          result: {
            type: "trapTriggered",
            message: triggered.result.message,
            trapResult: triggered.result
          }
        };
      }
    }
    return {
      run,
      character: nextCharacter,
      result: {
        type: "nothing",
        message: "You find nothing obvious — but something here is wrong."
      }
    };
  }

  // Room-type specific hidden loot pools
  const loot = rollHiddenLoot({ run, character: nextCharacter, room, rng });
  if (loot.length > 0) {
    const capacity = nextCharacter.derivedStats.carryCapacity;
    let raid = run.raidInventory;
    const taken: ItemInstance[] = [];
    for (const item of loot) {
      const weight = calculateInventoryWeight(raid) + item.weight * item.quantity;
      if (weight <= capacity) {
        raid = addItem(raid, item);
        taken.push(item);
      }
    }
    run = { ...run, raidInventory: raid };
    run = updateRoomSearchState(run, room.id, prev => ({ ...prev, hiddenLootClaimed: prev.hiddenLootClaimed || taken.length > 0 }));
    if (taken.length > 0) {
      const names = taken.map(item => item.name).join(", ");
      run = addDungeonLogEntry({
        run, type: "loot", now, roomId: room.id,
        message: `Hidden: ${names}.`
      });
      return {
        run,
        character: nextCharacter,
        result: {
          type: "hiddenLoot",
          message: `You uncover ${names}.`,
          loot: taken
        }
      };
    }
  }

  const materials = generateMaterialLoot({ biome: room.biome, roomType: room.type, tier: run.tier, rng });
  if (Object.keys(materials).length > 0) {
    run = {
      ...run,
      raidInventory: addMaterials({ inventory: run.raidInventory, materials })
    };
    run = updateRoomSearchState(run, room.id, prev => ({ ...prev, hiddenLootClaimed: true }));
    const names = Object.entries(materials).map(([id, amount]) => `${amount} ${id}`).join(", ");
    run = addDungeonLogEntry({
      run, type: "loot", now, roomId: room.id,
      message: `Materials: ${names}.`
    });
    return {
      run,
      character: nextCharacter,
      result: {
        type: "hiddenLoot",
        message: `You gather ${names}.`,
        loot: []
      }
    };
  }

  // Rare ambush
  if (shouldTriggerAmbush({ threat: run.threat, rng, additionalChance: SEARCH_RULES.ambushChanceOnSearch })) {
    run = addDungeonLogEntry({
      run, type: "warning", now, roomId: room.id,
      message: "Your search drew something out of the dark."
    });
    return {
      run,
      character: nextCharacter,
      result: {
        type: "ambush",
        message: "Your search drew something out of the dark."
      }
    };
  }

  // Nothing
  run = addDungeonLogEntry({
    run, type: "info", now, roomId: room.id,
    message: "You search, but the room gives nothing up."
  });
  return {
    run,
    character: nextCharacter,
    result: { type: "nothing" as SearchResultType, message: "Nothing of worth." }
  };
}

export function rollHiddenLoot(params: {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
  rng: Rng;
}): ItemInstance[] {
  const { run, character, room, rng } = params;
  if (room.searchState?.hiddenLootClaimed) return [];
  // Only certain room types yield hidden loot on a generic search.
  if (!["combat", "eliteCombat", "empty", "extraction", "boss"].includes(room.type)) return [];

  let chance = SEARCH_RULES.hiddenLootChance;
  if (character.classId === "scout") chance += SEARCH_RULES.hiddenLootScoutBonus;
  if (getModifier(character.abilityScores.intellect) >= 2) {
    chance += SEARCH_RULES.hiddenLootHighIntellectBonus;
  }
  if (rng.nextFloat() > chance) return [];

  const lootTable = getLootTableForBiome(room.biome, run.tier);
  return generateLootForRoomLootTableId(lootTable.id, rng, 1);
}

// ---------------------------------------------------------------------------

function applyThreat(
  run: DungeonRun,
  amount: number,
  roomId: string,
  now: number
): DungeonRun {
  if (amount === 0) return run;
  const { threat, change } = applyThreatChange({
    threat: run.threat, amount, reason: "searchedRoom", now,
    message: "Your search disturbs the quiet."
  });
  let next: DungeonRun = { ...run, threat };
  next = addDungeonLogEntry({
    run: next, type: "threat", now: change.timestamp, roomId,
    message: `${change.message} (${amount >= 0 ? "+" : ""}${amount})`
  });
  return next;
}

function updateRoomSearchState(
  run: DungeonRun,
  roomId: string,
  mutator: (prev: { searched: boolean; searchCount: number; hiddenLootClaimed: boolean; trapChecked: boolean; eventRevealed: boolean }) => { searched: boolean; searchCount: number; hiddenLootClaimed: boolean; trapChecked: boolean; eventRevealed: boolean }
): DungeonRun {
  return {
    ...run,
    roomGraph: run.roomGraph.map(room => {
      if (room.id !== roomId) return room;
      const prev = room.searchState ?? {
        searched: false, searchCount: 0, hiddenLootClaimed: false, trapChecked: false, eventRevealed: false
      };
      return { ...room, searchState: mutator(prev) };
    })
  };
}

function updateRoomTrap(
  run: DungeonRun,
  roomId: string,
  mutator: (trap: NonNullable<DungeonRoom["activeTrap"]>) => NonNullable<DungeonRoom["activeTrap"]>
): DungeonRun {
  return {
    ...run,
    roomGraph: run.roomGraph.map(room => {
      if (room.id !== roomId || !room.activeTrap) return room;
      return { ...room, activeTrap: mutator(room.activeTrap) };
    })
  };
}

function updateRoomCompleted(run: DungeonRun, roomId: string): DungeonRun {
  return {
    ...run,
    roomGraph: run.roomGraph.map(room =>
      room.id === roomId ? { ...room, completed: true } : room
    )
  };
}

function findRoom(run: DungeonRun, id: string): DungeonRoom | undefined {
  return run.roomGraph.find(r => r.id === id);
}
