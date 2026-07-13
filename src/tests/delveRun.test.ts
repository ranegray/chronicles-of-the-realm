import { describe, expect, it } from "vitest";
import { applyDelveAction, createDelveRun, DEFAULT_WATER_CLOCK } from "../game/delve/delveRun";
import { buildAdjacency, getPlace } from "../game/delve/place";
import { getLightState } from "../game/delve/lamp";
import { bfsDistances, bfsPath } from "../game/delve/noise";
import type {
  DelveAction,
  DelveActionResult,
  DelveRunDeps,
  DelveRunEvent,
  DelveRunState,
  Direction,
  PlaceFloor
} from "../game/delve/types";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { getThreatLevelFromPoints } from "../game/threat";
import { THREAT_RULES } from "../game/constants";
import type { Character, ItemInstance } from "../game/types";

const PLACE_ID = "goblinWarrens";
const HUNTING_POINTS = THREAT_RULES.thresholds.find(t => t.label === "Hunting")!.minPoints;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function buildCharacter(seed: string): Character {
  let draft = createEmptyDraft(seed);
  draft = CharacterCreationService.setName(draft, "Delver");
  draft = CharacterCreationService.selectAncestry(draft, "human");
  draft = CharacterCreationService.selectClass(draft, "warrior");
  draft = CharacterCreationService.rollAllAbilityScores(draft);
  draft = CharacterCreationService.autoAssignScoresForClass(draft);
  draft = CharacterCreationService.chooseStarterKit(draft, "warrior_sword_shield");
  return CharacterCreationService.finalizeCharacter(draft).character;
}

interface Harness {
  state: DelveRunState;
  character: Character;
  carried: ItemInstance[];
  events: DelveRunEvent[];
}

function makeHarness(seed: string, runOverrides: Partial<Parameters<typeof createDelveRun>[0]> = {}): Harness {
  return {
    state: createDelveRun({ placeId: PLACE_ID, seed, flasksPacked: 1, ...runOverrides }),
    character: buildCharacter(seed),
    carried: [],
    events: []
  };
}

function depsOf(h: Harness): DelveRunDeps {
  return {
    character: h.character,
    carriedItems: h.carried,
    carriedWeight: h.carried.reduce((sum, i) => sum + i.weight * i.quantity, 0),
    carryCapacity: h.character.derivedStats.carryCapacity
  };
}

/** Apply an action and fold hp/inventory events back into the harness, the way the store would. */
function act(h: Harness, action: DelveAction): DelveActionResult {
  const result = applyDelveAction(h.state, action, depsOf(h));
  h.state = result.state;
  for (const event of result.events) {
    h.events.push(event);
    if (event.kind === "hpDelta") {
      h.character = {
        ...h.character,
        hp: Math.min(h.character.maxHp, h.character.hp + event.amount)
      };
    } else if (event.kind === "itemsTaken") {
      h.carried = [...h.carried, ...event.items];
    } else if (event.kind === "flaskConsumed") {
      const idx = h.carried.findIndex(i => i.tags?.includes("oilFlask"));
      if (idx >= 0) h.carried = h.carried.filter((_, i) => i !== idx);
    } else if (event.kind === "itemConsumed") {
      const idx = h.carried.findIndex(i => i.tags?.includes(event.tag));
      if (idx >= 0) h.carried = h.carried.filter((_, i) => i !== idx);
    }
  }
  return result;
}

/** Resolve any active encounter with fight beats (press), up to a safety cap. */
function fightItOut(h: Harness): void {
  for (let beat = 0; beat < 12 && h.state.activeEncounter && h.state.status === "active"; beat++) {
    act(h, { type: "fightBeat", stance: "press" });
  }
}

function floor1(): PlaceFloor {
  return getPlace(PLACE_ID).floors[0]!;
}

function directionBetween(floor: PlaceFloor, from: string, to: string): Direction {
  const direction = floor.rooms.find(r => r.id === from)?.exits.find(e => e.to === to)?.direction;
  if (!direction) throw new Error(`No exit ${from} -> ${to}`);
  return direction;
}

/** Walk toward a room, resolving encounters and locked doors along the way. */
function walkTo(h: Harness, targetRoomId: string, maxSteps = 60): void {
  const floor = getPlace(PLACE_ID).floors.find(f => f.floor === h.state.floor)!;
  const adjacency = buildAdjacency(floor);
  for (let step = 0; step < maxSteps; step++) {
    if (h.state.status !== "active") return;
    if (h.state.activeEncounter) {
      fightItOut(h);
      continue;
    }
    if (h.state.currentRoomId === targetRoomId) return;
    const path = bfsPath(adjacency, h.state.currentRoomId, targetRoomId);
    if (!path || path.length < 2) throw new Error(`No path ${h.state.currentRoomId} -> ${targetRoomId}`);
    act(h, { type: "move", direction: directionBetween(floor, h.state.currentRoomId, path[1]!) });
  }
  throw new Error(`walkTo(${targetRoomId}) did not arrive in ${maxSteps} steps`);
}

function narrativeText(result: DelveActionResult): string {
  return result.narrative.map(n => n.text).join(" | ");
}

