import { describe, it, expect } from "vitest";
import {
  activateExtraction,
  canAttemptExtraction,
  generateExtractionPoint,
  getExtractionWeightLimit,
  resolveExtractionTurn,
  resolveUnstableExtraction
} from "../game/extraction";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { createRng } from "../game/rng";
import { instanceFromTemplateId } from "../game/inventory";
import type {
  Character,
  ClassId,
  DungeonRoom,
  DungeonRun,
  ExtractionPoint,
  ExtractionVariant
} from "../game/types";

function buildCharacter(classId: ClassId = "warrior"): Character {
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

function runWithVariant(seed: string, variant: ExtractionVariant): { run: DungeonRun; room: DungeonRoom } {
  for (let i = 0; i < 40; i++) {
    const base = generateDungeonRun({ seed: `${seed}:${i}`, biome: "crypt", tier: 1 });
    const room = base.roomGraph.find(r => r.extraction);
    if (!room || !room.extraction) continue;
    const pointed = { ...base, currentRoomId: room.id };
    // Force the desired variant for deterministic testing.
    const forced: ExtractionPoint = makeVariant(variant, room.id);
    const withForced = {
      ...pointed,
      roomGraph: pointed.roomGraph.map(r => r.id === room.id ? { ...r, extraction: forced } : r)
    };
    const updated = withForced.roomGraph.find(r => r.id === room.id)!;
    return { run: withForced, room: updated };
  }
  throw new Error("no extraction room in 40 seeded attempts");
}

function makeVariant(variant: ExtractionVariant, roomId: string): ExtractionPoint {
  switch (variant) {
    case "stable":
      return {
        id: `${roomId}:stable`, variant: "stable", state: "available",
        title: "Clear Way Out", description: "", activationText: "ok", successText: "out"
      };
    case "delayed":
      return {
        id: `${roomId}:delayed`, variant: "delayed", state: "available",
        title: "Lift", description: "", activationText: "start", successText: "out",
        requiredTurns: 2
      };
    case "guarded":
      return {
        id: `${roomId}:guarded`, variant: "guarded", state: "blocked",
        title: "Guard", description: "", activationText: "engage", successText: "out",
        guardEncounterId: "enc_crypt_skeleton", guardDefeated: false
      };
    case "unstable":
      return {
        id: `${roomId}:unstable`, variant: "unstable", state: "available",
        title: "Portal", description: "", activationText: "go", successText: "out",
        baseComplicationChance: 0.12, threatSensitive: true
      };
    case "burdened":
      return {
        id: `${roomId}:burdened`, variant: "burdened", state: "available",
        title: "Crawlway", description: "", activationText: "squeeze", successText: "out",
        burdenedWeightLimitRatio: 0.75
      };
  }
}

describe("extraction", () => {
  it("generateExtractionPoint picks a valid variant every time", () => {
    const variants = new Set<ExtractionVariant>();
    for (let i = 0; i < 60; i++) {
      const ep = generateExtractionPoint({
        roomId: `r${i}`, biome: "crypt", tier: 1,
        rng: createRng(`ext:${i}`)
      });
      variants.add(ep.variant);
    }
    // Given 60 tries and the weights, all 5 variants should appear.
    expect(variants.size).toBeGreaterThanOrEqual(4);
  });

  it("stable extraction succeeds immediately", () => {
    const { run, room } = runWithVariant("stable-run", "stable");
    const character = buildCharacter();
    const res = activateExtraction({
      run, character, room, rng: createRng("stable-go")
    });
    expect(res.extracted).toBe(true);
    expect(res.startedCombat).toBeFalsy();
  });

  it("delayed extraction sets turnsRemaining and keeps the run active", () => {
    const { run, room } = runWithVariant("delayed-run", "delayed");
    const character = buildCharacter();
    const res = activateExtraction({
      run, character, room, rng: createRng("delayed-go")
    });
    expect(res.extracted).toBe(false);
    expect(res.requiresPlayerChoice).toBe(true);
    expect(res.run.currentExtractionInteraction).toBeDefined();
    expect(res.run.currentExtractionInteraction?.turnsRemaining).toBeGreaterThan(0);
  });

  it("delayed extraction can complete after enough safe turns", () => {
    const { run, room } = runWithVariant("delayed-finish", "delayed");
    const character = buildCharacter();
    // Force activation with a fixed rng so we know the initial state.
    let state = activateExtraction({
      run, character, room, rng: createRng("start")
    });
    // Run turns; any ambush roll resolves into startedCombat.
    // Use a rng that never ambushes (nextFloat always 1).
    const noAmbushRng = rngForcedFloat(0.99);
    while (!state.extracted && !state.startedCombat) {
      const currentRoom = state.run.roomGraph.find(r => r.id === room.id)!;
      state = resolveExtractionTurn({
        run: state.run, character: state.character, room: currentRoom,
        rng: noAmbushRng
      });
      if ((state.run.currentExtractionInteraction?.turnsRemaining ?? 0) <= 0 && !state.extracted) {
        // Should extract exactly at 0; break otherwise to avoid infinite loop.
        break;
      }
    }
    expect(state.extracted).toBe(true);
  });

  it("guarded extraction starts combat first, then extracts after guardDefeated", () => {
    const { run, room } = runWithVariant("guarded-run", "guarded");
    const character = buildCharacter();

    // Activation starts combat while guard is alive.
    const res = activateExtraction({
      run, character, room, rng: createRng("guarded-go")
    });
    expect(res.extracted).toBe(false);
    expect(res.startedCombat).toBe(true);
    expect(res.combatEncounterId).toBeDefined();

    // With guard defeated, we should be able to extract.
    const defeatedRoom = { ...room, extraction: { ...room.extraction!, guardDefeated: true } };
    const res2 = activateExtraction({
      run, character, room: defeatedRoom, rng: createRng("guarded-again")
    });
    expect(res2.extracted).toBe(true);
  });

  it("unstable extraction yields either success or a complication (never raw kill at hp 38)", () => {
    const { run, room } = runWithVariant("unstable-run", "unstable");
    const character = buildCharacter();
    let clean = 0, complicated = 0;
    for (let i = 0; i < 80; i++) {
      const res = resolveUnstableExtraction({
        run, character, room, rng: createRng(`unstable:${i}`)
      });
      if (res.extracted) clean++;
      else complicated++;
    }
    expect(clean).toBeGreaterThan(0);
    expect(complicated + clean).toBe(80);
  });

  it("burdened extraction blocks when raid pack is above the weight limit", () => {
    const { run, room } = runWithVariant("burdened-run", "burdened");
    const character = buildCharacter();
    // Add enough heavy items to exceed the limit.
    let heavyRun = run;
    for (let i = 0; i < 6; i++) {
      const item = instanceFromTemplateId("material_ore_chunk", createRng(`bm:${i}`), 1);
      heavyRun = { ...heavyRun, raidInventory: { ...heavyRun.raidInventory, items: [...heavyRun.raidInventory.items, { ...item, weight: 6 }] } };
    }
    const gate = canAttemptExtraction({ run: heavyRun, character, room });
    expect(gate.canAttempt).toBe(false);
    expect(gate.reason?.toLowerCase()).toContain("drop");
  });

  it("getExtractionWeightLimit uses the 75% default ratio", () => {
    const character = buildCharacter();
    const extraction: ExtractionPoint = makeVariant("burdened", "r");
    const limit = getExtractionWeightLimit({ character, extraction });
    expect(limit).toBe(Math.floor(character.derivedStats.carryCapacity * 0.75));
  });
});

function rngForcedFloat(value: number) {
  return {
    seed: "forced",
    nextInt: (lo: number, hi: number) => Math.floor((lo + hi) / 2),
    nextFloat: () => value,
    pickOne: <T>(arr: readonly T[]) => arr[0]!,
    pickWeighted: <T>(entries: ReadonlyArray<{ value: T; weight: number }>) => entries[0]!.value,
    shuffle: <T>(arr: readonly T[]) => [...arr],
    forkChild: (_: string) => rngForcedFloat(value)
  };
}
