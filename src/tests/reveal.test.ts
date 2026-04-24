import { describe, it, expect } from "vitest";
import { getRoomRevealPreview } from "../game/reveal";
import type { Character, DungeonRoom, VillageState } from "../game/types";

function makeRoom(partial: Partial<DungeonRoom> = {}): DungeonRoom {
  return {
    id: "r1",
    type: "combat",
    biome: "crypt",
    title: "A cold hall",
    description: "",
    dangerRating: 2,
    connectedRoomIds: [],
    visited: false,
    completed: false,
    ...partial
  };
}

function makeCharacter(trapSense: number): Character {
  return {
    id: "c1",
    name: "Test",
    ancestryId: "human",
    classId: "warrior",
    level: 1,
    xp: 0,
    abilityScores: { might: 10, agility: 10, endurance: 10, intellect: 10, will: 10, presence: 10 },
    derivedStats: {
      maxHp: 20, armor: 0, accuracy: 0, evasion: 10, critChance: 0,
      carryCapacity: 20, magicPower: 0, trapSense
    },
    hp: 20,
    maxHp: 20,
    equipped: {}
  };
}

function makeVillage(cartographerLevel: number | null): VillageState {
  const npcs: VillageState["npcs"] = [];
  if (cartographerLevel !== null) {
    npcs.push({
      id: "carto",
      name: "The Mapper",
      role: "cartographer",
      personality: "Observant",
      description: "",
      serviceLevel: cartographerLevel,
      relationship: 0,
      questIds: []
    });
  }
  return { name: "Testhold", npcs, quests: [], unlockFlags: {} };
}

describe("getRoomRevealPreview", () => {
  it("visited rooms reveal everything", () => {
    const preview = getRoomRevealPreview({
      room: makeRoom({ visited: true }),
      character: makeCharacter(0),
      village: makeVillage(1)
    });
    expect(preview.visited).toBe(true);
    expect(preview.knowsDanger).toBe(true);
    expect(preview.knowsType).toBe(true);
  });

  it("cartographer level 1 reveals nothing extra", () => {
    const preview = getRoomRevealPreview({
      room: makeRoom(),
      character: makeCharacter(0),
      village: makeVillage(1)
    });
    expect(preview.knowsDanger).toBe(false);
    expect(preview.knowsType).toBe(false);
  });

  it("cartographer level 2 reveals danger", () => {
    const preview = getRoomRevealPreview({
      room: makeRoom(),
      character: makeCharacter(0),
      village: makeVillage(2)
    });
    expect(preview.knowsDanger).toBe(true);
    expect(preview.knowsType).toBe(false);
  });

  it("cartographer level 3 reveals type and danger", () => {
    const preview = getRoomRevealPreview({
      room: makeRoom(),
      character: makeCharacter(0),
      village: makeVillage(3)
    });
    expect(preview.knowsDanger).toBe(true);
    expect(preview.knowsType).toBe(true);
    expect(preview.sourceLabel).toContain("Cartographer");
  });

  it("trap sense 2 warns only on trap rooms", () => {
    const onTrap = getRoomRevealPreview({
      room: makeRoom({ type: "trap" }),
      character: makeCharacter(2),
      village: makeVillage(1)
    });
    expect(onTrap.trapWarning).toBe(true);

    const onCombat = getRoomRevealPreview({
      room: makeRoom({ type: "combat" }),
      character: makeCharacter(2),
      village: makeVillage(1)
    });
    expect(onCombat.trapWarning).toBe(false);
  });

  it("no village: still reveals nothing extra", () => {
    const preview = getRoomRevealPreview({
      room: makeRoom(),
      character: makeCharacter(0)
    });
    expect(preview.knowsDanger).toBe(false);
    expect(preview.knowsType).toBe(false);
  });
});
