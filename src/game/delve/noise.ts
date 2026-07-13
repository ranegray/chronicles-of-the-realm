// Noise propagation over the room graph (Pillar 3). Pure, no rng.
// See docs/design/the-delve.md.

import type { LightState, NoiseEvent } from "./types";

/** Room adjacency map: roomId -> ids of directly connected rooms. */
export type RoomAdjacency = Record<string, string[]>;

/** Loudness for causes with a fixed value (move is variable; see moveNoiseLoudness). */
export const NOISE_LOUDNESS: Record<Exclude<NoiseEvent["cause"], "move" | "other">, number> = {
  search: 2,
  fightBeat: 3,
  lockwork: 3,
  flee: 4,
  crank: 4
};

/**
 * Move noise: base 1, +1 if the pack is over 60% capacity, +1 more if the
 * lamp is dark.
 */
export function moveNoiseLoudness(params: { packRatio: number; lightState: LightState }): number {
  let loudness = 1;
  if (params.packRatio > 0.6) loudness += 1;
  if (params.lightState === "dark") loudness += 1;
  return loudness;
}

/**
 * BFS distance from `fromRoomId` to every reachable room in the adjacency
 * graph. The origin room has distance 0.
 */
export function bfsDistances(adjacency: RoomAdjacency, fromRoomId: string): Record<string, number> {
  const distances: Record<string, number> = { [fromRoomId]: 0 };
  const queue: string[] = [fromRoomId];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head]!;
    head += 1;
    const currentDistance = distances[current]!;
    const neighbors = adjacency[current] ?? [];
    for (const neighbor of neighbors) {
      if (distances[neighbor] !== undefined) continue;
      distances[neighbor] = currentDistance + 1;
      queue.push(neighbor);
    }
  }
  return distances;
}

/**
 * Graph distance between two rooms, or `undefined` if unreachable.
 */
export function graphDistance(adjacency: RoomAdjacency, fromRoomId: string, toRoomId: string): number | undefined {
  return bfsDistances(adjacency, fromRoomId)[toRoomId];
}

/**
 * The full BFS shortest path from `fromRoomId` to `toRoomId`, inclusive of
 * both endpoints, or `undefined` if unreachable.
 */
export function bfsPath(adjacency: RoomAdjacency, fromRoomId: string, toRoomId: string): string[] | undefined {
  if (fromRoomId === toRoomId) return [fromRoomId];
  const previous: Record<string, string> = {};
  const visited = new Set<string>([fromRoomId]);
  const queue: string[] = [fromRoomId];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head]!;
    head += 1;
    const neighbors = adjacency[current] ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      previous[neighbor] = current;
      if (neighbor === toRoomId) {
        const path = [toRoomId];
        let node = toRoomId;
        while (node !== fromRoomId) {
          node = previous[node]!;
          path.push(node);
        }
        return path.reverse();
      }
      queue.push(neighbor);
    }
  }
  return undefined;
}

/**
 * Emit a noise event. Pure passthrough today — the single point every
 * source of noise (movement, combat, lockwork, flight, cranking) should
 * route through, so future hooks (logging, alertness feed) have one seam.
 */
export function emitNoise(event: NoiseEvent): NoiseEvent {
  return event;
}

/**
 * Whether a hunter standing in `hunterRoomId` hears a noise: true when the
 * noise's loudness is at least the graph distance to the hunter.
 */
export function hunterHears(noise: NoiseEvent, hunterRoomId: string, adjacency: RoomAdjacency): boolean {
  const distance = graphDistance(adjacency, noise.roomId, hunterRoomId);
  if (distance === undefined) return false;
  return noise.loudness >= distance;
}
