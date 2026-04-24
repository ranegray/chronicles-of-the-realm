import { describe, it, expect } from "vitest";
import {
  calculateScoutingScore,
  getDangerBand,
  getRoomSigns,
  knowledgeLevelForScore,
  scoutAdjacentRooms,
  scoutRoom
} from "../game/scouting";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { createRng } from "../game/rng";
import { SCOUTING_RULES } from "../game/constants";
import type { Character, ClassId, DungeonRun } from "../game/types";

function buildCharacter(classId: ClassId, seed: string): Character {
  let draft = createEmptyDraft(`char:${seed}:${classId}`);
  draft = CharacterCreationService.setName(draft, classId);
  draft = CharacterCreationService.selectAncestry(draft, "human");
  draft = CharacterCreationService.selectClass(draft, classId);
  draft = CharacterCreationService.rollAllAbilityScores(draft);
  draft = CharacterCreationService.autoAssignScoresForClass(draft);
  const kitId = CharacterCreationService.isReadyToFinalize(draft)
    ? undefined
    : undefined;
  void kitId;
  // pick the first kit for the class
  const cls = draft.classId;
  void cls;
  // CharacterCreationService expects a kit id — look it up by calling finalize
  // through chooseStarterKit with the first kit the class offers.
  // For tests we'll pick the class's first starter kit id.
  const firstKit = getFirstKitId(classId);
  draft = CharacterCreationService.chooseStarterKit(draft, firstKit);
  return CharacterCreationService.finalizeCharacter(draft).character;
}

function getFirstKitId(classId: ClassId): string {
  switch (classId) {
    case "warrior": return "warrior_sword_shield";
    case "scout": return "scout_bow_dagger";
    case "arcanist": return "arcanist_fire_focus";
    case "warden": return "warden_hunter";
    case "devout": return "devout_healer";
  }
}

function buildBasicRun(seed: string): DungeonRun {
  return generateDungeonRun({ seed, biome: "crypt", tier: 1 });
}

