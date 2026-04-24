import { describe, expect, it } from "vitest";
import { getEncounter } from "../data/encounters";
import { getLootTableForBiome } from "../data/lootTables";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { startCombat, resolvePlayerAction } from "../game/combat";
import { generateDungeonRun, getRoomById } from "../game/dungeonGenerator";
import { addItem, calculateInventoryWeight, createEmptyInventory, instanceFromTemplateId, removeItem } from "../game/inventory";
import { getConsumableHealFormula } from "../game/itemEffects";
import { generateLootForRoomLootTableId, rollGold } from "../game/lootGenerator";
import { createRng } from "../game/rng";
import type { Character, ClassId, DungeonBiome, DungeonRoom, DungeonRun, Inventory, ItemInstance } from "../game/types";

interface SimResult {
  seed: string;
  outcome: "extracted" | "dead" | "stranded";
  roomsVisited: number;
  roomsCompleted: number;
  hpAtEnd: number;
  packValue: number;
  packGold: number;
  decisionWindows: number;
  firstExtractionAt?: number;
}

interface SimScenario {
  label: string;
  biome: DungeonBiome;
  classId: ClassId;
  starterKitId: string;
}

const SCENARIOS: SimScenario[] = [
  { label: "warrior crypt", biome: "crypt", classId: "warrior", starterKitId: "warrior_sword_shield" },
  { label: "scout goblins", biome: "goblinWarrens", classId: "scout", starterKitId: "scout_lockpick" },
  { label: "warden fungal", biome: "fungalCaverns", classId: "warden", starterKitId: "warden_survival" },
  { label: "devout keep", biome: "ruinedKeep", classId: "devout", starterKitId: "devout_smiter" },
  { label: "arcanist temple", biome: "sunkenTemple", classId: "arcanist", starterKitId: "arcanist_ward_focus" }
];

describe("risk/reward simulation", () => {
  it.each(SCENARIOS)("creates repeated push-or-extract decisions for $label", scenario => {
    const results = Array.from({ length: 25 }, (_, i) => simulateRun(`risk-${scenario.label}-${i + 1}`, scenario));
    const extracted = results.filter(result => result.outcome === "extracted");
    const deaths = results.filter(result => result.outcome === "dead");
    const withDecision = results.filter(result => result.decisionWindows > 0);
    const nearDeath = extracted.filter(result => result.hpAtEnd <= 20);
    const avgRooms = average(results.map(result => result.roomsVisited));
    const avgValue = average(extracted.map(result => result.packValue + result.packGold));

    console.info("risk/reward simulation", {
      scenario: scenario.label,
      runs: results.length,
      extracted: extracted.length,
      deaths: deaths.length,
      withDecision: withDecision.length,
      nearDeath: nearDeath.length,
      avgRooms: Number(avgRooms.toFixed(1)),
      avgExtractedValue: Number(avgValue.toFixed(1))
    });

    expect(extracted.length).toBeGreaterThanOrEqual(15);
    expect(withDecision.length).toBeGreaterThanOrEqual(15);
    expect(nearDeath.length + deaths.length).toBeGreaterThanOrEqual(8);
    expect(avgRooms).toBeGreaterThanOrEqual(5);
    expect(avgValue).toBeGreaterThanOrEqual(25);
  });
});

