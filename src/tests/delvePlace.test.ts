import { describe, it, expect } from "vitest";
import { createRng } from "../game/rng";
import { getPlace, validatePlace, buildAdjacency, populateFloor } from "../game/delve/place";
import { GOBLIN_WARRENS } from "../game/delve/places/goblinWarrens";
import type { Place, PlaceFloor, PlaceRoom } from "../game/delve/types";

function room(partial: Partial<PlaceRoom> & { id: string }): PlaceRoom {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    prose: partial.prose ?? ["A room."],
    landmark: partial.landmark,
    junction: partial.junction,
    exits: partial.exits ?? [],
    lootTableId: partial.lootTableId,
    hunterSpawn: partial.hunterSpawn,
    supplySpawn: partial.supplySpawn
  };
}

function makePlace(floors: PlaceFloor[]): Place {
  return { id: "test_place", name: "Test Place", biome: "goblinWarrens", floors };
}

function baseFloor(rooms: PlaceRoom[], overrides: Partial<PlaceFloor> = {}): PlaceFloor {
  return {
    floor: 1,
    entranceRoomId: rooms[0]!.id,
    rooms,
    extracts: [{ id: "ex1", roomId: rooms[rooms.length - 1]!.id, label: "Out", condition: "alwaysOpen" }],
    hunterBudget: { min: 1, max: 1 },
    ...overrides
  };
}

