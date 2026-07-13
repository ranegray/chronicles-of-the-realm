// Place registry, validation, adjacency, and per-run population.
// See docs/design/the-delve.md (Pillar 1) and src/game/delve/types.ts.

import type { Rng } from "../rng";
import type {
  Place,
  PlaceFloor,
  PlaceRoom,
  DelveRunState
} from "./types";
import { GOBLIN_WARRENS } from "./places/goblinWarrens";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const PLACES: Record<string, Place> = {
  [GOBLIN_WARRENS.id]: GOBLIN_WARRENS
};

export function getPlace(id: string): Place {
  const place = PLACES[id];
  if (!place) throw new Error(`Unknown place: ${id}`);
  return place;
}

// ---------------------------------------------------------------------------
// Adjacency
// ---------------------------------------------------------------------------

/** Room id -> reachable room ids, honoring oneWay exits (no reverse edge). */
export function buildAdjacency(floor: PlaceFloor): Record<string, string[]> {
  const adjacency: Record<string, string[]> = {};
  for (const room of floor.rooms) {
    adjacency[room.id] = room.exits.map(exit => exit.to);
  }
  return adjacency;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validatePlace(place: Place): void {
  if (place.floors.length === 0) {
    throw new Error(`Place "${place.id}" has no floors`);
  }

  for (const floor of place.floors) {
    validateFloor(place.id, floor);
  }
}

function validateFloor(placeId: string, floor: PlaceFloor): void {
  const label = `${placeId} floor ${floor.floor}`;
  const roomsById = new Map<string, PlaceRoom>(floor.rooms.map(r => [r.id, r]));

  if (roomsById.size !== floor.rooms.length) {
    throw new Error(`${label}: duplicate room ids detected`);
  }

  // A room's exits must use distinct directions — doorOverrides key on
  // "roomId:direction", and prose navigation ("go west") is ambiguous otherwise.
  for (const room of floor.rooms) {
    const seenDirections = new Set<string>();
    for (const exit of room.exits) {
      if (seenDirections.has(exit.direction)) {
        throw new Error(
          `${label}: room "${room.id}" has more than one exit in direction "${exit.direction}"`
        );
      }
      seenDirections.add(exit.direction);
    }
  }

  // Every exit's `to` must exist, and reciprocal exits must exist unless oneWay.
  for (const room of floor.rooms) {
    for (const exit of room.exits) {
      const target = roomsById.get(exit.to);
      if (!target) {
        throw new Error(
          `${label}: room "${room.id}" has an exit (${exit.direction}) to unknown room "${exit.to}"`
        );
      }
      if (!exit.oneWay) {
        const hasReciprocal = target.exits.some(e => e.to === room.id);
        if (!hasReciprocal) {
          throw new Error(
            `${label}: exit "${room.id}" -> "${exit.to}" (${exit.direction}) has no reciprocal exit ` +
            `back from "${exit.to}"; mark it oneWay if that is intentional`
          );
        }
      }
    }
  }

  // entranceRoomId must exist.
  if (!roomsById.has(floor.entranceRoomId)) {
    throw new Error(`${label}: entranceRoomId "${floor.entranceRoomId}" does not exist`);
  }

  // Every extract roomId must exist.
  for (const extract of floor.extracts) {
    if (!roomsById.has(extract.roomId)) {
      throw new Error(
        `${label}: extract "${extract.id}" references unknown room "${extract.roomId}"`
      );
    }
  }
  if (floor.extracts.length === 0) {
    throw new Error(`${label}: has no extracts defined`);
  }

  // Floor must be fully connected via BFS from the entrance (treating exits
  // as directed edges; oneWay exits still count as forward reachability).
  const adjacency = buildAdjacency(floor);
  const reached = bfsReachable(floor.entranceRoomId, adjacency);
  for (const room of floor.rooms) {
    if (!reached.has(room.id)) {
      throw new Error(
        `${label}: room "${room.id}" is not reachable from entrance "${floor.entranceRoomId}"`
      );
    }
  }

  // hunterSpawn rooms must be at least hunterBudget.max so a full spawn roll
  // never runs out of eligible rooms.
  const hunterSpawnRooms = floor.rooms.filter(r => r.hunterSpawn);
  if (hunterSpawnRooms.length < floor.hunterBudget.max) {
    throw new Error(
      `${label}: only ${hunterSpawnRooms.length} hunterSpawn rooms, need at least ` +
      `hunterBudget.max (${floor.hunterBudget.max})`
    );
  }

  // At least one extract per floor must be reachable from the entrance.
  const reachableExtract = floor.extracts.some(e => reached.has(e.roomId));
  if (!reachableExtract) {
    throw new Error(`${label}: no extract is reachable from entrance "${floor.entranceRoomId}"`);
  }
}

function bfsReachable(start: string, adjacency: Record<string, string[]>): Set<string> {
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency[current] ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

// ---------------------------------------------------------------------------
// Per-run population
// ---------------------------------------------------------------------------

export interface PopulatedFloor {
  /** Room id -> chosen prose variant for this run. */
  roomProse: Record<string, string>;
  /** "roomId:direction" -> resolved door state, for exits with a doorStates pool. */
  doorOverrides: DelveRunState["doorOverrides"];
  /** Room ids chosen as hunter spawn points this run. */
  hunterSpawnRoomIds: string[];
  /** Room ids given a supply cache (oil flask or rations) this run. */
  supplyRoomIds: Array<{ roomId: string; kind: "oilFlask" | "rations" }>;
  /** Room ids that will roll loot this run (actual generation stays downstream). */
  lootRoomIds: string[];
}

export interface PopulateFloorArgs {
  floor: PlaceFloor;
  rng: Rng;
  tier: number;
}

export function populateFloor({ floor, rng }: PopulateFloorArgs): PopulatedFloor {
  const roomProse: Record<string, string> = {};
  const doorOverrides: DelveRunState["doorOverrides"] = {};

  for (const room of floor.rooms) {
    roomProse[room.id] = rng.pickOne(room.prose);

    for (const exit of room.exits) {
      if (!exit.doorStates || exit.doorStates.length === 0) continue;
      const rolled = rng.pickOne(exit.doorStates);
      if (rolled === "open") continue; // open = no override needed
      const state = rolled === "lockable" ? "locked" : rolled === "jammable" ? "jammed" : "shut";
      doorOverrides[`${room.id}:${exit.direction}`] = state;
    }
  }

  // Hunter spawns: choose a count within [min, max], drawn from eligible rooms.
  const eligibleHunterRooms = floor.rooms.filter(r => r.hunterSpawn).map(r => r.id);
  const hunterCount = rng.nextInt(floor.hunterBudget.min, floor.hunterBudget.max);
  const shuffledHunterRooms = rng.shuffle(eligibleHunterRooms);
  const hunterSpawnRoomIds = shuffledHunterRooms.slice(0, hunterCount);

  // Supply caches: 2-3 placed in supplySpawn rooms, split between oil flasks
  // and rations.
  const eligibleSupplyRooms = floor.rooms.filter(r => r.supplySpawn).map(r => r.id);
  const supplyCount = Math.min(rng.nextInt(2, 3), eligibleSupplyRooms.length);
  const shuffledSupplyRooms = rng.shuffle(eligibleSupplyRooms);
  const supplyRoomIds = shuffledSupplyRooms.slice(0, supplyCount).map(roomId => ({
    roomId,
    kind: rng.pickOne(["oilFlask", "rations"] as const)
  }));

  // Loot: mark every room with a lootTableId as having loot this run.
  const lootRoomIds = floor.rooms.filter(r => r.lootTableId).map(r => r.id);

  return { roomProse, doorOverrides, hunterSpawnRoomIds, supplyRoomIds, lootRoomIds };
}
