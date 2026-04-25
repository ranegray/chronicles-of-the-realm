import { describe, expect, it } from "vitest";
import { applyTalentEffectsToDerivedStats, getTalentBonusForContext, hasPassiveFlag } from "../game/talentEffects";
import type { Character, CharacterLevel, ClassId, DerivedStats } from "../game/types";

const baseStats: DerivedStats = {
  maxHp: 24,
  armor: 1,
  accuracy: 3,
  evasion: 11,
  critChance: 5,
  carryCapacity: 20,
  magicPower: 1,
  trapSense: 1
};

function buildCharacter(
  classId: ClassId,
  learnedTalentIds: string[],
  level: CharacterLevel = 7,
  unlockedPassiveIds: string[] = []
): Character {
  return {
    id: `${classId}-effects`,
    name: "Tester",
    ancestryId: "human",
    classId,
    level,
    xp: 0,
    abilityScores: {
      might: 12,
      agility: 12,
      endurance: 12,
      intellect: 12,
      will: 12,
      presence: 12
    },
    derivedStats: baseStats,
    hp: 24,
    maxHp: 24,
    equipped: {},
    progression: {
      level,
      xp: 0,
      totalXpEarned: 0,
      unspentTalentPoints: 0,
      spentTalentPoints: learnedTalentIds.length,
      learnedTalentIds,
      activeCombatActionIds: [],
      unlockedPassiveIds,
      unlockedBuildFlags: Object.fromEntries(unlockedPassiveIds.map(id => [id, true]))
    }
  };
}

describe("talent effects", () => {
  it("applies derived stat bonuses from learned talents", () => {
    const warrior = buildCharacter("warrior", ["warrior-weapon-mastery"]);
    const modified = applyTalentEffectsToDerivedStats({ character: warrior, baseStats });
    expect(modified.accuracy).toBe(baseStats.accuracy + 1);
  });

  it("applies scouting, trap, and flee bonuses in the right contexts", () => {
    const scout = buildCharacter("scout", [
      "scout-keen-eye",
      "scout-quick-hands"
    ]);
    const warrior = buildCharacter("warrior", ["warrior-iron-nerve"]);
    expect(getTalentBonusForContext({ character: scout, context: "scouting" })).toBe(2);
    expect(getTalentBonusForContext({ character: scout, context: "trapDisarm" })).toBe(2);
    expect(getTalentBonusForContext({ character: warrior, context: "flee" })).toBe(1);
  });

  it("queries passive flags from learned talent effects and progression state", () => {
    const arcanist = buildCharacter("arcanist", ["arcanist-arcane-ward"]);
    expect(hasPassiveFlag({ character: arcanist, passiveFlag: "arcanist_arcane_ward" })).toBe(true);

    const warrior = buildCharacter("warrior", [], 7, ["warrior_scarred_veteran"]);
    expect(hasPassiveFlag({ character: warrior, passiveFlag: "warrior_scarred_veteran" })).toBe(true);
  });

  it("does not apply talent ids from the wrong class", () => {
    const scout = buildCharacter("scout", ["warrior-weapon-mastery"]);
    const modified = applyTalentEffectsToDerivedStats({ character: scout, baseStats });
    expect(modified.accuracy).toBe(baseStats.accuracy);
  });

  it("applies extraction and healing context bonuses", () => {
    const warden = buildCharacter("warden", ["warden-herbal-recovery"]);
    const scout = buildCharacter("scout", ["scout-light-pack"]);
    expect(getTalentBonusForContext({ character: warden, context: "healingReceived" })).toBe(2);
    expect(getTalentBonusForContext({ character: scout, context: "extraction" })).toBe(1);
  });
});