describe("scouting", () => {
  it("getDangerBand maps 0 to safe (off-by-one guard)", () => {
    expect(getDangerBand(0)).toBe("safe");
    expect(getDangerBand(1)).toBe("low");
    expect(getDangerBand(2)).toBe("low");
    expect(getDangerBand(3)).toBe("moderate");
    expect(getDangerBand(4)).toBe("moderate");
    expect(getDangerBand(5)).toBe("high");
    expect(getDangerBand(6)).toBe("high");
    expect(getDangerBand(7)).toBe("severe");
    expect(getDangerBand(99)).toBe("severe");
  });

  it("knowledgeLevelForScore respects spec thresholds", () => {
    expect(knowledgeLevelForScore(7)).toBe("unknown");
    expect(knowledgeLevelForScore(SCOUTING_RULES.knowledgeThresholds.signsOnly)).toBe("signsOnly");
    expect(knowledgeLevelForScore(SCOUTING_RULES.knowledgeThresholds.dangerKnown)).toBe("dangerKnown");
    expect(knowledgeLevelForScore(SCOUTING_RULES.knowledgeThresholds.likelyType)).toBe("likelyType");
    expect(knowledgeLevelForScore(SCOUTING_RULES.knowledgeThresholds.exactType)).toBe("exactType");
    expect(knowledgeLevelForScore(100)).toBe("exactType");
  });

  it("same seed and same room produce identical scouting result", () => {
    const run = buildBasicRun("det-1");
    const character = buildCharacter("scout", "det");
    const target = run.roomGraph.find(r => !r.visited)!;
    const a = scoutRoom({
      room: target, character, run,
      rng: createRng(`${run.seed}:scout:${target.id}`),
      now: 1000
    });
    const b = scoutRoom({
      room: target, character, run,
      rng: createRng(`${run.seed}:scout:${target.id}`),
      now: 1000
    });
    expect(a).toEqual(b);
  });

  it("Scout reaches higher-tier knowledge more often than Warrior on average", () => {
    const scoutHits = countTierHits("scout", 150);
    const warriorHits = countTierHits("warrior", 150);
    expect(scoutHits.knownOrBetter).toBeGreaterThan(warriorHits.knownOrBetter);
  });

  it("getRoomSigns returns empty list for unknown knowledge level", () => {
    const run = buildBasicRun("signs-1");
    const room = run.roomGraph[1]!;
    const signs = getRoomSigns({
      room, knowledgeLevel: "unknown", rng: createRng("seed")
    });
    expect(signs).toEqual([]);
  });

  it("getRoomSigns returns signs from the profile pool on signsOnly+", () => {
    const run = buildBasicRun("signs-2");
    const room = run.roomGraph.find(r => r.scoutingProfile && r.scoutingProfile.signs.length > 0)!;
    const signs = getRoomSigns({
      room, knowledgeLevel: "signsOnly", rng: createRng("signs-seed")
    });
    expect(signs.length).toBeGreaterThan(0);
    for (const sign of signs) {
      expect(room.scoutingProfile!.signs).toContain(sign);
    }
  });

  it("scoutAdjacentRooms only writes intel for unvisited adjacent rooms", () => {
    const run = buildBasicRun("adj-1");
    const character = buildCharacter("scout", "adj");
    const entrance = run.roomGraph.find(r => r.type === "entrance")!;
    const intel = scoutAdjacentRooms({ run, character });
    for (const neighborId of entrance.connectedRoomIds) {
      if (run.visitedRoomIds.includes(neighborId)) continue;
      expect(intel[neighborId]).toBeDefined();
      expect(intel[neighborId]!.roomId).toBe(neighborId);
    }
    expect(intel[entrance.id]).toBeUndefined();
  });

  it("scoutAdjacentRooms is idempotent — never rewrites existing intel", () => {
    const run = buildBasicRun("idem-1");
    const character = buildCharacter("scout", "idem");
    const first = scoutAdjacentRooms({ run, character });
    const runWithIntel = { ...run, knownRoomIntel: first };
    const second = scoutAdjacentRooms({ run: runWithIntel, character });
    for (const id of Object.keys(first)) {
      expect(second[id]).toEqual(first[id]);
    }
  });

  it("calculateScoutingScore drops as threat level rises", () => {
    const character = buildCharacter("scout", "threat");
    const base = generateDungeonRun({ seed: "threat-score", biome: "crypt", tier: 1 });
    const hot = { ...base, threat: { ...base.threat, points: 200, level: 5 as const } };
    const rngA = createRng("same-roll");
    const rngB = createRng("same-roll");
    const calm = calculateScoutingScore({ character, run: base, rng: rngA });
    const tense = calculateScoutingScore({ character, run: hot, rng: rngB });
    expect(tense).toBeLessThan(calm);
    expect(calm - tense).toBe(5);
  });

  it("likelyType knowledge includes the actual room type in likelyTypes", () => {
    const run = buildBasicRun("likely-1");
    const character = buildCharacter("scout", "likely");
    const target = run.roomGraph.find(r => r.type === "combat")!;
    // Force a specific knowledge level via a controlled rng — run enough trials and
    // collect at least one 'likelyType' result.
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const result = scoutRoom({
        room: target, character, run,
        rng: createRng(`likely-seed-${i}`)
      });
      if (result.knowledgeLevel === "likelyType") {
        expect(result.likelyTypes).toContain(target.type);
        expect(result.shownType).toBeUndefined();
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("exactType knowledge sets shownType to the actual type", () => {
    const run = buildBasicRun("exact-1");
    const character = buildCharacter("scout", "exact");
    const target = run.roomGraph.find(r => r.type === "combat")!;
    let found = false;
    for (let i = 0; i < 400 && !found; i++) {
      const result = scoutRoom({
        room: target, character, run,
        rng: createRng(`exact-seed-${i}`)
      });
      if (result.knowledgeLevel === "exactType") {
        expect(result.shownType).toBe(target.type);
        expect(result.likelyTypes).toEqual([target.type]);
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});

function countTierHits(classId: ClassId, trials: number): { knownOrBetter: number } {
  const character = buildCharacter(classId, "tier");
  const run = buildBasicRun("tier-compare");
  const target = run.roomGraph[1]!;
  let knownOrBetter = 0;
  for (let i = 0; i < trials; i++) {
    const rng = createRng(`compare:${classId}:${i}`);
    const result = scoutRoom({ room: target, character, run, rng });
    if (result.knowledgeLevel === "likelyType" || result.knowledgeLevel === "exactType") {
      knownOrBetter++;
    }
  }
  return { knownOrBetter };
}
