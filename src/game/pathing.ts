import type { DungeonRun, DungeonRoom } from "./types";

/**
 * BFS shortest distance (in rooms) from `fromId` to the nearest room satisfying
 * `predicate`. Traverses the whole graph regardless of visited state unless
 * `throughVisitedOnly` is true.
 */
export function shortestDistance(
  run: DungeonRun,
  fromId: string,
  predicate: (room: DungeonRoom) => boolean,
  throughVisitedOnly = false
): number | undefined {
  const byId = new Map(run.roomGraph.map(r => [r.id, r] as const));
  const start = byId.get(fromId);
  if (!start) return undefined;
  if (predicate(start)) return 0;

  const queue: Array<{ id: string; d: number }> = [{ id: fromId, d: 0 }];
  const seen = new Set<string>([fromId]);
  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    const room = byId.get(id);
    if (!room) continue;
    for (const nbId of room.connectedRoomIds) {
      if (seen.has(nbId)) continue;
      if (throughVisitedOnly && !run.visitedRoomIds.includes(nbId)) continue;
      seen.add(nbId);
      const nb = byId.get(nbId);
      if (!nb) continue;
      if (predicate(nb)) return d + 1;
      queue.push({ id: nbId, d: d + 1 });
    }
  }
  return undefined;
}

/**
 * Distance in rooms from `fromId` to the nearest extraction point.
 * Returns both the absolute shortest path (through any room) and whether the
 * player had already visited an extraction.
 */
export function extractionDistances(
  run: DungeonRun,
  fromId: string
): { absolute?: number; knownVisited?: number } {
  const absolute = shortestDistance(run, fromId, r => r.extractionPoint === true, false);
  const knownVisited = shortestDistance(
    run,
    fromId,
    r => r.extractionPoint === true && run.visitedRoomIds.includes(r.id),
    true
  );
  return { absolute, knownVisited };
}

/**
 * Returns the id of the immediate neighbor that lies on the shortest path
 * from `fromId` toward the nearest known (visited) extraction, or undefined
 * if no such path exists.
 */
export function nextStepToKnownExtraction(
  run: DungeonRun,
  fromId: string
): string | undefined {
  const byId = new Map(run.roomGraph.map(r => [r.id, r] as const));
  const start = byId.get(fromId);
  if (!start) return undefined;
  // If we're standing on an extraction, no step is needed.
  if (start.extractionPoint) return undefined;

  const parents = new Map<string, string>();
  const queue: string[] = [fromId];
  const seen = new Set<string>([fromId]);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const room = byId.get(id);
    if (!room) continue;
    if (id !== fromId && room.extractionPoint && run.visitedRoomIds.includes(id)) {
      // Walk back from `id` to find the direct neighbor of `fromId`.
      let cur: string = id;
      while (parents.get(cur) !== fromId) {
        const parent = parents.get(cur);
        if (!parent) return undefined;
        cur = parent;
      }
      return cur;
    }
    for (const nbId of room.connectedRoomIds) {
      if (seen.has(nbId)) continue;
      if (!run.visitedRoomIds.includes(nbId)) continue;
      seen.add(nbId);
      parents.set(nbId, id);
      queue.push(nbId);
    }
  }
  return undefined;
}