// ---------------------------------------------------------------------------
// createDelveRun
// ---------------------------------------------------------------------------

describe("createDelveRun", () => {
  it("starts at the entrance with a populated floor and dormant hunters", () => {
    const state = createDelveRun({ placeId: PLACE_ID, seed: "start-1" });
    expect(state.currentRoomId).toBe("gullet");
    expect(state.visitedRoomIds).toEqual(["gullet"]);
    expect(state.status).toBe("active");
    expect(state.lamp).toEqual({ oil: 20, capacity: 20, flasksPacked: 1 });
    expect(state.waterClock).toBe(DEFAULT_WATER_CLOCK);
    expect(state.alertness).toBe(0);

    const budget = floor1().hunterBudget;
    expect(state.hunters.length).toBeGreaterThanOrEqual(budget.min);
    expect(state.hunters.length).toBeLessThanOrEqual(budget.max);
    const spawnRooms = new Set(floor1().rooms.filter(r => r.hunterSpawn).map(r => r.id));
    for (const hunter of state.hunters) {
      expect(hunter.state).toBe("dormant");
      expect(spawnRooms.has(hunter.roomId)).toBe(true);
    }

    // Entrance prose + one sense line per exit.
    expect(state.narrative[0]!.kind).toBe("room");
    expect(state.narrative[0]!.text).toContain("The Gullet");
    const senseLines = state.narrative.filter(n => n.kind === "sense");
    expect(senseLines.length).toBe(floor1().rooms.find(r => r.id === "gullet")!.exits.length);
  });

  it("chooses room prose variants and door overrides from the seed", () => {
    const a = createDelveRun({ placeId: PLACE_ID, seed: "pop-a" });
    const b = createDelveRun({ placeId: PLACE_ID, seed: "pop-a" });
    expect(a.roomProse).toEqual(b.roomProse);
    expect(a.doorOverrides).toEqual(b.doorOverrides);
    expect(a.hunters).toEqual(b.hunters);
  });
});

// ---------------------------------------------------------------------------
// move
// ---------------------------------------------------------------------------

describe("move", () => {
  it("spends oil, emits move noise into alertness, ticks the water clock, and appends prose", () => {
    const h = makeHarness("move-1");
    const before = h.state;
    const result = act(h, { type: "move", direction: "south" });
    expect(h.state.currentRoomId).toBe("antechamber");
    expect(h.state.cameFromRoomId).toBe("gullet");
    expect(h.state.lamp.oil).toBe(before.lamp.oil - 1);
    expect(h.state.alertness).toBe(before.alertness + 1); // light pack, bright lamp
    expect(h.state.waterClock).toBe(before.waterClock - 1);
    expect(result.narrative.some(n => n.kind === "room" && n.text.includes("Antechamber"))).toBe(true);
    expect(result.narrative.some(n => n.kind === "sense")).toBe(true);
  });

  it("refuses a direction with no exit at no cost", () => {
    const h = makeHarness("move-2");
    const before = h.state;
    const result = act(h, { type: "move", direction: "west" });
    expect(h.state.currentRoomId).toBe("gullet");
    expect(h.state.lamp.oil).toBe(before.lamp.oil);
    expect(h.state.waterClock).toBe(before.waterClock);
    expect(narrativeText(result)).toContain("no way west");
  });

  it("treats locked doors as lockwork: oil 2, noise 3, may fail, opens on success", () => {
    const h = makeHarness("move-3");
    h.state = { ...h.state, doorOverrides: { ...h.state.doorOverrides, "gullet:south": "locked" } };

    let attempts = 0;
    while (h.state.currentRoomId === "gullet" && attempts < 20) {
      const before = h.state;
      act(h, { type: "move", direction: "south" });
      attempts++;
      expect(h.state.lamp.oil).toBe(Math.max(0, before.lamp.oil - 2));
      expect(h.state.alertness).toBe(before.alertness + 3);
    }
    expect(h.state.currentRoomId).toBe("antechamber");
    expect(h.state.doorOverrides["gullet:south"]).toBeUndefined();
  });

  it("first visit uses the populated prose variant; revisits do not repeat it", () => {
    const h = makeHarness("move-4");
    const first = act(h, { type: "move", direction: "south" });
    fightItOut(h);
    const firstRoomLine = first.narrative.find(n => n.kind === "room");
    expect(firstRoomLine!.text).toContain(h.state.roomProse["antechamber"]!);
    if (h.state.status !== "active") return; // rare hunter ambush on this seed path
    act(h, { type: "move", direction: "north" });
    fightItOut(h);
    if (h.state.status !== "active") return;
    const back = act(h, { type: "move", direction: "south" });
    const revisitLine = back.narrative.find(n => n.kind === "room");
    expect(revisitLine!.text).toBe("Antechamber, again.");
  });
});

// ---------------------------------------------------------------------------
// search & loot
// ---------------------------------------------------------------------------

