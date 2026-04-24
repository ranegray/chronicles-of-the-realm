import { describe, it, expect } from "vitest";
import {
  applyEventOutcome,
  checkChoiceRequirements,
  resolveEventChoice,
  resolveStatCheck
} from "../game/roomEvents";
import { EVENT_TEMPLATES, getEventTemplate } from "../data/eventTemplates";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { createRng } from "../game/rng";
import type { ActiveRoomEvent, Character, ClassId, DungeonRun, EventChoice, RoomEventDefinition } from "../game/types";

function buildCharacter(classId: ClassId = "warden"): Character {
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
    case "arcanist": return "arcanist_fire_focus";
    case "warden": return "warden_hunter";
    case "devout": return "devout_healer";
  }
}

function attachEventToRoom(run: DungeonRun, templateId: string): { run: DungeonRun; event: ActiveRoomEvent; definition: RoomEventDefinition } {
  const definition = getEventTemplate(templateId);
  const room = run.roomGraph[1]!;
  const event: ActiveRoomEvent = { eventId: templateId, roomId: room.id, resolved: false };
  const next = {
    ...run,
    currentRoomId: room.id,
    roomGraph: run.roomGraph.map(r => r.id === room.id ? { ...r, activeEvent: event } : r)
  };
  return { run: next, event, definition };
}

