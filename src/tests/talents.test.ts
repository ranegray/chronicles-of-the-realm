import { describe, expect, it } from "vitest";
import {
  canLearnTalent,
  getTalentStatus,
  getTalentTreeForClass,
  getUnlockedCombatActions,
  learnTalent
} from "../game/talents";
import type { Character, CharacterLevel, ClassId } from "../game/types";

const classIds: ClassId[] = ["warrior", "scout", "arcanist", "warden", "devout"];

function buildCharacter(classId: ClassId, level: CharacterLevel = 2, points = 1): Character {
  return {
    id: `${classId}-test`,
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
    derivedStats: {
      maxHp: 24,
      armor: 1,
      accuracy: 3,
      evasion: 11,
      critChance: 5,
      carryCapacity: 20,
      magicPower: 1,
      trapSense: 1
    },
    hp: 24,
    maxHp: 24,
    equipped: {},
    progression: {
      level,
      xp: 0,
      totalXpEarned: 0,
      unspentTalentPoints: points,
      spentTalentPoints: 0,
      learnedTalentIds: [],
      activeCombatActionIds: [],
      unlockedPassiveIds: [],
      unlockedBuildFlags: {}
    }
  };
}

describe("talents", () => {
  it("loads a complete three-tier talent tree for each class", () => {
    for (const classId of classIds) {
      const tree = getTalentTreeForClass(classId);
      expect(tree.nodes.length).toBeGreaterThanOrEqual(5);
      expect(new Set(tree.nodes.map(node => node.tier))).toEqual(new Set([1, 2, 3]));
      expect(tree.nodes.some(node => node.type === "combatAction")).toBe(true);
      expect(
        tree.nodes.filter(node => node.type === "passive" || node.type === "exploration").length
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps locked talents unavailable until level and prerequisite requirements are met", () => {
    const character = buildCharacter("warrior", 4, 1);
    const locked = canLearnTalent({ character, talentId: "warrior-shield-bash" });
    expect(locked.canLearn).toBe(false);
    expect(locked.reason).toContain("Hold the Line");
  });

  it("learns an available talent, spends a point, and records the learned id", () => {
    const character = buildCharacter("scout", 2, 1);
    const result = learnTalent({ character, talentId: "scout-keen-eye" });
    expect(result.success).toBe(true);
    expect(result.character.progression.unspentTalentPoints).toBe(0);
    expect(result.character.progression.spentTalentPoints).toBe(1);
    expect(result.character.progression.learnedTalentIds).toContain("scout-keen-eye");
    expect(
      getTalentStatus({
        character: result.character,
        talent: getTalentTreeForClass("scout").nodes.find(node => node.id === "scout-keen-eye")!
      })
    ).toBe("learned");
  });

  it("unlocks combat actions from learned combat-action talents", () => {
    const character = buildCharacter("scout", 4, 2);
    const learnedKeenEye = learnTalent({ character, talentId: "scout-quick-hands" }).character;
    const learnedSlipAway = learnTalent({
      character: { ...learnedKeenEye, progression: { ...learnedKeenEye.progression, unspentTalentPoints: 1 } },
      talentId: "scout-slip-away"
    }).character;

    expect(getUnlockedCombatActions(learnedSlipAway).map(action => action.id)).toContain("slip-away");
  });

  it("survives serialization with learned talent state intact", () => {
    const character = learnTalent({
      character: buildCharacter("devout", 2, 1),
      talentId: "devout-field-prayer"
    }).character;
    const restored = JSON.parse(JSON.stringify(character)) as Character;
    expect(restored.progression.learnedTalentIds).toEqual(["devout-field-prayer"]);
    expect(getUnlockedCombatActions(restored).map(action => action.id)).toContain("field-prayer");
  });
});
