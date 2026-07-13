import { describe, expect, it } from "vitest";
import { createDelveRun } from "../game/delve/delveRun";
import type { ActiveEncounter, DelveNarrativeEntry, DelveRunState } from "../game/delve/types";
import {
  buildChoiceList,
  exitMemoryAnnotation,
  groupNarrativeSegments,
  segmentRoomName
} from "../screens/delveChoices";

const PLACE_ID = "goblinWarrens";

function freshRun(overrides: Partial<DelveRunState> = {}): DelveRunState {
  const state = createDelveRun({ placeId: PLACE_ID, seed: "choices-1", flasksPacked: 1 });
  return { ...state, ...overrides };
}

describe("buildChoiceList", () => {
  it("at the entrance, offers the single move exit, search, listen, refill lamp, extract, and descend", () => {
    const state = freshRun(); // starts at "gullet": one exit south, and the "way you came" extract
    const choices = buildChoiceList(state);

    expect(choices).toContainEqual(expect.objectContaining({ kind: "move", direction: "south" }));
    expect(choices).toContainEqual(expect.objectContaining({ kind: "search" }));
    expect(choices).toContainEqual(expect.objectContaining({ kind: "listen" }));
    expect(choices).toContainEqual(expect.objectContaining({ kind: "refillLamp" }));
    expect(choices).toContainEqual(expect.objectContaining({ kind: "extract", extractId: "f1_barred_door" }));
    expect(choices).toContainEqual(expect.objectContaining({ kind: "descend" }));
    expect(choices.some(c => c.kind === "consultMap")).toBe(false);
    expect(choices.some(c => c.kind === "crank")).toBe(false);
  });

  it("drops the search choice once the current room has been searched", () => {
    const state = freshRun({ searchedRoomIds: ["gullet"] });
    const choices = buildChoiceList(state);
    expect(choices.some(c => c.kind === "search")).toBe(false);
  });

  it("hides refill lamp when no flasks are packed", () => {
    const state = freshRun({ lamp: { oil: 20, capacity: 20, flasksPacked: 0 } });
    const choices = buildChoiceList(state);
    expect(choices.some(c => c.kind === "refillLamp")).toBe(false);
  });

  it("offers consult the map only with the map item and some oil left", () => {
    const withMap = freshRun({ hasMapItem: true });
    expect(buildChoiceList(withMap).some(c => c.kind === "consultMap")).toBe(true);

    const darkWithMap = freshRun({ hasMapItem: true, lamp: { oil: 0, capacity: 20, flasksPacked: 1 } });
    expect(buildChoiceList(darkWithMap).some(c => c.kind === "consultMap")).toBe(false);

    const noMap = freshRun({ hasMapItem: false });
    expect(buildChoiceList(noMap).some(c => c.kind === "consultMap")).toBe(false);
  });

  it("pending loot in the current room replaces exits/contextual choices with take-all/leave", () => {
    const state = freshRun({
      pendingLoot: {
        gullet: { items: [], gold: 5, materials: {} }
      }
    });
    const choices = buildChoiceList(state);
    expect(choices).toEqual([
      { kind: "takeAllLoot", label: "Take All" },
      { kind: "leaveLoot", label: "Leave the Rest" }
    ]);
  });

  it("an active encounter surfaces its non-fight options plus all three stance buttons, in that priority", () => {
    const encounter: ActiveEncounter = {
      hunterId: "h1",
      enemyId: "goblin_skulker",
      enemyHp: 10,
      enemyMaxHp: 10,
      beat: 1,
      options: [
        { kind: "fight", label: "Meet it head-on", available: true },
        { kind: "slipPast", label: "Slip along the far wall", available: true },
        { kind: "fallBack", label: "Fall back the way you came", available: false, unavailableReason: "No way back" }
      ],
      log: []
    };
    const state = freshRun({ activeEncounter: encounter });
    const choices = buildChoiceList(state);

    // "fight" is realized via stance buttons, not surfaced as its own option.
    expect(choices.some(c => c.kind === "encounterOption" && c.optionKind === "fight")).toBe(false);
    expect(choices).toContainEqual(
      expect.objectContaining({ kind: "encounterOption", optionKind: "slipPast", available: true })
    );
    expect(choices).toContainEqual(
      expect.objectContaining({ kind: "encounterOption", optionKind: "fallBack", available: false, unavailableReason: "No way back" })
    );
    const stances = choices.filter(c => c.kind === "fightStance").map(c => (c as { stance: string }).stance);
    expect(stances).toEqual(["press", "guard", "breakAway"]);

    // Encounter takes priority even if there also happens to be pending loot in the room.
    const stateWithLootToo: DelveRunState = {
      ...state,
      pendingLoot: { gullet: { items: [], gold: 3, materials: {} } }
    };
    expect(buildChoiceList(stateWithLootToo).some(c => c.kind === "takeAllLoot")).toBe(false);
  });

  it("offers crank while cranks remain, then switches to extract once the winch is done", () => {
    const partiallyCranked = freshRun({ currentRoomId: "rope_winch", cranksDone: { f1_rope_winch: 1 } });
    const cranked = buildChoiceList(partiallyCranked);
    expect(cranked).toContainEqual({ kind: "crank", extractId: "f1_rope_winch", label: "Crank the winch (1/3)" });
    expect(cranked.some(c => c.kind === "extract")).toBe(false);

    const fullyCranked = freshRun({ currentRoomId: "rope_winch", cranksDone: { f1_rope_winch: 3 } });
    const doneChoices = buildChoiceList(fullyCranked);
    expect(doneChoices.some(c => c.kind === "crank")).toBe(false);
    expect(doneChoices).toContainEqual(expect.objectContaining({ kind: "extract", extractId: "f1_rope_winch" }));
  });

  it("returns no choices once the run is no longer active", () => {
    const extracted = freshRun({ status: "extracted" });
    expect(buildChoiceList(extracted)).toEqual([]);
    const dead = freshRun({ status: "dead" });
    expect(buildChoiceList(dead)).toEqual([]);
  });

  it("annotates exits from run state: back the way you came, walked before, or plain sense text", () => {
    // tallow_gallery (a junction) exits: north -> antechamber, east -> candle_row,
    // south -> grease_cellar, down (vertical!) -> toll_bridge (senses: chittering).
    const state = freshRun({
      currentRoomId: "tallow_gallery",
      cameFromRoomId: "antechamber",
      visitedRoomIds: ["gullet", "antechamber", "tallow_gallery", "candle_row"]
    });
    const choices = buildChoiceList(state);
    const moveLabel = (direction: string) =>
      choices.find(c => c.kind === "move" && c.direction === direction)!.label;

    expect(moveLabel("north")).toBe("North — back the way you came");
    expect(moveLabel("east")).toBe("East — you've walked this way before");
    expect(moveLabel("south")).toBe("South — a way on");
    // Unvisited and vertical: keeps its sense text, reads naturally as "Below"
    // (door state is a per-run population roll, so just check the prefix).
    expect(moveLabel("down")).toMatch(/^Below — faint chittering/);
  });

  it("annotates a vertical back-the-way-you-came exit as 'Above'/'Below', not 'Up'/'Down'", () => {
    // toll_bridge's only vertical exit (up) leads back to tallow_gallery.
    const state = freshRun({
      currentRoomId: "toll_bridge",
      cameFromRoomId: "tallow_gallery",
      visitedRoomIds: ["gullet", "antechamber", "tallow_gallery", "toll_bridge"]
    });
    const choices = buildChoiceList(state);
    const upMove = choices.find(c => c.kind === "move" && c.direction === "up")!;
    expect(upMove.label).toBe("Above — back the way you came");
  });
});

