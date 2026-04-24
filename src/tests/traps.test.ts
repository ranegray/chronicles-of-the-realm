import { describe, it, expect } from "vitest";
import {
  detectTrap,
  disarmTrap,
  generateTrapForRoom,
  rollTrapDamage,
  triggerTrap,
  effectiveDetectionDifficulty
} from "../game/traps";
import { getTrapTemplate, TRAP_TEMPLATES } from "../data/trapTables";
import { generateDungeonRun } from "../game/dungeonGenerator";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { createRng } from "../game/rng";
import { TRAP_RULES } from "../game/constants";
import type { Character, ClassId, DungeonRoom, DungeonRun } from "../game/types";

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

function buildTrapRun(seed: string): { run: DungeonRun; trapRoom: DungeonRoom } {
  for (let i = 0; i < 40; i++) {
    const run = generateDungeonRun({ seed: `${seed}:${i}`, biome: "crypt", tier: 1 });
    const trapRoom = run.roomGraph.find(r => r.type === "trap" && r.activeTrap);
    if (trapRoom) return { run, trapRoom };
  }
  throw new Error("no trap room in 40 seeded attempts — generator regression?");
}

describe("traps", () => {
  it("generateTrapForRoom returns a valid ActiveTrap for supported biomes", () => {
    const trap = generateTrapForRoom({
      room: { id: "r" } as DungeonRoom,
      biome: "crypt",
      tier: 1,
      rng: createRng("crypt-trap")
    });
    expect(trap).toBeDefined();
    expect(trap!.triggered).toBe(false);
    expect(trap!.detected).toBe(false);
    expect(trap!.disarmed).toBe(false);
    expect(TRAP_TEMPLATES.find(t => t.id === trap!.trapId)).toBeDefined();
  });

  it("detectTrap uses trapSense and respects difficulty", () => {
    const { run, trapRoom } = buildTrapRun("detect-1");
    const character = buildCharacter("scout");
    let successes = 0;
    for (let i = 0; i < 80; i++) {
      const res = detectTrap({
        run, character, trap: trapRoom.activeTrap!, rng: createRng(`det:${i}`)
      });
      if (res.detected) successes++;
    }
    expect(successes).toBeGreaterThan(0);
    expect(successes).toBeLessThan(80);
  });

  it("disarmed trap cannot trigger again", () => {
    const { run, trapRoom } = buildTrapRun("disarm-1");
    const character = buildCharacter("scout");
    const trap = { ...trapRoom.activeTrap!, disarmed: true, detected: true };
    const res = disarmTrap({ run, character, trap, rng: createRng("post-disarm") });
    expect(res.disarmed).toBe(true);
    expect(res.triggered).toBe(false);
  });

  it("triggerTrap applies damage and threat", () => {
    const { run, trapRoom } = buildTrapRun("trigger-1");
    const character = { ...buildCharacter("scout"), hp: 50, maxHp: 50 };
    const before = run.threat.points;
    const trig = triggerTrap({
      run, character, room: trapRoom, trap: trapRoom.activeTrap!,
      rng: createRng("trigger-sim")
    });
    expect(trig.character.hp).toBeLessThanOrEqual(character.hp);
    expect(trig.run.threat.points).toBeGreaterThanOrEqual(before);
    expect(trig.result.triggered).toBe(true);
  });

  it("rollTrapDamage yields non-negative damage", () => {
    const template = getTrapTemplate("trap_tripwire_snare");
    for (let i = 0; i < 50; i++) {
      const dmg = rollTrapDamage(template, 1, createRng(`dmg:${i}`));
      expect(dmg).toBeGreaterThanOrEqual(0);
    }
  });

  it("threat level raises effective detection difficulty", () => {
    const { run, trapRoom } = buildTrapRun("threat-diff-1");
    const template = getTrapTemplate(trapRoom.activeTrap!.trapId);
    const calm = effectiveDetectionDifficulty(template, run);
    const hot = effectiveDetectionDifficulty(template, { ...run, threat: { ...run.threat, level: 5 as const } });
    expect(hot).toBeGreaterThan(calm);
  });

  it("alarm trap has higher threat-increase-on-trigger than mechanical trap", () => {
    const alarm = getTrapTemplate("trap_alarm_bones");
    const mechanical = getTrapTemplate("trap_tripwire_snare");
    expect(alarm.threatIncreaseOnTrigger ?? 0)
      .toBeGreaterThan(mechanical.threatIncreaseOnTrigger ?? 0);
  });

  it("trap state persists on the room after generation (scouted + searchable)", () => {
    const { trapRoom } = buildTrapRun("persist-1");
    expect(trapRoom.activeTrap).toBeDefined();
    expect(trapRoom.activeTrap!.roomId).toBe(trapRoom.id);
    expect(trapRoom.scoutingProfile?.hasTrapSignature).toBe(true);
    expect(trapRoom.searchState).toBeDefined();
  });

  it("TRAP_RULES tier damage table has an entry for every supported tier", () => {
    for (let tier = 1; tier <= 5; tier++) {
      const row = (TRAP_RULES.triggerDamageByTier as Record<number, unknown>)[tier];
      expect(row).toBeDefined();
    }
  });
});
