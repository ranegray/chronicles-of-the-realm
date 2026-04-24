import { describe, it, expect } from "vitest";
import { canSearchRoom, searchCurrentRoom } from "../game/search";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { createRng } from "../game/rng";
import { SEARCH_RULES } from "../game/constants";
import type { Character, ClassId, DungeonRun } from "../game/types";

function buildCharacter(classId: ClassId = "scout"): Character {
  let d = createEmptyDraft(`char:${classId}`);
  d = CharacterCreationService.setName(d, classId);
  d = CharacterCreationService.selectAncestry(d, "human");
  d = CharacterCreationService.selectClass(d, classId);
  d = CharacterCreationService.rollAllAbilityScores(d);
  d = CharacterCreationService.autoAssignScoresForClass(d);
  const firstKit = firstKitFor(classId);
  d = CharacterCreationService.chooseStarterKit(d, firstKit);
  return CharacterCreationService.finalizeCharacter(d).character;
}

function firstKitFor(classId: ClassId): string {
  switch (classId) {
    case "warrior": return "warrior_sword_shield";
    case "scout": return "scout_bow_dagger";
    case "arcanist": return "arcanist_staff";
    case "warden": return "warden_spear";
    case "devout": return "devout_mace";
  }
}

function runWithTrapRoom(seed: string): DungeonRun {
  for (let i = 0; i < 40; i++) {
    const run = generateDungeonRun({ seed: `${seed}:${i}`, biome: "crypt", tier: 1 });
    const trapRoom = run.roomGraph.find(r => r.type === "trap" && r.activeTrap);
    if (trapRoom) return { ...run, currentRoomId: trapRoom.id };
  }
  throw new Error("no trap room in 40 seeded attempts");
}

function runWithHiddenLootEligibleRoom(seed: string): DungeonRun {
  // Prefer an empty room; fall back to a completed combat room type.
  for (let i = 0; i < 40; i++) {
    const run = generateDungeonRun({ seed: `${seed}:${i}`, biome: "crypt", tier: 1 });
    const candidate = run.roomGraph.find(r => r.type === "empty") ?? run.roomGraph.find(r => r.type === "extraction");
    if (candidate) return { ...run, currentRoomId: candidate.id };
  }
  throw new Error("no empty/extraction room in 40 seeded attempts");
}

describe("search", () => {
  it("first search increases threat by baseSearchThreatIncrease", () => {
    const run = runWithHiddenLootEligibleRoom("search-1");
    const character = buildCharacter("scout");
    const before = run.threat.points;
    const { run: after } = searchCurrentRoom({ run, character, rng: createRng("first") });
    expect(after.threat.points - before).toBe(SEARCH_RULES.baseSearchThreatIncrease);
  });

  it("second search increases threat by repeatSearchThreatIncrease", () => {
    const run = runWithHiddenLootEligibleRoom("search-2");
    const character = buildCharacter("scout");
    const first = searchCurrentRoom({ run, character, rng: createRng("a") });
    const mid = first.run.threat.points;
    const second = searchCurrentRoom({ run: first.run, character, rng: createRng("b") });
    expect(second.run.threat.points - mid).toBe(SEARCH_RULES.repeatSearchThreatIncrease);
  });

  it("search count is tracked on the room and blocks a third search", () => {
    let run = runWithHiddenLootEligibleRoom("search-3");
    const character = buildCharacter("scout");
    run = searchCurrentRoom({ run, character, rng: createRng("s1") }).run;
    run = searchCurrentRoom({ run, character, rng: createRng("s2") }).run;
    const room = run.roomGraph.find(r => r.id === run.currentRoomId)!;
    expect(room.searchState?.searchCount).toBe(SEARCH_RULES.maxSearchesPerRoom);
    const gate = canSearchRoom(room);
    expect(gate.canSearch).toBe(false);
    const third = searchCurrentRoom({ run, character, rng: createRng("s3") });
    expect(third.result.type).toBe("nothing");
    expect(third.run.threat.points).toBe(run.threat.points);
  });

  it("searching a trap room may detect, trigger, or turn up nothing", () => {
    const run = runWithTrapRoom("search-trap-1");
    const character = buildCharacter("scout");
    let sawDetection = false;
    let sawTriggerOrNothing = false;
    for (let i = 0; i < 50 && (!sawDetection || !sawTriggerOrNothing); i++) {
      const res = searchCurrentRoom({ run, character, rng: createRng(`trap-search:${i}`) });
      if (res.result.type === "trapDetected") sawDetection = true;
      if (res.result.type === "nothing" || res.result.type === "trapTriggered") sawTriggerOrNothing = true;
    }
    expect(sawDetection).toBe(true);
    expect(sawTriggerOrNothing).toBe(true);
  });

  it("searching can reveal hidden loot in cleared combat rooms", () => {
    const run = generateDungeonRun({ seed: "search-loot-1", biome: "crypt", tier: 1 });
    const combatRoom = run.roomGraph.find(r => r.type === "combat");
    if (!combatRoom) return;
    const pointed = { ...run, currentRoomId: combatRoom.id };
    const character = buildCharacter("scout");
    let foundLoot = false;
    for (let i = 0; i < 100 && !foundLoot; i++) {
      // Each iteration has a fresh run (so search state resets).
      const res = searchCurrentRoom({ run: pointed, character, rng: createRng(`loot-${i}`) });
      if (res.result.type === "hiddenLoot") foundLoot = true;
    }
    expect(foundLoot).toBe(true);
  });

  it("searching is deterministic with the same rng seed", () => {
    const run = runWithHiddenLootEligibleRoom("search-det");
    const character = buildCharacter("scout");
    const a = searchCurrentRoom({ run, character, rng: createRng("deterministic") });
    const b = searchCurrentRoom({ run, character, rng: createRng("deterministic") });
    expect(a.result).toEqual(b.result);
    expect(a.run.threat.points).toBe(b.run.threat.points);
  });

  it("canSearchRoom allows a fresh room and blocks a fully-searched one", () => {
    const run = runWithHiddenLootEligibleRoom("gate-1");
    const freshRoom = run.roomGraph.find(r => r.id === run.currentRoomId)!;
    expect(canSearchRoom(freshRoom).canSearch).toBe(true);
    const maxed = {
      ...freshRoom,
      searchState: { ...freshRoom.searchState!, searchCount: SEARCH_RULES.maxSearchesPerRoom }
    };
    expect(canSearchRoom(maxed).canSearch).toBe(false);
  });
});