function simulateRun(seed: string, scenario: SimScenario): SimResult {
  const player = buildPlayer(seed, scenario);
  let currentPlayer: Character = { ...player };
  let run = generateDungeonRun({ seed, biome: scenario.biome, tier: 1 });
  let raidInventory = addItem(createEmptyInventory(), instanceFromTemplateId("consumable_small_draught", createRng(`${seed}:potion`), 1));
  let currentRoomId = run.currentRoomId;
  let decisionWindows = 0;
  let firstExtractionAt: number | undefined;

  for (let step = 0; step < 80; step++) {
    const room = getRoomById(run.roomGraph, currentRoomId);
    if (!room) break;

    const processResult = processRoom({
      player: currentPlayer,
      raidInventory,
      run,
      room
    });
    currentPlayer = processResult.player;
    raidInventory = processResult.raidInventory;
    run = processResult.run;
    if (currentPlayer.hp <= 0) {
      return finish("dead", seed, run, raidInventory, currentPlayer, decisionWindows, firstExtractionAt);
    }

    if (room.extractionPoint) {
      firstExtractionAt ??= run.visitedRoomIds.length;
    }

    const extractionDistance = nearestVisitedExtractionDistance(run, currentRoomId);
    const extractionNearby = extractionDistance !== undefined && extractionDistance <= 2;
    const hasUnvisited = run.roomGraph.some(candidate => !run.visitedRoomIds.includes(candidate.id));
    const packValue = inventoryValue(raidInventory) + raidInventory.gold;
    const hurtEnough = currentPlayer.hp <= Math.floor(currentPlayer.maxHp * 0.75);
    if (extractionNearby && hasUnvisited && hurtEnough && packValue >= 18) {
      decisionWindows += 1;
    }
    if (extractionNearby && (packValue >= 90 || currentPlayer.hp <= Math.floor(currentPlayer.maxHp * 0.3))) {
      return finish("extracted", seed, run, raidInventory, currentPlayer, decisionWindows, firstExtractionAt);
    }

    const nextRoomId = chooseNextRoom(run, currentRoomId);
    if (!nextRoomId) {
      if (firstExtractionAt !== undefined) {
        return finish("extracted", seed, run, raidInventory, currentPlayer, decisionWindows, firstExtractionAt);
      }
      return finish("stranded", seed, run, raidInventory, currentPlayer, decisionWindows, firstExtractionAt);
    }
    currentRoomId = nextRoomId;
    run = visitRoom(run, currentRoomId);
  }

  return finish("stranded", seed, run, raidInventory, currentPlayer, decisionWindows, firstExtractionAt);
}

function buildPlayer(seed: string, scenario: SimScenario): Character {
  let draft = createEmptyDraft(seed);
  draft = CharacterCreationService.setName(draft, "Playtester");
  draft = CharacterCreationService.selectAncestry(draft, "human");
  draft = CharacterCreationService.selectClass(draft, scenario.classId);
  draft = CharacterCreationService.rollAllAbilityScores(draft);
  draft = CharacterCreationService.autoAssignScoresForClass(draft);
  draft = CharacterCreationService.chooseStarterKit(draft, scenario.starterKitId);
  return CharacterCreationService.finalizeCharacter(draft).character;
}

function processRoom(args: {
  player: Character;
  raidInventory: Inventory;
  run: DungeonRun;
  room: DungeonRoom;
}): { player: Character; raidInventory: Inventory; run: DungeonRun } {
  const { room } = args;
  if (room.completed) return args;

  if (room.type === "combat" || room.type === "eliteCombat" || room.type === "boss") {
    return processCombatRoom(args);
  }

  if (room.type === "trap") {
    const rng = createRng(`sim-trap:${args.run.seed}:${room.id}`);
    const roll = rng.nextInt(1, 20);
    const total = roll + args.player.derivedStats.trapSense;
    const dc = 13 + args.run.tier + room.dangerRating;
    const damage = total >= dc + 4
      ? 0
      : total >= dc
        ? rng.nextInt(2, 5) + args.run.tier
        : rng.nextInt(6, 10) + args.run.tier + room.dangerRating;
    return {
      player: { ...args.player, hp: Math.max(0, args.player.hp - damage) },
      raidInventory: args.raidInventory,
      run: completeRoom(args.run, room.id)
    };
  }

  let raidInventory = args.raidInventory;
  const rng = createRng(`sim-loot:${args.run.seed}:${room.id}`);
  if (room.lootTableId) {
    for (const item of generateLootForRoomLootTableId(room.lootTableId, rng, room.type === "lockedChest" ? 2 : 1)) {
      if (calculateInventoryWeight(raidInventory) + item.weight * item.quantity <= args.player.derivedStats.carryCapacity) {
        raidInventory = addItem(raidInventory, item);
      }
    }
    raidInventory = { ...raidInventory, gold: raidInventory.gold + rollGold(rng, args.run.tier) };
  } else if (room.type === "shrine" || room.type === "npcEvent") {
    raidInventory = { ...raidInventory, gold: raidInventory.gold + rollGold(rng, args.run.tier) };
  }
  return {
    player: args.player,
    raidInventory,
    run: completeRoom(args.run, room.id)
  };
}