describe("exitMemoryAnnotation", () => {
  const baseState = () =>
    createDelveRun({ placeId: PLACE_ID, seed: "annotation-1", flasksPacked: 1 });

  it("prefers 'back the way you came' over 'walked this way before' when both would apply", () => {
    const state = { ...baseState(), cameFromRoomId: "antechamber", visitedRoomIds: ["gullet", "antechamber"] };
    const exit = { direction: "north" as const, to: "antechamber" };
    expect(exitMemoryAnnotation(state, exit)).toBe("back the way you came");
  });

  it("returns undefined for an exit to an unvisited room", () => {
    const state = { ...baseState(), cameFromRoomId: "antechamber", visitedRoomIds: ["gullet", "antechamber"] };
    const exit = { direction: "south" as const, to: "grease_cellar" };
    expect(exitMemoryAnnotation(state, exit)).toBeUndefined();
  });

  it("flags a visited-but-not-came-from room", () => {
    const state = { ...baseState(), cameFromRoomId: "antechamber", visitedRoomIds: ["gullet", "antechamber", "candle_row"] };
    const exit = { direction: "east" as const, to: "candle_row" };
    expect(exitMemoryAnnotation(state, exit)).toBe("you've walked this way before");
  });
});

describe("groupNarrativeSegments", () => {
  function entry(id: string, kind: DelveNarrativeEntry["kind"], text = "x"): DelveNarrativeEntry {
    return { id, kind, text };
  }

  it("starts a new segment at every kind:'room' entry", () => {
    const entries = [
      entry("1", "room", "The Gullet. Cold air."),
      entry("2", "sense", "North — a way on."),
      entry("3", "action", "You search."),
      entry("4", "room", "Antechamber. A low crawl-space."),
      entry("5", "sense", "South — warm air.")
    ];
    const segments = groupNarrativeSegments(entries);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.entries.map(e => e.id)).toEqual(["1", "2", "3"]);
    expect(segments[1]!.entries.map(e => e.id)).toEqual(["4", "5"]);
    expect(segments[0]!.id).toBe("1");
    expect(segments[1]!.id).toBe("4");
  });

  it("treats a revisit room entry as its own new segment too", () => {
    const entries = [
      entry("1", "room", "The Gullet. Cold air."),
      entry("2", "room", "The Gullet, again.")
    ];
    expect(groupNarrativeSegments(entries)).toHaveLength(2);
  });

  it("returns an empty array for an empty log, and tolerates a log that doesn't start with 'room'", () => {
    expect(groupNarrativeSegments([])).toEqual([]);
    const entries = [entry("1", "system", "Somewhere, a bell."), entry("2", "room", "Antechamber.")];
    const segments = groupNarrativeSegments(entries);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.entries.map(e => e.id)).toEqual(["1"]);
  });

  it("preserves every entry across segments (nothing dropped)", () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      entry(String(i), i % 3 === 0 ? "room" : "sense")
    );
    const segments = groupNarrativeSegments(entries);
    const flattened = segments.flatMap(s => s.entries.map(e => e.id));
    expect(flattened).toEqual(entries.map(e => e.id));
  });
});

describe("segmentRoomName", () => {
  it("strips the prose tail from a first-visit room entry", () => {
    expect(segmentRoomName("The Gullet. The tunnel mouth you came in through.")).toBe("The Gullet");
  });

  it("strips the ', again.' tail from a revisit room entry", () => {
    expect(segmentRoomName("Antechamber, again.")).toBe("Antechamber");
  });

  it("returns the whole string when neither tail shape is present", () => {
    expect(segmentRoomName("Sleeper's Court")).toBe("Sleeper's Court");
  });
});
