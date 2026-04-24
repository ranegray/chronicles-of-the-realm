import { describe, it, expect } from "vitest";
import { generateDungeonRun, generateRoomGraph } from "../game/dungeonGenerator";
import { RUN_RULES } from "../game/constants";

describe("dungeonGenerator", () => {
  it("generates the same room graph for the same seed", () => {
    const a = generateRoomGraph("seed-XYZ", "crypt", 1);
    const b = generateRoomGraph("seed-XYZ", "crypt", 1);
    expect(a.length).toEqual(b.length);
    expect(a.map(r => r.type)).toEqual(b.map(r => r.type));
    expect(a.map(r => [r.mapX, r.mapY])).toEqual(b.map(r => [r.mapX, r.mapY]));
  });

  it("includes required rooms (entrance, combat, treasure, extraction)", () => {
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const rooms = generateRoomGraph(seed, "goblinWarrens", 1);
      expect(rooms.some(r => r.type === "entrance")).toBe(true);
      expect(rooms.some(r => r.type === "combat")).toBe(true);
      expect(rooms.some(r => r.type === "treasure")).toBe(true);
      expect(rooms.some(r => r.type === "extraction")).toBe(true);
    }
  });

  it("keeps an extraction point even when a boss room is generated", () => {
    for (let i = 0; i < 250; i++) {
      const rooms = generateRoomGraph(`boss-extract-${i}`, "crypt", 1);
      expect(rooms.some(r => r.type === "extraction")).toBe(true);
      expect(rooms.some(r => r.extractionPoint)).toBe(true);
    }
  });

  it("can generate deeper floors before dedicated tier tables exist", () => {
    const rooms = generateRoomGraph("depth-two", "sunkenTemple", 2);
    expect(rooms.some(r => r.type === "entrance")).toBe(true);
    expect(rooms.some(r => r.type === "extraction")).toBe(true);
  });

  it("respects tier-1 room count bounds", () => {
    for (const seed of ["a", "b", "c"]) {
      const rooms = generateRoomGraph(seed, "fungalCaverns", 1);
      expect(rooms.length).toBeGreaterThanOrEqual(RUN_RULES.tierOneMinRooms);
      expect(rooms.length).toBeLessThanOrEqual(RUN_RULES.tierOneMaxRooms);
    }
  });

  it("starts at the entrance and the entrance is connected", () => {
    const run = generateDungeonRun({ seed: "start", biome: "crypt", tier: 1 });
    const entrance = run.roomGraph.find(r => r.type === "entrance")!;
    expect(run.currentRoomId).toEqual(entrance.id);
    expect(entrance.connectedRoomIds.length).toBeGreaterThan(0);
  });

  it("places rooms on unique grid coordinates", () => {
    const rooms = generateRoomGraph("grid", "ruinedKeep", 1);
    const coords = rooms.map(r => `${r.mapX},${r.mapY}`);
    expect(new Set(coords).size).toBe(rooms.length);
  });

  it("only connects rooms through cardinal grid neighbors", () => {
    const rooms = generateRoomGraph("cardinal", "oldMine", 1);
    for (const room of rooms) {
      for (const id of room.connectedRoomIds) {
        const neighbor = rooms.find(r => r.id === id)!;
        const distance = Math.abs((room.mapX ?? 0) - (neighbor.mapX ?? 0)) +
          Math.abs((room.mapY ?? 0) - (neighbor.mapY ?? 0));
        expect(distance).toBe(1);
      }
    }
  });

  it("limits each room to four attached rooms", () => {
    for (const seed of ["forked", "dense", "looped", "wide"]) {
      const rooms = generateRoomGraph(seed, "sunkenTemple", 1);
      for (const room of rooms) {
        expect(room.connectedRoomIds.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it("generates a runId and seed", () => {
    const run = generateDungeonRun({ seed: "ids" });
    expect(run.runId).toMatch(/^run_/);
    expect(run.seed).toEqual("ids");
  });
});