function processCombatRoom(args: {
  player: Character;
  raidInventory: Inventory;
  run: DungeonRun;
  room: DungeonRoom;
}): { player: Character; raidInventory: Inventory; run: DungeonRun } {
  if (!args.room.encounterId) return { ...args, run: completeRoom(args.run, args.room.id) };

  let player = args.player;
  let raidInventory = args.raidInventory;
  let combat = startCombat(getEncounter(args.room.encounterId), createRng(`sim-start:${args.run.seed}:${args.room.id}`), args.room.id);

  for (let turn = 0; turn < 30 && !combat.over; turn++) {
    const healItem = player.hp <= Math.floor(player.maxHp * 0.4)
      ? raidInventory.items.find(item => getConsumableHealFormula(item))
      : undefined;
    const target = combat.enemies.find(enemy => enemy.hp > 0);
    if (!target && !healItem) break;
    const action = healItem
      ? { kind: "useItem" as const, itemInstanceId: healItem.instanceId }
      : { kind: "attack" as const, targetId: target!.instanceId };
    const result = resolvePlayerAction(
      combat,
      player,
      action,
      createRng(`sim-combat:${args.run.seed}:${args.room.id}:${turn}`),
      raidInventory.items
    );
    combat = result.combat;
    player = result.player;
    for (const id of result.consumedItems) {
      raidInventory = removeItem(raidInventory, id, 1);
    }
  }

  if (combat.outcome === "defeat" || player.hp <= 0) {
    return { player: { ...player, hp: 0 }, raidInventory, run: args.run };
  }

  const rng = createRng(`sim-combat-loot:${args.run.seed}:${args.room.id}`);
  const lootTable = getLootTableForBiome(args.room.biome, args.run.tier);
  if (rng.nextFloat() < (args.room.type === "boss" ? 1 : args.room.type === "eliteCombat" ? 0.7 : 0.4)) {
    for (const item of generateLootForRoomLootTableId(lootTable.id, rng, args.room.type === "boss" ? 2 : 1)) {
      if (calculateInventoryWeight(raidInventory) + item.weight * item.quantity <= player.derivedStats.carryCapacity) {
        raidInventory = addItem(raidInventory, item);
      }
    }
  }

  return { player, raidInventory, run: completeRoom(args.run, args.room.id) };
}

function chooseNextRoom(run: DungeonRun, currentRoomId: string): string | undefined {
  const current = getRoomById(run.roomGraph, currentRoomId);
  if (!current) return undefined;
  const direct = current.connectedRoomIds.find(id => !run.visitedRoomIds.includes(id));
  if (direct) return direct;

  const route = shortestRouteToUnvisited(run, currentRoomId);
  return route?.[1];
}

function shortestRouteToUnvisited(run: DungeonRun, currentRoomId: string): string[] | undefined {
  const queue: string[][] = [[currentRoomId]];
  const seen = new Set<string>([currentRoomId]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const room = getRoomById(run.roomGraph, path[path.length - 1]!);
    if (!room) continue;
    if (!run.visitedRoomIds.includes(room.id)) return path;
    for (const id of room.connectedRoomIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push([...path, id]);
    }
  }
  return undefined;
}

function nearestVisitedExtractionDistance(run: DungeonRun, currentRoomId: string): number | undefined {
  const queue: Array<{ id: string; distance: number }> = [{ id: currentRoomId, distance: 0 }];
  const seen = new Set<string>([currentRoomId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const room = getRoomById(run.roomGraph, current.id);
    if (!room) continue;
    if (room.extractionPoint && run.visitedRoomIds.includes(room.id)) return current.distance;
    for (const id of room.connectedRoomIds) {
      if (seen.has(id) || !run.visitedRoomIds.includes(id)) continue;
      seen.add(id);
      queue.push({ id, distance: current.distance + 1 });
    }
  }
  return undefined;
}

function visitRoom(run: DungeonRun, roomId: string): DungeonRun {
  return {
    ...run,
    currentRoomId: roomId,
    visitedRoomIds: run.visitedRoomIds.includes(roomId) ? run.visitedRoomIds : [...run.visitedRoomIds, roomId],
    roomGraph: run.roomGraph.map(room => room.id === roomId ? { ...room, visited: true } : room)
  };
}

function completeRoom(run: DungeonRun, roomId: string): DungeonRun {
  return {
    ...run,
    roomGraph: run.roomGraph.map(room => room.id === roomId ? { ...room, completed: true } : room)
  };
}

function finish(
  outcome: SimResult["outcome"],
  seed: string,
  run: DungeonRun,
  raidInventory: Inventory,
  player: Character,
  decisionWindows: number,
  firstExtractionAt?: number
): SimResult {
  return {
    seed,
    outcome,
    roomsVisited: run.visitedRoomIds.length,
    roomsCompleted: run.roomGraph.filter(room => room.completed).length,
    hpAtEnd: player.hp,
    packValue: inventoryValue(raidInventory),
    packGold: raidInventory.gold,
    decisionWindows,
    firstExtractionAt
  };
}

function inventoryValue(inv: Inventory): number {
  return inv.items.reduce((sum, item) => sum + item.value * item.quantity, 0);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
