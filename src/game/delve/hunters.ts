// Positional hunter state machine (Pillar 3). Pure, seeded-rng, no React.
// See docs/design/the-delve.md.

import type { Direction, Hunter, HunterSignal, HunterState, NoiseEvent } from "./types";
import type { RoomAdjacency } from "./noise";
import { bfsPath, graphDistance, hunterHears } from "./noise";
import type { Rng } from "../rng";
import { makeId } from "../rng";

/** Noise heard within this many rooms immediately promotes a hunter to hunting. */
const HUNTING_HEAR_DISTANCE = 2;

/** Alertness level at which sight (not just noise) can trigger hunting. */
const HUNTING_SIGHT_ALERTNESS = 3;

/** Roaming hunters' base chance to take a step each tick. */
const ROAM_MOVE_CHANCE_BASE = 0.5;
/** Roaming hunters' chance to move at maximum alertness. */
const ROAM_MOVE_CHANCE_MAX = 0.8;
/** Alertness level at which roaming move chance saturates at the max. */
const ROAM_MOVE_CHANCE_SATURATION_LEVEL = 5;

/** Pick which rooms get hunters and spin up their initial (dormant) state. */
export function spawnHunters(params: {
  floor: number;
  rng: Rng;
  budget: { min: number; max: number };
  eligibleRoomIds: string[];
  enemyPool: string[];
}): Hunter[] {
  const { rng, budget, eligibleRoomIds, enemyPool } = params;
  if (eligibleRoomIds.length === 0 || enemyPool.length === 0) return [];

  const count = Math.min(
    eligibleRoomIds.length,
    rng.nextInt(budget.min, budget.max)
  );
  const rooms = rng.shuffle(eligibleRoomIds).slice(0, count);

  return rooms.map((roomId): Hunter => ({
    id: makeId(rng, "hunter"),
    enemyId: rng.pickOne(enemyPool),
    roomId,
    state: "dormant"
  }));
}

/** Roaming hunters get bolder (more likely to move) as alertness rises. */
export function roamMoveChance(alertnessLevel: number): number {
  const t = Math.max(0, Math.min(1, alertnessLevel / ROAM_MOVE_CHANCE_SATURATION_LEVEL));
  return ROAM_MOVE_CHANCE_BASE + t * (ROAM_MOVE_CHANCE_MAX - ROAM_MOVE_CHANCE_BASE);
}

/** The noise a hunter should chase: loudest first, nearest as a tiebreak. */
function pickTargetNoise(
  heard: Array<{ noise: NoiseEvent; distance: number }>
): NoiseEvent | undefined {
  if (heard.length === 0) return undefined;
  const sorted = [...heard].sort((a, b) => {
    if (b.noise.loudness !== a.noise.loudness) return b.noise.loudness - a.noise.loudness;
    return a.distance - b.distance;
  });
  return sorted[0]!.noise;
}

/** One room step toward `targetRoomId`, or the current room if no path exists. */
function stepToward(adjacency: RoomAdjacency, fromRoomId: string, targetRoomId: string): string {
  const path = bfsPath(adjacency, fromRoomId, targetRoomId);
  if (!path || path.length < 2) return fromRoomId;
  return path[1]!;
}

