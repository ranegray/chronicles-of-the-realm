import type {
  DungeonBiome,
  DungeonRoom,
  DungeonRun,
  RoomType
} from "./types";
import {
  DUNGEON_GENERATOR_VERSION,
  RUN_RULES
} from "./constants";
import { getBiome } from "../data/biomes";
import { getEncountersForBiome } from "../data/encounters";
import { getLootTableForBiome } from "../data/lootTables";
import { createEmptyInventory } from "./inventory";
import type { Rng } from "./rng";
import { createRng, makeId, randomSeed } from "./rng";

export interface DungeonGenParams {
  seed?: string;
  biome?: DungeonBiome;
  tier?: number;
  activeQuestIds?: string[];
}

const ALL_BIOMES: DungeonBiome[] = [
  "crypt",
  "goblinWarrens",
  "fungalCaverns",
  "ruinedKeep",
  "oldMine",
  "sunkenTemple"
];

const NON_ENTRANCE_TYPES: RoomType[] = [
  "combat",
  "combat",
  "combat",
  "treasure",
  "treasure",
  "trap",
  "shrine",
  "npcEvent",
  "questObjective",
  "lockedChest",
  "empty"
];

const MAX_ROOM_CONNECTIONS = 4;

const CARDINAL_DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }
] as const;

export function generateDungeonRun(params: DungeonGenParams = {}): DungeonRun {
  const seed = params.seed ?? randomSeed();
  const rootRng = createRng(`run:${seed}`);
  const biome = params.biome ?? rootRng.pickOne(ALL_BIOMES);
  const tier = params.tier ?? 1;

  const rooms = generateRoomGraph(seed, biome, tier);
  const entrance = rooms.find(r => r.type === "entrance")!;

  return {
    runId: makeId(rootRng, "run"),
    seed,
    generatorVersion: DUNGEON_GENERATOR_VERSION,
    biome,
    tier,
    status: "active",
    startedAt: Date.now(),
    currentRoomId: entrance.id,
    roomGraph: rooms,
    visitedRoomIds: [entrance.id],
    raidInventory: createEmptyInventory(),
    loadoutSnapshot: [],
    activeQuestIds: params.activeQuestIds ?? [],
    dangerLevel: tier
  };
}

export function generateRoomGraph(
  seed: string,
  biome: DungeonBiome,
  tier: number
): DungeonRoom[] {
  const rng = createRng(`graph:${seed}:${biome}:${tier}`);
  const minR = RUN_RULES.tierOneMinRooms;
  const maxR = RUN_RULES.tierOneMaxRooms;
  const totalRooms = rng.nextInt(minR, maxR);

  const rooms: DungeonRoom[] = [];
  for (let i = 0; i < totalRooms; i++) {
    const isEntrance = i === 0;
    const type: RoomType = isEntrance ? "entrance" : rng.pickOne(NON_ENTRANCE_TYPES);
    rooms.push(buildRoom(rng, biome, tier, type, i));
  }

  ensureRequiredRooms(rooms, rng, biome, tier);
  assignSpatialLayout(rooms, rng);

  // Mark entrance visited
  rooms[0]!.visited = true;

  return rooms;
}