describe("search", () => {
  it("rolls loot into pendingLoot for marked rooms and emits lootFound", () => {
    const h = makeHarness("search-1");
    walkTo(h, "trade_room");
    expect(h.state.status).toBe("active");
    expect(h.state.lootRoomIds).toContain("trade_room");

    const before = h.state;
    const result = act(h, { type: "search" });
    expect(h.state.lamp.oil).toBe(before.lamp.oil - 2);
    expect(h.state.alertness).toBe(before.alertness + 2);
    const pool = h.state.pendingLoot["trade_room"];
    expect(pool).toBeDefined();
    expect(pool!.items.length).toBeGreaterThan(0);
    expect(pool!.gold).toBeGreaterThan(0);
    expect(result.events.some(e => e.kind === "lootFound")).toBe(true);
    expect(h.state.searchedRoomIds).toContain("trade_room");
  });

  it("finds nothing on a second search of the same room", () => {
    const h = makeHarness("search-2");
    // Not a hunter test: strip hunters so a wandering encounter can't
    // interrupt the second search on this seed (the Warrens' floor-1 layout
    // was re-authored for issue #38's exit-count trim, which shifted BFS
    // distances and, with them, which seeds happen to draw an encounter).
    h.state = { ...h.state, hunters: [] };
    walkTo(h, "trade_room");
    act(h, { type: "search" });
    const poolBefore = h.state.pendingLoot["trade_room"];
    const again = act(h, { type: "search" });
    expect(narrativeText(again)).toContain("already turned this room over");
    expect(h.state.pendingLoot["trade_room"]).toEqual(poolBefore);
  });

  it("supply caches yield oil flasks or rations as items", () => {
    // Force a known cache so the test doesn't depend on the population roll.
    const h = makeHarness("search-3");
    walkTo(h, "antechamber");
    h.state = {
      ...h.state,
      supplyCaches: [{ roomId: "antechamber", kind: "oilFlask", found: false }]
    };
    act(h, { type: "search" });
    const pool = h.state.pendingLoot["antechamber"];
    expect(pool!.items.some(i => i.tags?.includes("oilFlask"))).toBe(true);

    const flasksBefore = h.state.lamp.flasksPacked;
    act(h, { type: "takeAllLoot" });
    expect(h.state.lamp.flasksPacked).toBe(flasksBefore + 1); // bagging a flask stocks the lamp
    expect(h.carried.some(i => i.tags?.includes("oilFlask"))).toBe(true);
  });
});