describe("roomEvents", () => {
  it("every template has at least one choice and one always-available exit", () => {
    for (const t of EVENT_TEMPLATES) {
      expect(t.choices.length).toBeGreaterThan(0);
      expect(t.choices.length).toBeLessThanOrEqual(4);
    }
  });

  it("resolveStatCheck produces a roll-based result", () => {
    const character = buildCharacter("warden");
    const check = {
      ability: "will" as const,
      difficulty: 10,
      successMessage: "ok",
      failureMessage: "bad"
    };
    const res = resolveStatCheck({ character, check, rng: createRng("stat-1") });
    expect(res.roll).toBeGreaterThanOrEqual(1);
    expect(res.roll).toBeLessThanOrEqual(20);
    expect(res.total).toBe(res.roll + res.modifier);
    expect(res.difficulty).toBe(10);
  });

  it("natural 1 always fails, natural 20 always succeeds", () => {
    const character = { ...buildCharacter("warrior"), abilityScores: { might: 18, agility: 10, endurance: 10, intellect: 10, will: 18, presence: 10 } };
    // Rigged rngs: nextFloat that returns 0 will produce roll = 1; returning 1 - epsilon yields 20.
    const rngLow = { nextInt: (_lo: number, _hi: number) => 1, nextFloat: () => 0, pickOne: () => undefined as never, pickWeighted: () => undefined as never, shuffle: <T>(a: T[]) => a, forkChild: () => rngLow, seed: "low" };
    const rngHigh = { nextInt: (_lo: number, _hi: number) => 20, nextFloat: () => 0.99, pickOne: () => undefined as never, pickWeighted: () => undefined as never, shuffle: <T>(a: T[]) => a, forkChild: () => rngHigh, seed: "high" };
    const hard = { ability: "will" as const, difficulty: 50, successMessage: "ok", failureMessage: "bad" };
    expect(resolveStatCheck({ character, check: hard, rng: rngHigh as never }).passed).toBe(true);
    const easy = { ability: "will" as const, difficulty: 2, successMessage: "ok", failureMessage: "bad" };
    expect(resolveStatCheck({ character, check: easy, rng: rngLow as never }).passed).toBe(false);
  });

  it("resolveEventChoice applies heal outcomes on success", () => {
    const character = { ...buildCharacter("devout"), hp: 10, maxHp: 30 };
    const base = generateDungeonRun({ seed: "heal-event", biome: "crypt", tier: 1 });
    const { run, event } = attachEventToRoom(base, "sealed-shrine");
    // Rig an rng that always rolls 20 to guarantee success on the Pray statCheck
    const rng = forceRollRng(20);
    const res = resolveEventChoice({ run, character, event, choiceId: "pray", rng });
    expect(res.character.hp).toBeGreaterThan(character.hp);
    const resolvedRoom = res.run.roomGraph.find(r => r.id === event.roomId);
    expect(resolvedRoom?.activeEvent?.resolved).toBe(true);
  });

  it("resolveEventChoice applies threat/loot outcomes on take-offerings", () => {
    const character = buildCharacter("warrior");
    const base = generateDungeonRun({ seed: "take-event", biome: "crypt", tier: 1 });
    const { run, event } = attachEventToRoom(base, "sealed-shrine");
    const before = run.threat.points;
    const res = resolveEventChoice({ run, character, event, choiceId: "take-offerings", rng: createRng("take-1") });
    expect(res.run.threat.points).toBeGreaterThan(before);
    const resolvedRoom = res.run.roomGraph.find(r => r.id === event.roomId);
    expect(resolvedRoom?.activeEvent?.resolved).toBe(true);
  });

  it("resolveEventChoice cannot resolve a choice twice", () => {
    const character = buildCharacter("scout");
    const base = generateDungeonRun({ seed: "repeat-event", biome: "crypt", tier: 1 });
    const { run, event } = attachEventToRoom(base, "sealed-shrine");
    const first = resolveEventChoice({ run, character, event, choiceId: "leave", rng: createRng("x") });
    const secondRoom = first.run.roomGraph.find(r => r.id === event.roomId)!;
    const second = resolveEventChoice({
      run: first.run, character, event: secondRoom.activeEvent!, choiceId: "pray", rng: createRng("y")
    });
    expect(second.resultMessage.toLowerCase()).toContain("already");
  });

  it("merchant-shade 'Trade gold' is blocked without enough gold", () => {
    const character = buildCharacter("warrior");
    const base = generateDungeonRun({ seed: "gold-gate", biome: "crypt", tier: 1 });
    const run = { ...base, raidInventory: { ...base.raidInventory, gold: 0 } };
    const choice: EventChoice = getEventTemplate("merchant-shade").choices.find(c => c.id === "trade-gold")!;
    const gate = checkChoiceRequirements({ choice, character, run });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toMatch(/gold/);
  });

  it("applyEventOutcome gainLootFromTable adds items when under capacity", () => {
    const character = buildCharacter("warden");
    const run = generateDungeonRun({ seed: "loot-out", biome: "crypt", tier: 1 });
    const before = run.raidInventory.items.length;
    const { run: after } = applyEventOutcome({
      run, character,
      outcome: { type: "gainLootFromTable", message: "You find something." },
      rng: createRng("loot-rng"),
      roomId: run.roomGraph[1]!.id
    });
    expect(after.raidInventory.items.length).toBeGreaterThanOrEqual(before);
    expect(after.dungeonLog.length).toBeGreaterThan(run.dungeonLog.length);
  });

  it("applyEventOutcome increaseThreat bumps threat and logs", () => {
    const character = buildCharacter("warden");
    const run = generateDungeonRun({ seed: "threat-out", biome: "crypt", tier: 1 });
    const before = run.threat.points;
    const { run: after } = applyEventOutcome({
      run, character,
      outcome: { type: "increaseThreat", amount: 10, message: "Noisy." },
      rng: createRng("threat-rng"),
      roomId: run.roomGraph[1]!.id
    });
    expect(after.threat.points - before).toBe(10);
    expect(after.dungeonLog.some(e => e.type === "threat")).toBe(true);
  });
});

function forceRollRng(d20Value: number) {
  let floatTurn = 0;
  const floats = [
    (d20Value - 1) / 20 + 0.0001, // forces nextInt(1, 20) to yield d20Value
    0.01 // anything for pickOne/pickWeighted later
  ];
  return {
    seed: "force",
    nextInt: (lo: number, hi: number) => {
      if (lo === 1 && hi === 20) return d20Value;
      return lo;
    },
    nextFloat: () => floats[Math.min(floatTurn++, floats.length - 1)] ?? 0.5,
    pickOne: <T>(arr: readonly T[]) => arr[0]!,
    pickWeighted: <T>(entries: ReadonlyArray<{ value: T; weight: number }>) => entries[0]!.value,
    shuffle: <T>(arr: readonly T[]) => [...arr],
    forkChild: (_: string) => forceRollRng(d20Value)
  };
}
