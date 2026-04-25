import type {
  DungeonBiome,
  DungeonRoom,
  DungeonRun,
  RoomScoutingProfile,
  RoomSearchState,
  RoomSignTag,
  RoomType
} from "./types";
import {
  DEPTH_RULES,
  DUNGEON_GENERATOR_VERSION,
  RUN_RULES,
  SCOUTING_RULES
} from "./constants";
import { getBiome } from "../data/biomes";
import { getEncountersForBiome } from "../data/encounters";
import { getLootTableForBiome } from "../data/lootTables";
import { createEmptyInventory } from "./inventory";
import type { Rng } from "./rng";
import { createRng, makeId, randomSeed } from "./rng";
import { createInitialDelveStrainState, createInitialThreatState } from "./threat";
import { addDungeonLogEntry, createEmptyDungeonLog } from "./dungeonLog";
import { BIOME_SIGN_FLAVOR, ROOM_SIGNS_BY_TYPE } from "../data/roomSigns";
import { generateTrapForRoom } from "./traps";
import { generateRoomEvent } from "./roomEvents";
import { generateExtractionPoint } from "./extraction";
import { ROOM_EVENT_RULES } from "./constants";

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
  "eliteCombat",
  "eliteCombat",
  "treasure",
  "treasure",
  "trap",
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
  const startedAt = Date.now();

  const bareRun: DungeonRun = {
    runId: makeId(rootRng, "run"),
    seed,
    generatorVersion: DUNGEON_GENERATOR_VERSION,
    biome,
    tier,
    status: "active",
    startedAt,
    currentRoomId: entrance.id,
    roomGraph: rooms,
    visitedRoomIds: [entrance.id],
    raidInventory: createEmptyInventory(),
    loadoutSnapshot: [],
    activeQuestIds: params.activeQuestIds ?? [],
    questProgressAtStart: {},
    xpGained: 0,
    roomsVisitedBeforeDepth: 0,
    roomsCompletedBeforeDepth: 0,
    dangerLevel: tier,
    threat: createInitialThreatState(startedAt),
    delveStrain: createInitialDelveStrainState(startedAt),
    knownRoomIntel: {},
    dungeonLog: createEmptyDungeonLog()
  };

  return addDungeonLogEntry({
    run: bareRun,
    type: "info",
    message: `You enter the dungeon through the ${entrance.title.toLowerCase()}.`,
    roomId: entrance.id,
    now: startedAt
  });
}