describe("loot actions", () => {
  function harnessWithLoot(seed: string): Harness {
    const h = makeHarness(seed);
    h.state = { ...h.state, hunters: [] }; // keep the loot mechanics free of ambushes
    walkTo(h, "trade_room");
    act(h, { type: "search" });
    expect(h.state.pendingLoot["trade_room"]).toBeDefined();
    return h;
  }

  it("takeAllLoot moves what fits into the pack and emits itemsTaken; no oil, no noise, no tick", () => {
    const h = harnessWithLoot("loot-1");
    const before = h.state;
    const pool = before.pendingLoot["trade_room"]!;
    const result = act(h, { type: "takeAllLoot" });
    expect(h.state.lamp.oil).toBe(before.lamp.oil);
    expect(h.state.alertness).toBe(before.alertness);
    expect(h.state.waterClock).toBe(before.waterClock);
    const taken = result.events.find(e => e.kind === "itemsTaken");
    expect(taken).toBeDefined();
    if (taken?.kind === "itemsTaken") {
      expect(taken.items.length).toBe(pool.items.length);
      expect(taken.gold).toBe(pool.gold);
    }
    expect(h.state.pendingLoot["trade_room"]).toBeUndefined();
  });

  it("takeLoot refuses an item that exceeds carryCapacity", () => {
    const h = harnessWithLoot("loot-2");
    const anvil: ItemInstance = {
      instanceId: "item_anvil",
      templateId: "anvil",
      name: "Stolen Anvil",
      category: "material",
      rarity: "common",
      description: "Impossibly heavy.",
      value: 50,
      weight: 999,
      stackable: false,
      quantity: 1,
      tags: [],
      affixes: [],
      states: []
    };
    h.state = {
      ...h.state,
      pendingLoot: {
        ...h.state.pendingLoot,
        trade_room: {
          ...h.state.pendingLoot["trade_room"]!,
          items: [...h.state.pendingLoot["trade_room"]!.items, anvil]
        }
      }
    };
    const result = act(h, { type: "takeLoot", itemInstanceId: "item_anvil" });
    expect(narrativeText(result)).toContain("won't fit");
    expect(h.state.pendingLoot["trade_room"]!.items.some(i => i.instanceId === "item_anvil")).toBe(true);
  });

  it("leaveLoot abandons the room's pool", () => {
    const h = harnessWithLoot("loot-3");
    act(h, { type: "leaveLoot" });
    expect(h.state.pendingLoot["trade_room"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// listen, lamp, map
// ---------------------------------------------------------------------------

describe("listen", () => {
  it("hears hunters up to three rooms away, costs 1 oil, emits no noise", () => {
    const h = makeHarness("listen-1");
    // Candle Row is 3 rooms from the gullet (antechamber, tallow gallery, candle row).
    h.state = {
      ...h.state,
      hunters: [{ id: "h1", enemyId: "goblin_snare", roomId: "candle_row", state: "dormant" }]
    };
    const before = h.state;
    const result = act(h, { type: "listen" });
    expect(h.state.lamp.oil).toBe(before.lamp.oil - 1);
    expect(h.state.alertness).toBe(before.alertness); // listening is silent
    expect(h.state.waterClock).toBe(before.waterClock - 1); // but time passes
    expect(narrativeText(result)).toContain("3 rooms off");
  });

  it("reports silence when nothing is within reach", () => {
    const h = makeHarness("listen-2");
    h.state = { ...h.state, hunters: [] };
    const result = act(h, { type: "listen" });
    expect(narrativeText(result)).toContain("Nothing but your own blood");
  });
});

describe("refillLamp", () => {
  it("consumes a packed flask, fills to capacity, no tick", () => {
    const h = makeHarness("lamp-1");
    h.state = { ...h.state, lamp: { ...h.state.lamp, oil: 3 } };
    const before = h.state;
    const result = act(h, { type: "refillLamp" });
    expect(h.state.lamp).toEqual({ oil: 20, capacity: 20, flasksPacked: 0 });
    expect(h.state.waterClock).toBe(before.waterClock);
    expect(result.events.some(e => e.kind === "flaskConsumed")).toBe(true);

    const refusal = act(h, { type: "refillLamp" });
    expect(narrativeText(refusal)).toContain("No oil left");
  });
});

describe("consultMap", () => {
  it("requires the map item", () => {
    const h = makeHarness("map-1", { hasMapItem: false });
    const before = h.state.lamp.oil;
    const result = act(h, { type: "consultMap" });
    expect(narrativeText(result)).toContain("no map");
    expect(h.state.lamp.oil).toBe(before);
  });

  it("costs 1 oil and returns a map narrative entry in the light", () => {
    const h = makeHarness("map-2", { hasMapItem: true });
    const before = h.state.lamp.oil;
    const result = act(h, { type: "consultMap" });
    expect(result.narrative.some(n => n.kind === "map")).toBe(true);
    expect(h.state.lamp.oil).toBe(before - 1);
  });
});

// ---------------------------------------------------------------------------
// darkness
// ---------------------------------------------------------------------------

describe("dark light state", () => {
  function darkHarness(seed: string): Harness {
    const h = makeHarness(seed, { hasMapItem: true });
    h.state = { ...h.state, lamp: { ...h.state.lamp, oil: 0, flasksPacked: 0 } };
    expect(getLightState(h.state.lamp)).toBe("dark");
    return h;
  }

  it("blocks search with a diegetic refusal", () => {
    const h = darkHarness("dark-1");
    const before = h.state;
    const result = act(h, { type: "search" });
    expect(narrativeText(result)).toContain("dark gives nothing up");
    expect(h.state.alertness).toBe(before.alertness);
    expect(h.state.searchedRoomIds).toEqual([]);
  });

  it("blocks consultMap with a diegetic refusal", () => {
    const h = darkHarness("dark-2");
    const result = act(h, { type: "consultMap" });
    expect(narrativeText(result)).toContain("no light to read by");
    expect(result.narrative.every(n => n.kind !== "map")).toBe(true);
  });

  it("doubles move noise: alertness rises by 2 for an unburdened move", () => {
    const h = darkHarness("dark-3");
    h.state = { ...h.state, hunters: [] }; // isolate noise accounting from fight noise
    const before = h.state.alertness;
    act(h, { type: "move", direction: "south" });
    expect(h.state.alertness).toBe(before + 2);
  });
});

// ---------------------------------------------------------------------------
// encounters
// ---------------------------------------------------------------------------

describe("encounters", () => {
  it("opens on contact when moving into a hunter's room", () => {
    const h = makeHarness("enc-1");
    h.state = {
      ...h.state,
      hunters: [{ id: "h1", enemyId: "goblin_snare", roomId: "antechamber", state: "dormant" }]
    };
    const result = act(h, { type: "move", direction: "south" });
    expect(h.state.activeEncounter).toBeDefined();
    expect(h.state.activeEncounter!.hunterId).toBe("h1");
    expect(result.narrative.some(n => n.kind === "encounter")).toBe(true);
  });

  it("blocks other actions while an encounter is active", () => {
    const h = makeHarness("enc-2");
    h.state = {
      ...h.state,
      hunters: [{ id: "h1", enemyId: "goblin_candle", roomId: "antechamber", state: "dormant" }]
    };
    act(h, { type: "move", direction: "south" });
    expect(h.state.activeEncounter).toBeDefined();
    const before = h.state;
    const refused = act(h, { type: "search" });
    expect(narrativeText(refused)).toContain("Deal with it first");
    expect(h.state.lamp.oil).toBe(before.lamp.oil);
  });

  it("fight beats spend oil, emit fight noise, and a win removes the hunter", () => {
    // Seed chosen so the warrior wins this fight without dying.
    const h = makeHarness("enc-3");
    h.state = {
      ...h.state,
      hunters: [{ id: "h1", enemyId: "goblin_candle", roomId: "antechamber", state: "dormant" }]
    };
    act(h, { type: "move", direction: "south" });
    const alertnessBefore = h.state.alertness;
    fightItOut(h);
    expect(h.state.status).toBe("active");
    expect(h.state.activeEncounter).toBeUndefined();
    expect(h.state.hunters.find(hh => hh.id === "h1")).toBeUndefined();
    expect(h.events.some(e => e.kind === "enemyDefeated")).toBe(true);
    expect(h.state.alertness).toBeGreaterThan(alertnessBefore); // fight beats are loud
  });

  it("fallBack on success moves the player back the way they came", () => {
    // Alertness 0 keeps the follow chance at its 20% floor; hunt a seed where the goblin doesn't follow.
    for (let i = 0; i < 20; i++) {
      const h = makeHarness(`enc-fallback-${i}`);
      h.state = {
        ...h.state,
        hunters: [{ id: "h1", enemyId: "goblin_snare", roomId: "antechamber", state: "dormant" }]
      };
      act(h, { type: "move", direction: "south" });
      expect(h.state.activeEncounter).toBeDefined();
      const result = act(h, { type: "encounterOption", kind: "fallBack" });
      if (narrativeText(result).includes("doesn't follow")) {
        expect(h.state.currentRoomId).toBe("gullet");
        expect(h.state.activeEncounter).toBeUndefined();
        return;
      }
    }
    throw new Error("no seed produced a clean fall-back in 20 tries");
  });

  it("unavailable options are refused with their reason", () => {
    const h = makeHarness("enc-4");
    h.state = {
      ...h.state,
      hunters: [{ id: "h1", enemyId: "goblin_candle", roomId: "antechamber", state: "dormant" }]
    };
    act(h, { type: "move", direction: "south" });
    // No rations carried -> throwRations unavailable.
    const result = act(h, { type: "encounterOption", kind: "throwRations" });
    expect(narrativeText(result)).toContain("No rations");
    expect(h.state.activeEncounter).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// death path
// ---------------------------------------------------------------------------

describe("death", () => {
  it("a dying delver produces a died event and a dead run refuses further actions", () => {
    for (let i = 0; i < 15; i++) {
      const h = makeHarness(`death-${i}`);
      h.character = { ...h.character, hp: 1 };
      h.state = {
        ...h.state,
        hunters: [{ id: "h1", enemyId: "goblin_warrens_brute", roomId: "antechamber", state: "dormant" }]
      };
      act(h, { type: "move", direction: "south" });
      fightItOut(h);
      if (h.state.status === "dead") {
        expect(h.events.some(e => e.kind === "died")).toBe(true);
        const refused = act(h, { type: "move", direction: "north" });
        expect(narrativeText(refused)).toContain("The run is over");
        expect(h.state.currentRoomId).toBe("antechamber");
        return;
      }
    }
    throw new Error("no seed killed a 1-hp delver in 15 tries");
  });
});

// ---------------------------------------------------------------------------
// extracts
// ---------------------------------------------------------------------------

describe("extracts", () => {
  it("the way you came: open below Hunting alertness, barred at or above it", () => {
    const h = makeHarness("ext-1");
    // Below the threshold: extraction succeeds from the gullet.
    const open = act(h, { type: "extract", extractId: "f1_barred_door" });
    expect(h.state.status).toBe("extracted");
    expect(open.events).toContainEqual({ kind: "extracted", extractId: "f1_barred_door" });

    // At Hunting alertness the same door is barred.
    const h2 = makeHarness("ext-1b");
    h2.state = { ...h2.state, alertness: HUNTING_POINTS };
    expect(getThreatLevelFromPoints(h2.state.alertness)).toBe(3);
    const barred = act(h2, { type: "extract", extractId: "f1_barred_door" });
    expect(h2.state.status).toBe("active");
    expect(barred.events).toEqual([]);
    expect(narrativeText(barred)).toContain("barred from the other side");
  });

  it("driving alertness up through play bars the door", () => {
    const h = makeHarness("ext-loud");
    h.state = { ...h.state, hunters: [], alertness: HUNTING_POINTS - 2 };
    act(h, { type: "move", direction: "south" }); // +1
    act(h, { type: "move", direction: "north" }); // +1 -> crosses Hunting
    expect(getThreatLevelFromPoints(h.state.alertness)).toBeGreaterThanOrEqual(3);
    expect(h.events.some(e => e.kind === "alertnessLevel" && e.level === 3)).toBe(true);
    expect(h.events.some(e => e.kind === "reinforcement")).toBe(true);
    // The reinforcement guards the entrance; deal with it before trying the door.
    fightItOut(h);
    expect(h.state.status).toBe("active");
    const result = act(h, { type: "extract", extractId: "f1_barred_door" });
    expect(narrativeText(result)).toContain("barred from the other side");
    expect(h.state.status).toBe("active");
  });

  it("the flooded stair: open while the water clock holds, closed at zero", () => {
    const h = makeHarness("ext-2");
    h.state = { ...h.state, currentRoomId: "flooded_stair", hunters: [] };
    expect(h.state.waterClock).toBeGreaterThan(0);
    act(h, { type: "extract", extractId: "f1_flooded_stair" });
    expect(h.state.status).toBe("extracted");

    const h2 = makeHarness("ext-2b");
    h2.state = { ...h2.state, currentRoomId: "flooded_stair", hunters: [], waterClock: 0 };
    const closed = act(h2, { type: "extract", extractId: "f1_flooded_stair" });
    expect(h2.state.status).toBe("active");
    expect(narrativeText(closed)).toContain("water has taken the stair");
  });

  it("draining the water clock through play closes the stair", () => {
    const h = makeHarness("ext-drain", { waterClock: 2 });
    h.state = { ...h.state, currentRoomId: "flooded_stair", hunters: [] };
    act(h, { type: "listen" }); // waterClock 1
    act(h, { type: "listen" }); // waterClock 0
    expect(h.state.waterClock).toBe(0);
    const closed = act(h, { type: "extract", extractId: "f1_flooded_stair" });
    expect(h.state.status).toBe("active");
    expect(narrativeText(closed)).toContain("water has taken the stair");
  });

  it("the rope winch: three loud cranks, then it carries you out", () => {
    const h = makeHarness("ext-3");
    h.state = { ...h.state, currentRoomId: "rope_winch", hunters: [] };

    const early = act(h, { type: "extract", extractId: "f1_rope_winch" });
    expect(narrativeText(early)).toContain("wants more cranking");

    const alertnessBefore = h.state.alertness;
    const oilBefore = h.state.lamp.oil;
    act(h, { type: "crank", extractId: "f1_rope_winch" });
    act(h, { type: "crank", extractId: "f1_rope_winch" });
    act(h, { type: "crank", extractId: "f1_rope_winch" });
    expect(h.state.cranksDone["f1_rope_winch"]).toBe(3);
    expect(h.state.alertness).toBe(alertnessBefore + 12); // 3 cranks x loudness 4
    expect(h.state.lamp.oil).toBe(oilBefore - 3);

    act(h, { type: "extract", extractId: "f1_rope_winch" });
    expect(h.state.status).toBe("extracted");
    expect(h.events).toContainEqual({ kind: "extracted", extractId: "f1_rope_winch" });
  });

  it("refuses extraction from the wrong room", () => {
    const h = makeHarness("ext-4");
    h.state = { ...h.state, currentRoomId: "antechamber" };
    const result = act(h, { type: "extract", extractId: "f1_barred_door" });
    expect(narrativeText(result)).toContain("not in this room");
    expect(h.state.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// descend
// ---------------------------------------------------------------------------

describe("descend", () => {
  it("moves to floor 2, halves-down alertness by the carryover ratio, respawns hunters", () => {
    const h = makeHarness("desc-1");
    h.state = { ...h.state, currentRoomId: "deep_gallery", alertness: 50 };
    const huntersBefore = h.state.hunters.map(hh => hh.id);

    const result = act(h, { type: "descend", stairRoomId: "deep_gallery" });
    expect(h.state.floor).toBe(2);
    expect(h.state.currentRoomId).toBe("bonefire_hall");
    expect(h.state.alertness).toBe(Math.floor(50 * 0.25)); // DEPTH_RULES.floorThreatCarryoverRatio
    expect(result.events).toContainEqual({ kind: "descended", floor: 2 });

    const floor2 = getPlace(PLACE_ID).floors[1]!;
    const floor2SpawnRooms = new Set(floor2.rooms.filter(r => r.hunterSpawn).map(r => r.id));
    expect(h.state.hunters.length).toBeGreaterThanOrEqual(floor2.hunterBudget.min);
    for (const hunter of h.state.hunters) {
      expect(floor2SpawnRooms.has(hunter.roomId)).toBe(true);
      expect(huntersBefore).not.toContain(hunter.id);
    }

    // Floor 2 is playable: the always-open flue extract works.
    h.state = { ...h.state, hunters: [] };
    walkTo(h, "old_flue");
    act(h, { type: "extract", extractId: "f2_old_flue" });
    expect(h.state.status).toBe("extracted");
  });

  it("refuses to descend from a room the player is not in", () => {
    const h = makeHarness("desc-2");
    const result = act(h, { type: "descend", stairRoomId: "deep_gallery" });
    expect(narrativeText(result)).toContain("not in this room");
    expect(h.state.floor).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// determinism
// ---------------------------------------------------------------------------

describe("determinism", () => {
  it("the same seed and action script produce identical states and narrative", () => {
    const script: DelveAction[] = [
      { type: "move", direction: "south" },
      { type: "listen" },
      { type: "move", direction: "south" },
      { type: "search" },
      { type: "takeAllLoot" },
      { type: "move", direction: "east" },
      { type: "move", direction: "north" },
      { type: "search" },
      { type: "takeAllLoot" }
    ];
    const run = () => {
      const h = makeHarness("det-1");
      for (const action of script) {
        if (h.state.status !== "active") break;
        if (h.state.activeEncounter) fightItOut(h);
        if (h.state.status !== "active") break;
        act(h, action);
      }
      if (h.state.activeEncounter) fightItOut(h);
      return h;
    };
    const a = run();
    const b = run();
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
    expect(a.state.narrative.map(n => n.text)).toEqual(b.state.narrative.map(n => n.text));
  });
});

// ---------------------------------------------------------------------------
// full-run integration
// ---------------------------------------------------------------------------

describe("full-run integration", () => {
  it("enter, delve to the trade room, search, loot, and walk out the way you came", () => {
    const h = makeHarness("full-1");
    walkTo(h, "trade_room");
    if (h.state.status !== "active") throw new Error("delver died on the approach; pick a new seed");
    act(h, { type: "search" });
    if (h.state.activeEncounter) fightItOut(h);
    if (h.state.pendingLoot["trade_room"]) {
      act(h, { type: "takeAllLoot" });
      expect(h.carried.length + h.events.filter(e => e.kind === "itemsTaken").length).toBeGreaterThan(0);
    }
    walkTo(h, "gullet");
    expect(h.state.status).toBe("active");
    expect(getThreatLevelFromPoints(h.state.alertness)).toBeLessThan(3);
    act(h, { type: "extract", extractId: "f1_barred_door" });
    expect(h.state.status).toBe("extracted");
    expect(h.events.some(e => e.kind === "extracted")).toBe(true);
    // The lamp did real work along the way.
    expect(h.state.lamp.oil).toBeLessThan(20);
  });
});

// ---------------------------------------------------------------------------
// Risk/reward simulation (in the style of riskRewardSimulation.test.ts):
// a cautious bot banks a small pack and leaves; a greedy bot searches
// everything and pays for it.
// ---------------------------------------------------------------------------

interface DelveSimResult {
  seed: string;
  outcome: "extracted" | "dead" | "trapped";
  steps: number;
  roomsSearched: number;
  packValue: number;
  alertnessAtEnd: number;
  extractUsed?: string;
}

type BotPolicy = "cautious" | "greedy";

function runDelveBot(seed: string, policy: BotPolicy): DelveSimResult {
  const h = makeHarness(seed, { flasksPacked: 1 });
  const floor = floor1();
  const adjacency = buildAdjacency(floor);
  const entranceDistances = bfsDistances(adjacency, floor.entranceRoomId);

  // Search targets. The cautious bot plays like someone who has learned the
  // place: two marked rooms near the entrance, in and out. The greedy bot
  // doesn't know what's marked — it turns over every room on the floor.
  const supplyRooms = h.state.supplyCaches.map(c => c.roomId);
  const markedTargets = [...new Set([...h.state.lootRoomIds, ...supplyRooms])];
  const targets = policy === "greedy"
    ? floor.rooms.map(r => r.id)
    : markedTargets.filter(id => (entranceDistances[id] ?? 99) <= 4).slice(0, 2);

  let failedBarredDoor = false;
  let failedStair = false;
  let extractUsed: string | undefined;

  const finishSim = (outcome: DelveSimResult["outcome"], steps: number): DelveSimResult => ({
    seed,
    outcome,
    steps,
    roomsSearched: h.state.searchedRoomIds.length,
    packValue: h.carried.reduce((sum, i) => sum + i.value * i.quantity, 0),
    alertnessAtEnd: h.state.alertness,
    extractUsed
  });

  for (let step = 0; step < 250; step++) {
    if (h.state.status === "extracted") return finishSim("extracted", step);
    if (h.state.status === "dead") return finishSim("dead", step);

    // Encounters first.
    if (h.state.activeEncounter) {
      const enc = h.state.activeEncounter;
      const slip = enc.options.find(o => o.kind === "slipPast");
      if (policy === "cautious" && enc.beat === 1 && slip?.available) {
        act(h, { type: "encounterOption", kind: "slipPast" });
      } else {
        act(h, { type: "fightBeat", stance: "press" });
      }
      continue;
    }

    // Lamp upkeep.
    if (h.state.lamp.oil <= 2 && h.state.lamp.flasksPacked > 0) {
      act(h, { type: "refillLamp" });
      continue;
    }

    // Bag anything at our feet.
    const pool = h.state.pendingLoot[h.state.currentRoomId];
    if (pool && (pool.items.length > 0 || pool.gold > 0)) {
      act(h, { type: "takeAllLoot" });
      continue;
    }

    const light = getLightState(h.state.lamp);
    const unsearched = targets.filter(id => !h.state.searchedRoomIds.includes(id));

    // Cautious bots know when to stop; greedy bots stop only when done or blind.
    const level = getThreatLevelFromPoints(h.state.alertness);
    const shouldExtract = policy === "cautious"
      ? unsearched.length === 0 ||
        level >= 2 ||
        h.state.lamp.oil + h.state.lamp.flasksPacked * h.state.lamp.capacity < 10 ||
        h.character.hp < h.character.maxHp * 0.5
      : unsearched.length === 0 || (light === "dark" && h.state.lamp.flasksPacked === 0);

    if (!shouldExtract) {
      if (unsearched.includes(h.state.currentRoomId) && light !== "dark") {
        act(h, { type: "search" });
        continue;
      }
      // Head for the nearest unsearched target.
      const distances = bfsDistances(adjacency, h.state.currentRoomId);
      const reachable = unsearched.filter(id => distances[id] !== undefined);
      if (reachable.length === 0) {
        // One-way drops can strand targets behind us; give up and leave.
        failedBarredDoor = failedBarredDoor || false;
      } else {
        const nearest = reachable.sort((a, b) => distances[a]! - distances[b]!)[0]!;
        const path = bfsPath(adjacency, h.state.currentRoomId, nearest)!;
        act(h, { type: "move", direction: directionBetween(floor, h.state.currentRoomId, path[1]!) });
        continue;
      }
    }

    // Extraction phase: the way you came, then the stair, then the winch.
    let goal: string;
    if (!failedBarredDoor && level < 3) {
      goal = "gullet";
      if (h.state.currentRoomId === goal) {
        extractUsed = "f1_barred_door";
        act(h, { type: "extract", extractId: "f1_barred_door" });
        if (h.state.status === "active") failedBarredDoor = true;
        continue;
      }
    } else if (!failedStair && h.state.waterClock > 0) {
      goal = "flooded_stair";
      if (h.state.currentRoomId === goal) {
        extractUsed = "f1_flooded_stair";
        act(h, { type: "extract", extractId: "f1_flooded_stair" });
        if (h.state.status === "active") failedStair = true;
        continue;
      }
    } else {
      goal = "rope_winch";
      if (h.state.currentRoomId === goal) {
        if ((h.state.cranksDone["f1_rope_winch"] ?? 0) < 3) {
          act(h, { type: "crank", extractId: "f1_rope_winch" });
        } else {
          extractUsed = "f1_rope_winch";
          act(h, { type: "extract", extractId: "f1_rope_winch" });
        }
        continue;
      }
    }
    if (level >= 3) failedBarredDoor = true;

    const path = bfsPath(adjacency, h.state.currentRoomId, goal);
    if (!path || path.length < 2) return finishSim("trapped", step);
    act(h, { type: "move", direction: directionBetween(floor, h.state.currentRoomId, path[1]!) });
  }
  return finishSim("trapped", 250);
}

describe("delve risk/reward simulation", () => {
  it("a cautious delver extracts most runs; greed makes the floor tilt", () => {
    // Issue #38 re-authored floor 1's exit graph (fewer exits per room, two
    // junction rooms), which shifts hunter/noise dynamics enough that 40
    // seeds landed a hair under the old bad-rate floor. A larger sample
    // settles the same signal (see thresholds below) without loosening them.
    const RUNS = 120;
    const cautious = Array.from({ length: RUNS }, (_, i) => runDelveBot(`delve-sim-c-${i + 1}`, "cautious"));
    const greedy = Array.from({ length: RUNS }, (_, i) => runDelveBot(`delve-sim-g-${i + 1}`, "greedy"));

    const summarize = (label: string, results: DelveSimResult[]) => {
      const extracted = results.filter(r => r.outcome === "extracted");
      const dead = results.filter(r => r.outcome === "dead");
      const trapped = results.filter(r => r.outcome === "trapped");
      const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
      console.info("delve simulation", {
        label,
        runs: results.length,
        extracted: extracted.length,
        dead: dead.length,
        trapped: trapped.length,
        avgSearched: Number(avg(results.map(r => r.roomsSearched)).toFixed(1)),
        avgPackValue: Number(avg(extracted.map(r => r.packValue)).toFixed(1)),
        avgAlertness: Number(avg(results.map(r => r.alertnessAtEnd)).toFixed(1))
      });
      return { extracted, dead, trapped };
    };

    const c = summarize("cautious", cautious);
    const g = summarize("greedy", greedy);

    const cautiousExtractRate = c.extracted.length / RUNS;
    const cautiousBadRate = (c.dead.length + c.trapped.length) / RUNS;
    const greedyBadRate = (g.dead.length + g.trapped.length) / RUNS;

    // The design doc's balance target: a competent, cautious run gets out.
    expect(cautiousExtractRate).toBeGreaterThan(0.7);
    // Greed pays: substantially more deaths/trappings than playing it safe.
    // (Observed: cautious 0/40 bad outcomes, greedy 7/40 — the tilt is real,
    // though most of it is death-by-goblin; the barred door rarely springs
    // because the oil budget ends greedy runs before alertness reaches
    // Hunting. See the run-layer report for the retuning argument.)
    expect(greedyBadRate).toBeGreaterThanOrEqual(cautiousBadRate + 0.1);
    expect(greedyBadRate).toBeGreaterThanOrEqual(0.15);
    // Greed also has to be worth attempting: greedy extractions carry more value.
    const avgValue = (rs: DelveSimResult[]) =>
      rs.length === 0 ? 0 : rs.reduce((sum, r) => sum + r.packValue, 0) / rs.length;
    if (g.extracted.length > 0 && c.extracted.length > 0) {
      expect(avgValue(g.extracted)).toBeGreaterThan(avgValue(c.extracted));
    }
  });
});