describe("validatePlace", () => {
  it("accepts a small well-formed floor", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "north", to: "b" }], hunterSpawn: true }),
      room({ id: "b", exits: [{ direction: "south", to: "a" }] })
    ];
    const place = makePlace([baseFloor(rooms, { extracts: [{ id: "ex1", roomId: "b", label: "Out", condition: "alwaysOpen" }] })]);
    expect(() => validatePlace(place)).not.toThrow();
  });

  it("throws when an exit points to an unknown room", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "north", to: "ghost" }], hunterSpawn: true }),
      room({ id: "b", exits: [] })
    ];
    const place = makePlace([baseFloor(rooms)]);
    expect(() => validatePlace(place)).toThrow(/unknown room "ghost"/);
  });

  it("throws when an exit has no reciprocal and is not marked oneWay", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "north", to: "b" }], hunterSpawn: true }),
      room({ id: "b", exits: [] })
    ];
    const place = makePlace([baseFloor(rooms, { extracts: [{ id: "ex1", roomId: "b", label: "Out", condition: "alwaysOpen" }] })]);
    expect(() => validatePlace(place)).toThrow(/no reciprocal exit/);
  });

  it("allows a oneWay exit with no reciprocal", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "down", to: "b", oneWay: true }], hunterSpawn: true }),
      room({ id: "b", exits: [] })
    ];
    const place = makePlace([baseFloor(rooms, { extracts: [{ id: "ex1", roomId: "b", label: "Out", condition: "alwaysOpen" }] })]);
    expect(() => validatePlace(place)).not.toThrow();
  });

  it("throws when a room is unreachable from the entrance", () => {
    const rooms = [
      room({ id: "a", exits: [], hunterSpawn: true }),
      room({ id: "b", exits: [] })
    ];
    const place = makePlace([baseFloor(rooms, { extracts: [{ id: "ex1", roomId: "a", label: "Out", condition: "alwaysOpen" }] })]);
    expect(() => validatePlace(place)).toThrow(/not reachable/);
  });

  it("throws when a room has two exits in the same direction", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "north", to: "b" }, { direction: "north", to: "c" }], hunterSpawn: true }),
      room({ id: "b", exits: [{ direction: "south", to: "a" }] }),
      room({ id: "c", exits: [{ direction: "south", to: "a" }] })
    ];
    const place = makePlace([baseFloor(rooms, { extracts: [{ id: "ex1", roomId: "b", label: "Out", condition: "alwaysOpen" }] })]);
    expect(() => validatePlace(place)).toThrow(/more than one exit in direction "north"/);
  });

  it("throws when an extract references an unknown room", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "north", to: "b" }], hunterSpawn: true }),
      room({ id: "b", exits: [{ direction: "south", to: "a" }] })
    ];
    const place = makePlace([baseFloor(rooms, {
      extracts: [{ id: "ex1", roomId: "ghost_room", label: "Out", condition: "alwaysOpen" }]
    })]);
    expect(() => validatePlace(place)).toThrow(/extract "ex1" references unknown room/);
  });

  it("throws when entranceRoomId does not exist", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "north", to: "b" }], hunterSpawn: true }),
      room({ id: "b", exits: [{ direction: "south", to: "a" }] })
    ];
    const place = makePlace([baseFloor(rooms, {
      entranceRoomId: "nope",
      extracts: [{ id: "ex1", roomId: "b", label: "Out", condition: "alwaysOpen" }]
    })]);
    expect(() => validatePlace(place)).toThrow(/entranceRoomId "nope" does not exist/);
  });

  it("throws when hunterSpawn rooms are fewer than hunterBudget.max", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "north", to: "b" }] }),
      room({ id: "b", exits: [{ direction: "south", to: "a" }] })
    ];
    const place = makePlace([baseFloor(rooms, {
      hunterBudget: { min: 1, max: 3 },
      extracts: [{ id: "ex1", roomId: "b", label: "Out", condition: "alwaysOpen" }]
    })]);
    expect(() => validatePlace(place)).toThrow(/hunterSpawn rooms/);
  });

  it("throws when a floor has no extracts at all", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "north", to: "b" }], hunterSpawn: true }),
      room({ id: "b", exits: [{ direction: "south", to: "a" }] })
    ];
    const place = makePlace([baseFloor(rooms, { extracts: [] })]);
    expect(() => validatePlace(place)).toThrow(/has no extracts/);
  });

  // ---------------------------------------------------------------------
  // Exit-count budget & junctions (issue #38: fewer exits per room)
  // ---------------------------------------------------------------------
  function hubAndLeaves(hubOverrides: Partial<PlaceRoom> = {}): PlaceRoom[] {
    return [
      room({
        id: "hub",
        hunterSpawn: true,
        exits: [
          { direction: "north", to: "b" },
          { direction: "east", to: "c" },
          { direction: "south", to: "d" },
          { direction: "west", to: "e" }
        ],
        ...hubOverrides
      }),
      room({ id: "b", exits: [{ direction: "south", to: "hub" }] }),
      room({ id: "c", exits: [{ direction: "west", to: "hub" }] }),
      room({ id: "d", exits: [{ direction: "north", to: "hub" }] }),
      room({ id: "e", exits: [{ direction: "east", to: "hub" }] })
    ];
  }

  it("throws when a non-junction room has more than 3 exits", () => {
    const place = makePlace([
      baseFloor(hubAndLeaves(), { extracts: [{ id: "ex1", roomId: "e", label: "Out", condition: "alwaysOpen" }] })
    ]);
    expect(() => validatePlace(place)).toThrow(/"hub" has 4 exits, max 3/);
  });

  it("throws when a junction room is not also a landmark", () => {
    const place = makePlace([
      baseFloor(hubAndLeaves({ junction: true }), {
        extracts: [{ id: "ex1", roomId: "e", label: "Out", condition: "alwaysOpen" }]
      })
    ]);
    expect(() => validatePlace(place)).toThrow(/"hub" is a junction but not a landmark/);
  });

  it("allows a junction+landmark room up to 4 exits", () => {
    const place = makePlace([
      baseFloor(hubAndLeaves({ junction: true, landmark: true }), {
        extracts: [{ id: "ex1", roomId: "e", label: "Out", condition: "alwaysOpen" }]
      })
    ]);
    expect(() => validatePlace(place)).not.toThrow();
  });

  it("throws when even a junction room exceeds 4 exits", () => {
    const rooms = hubAndLeaves({ junction: true, landmark: true });
    const hub = rooms[0]!;
    rooms[0] = { ...hub, exits: [...hub.exits, { direction: "up", to: "f" }] };
    rooms.push(room({ id: "f", exits: [{ direction: "down", to: "hub" }] }));
    const place = makePlace([
      baseFloor(rooms, { extracts: [{ id: "ex1", roomId: "e", label: "Out", condition: "alwaysOpen" }] })
    ]);
    expect(() => validatePlace(place)).toThrow(/"hub" has 5 exits, max 4/);
  });

  it("throws when a floor has more than 2 junction rooms", () => {
    const rooms = [
      room({ id: "a", landmark: true, junction: true, hunterSpawn: true, exits: [{ direction: "north", to: "b" }] }),
      room({ id: "b", landmark: true, junction: true, exits: [{ direction: "south", to: "a" }, { direction: "north", to: "c" }] }),
      room({ id: "c", landmark: true, junction: true, exits: [{ direction: "south", to: "b" }] })
    ];
    const place = makePlace([
      baseFloor(rooms, { extracts: [{ id: "ex1", roomId: "c", label: "Out", condition: "alwaysOpen" }] })
    ]);
    expect(() => validatePlace(place)).toThrow(/has 3 junction rooms, max 2/);
  });

  it("goblinWarrens has exactly 2 junction rooms per floor, each a landmark with at most 4 exits", () => {
    for (const floor of GOBLIN_WARRENS.floors) {
      const junctions = floor.rooms.filter(r => r.junction);
      expect(junctions.length).toBe(2);
      for (const j of junctions) {
        expect(j.landmark).toBe(true);
        expect(j.exits.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it("goblinWarrens has no more than 3 exits on any non-junction room", () => {
    for (const floor of GOBLIN_WARRENS.floors) {
      for (const room of floor.rooms) {
        if (room.junction) continue;
        expect(room.exits.length).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("buildAdjacency", () => {
  it("honors oneWay exits (no reverse edge)", () => {
    const rooms = [
      room({ id: "a", exits: [{ direction: "down", to: "b", oneWay: true }] }),
      room({ id: "b", exits: [{ direction: "north", to: "c" }] }),
      room({ id: "c", exits: [{ direction: "south", to: "b" }] })
    ];
    const floor = baseFloor(rooms);
    const adjacency = buildAdjacency(floor);
    expect(adjacency["a"]).toEqual(["b"]);
    expect(adjacency["b"]).toEqual(["c"]);
    expect(adjacency["b"]).not.toContain("a");
  });
});

describe("goblinWarrens place", () => {
  it("passes validation", () => {
    expect(() => validatePlace(GOBLIN_WARRENS)).not.toThrow();
  });

  it("is retrievable from the registry", () => {
    expect(getPlace("goblinWarrens")).toBe(GOBLIN_WARRENS);
    expect(() => getPlace("nope")).toThrow(/Unknown place/);
  });

  it("has two floors of 25-30 rooms each with the required extracts", () => {
    expect(GOBLIN_WARRENS.floors).toHaveLength(2);
    for (const floor of GOBLIN_WARRENS.floors) {
      expect(floor.rooms.length).toBeGreaterThanOrEqual(25);
      expect(floor.rooms.length).toBeLessThanOrEqual(30);
    }
    const floor1 = GOBLIN_WARRENS.floors[0]!;
    const extractLabels = floor1.extracts.map(e => e.label).sort();
    expect(extractLabels).toEqual(
      ["The flooded stair", "The rope winch", "The Gullet — the way you came in"].sort()
    );
    const barredDoor = floor1.extracts.find(e => e.label === "The Gullet — the way you came in")!;
    expect(barredDoor.condition).toBe("closesAtAlertness");
    expect(barredDoor.alertnessLevel).toBe(3);
    expect(barredDoor.roomId).toBe(floor1.entranceRoomId);
    const flooded = floor1.extracts.find(e => e.label === "The flooded stair")!;
    expect(flooded.condition).toBe("waterClock");
    const winch = floor1.extracts.find(e => e.label === "The rope winch")!;
    expect(winch.condition).toBe("cranked");
    expect(winch.cranksRequired).toBe(3);
  });

  it("has at least 5 landmark rooms per floor", () => {
    for (const floor of GOBLIN_WARRENS.floors) {
      const landmarks = floor.rooms.filter(r => r.landmark);
      expect(landmarks.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("has at least 8 hunterSpawn and 4 supplySpawn rooms per floor", () => {
    for (const floor of GOBLIN_WARRENS.floors) {
      expect(floor.rooms.filter(r => r.hunterSpawn).length).toBeGreaterThanOrEqual(8);
      expect(floor.rooms.filter(r => r.supplySpawn).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("has at least two oneWay shortcuts per floor", () => {
    for (const floor of GOBLIN_WARRENS.floors) {
      const oneWayCount = floor.rooms.flatMap(r => r.exits).filter(e => e.oneWay).length;
      expect(oneWayCount).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("populateFloor", () => {
  const floor = GOBLIN_WARRENS.floors[0]!;

  it("is deterministic for the same seed", () => {
    const a = populateFloor({ floor, rng: createRng("delve-seed-1"), tier: 1 });
    const b = populateFloor({ floor, rng: createRng("delve-seed-1"), tier: 1 });
    expect(a).toEqual(b);
  });

  it("differs for different seeds (with overwhelming likelihood)", () => {
    const a = populateFloor({ floor, rng: createRng("delve-seed-A"), tier: 1 });
    const b = populateFloor({ floor, rng: createRng("delve-seed-B"), tier: 1 });
    expect(a).not.toEqual(b);
  });

  it("picks one prose variant per room from the room's own pool", () => {
    const result = populateFloor({ floor, rng: createRng("prose-check"), tier: 1 });
    for (const room of floor.rooms) {
      expect(room.prose).toContain(result.roomProse[room.id]);
    }
  });

  it("respects hunterBudget when choosing hunter spawn rooms", () => {
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const result = populateFloor({ floor, rng: createRng(seed), tier: 1 });
      expect(result.hunterSpawnRoomIds.length).toBeGreaterThanOrEqual(floor.hunterBudget.min);
      expect(result.hunterSpawnRoomIds.length).toBeLessThanOrEqual(floor.hunterBudget.max);
      for (const roomId of result.hunterSpawnRoomIds) {
        const r = floor.rooms.find(fr => fr.id === roomId)!;
        expect(r.hunterSpawn).toBe(true);
      }
    }
  });

  it("also respects budgets and pools on floor 2 (not just floor 1)", () => {
    const floor2 = GOBLIN_WARRENS.floors[1]!;
    for (const seed of ["f2-s1", "f2-s2", "f2-s3"]) {
      const result = populateFloor({ floor: floor2, rng: createRng(seed), tier: 1 });
      expect(result.hunterSpawnRoomIds.length).toBeGreaterThanOrEqual(floor2.hunterBudget.min);
      expect(result.hunterSpawnRoomIds.length).toBeLessThanOrEqual(floor2.hunterBudget.max);
      for (const roomId of result.hunterSpawnRoomIds) {
        expect(floor2.rooms.find(r => r.id === roomId)!.hunterSpawn).toBe(true);
      }
      expect(result.supplyRoomIds.length).toBeGreaterThanOrEqual(2);
      expect(result.supplyRoomIds.length).toBeLessThanOrEqual(3);
      for (const { roomId } of result.supplyRoomIds) {
        expect(floor2.rooms.find(r => r.id === roomId)!.supplySpawn).toBe(true);
      }
    }
    const a = populateFloor({ floor: floor2, rng: createRng("f2-determinism"), tier: 1 });
    const b = populateFloor({ floor: floor2, rng: createRng("f2-determinism"), tier: 1 });
    expect(a).toEqual(b);
  });

  it("places 2-3 supply caches only in supplySpawn rooms", () => {
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const result = populateFloor({ floor, rng: createRng(seed), tier: 1 });
      expect(result.supplyRoomIds.length).toBeGreaterThanOrEqual(2);
      expect(result.supplyRoomIds.length).toBeLessThanOrEqual(3);
      for (const { roomId, kind } of result.supplyRoomIds) {
        const r = floor.rooms.find(fr => fr.id === roomId)!;
        expect(r.supplySpawn).toBe(true);
        expect(["oilFlask", "rations"]).toContain(kind);
      }
    }
  });

  it("marks every room with a lootTableId as a loot room", () => {
    const result = populateFloor({ floor, rng: createRng("loot-check"), tier: 1 });
    const expected = floor.rooms.filter(r => r.lootTableId).map(r => r.id).sort();
    expect(result.lootRoomIds.slice().sort()).toEqual(expected);
  });

  it("only rolls doorOverrides for exits with a doorStates pool, and never for open", () => {
    const result = populateFloor({ floor, rng: createRng("door-check"), tier: 1 });
    const exitsWithPools = new Set<string>();
    for (const room of floor.rooms) {
      for (const exit of room.exits) {
        if (exit.doorStates && exit.doorStates.length > 0) {
          exitsWithPools.add(`${room.id}:${exit.direction}`);
        }
      }
    }
    for (const key of Object.keys(result.doorOverrides)) {
      expect(exitsWithPools.has(key)).toBe(true);
      expect(result.doorOverrides[key]).not.toBe("open");
    }
  });
});
