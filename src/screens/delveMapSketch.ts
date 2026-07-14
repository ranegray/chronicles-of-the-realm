// Pure view-model for the "consult the map" sketch (issue #38, Pillar 4:
// "the map is an item"). Turns the authored place layout plus the run's
// visitedRoomIds into a small abstract diagram — not a geographic minimap,
// just visited rooms and landmarks laid out by BFS distance from the
// entrance, with edges between visited rooms that are directly connected.
// No React here; DelveScreen renders the shape this produces.
import { buildAdjacency, getPlace } from "../game/delve/place";
import { bfsDistances } from "../game/delve/noise";
import type { DelveRunState } from "../game/delve/types";

export interface MapSketchNode {
  id: string;
  name: string;
  landmark: boolean;
  current: boolean;
  /** BFS distance from the floor's entrance — the sketch's column. */
  col: number;
  /** Position within its column, in visit order. */
  row: number;
}

export interface MapSketchEdge {
  from: string;
  to: string;
}

export interface MapSketch {
  nodes: MapSketchNode[];
  edges: MapSketchEdge[];
  columns: number;
  maxRows: number;
}

const EMPTY_SKETCH: MapSketch = { nodes: [], edges: [], columns: 0, maxRows: 0 };

/**
 * Build the map sketch for the current floor. Returns an empty sketch if the
 * place/floor can't be resolved (defensive; callers should already be
 * gating this on hasMapItem).
 */
export function buildMapSketch(state: DelveRunState): MapSketch {
  const place = getPlace(state.placeId);
  const floor = place.floors.find(f => f.floor === state.floor);
  if (!floor) return EMPTY_SKETCH;

  const adjacency = buildAdjacency(floor);
  const distances = bfsDistances(adjacency, floor.entranceRoomId);
  const visited = new Set(state.visitedRoomIds);

  // Preserve visitedRoomIds' order (the order rooms were first entered) so
  // the sketch reads as "how you learned the place," not a re-sorted map.
  const visitedRooms = state.visitedRoomIds
    .map(id => floor.rooms.find(r => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const rowByColumn = new Map<number, number>();
  const nodes: MapSketchNode[] = visitedRooms.map(room => {
    const col = distances[room.id] ?? 0;
    const row = rowByColumn.get(col) ?? 0;
    rowByColumn.set(col, row + 1);
    return {
      id: room.id,
      name: room.name,
      landmark: Boolean(room.landmark),
      current: room.id === state.currentRoomId,
      col,
      row
    };
  });

  const edgeKeys = new Set<string>();
  const edges: MapSketchEdge[] = [];
  for (const room of visitedRooms) {
    for (const exit of room.exits) {
      if (!visited.has(exit.to)) continue;
      const key = [room.id, exit.to].sort().join("::");
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ from: room.id, to: exit.to });
    }
  }

  const columns = nodes.reduce((max, n) => Math.max(max, n.col + 1), 0);
  const maxRows = [...rowByColumn.values()].reduce((max, n) => Math.max(max, n), 0);

  return { nodes, edges, columns, maxRows };
}
