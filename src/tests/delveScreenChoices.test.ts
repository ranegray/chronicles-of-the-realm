import { describe, expect, it } from "vitest";
import { createDelveRun } from "../game/delve/delveRun";
import type { ActiveEncounter, DelveRunState } from "../game/delve/types";
import { buildChoiceList } from "../screens/delveChoices";

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
});