function tickOne(
  hunter: Hunter,
  params: {
    adjacency: RoomAdjacency;
    playerRoomId: string;
    noises: NoiseEvent[];
    alertnessLevel: number;
    rng: Rng;
  }
): Hunter {
  const { adjacency, playerRoomId, noises, alertnessLevel, rng } = params;

  // Hunting is sticky: once a hunter has you, it converges every tick.
  if (hunter.state === "hunting") {
    return {
      ...hunter,
      roomId: stepToward(adjacency, hunter.roomId, playerRoomId),
      heardAt: undefined
    };
  }

  const sees =
    hunter.roomId === playerRoomId ||
    (alertnessLevel >= HUNTING_SIGHT_ALERTNESS && (adjacency[hunter.roomId] ?? []).includes(playerRoomId));

  const heard = noises
    .filter(n => hunterHears(n, hunter.roomId, adjacency))
    .map(n => ({ noise: n, distance: graphDistance(adjacency, n.roomId, hunter.roomId)! }));

  const closeHeard = heard.some(h => h.distance <= HUNTING_HEAR_DISTANCE);

  if (sees || closeHeard) {
    return {
      ...hunter,
      state: "hunting",
      roomId: stepToward(adjacency, hunter.roomId, playerRoomId),
      heardAt: undefined
    };
  }

  if (heard.length > 0) {
    const target = pickTargetNoise(heard)!;

    if (hunter.state === "dormant") {
      // Wakes up this tick; starts moving next tick.
      return { ...hunter, state: "drawn", heardAt: target.roomId };
    }

    if (hunter.state === "roaming") {
      return { ...hunter, state: "drawn", heardAt: target.roomId };
    }

    // Already drawn: refresh the target and take a step toward it.
    const heardAt = target.roomId;
    const roomId = stepToward(adjacency, hunter.roomId, heardAt);
    if (roomId === heardAt) {
      return { ...hunter, state: "roaming", roomId, heardAt: undefined };
    }
    return { ...hunter, state: "drawn", roomId, heardAt };
  }

  if (hunter.state === "drawn" && hunter.heardAt) {
    const roomId = stepToward(adjacency, hunter.roomId, hunter.heardAt);
    if (roomId === hunter.heardAt) {
      return { ...hunter, state: "roaming", roomId, heardAt: undefined };
    }
    return { ...hunter, roomId };
  }

  if (hunter.state === "roaming") {
    const neighbors = adjacency[hunter.roomId] ?? [];
    if (neighbors.length > 0 && rng.nextFloat() < roamMoveChance(alertnessLevel)) {
      return { ...hunter, roomId: rng.pickOne(neighbors) };
    }
    return hunter;
  }

  // dormant, heard nothing: stays put.
  return hunter;
}

/**
 * Run one tick of the hunter simulation. Call after every player action.
 * `directionOf` maps a room-to-room step to a compass direction for
 * player-facing signal prose, keeping this module decoupled from place data.
 */
export function tickHunters(params: {
  hunters: Hunter[];
  adjacency: RoomAdjacency;
  playerRoomId: string;
  noises: NoiseEvent[];
  alertnessLevel: number;
  rng: Rng;
  directionOf: (fromRoomId: string, toRoomId: string) => Direction | undefined;
}): { hunters: Hunter[]; signals: HunterSignal[]; contacts: string[] } {
  const { adjacency, playerRoomId, noises, alertnessLevel, rng, directionOf } = params;

  const hunters = params.hunters.map(hunter =>
    tickOne(hunter, { adjacency, playerRoomId, noises, alertnessLevel, rng })
  );

  const signals: HunterSignal[] = [];
  for (const hunter of hunters) {
    const distance = graphDistance(adjacency, playerRoomId, hunter.roomId);
    if (distance === undefined || distance > 2) continue;

    let direction: HunterSignal["direction"];
    if (distance === 0) {
      direction = "here";
    } else {
      const path = bfsPath(adjacency, playerRoomId, hunter.roomId);
      const firstStep = path && path.length > 1 ? path[1] : undefined;
      const resolved = firstStep ? directionOf(playerRoomId, firstStep) : undefined;
      direction = resolved ?? "near";
    }

    signals.push({
      hunterId: hunter.id,
      direction,
      distance: distance as 0 | 1 | 2,
      texture: textureFor(hunter.state)
    });
  }

  const contacts = hunters.filter(h => h.roomId === playerRoomId).map(h => h.id);

  return { hunters, signals, contacts };
}

function textureFor(state: HunterState): string {
  switch (state) {
    case "hunting": return "closing in";
    case "drawn": return "moving toward you";
    case "roaming": return "shuffling about";
    case "dormant": return "still";
  }
}