function buildRoom(
  rng: Rng,
  biome: DungeonBiome,
  tier: number,
  type: RoomType,
  idx: number
): DungeonRoom {
  const biomeInfo = getBiome(biome);
  const desc = rng.pickOne(biomeInfo.roomDescriptions);

  let title = "";
  let dangerRating = 1;
  let encounterId: string | undefined;
  let lootTableId: string | undefined;
  let trapId: string | undefined;
  let extractionPoint = false;

  switch (type) {
    case "entrance":
      title = "Entrance";
      dangerRating = 0;
      break;
    case "combat": {
      title = "Combat Room";
      const encounters = getEncountersForBiome(biome, tier);
      const enc = rng.pickWeighted(encounters.map(e => ({ value: e, weight: e.weight })));
      encounterId = enc.id;
      dangerRating = enc.dangerRating;
      break;
    }
    case "eliteCombat": {
      title = "Elite Combat";
      const encounters = getEncountersForBiome(biome, tier);
      const harder = encounters
        .filter(e => e.dangerRating >= 2)
        .map(e => ({ value: e, weight: e.weight }));
      const pool = harder.length > 0 ? harder : encounters.map(e => ({ value: e, weight: e.weight }));
      const enc = rng.pickWeighted(pool);
      encounterId = enc.id;
      dangerRating = Math.max(2, enc.dangerRating + 1);
      break;
    }
    case "treasure":
      title = "Treasure";
      lootTableId = getLootTableForBiome(biome, tier).id;
      dangerRating = 1;
      break;
    case "trap": {
      title = "Trap Room";
      trapId = rng.pickOne(biomeInfo.trapNames);
      dangerRating = 2;
      break;
    }
    case "shrine":
      title = "Shrine";
      dangerRating = 0;
      break;
    case "npcEvent":
      title = "Lone Voice";
      dangerRating = 1;
      break;
    case "questObjective":
      title = "Quest Objective";
      dangerRating = 1;
      break;
    case "lockedChest":
      title = "Locked Chest";
      lootTableId = getLootTableForBiome(biome, tier).id;
      dangerRating = 1;
      break;
    case "extraction":
      title = "Extraction Point";
      dangerRating = 0;
      extractionPoint = true;
      break;
    case "boss": {
      title = "Boss Chamber";
      const encounters = getEncountersForBiome(biome, tier);
      const enc = rng.pickWeighted(encounters.map(e => ({ value: e, weight: e.weight })));
      encounterId = enc.id;
      dangerRating = 4;
      break;
    }
    case "empty":
      title = "Quiet Hall";
      dangerRating = 0;
      break;
  }

  return {
    id: `room_${idx}_${makeId(rng, "r")}`,
    type,
    biome,
    title,
    description: desc,
    dangerRating,
    connectedRoomIds: [],
    visited: false,
    completed: false,
    encounterId,
    lootTableId,
    trapId,
    extractionPoint
  };
}

export function ensureRequiredRooms(
  rooms: DungeonRoom[],
  rng: Rng,
  biome: DungeonBiome,
  tier: number
): void {
  const has = (t: RoomType) => rooms.some(r => r.type === t);
  const PROTECTED: RoomType[] = ["entrance", "combat", "treasure", "extraction", "boss"];

  function findReplaceableIdx(minIdx = 1, maxIdx = rooms.length - 1, fallback = true): number | undefined {
    // Prefer slots that are not already a required type
    const candidates: number[] = [];
    for (let i = minIdx; i <= maxIdx; i++) {
      const room = rooms[i];
      if (room && !PROTECTED.includes(room.type)) candidates.push(i);
    }
    if (candidates.length > 0) {
      return candidates[rng.nextInt(0, candidates.length - 1)]!;
    }
    return fallback ? rng.nextInt(minIdx, maxIdx) : undefined;
  }

  if (!has("combat")) {
    const idx = findReplaceableIdx()!;
    rooms[idx] = buildRoom(rng, biome, tier, "combat", idx);
  }
  if (!has("treasure")) {
    const idx = findReplaceableIdx()!;
    rooms[idx] = buildRoom(rng, biome, tier, "treasure", idx);
  }
  if (!has("extraction")) {
    const minIdx = Math.max(2, Math.floor(rooms.length * 0.6));
    const idx = findReplaceableIdx(minIdx)!;
    rooms[idx] = buildRoom(rng, biome, tier, "extraction", idx);
  }
  const requiresBoss = tier <= RUN_RULES.maxDungeonDepth;
  if (!has("boss") && (requiresBoss || rng.nextFloat() < RUN_RULES.bossRoomChanceTierOne)) {
    const idx = findReplaceableIdx(Math.max(1, Math.floor(rooms.length * 0.65)), rooms.length - 1, false) ??
      (requiresBoss ? findReplaceableIdx(1, rooms.length - 1, false) : undefined);
    if (idx !== undefined) {
      rooms[idx] = buildRoom(rng, biome, tier, "boss", idx);
    }
  }
}

