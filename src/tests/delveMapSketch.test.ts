import { describe, expect, it } from "vitest";
import { createDelveRun } from "../game/delve/delveRun";
import { buildMapSketch } from "../screens/delveMapSketch";

const PLACE_ID = "goblinWarrens";

describe("buildMapSketch", () => {
  it("returns just the entrance for a fresh run", () => {
    const state = createDelveRun({ placeId: PLACE_ID, seed: "sketch-1", flasksPacked: 1 });
    const sketch = buildMapSketch(state);
    expect(sketch.nodes).toHaveLength(1);
    expect(sketch.nodes[0]).toMatchObject({ id: "gullet", landmark: true, current: true, col: 0, row: 0 });
    expect(sketch.edges).toEqual([]);
  });

  it("only includes visited rooms and edges between visited rooms", () => {
    const state = createDelveRun({ placeId: PLACE_ID, seed: "sketch-2", flasksPacked: 1 });
    const withVisits = {
      ...state,
      currentRoomId: "tallow_gallery",
      visitedRoomIds: ["gullet", "antechamber", "tallow_gallery"]
    };
    const sketch = buildMapSketch(withVisits);

    const ids = sketch.nodes.map(n => n.id);
    expect(ids).toEqual(["gullet", "antechamber", "tallow_gallery"]);
    expect(sketch.nodes.find(n => n.id === "tallow_gallery")).toMatchObject({ current: true, landmark: true });

    // candle_row is adjacent to tallow_gallery but unvisited — no edge to it.
    expect(sketch.edges.some(e => e.from === "candle_row" || e.to === "candle_row")).toBe(false);
    // gullet -> antechamber -> tallow_gallery are all visited and connected.
    const edgeSet = new Set(sketch.edges.map(e => [e.from, e.to].sort().join("::")));
    expect(edgeSet.has(["gullet", "antechamber"].sort().join("::"))).toBe(true);
    expect(edgeSet.has(["antechamber", "tallow_gallery"].sort().join("::"))).toBe(true);
  });

  it("lays rooms out in columns by BFS distance from the entrance", () => {
    const state = createDelveRun({ placeId: PLACE_ID, seed: "sketch-3", flasksPacked: 1 });
    const withVisits = {
      ...state,
      visitedRoomIds: ["gullet", "antechamber", "tallow_gallery"]
    };
    const sketch = buildMapSketch(withVisits);
    const colOf = (id: string) => sketch.nodes.find(n => n.id === id)!.col;
    expect(colOf("gullet")).toBe(0);
    expect(colOf("antechamber")).toBe(1);
    expect(colOf("tallow_gallery")).toBe(2);
  });

  it("dedupes reciprocal edges (each connection appears once)", () => {
    const state = createDelveRun({ placeId: PLACE_ID, seed: "sketch-4", flasksPacked: 1 });
    const withVisits = { ...state, visitedRoomIds: ["gullet", "antechamber"] };
    const sketch = buildMapSketch(withVisits);
    expect(sketch.edges).toHaveLength(1);
  });
});