export function createDefaultSearchState(): RoomSearchState {
  return {
    searched: false,
    searchCount: 0,
    hiddenLootClaimed: false,
    trapChecked: false,
    eventRevealed: false
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
  const depthRoomBonus = Math.min(
    DEPTH_RULES.maxRoomCountBonus,
    Math.floor(Math.max(0, tier - 1) / DEPTH_RULES.roomCountGrowthEveryDepth)
  );
  const totalRooms = rng.nextInt(minR + depthRoomBonus, maxR + depthRoomBonus);

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
  const baseDescription = rng.pickOne(biomeInfo.roomDescriptions);

  let title = "";
  let dangerRating = 1;
  let encounterId: string | undefined;
  let lootTableId: string | undefined;
  let trapId: string | undefined;
  let activeTrap: DungeonRoom["activeTrap"] | undefined;
  let extractionPoint = false;

  switch (type) {
    case "entrance":
      title = "Entrance";
      dangerRating = 0;
      break;
    case "combat": {
      title = rng.pickOne(["Guarded Hall", "Broken Watch", "Stalking Ground"]);
      const encounters = getEncountersForBiome(biome, tier);
      const enc = rng.pickWeighted(encounters.map(e => ({ value: e, weight: e.weight })));
      encounterId = enc.id;
      dangerRating = enc.dangerRating;
      break;
    }
    case "eliteCombat": {
      title = rng.pickOne(["Hard Crossing", "Old Killing Floor", "Held Chamber"]);
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
      title = rng.pickOne(["Old Cache", "Forgotten Stores", "Sealed Cache"]);
      lootTableId = getLootTableForBiome(biome, tier).id;
      dangerRating = 1;
      break;
    case "trap": {
      title = rng.pickOne(["Unsteady Passage", "Worked Floor", "Wrong Turn"]);
      const trap = generateTrapForRoom({
        room: { id: "" } as DungeonRoom,
        biome,
        tier,
        rng
      });
      if (trap) {
        activeTrap = trap;
        trapId = trap.trapId;
      } else {
        trapId = rng.pickOne(biomeInfo.trapNames);
      }
      dangerRating = 2;
      break;
    }
    case "shrine":
      title = rng.pickOne(["Quiet Shrine", "Old Offering Place", "Worn Altar"]);
      dangerRating = 0;
      break;
    case "npcEvent":
      title = rng.pickOne(["Lone Voice", "Waiting Stranger", "Still Figure"]);
      dangerRating = 1;
      break;
    case "questObjective":
      title = "Quest Objective";
      dangerRating = 1;
      break;
    case "lockedChest":
      title = rng.pickOne(["Locked Coffer", "Ironbound Chest", "Sealed Coffer"]);
      lootTableId = getLootTableForBiome(biome, tier).id;
      dangerRating = 1;
      break;
    case "extraction":
      title = "Extraction Point";
      dangerRating = 0;
      extractionPoint = true;
      break;
    case "boss": {
      title = rng.pickOne(["Deep Threshold", "Claimed Hall", "Last Door"]);
      const encounters = getEncountersForBiome(biome, tier);
      const enc = rng.pickWeighted(encounters.map(e => ({ value: e, weight: e.weight })));
      encounterId = enc.id;
      dangerRating = 4;
      break;
    }
    case "empty":
      title = rng.pickOne(["Quiet Hall", "Hushed Passage", "Cold Turning"]);
      dangerRating = 0;
      break;
  }

  const id = `room_${idx}_${makeId(rng, "r")}`;
  const extraction = type === "extraction" || extractionPoint
    ? generateExtractionPoint({ roomId: id, biome, tier, rng })
    : undefined;
  const scaledDanger = type === "entrance" || type === "extraction" || type === "empty"
    ? dangerRating
    : dangerRating + getDepthDangerBonus(tier);
  const bareRoom: DungeonRoom = {
    id,
    type,
    biome,
    title,
    description: describeRoomAtDepth({ baseDescription, type, biome, tier, dangerRating: scaledDanger, rng }),
    dangerRating: scaledDanger,
    connectedRoomIds: [],
    visited: false,
    completed: false,
    encounterId,
    lootTableId,
    trapId,
    activeTrap: activeTrap ? { ...activeTrap, roomId: id } : undefined,
    extractionPoint,
    extraction,
    searchState: createDefaultSearchState(),
    scoutingProfile: computeScoutingProfile(type, biome, scaledDanger, extractionPoint)
  };
  const activeEvent = maybeGenerateEvent({ room: bareRoom, biome, tier, rng });
  return activeEvent ? { ...bareRoom, activeEvent } : bareRoom;
}

function describeRoomAtDepth(params: {
  baseDescription: string;
  type: RoomType;
  biome: DungeonBiome;
  tier: number;
  dangerRating: number;
  rng: Rng;
}): string {
  const { baseDescription, type, biome, tier, dangerRating, rng } = params;
  const details: string[] = [baseDescription];
  if (tier >= 4) {
    details.push(rng.pickOne(depthPressureDetails(biome)));
  }
  if (tier >= 7) {
    details.push(rng.pickOne(deepPressureDetails(type, dangerRating)));
  }
  return details.join(" ");
}

function depthPressureDetails(biome: DungeonBiome): string[] {
  switch (biome) {
    case "crypt":
      return [
        "The stone is cold enough to ache through leather.",
        "Old names have been scratched out and written again lower on the wall.",
        "Fine grey dust shifts without a draft."
      ];
    case "goblinWarrens":
      return [
        "Fresh brace-work has been jammed into older, narrower cuts.",
        "The tunnel has been used recently, and in a hurry.",
        "Grease smoke clings low to the ceiling."
      ];
    case "fungalCaverns":
      return [
        "The caps here lean toward you before settling back.",
        "Spores drift in slow sheets whenever your boot moves.",
        "The floor gives softly, as if something underneath exhales."
      ];
    case "ruinedKeep":
      return [
        "The stones carry faint bootfalls that do not match yours.",
        "Old banners stir although the room has no wind.",
        "A command half-remembered seems to hang in the air."
      ];
    case "oldMine":
      return [
        "The timbers complain under a weight above you.",
        "Black water beads on the walls and runs upward in places.",
        "Distant picks strike once, then stop."
      ];
    case "sunkenTemple":
      return [
        "Salt crusts the seams in thick white veins.",
        "Water whispers somewhere behind the stone.",
        "The air tastes briny and old enough to swallow."
      ];
  }
}

function deepPressureDetails(type: RoomType, dangerRating: number): string[] {
  if (type === "treasure" || type === "lockedChest") {
    return [
      "Whatever was hidden here was hidden from more than thieves.",
      "The prize feels watched before it is even touched.",
      "A careful hand left old warnings beneath the dust."
    ];
  }
  if (type === "extraction") {
    return [
      "The way out is real, but it no longer feels close.",
      "Every sound from above arrives thin and delayed.",
      "The passage back seems to narrow when you look away."
    ];
  }
  if (dangerRating >= 3 || type === "combat" || type === "eliteCombat" || type === "boss") {
    return [
      "Something has worn a patient path through this room.",
      "The quiet here is practiced, not empty.",
      "Marks on the floor show where others tried to stand their ground."
    ];
  }
  return [
    "The silence has weight now.",
    "Even the dust seems reluctant to settle.",
    "The room waits longer than it should."
  ];
}

function maybeGenerateEvent(params: {
  room: DungeonRoom;
  biome: DungeonBiome;
  tier: number;
  rng: Rng;
}): ActiveRoomEventSeed | undefined {
  const { room, biome, tier, rng } = params;
  // shrine and npcEvent rooms always get an event; empty rooms roll a chance;
  // lockedChest rooms have a 50% chance of a whispering-chest event.
  let spawn = false;
  if (room.type === "shrine" || room.type === "npcEvent") spawn = true;
  else if (room.type === "empty") spawn = rng.nextFloat() < ROOM_EVENT_RULES.eventRoomChance;
  else if (room.type === "lockedChest") spawn = rng.nextFloat() < 0.5;
  if (!spawn) return undefined;
  const generated = generateRoomEvent({ room, biome, tier, rng });
  if (!generated) return undefined;
  return { ...generated, roomId: room.id };
}

type ActiveRoomEventSeed = NonNullable<DungeonRoom["activeEvent"]>;

export function computeScoutingProfile(
  type: RoomType,
  biome: DungeonBiome,
  dangerRating: number,
  extractionPoint: boolean
): RoomScoutingProfile {
  const typeSigns = ROOM_SIGNS_BY_TYPE[type] ?? [];
  const biomeSigns = BIOME_SIGN_FLAVOR[biome] ?? [];
  const signs = dedupe<RoomSignTag>([...typeSigns, ...biomeSigns]);
  return {
    signs,
    hiddenDanger: dangerRating >= 3,
    hasTrapSignature: type === "trap" || type === "lockedChest",
    hasMagicSignature: type === "shrine" || type === "questObjective" || type === "boss",
    hasCreatureSigns: type === "combat" || type === "eliteCombat" || type === "boss",
    hasTreasureSigns: type === "treasure" || type === "lockedChest",
    hasExtractionSigns: type === "extraction" || extractionPoint,
    falseSignalChance: SCOUTING_RULES.falseSignalBaseChance
  };
}

function dedupe<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
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
  const extractionCount = () => rooms.filter(r => r.type === "extraction").length;
  if (extractionCount() < 1) {
    const minIdx = Math.max(2, Math.floor(rooms.length * 0.28));
    const maxIdx = Math.max(minIdx, Math.floor(rooms.length * 0.45));
    const idx = findReplaceableIdx(minIdx, maxIdx)!;
    rooms[idx] = buildRoom(rng, biome, tier, "extraction", idx);
  }
  if (extractionCount() < 2 && rooms.length >= 12) {
    const minIdx = Math.max(3, Math.floor(rooms.length * 0.58));
    const idx = findReplaceableIdx(minIdx)!;
    rooms[idx] = buildRoom(rng, biome, tier, "extraction", idx);
  }
  if (!has("boss") && DEPTH_RULES.bossEveryDepth) {
    const idx = findReplaceableIdx(Math.max(1, Math.floor(rooms.length * 0.65)), rooms.length - 1, false) ??
      findReplaceableIdx(1, rooms.length - 1, false);
    if (idx !== undefined) {
      rooms[idx] = buildRoom(rng, biome, tier, "boss", idx);
    }
  }
}

function getDepthDangerBonus(tier: number): number {
  return Math.min(
    DEPTH_RULES.maxDangerBonus,
    Math.floor(Math.max(0, tier - 1) / DEPTH_RULES.dangerBonusEveryDepth)
  );
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