function assignSpatialLayout(rooms: DungeonRoom[], rng: Rng): void {
  if (rooms.length === 0) return;

  const occupied = new Map<string, DungeonRoom>();
  setRoomPosition(rooms[0]!, 0, 0);
  occupied.set(coordKey(0, 0), rooms[0]!);

  for (let i = 1; i < rooms.length; i++) {
    const placement = findPlacement(rooms.slice(0, i), occupied, rng);
    setRoomPosition(rooms[i]!, placement.x, placement.y);
    occupied.set(coordKey(placement.x, placement.y), rooms[i]!);
    connect(rooms[i]!, placement.parent);
  }

  addSpatialCrossConnections(rooms, rng);
}

function findPlacement(
  placedRooms: DungeonRoom[],
  occupied: Map<string, DungeonRoom>,
  rng: Rng
): { parent: DungeonRoom; x: number; y: number } {
  const candidates = rng.shuffle(placedRooms)
    .map(parent => ({
      parent,
      openings: getOpenNeighborCoords(parent, occupied)
    }))
    .filter(candidate =>
      candidate.openings.length > 0 &&
      candidate.parent.connectedRoomIds.length < MAX_ROOM_CONNECTIONS
    );

  if (candidates.length === 0) {
    throw new Error("Could not place dungeon room on the map grid");
  }

  const candidate = rng.pickOne(candidates);
  const coord = rng.pickOne(candidate.openings);
  return { parent: candidate.parent, x: coord.x, y: coord.y };
}

function getOpenNeighborCoords(
  room: DungeonRoom,
  occupied: Map<string, DungeonRoom>
): Array<{ x: number; y: number }> {
  const x = room.mapX ?? 0;
  const y = room.mapY ?? 0;
  return CARDINAL_DIRECTIONS
    .map(dir => ({ x: x + dir.dx, y: y + dir.dy }))
    .filter(coord => !occupied.has(coordKey(coord.x, coord.y)));
}

function addSpatialCrossConnections(rooms: DungeonRoom[], rng: Rng): void {
  const byCoord = new Map<string, DungeonRoom>();
  for (const room of rooms) {
    if (room.mapX === undefined || room.mapY === undefined) continue;
    byCoord.set(coordKey(room.mapX, room.mapY), room);
  }

  const candidates: Array<{ a: DungeonRoom; b: DungeonRoom }> = [];
  for (const room of rooms) {
    if (room.mapX === undefined || room.mapY === undefined) continue;
    for (const dir of CARDINAL_DIRECTIONS.slice(0, 2)) {
      const neighbor = byCoord.get(coordKey(room.mapX + dir.dx, room.mapY + dir.dy));
      if (!neighbor || room.connectedRoomIds.includes(neighbor.id)) continue;
      candidates.push({ a: room, b: neighbor });
    }
  }

  const extraConnections = Math.max(1, Math.floor(rooms.length / 5));
  let added = 0;
  for (const candidate of rng.shuffle(candidates)) {
    if (added >= extraConnections) break;
    if (connect(candidate.a, candidate.b)) added++;
  }
}

function setRoomPosition(room: DungeonRoom, x: number, y: number): void {
  room.mapX = x;
  room.mapY = y;
}

function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}

function connect(a: DungeonRoom, b: DungeonRoom): boolean {
  if (a.id === b.id) return false;
  if (a.connectedRoomIds.includes(b.id)) return false;
  if (
    a.connectedRoomIds.length >= MAX_ROOM_CONNECTIONS ||
    b.connectedRoomIds.length >= MAX_ROOM_CONNECTIONS
  ) {
    return false;
  }
  if (!a.connectedRoomIds.includes(b.id)) a.connectedRoomIds.push(b.id);
  if (!b.connectedRoomIds.includes(a.id)) b.connectedRoomIds.push(a.id);
  return true;
}

export function getRoomById(rooms: DungeonRoom[], id: string): DungeonRoom | undefined {
  return rooms.find(r => r.id === id);
}
