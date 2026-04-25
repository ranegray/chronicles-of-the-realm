import { describe, expect, it } from "vitest";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";
import {
  calculateEquipmentStatModifiers,
  calculateFullDerivedStats,
  calculateItemStateStatModifiers,
  calculateTalentStatModifiers,
  generateBuildSummary
} from "../game/buildMath";
import { instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { Character, CharacterProgressionState, ItemAffix, ItemInstance, ItemState } from "../game/types";

describe("build math", () => {
  it("includes base equipment, affix, talent, item-state, and run-preparation modifiers", () => {
    const character = makeCharacter();
    const sword = withAffix(instanceFromTemplateId("weapon_short_sword", createRng("build-sword")), {
      id: "affix-keen",
      name: "Keen",
      description: "+2 Accuracy.",
      stats: { accuracy: 2 },
      tags: ["combat"]
    });
    const armor = withStates(instanceFromTemplateId("armor_padded_coat", createRng("build-armor")), [
      { id: "reinforced", statModifier: { carryCapacity: 2 } }
    ]);
    const equipped = { weapon: sword, armor };
    const withProgression = {
      ...character,
      equipped,
      progression: makeProgression({ learnedTalentIds: ["scout-keen-eye", "scout-light-pack"] })
    } as Character;

    const stats = calculateFullDerivedStats({
      character: withProgression,
      ancestry: getAncestry("human"),
      classDefinition: getClass("scout"),
      equipped,
      activeRunPreparations: [
        {
          id: "prep-1",
          optionId: "prep",
          sourceNpcId: "npc",
          createdAt: 1,
          consumed: false,
          effect: { type: "temporaryStatBonus", statKey: "evasion", amount: 2, durationRuns: 1 }
        }
      ]
    });

    expect(stats.accuracy).toBeGreaterThan(character.derivedStats.accuracy);
    expect(stats.trapSense).toBeGreaterThanOrEqual(character.derivedStats.trapSense + 2);
    expect(stats.carryCapacity).toBeGreaterThan(character.derivedStats.carryCapacity);
    expect(stats.evasion).toBeGreaterThan(character.derivedStats.evasion);
  });

  it("collects equipment, affix, talent, and state modifier blocks independently", () => {
    const weapon = withAffix(instanceFromTemplateId("weapon_short_sword", createRng("mod-weapon")), {
      id: "affix-flat",
      name: "of Aim",
      description: "+1 Accuracy.",
      stats: { accuracy: 1 }
    });
    const armor = withStates(instanceFromTemplateId("armor_heavy_gambeson", createRng("mod-armor")), [
      { id: "damaged" },
      { id: "reinforced" }
    ]);
    const character = {
      ...makeCharacter(),
      progression: makeProgression({ learnedTalentIds: ["arcanist-spell-surge", "arcanist-glass-focus"] })
    } as Character;

    expect(calculateEquipmentStatModifiers({ weapon }).accuracy).toBe(2);
    expect(calculateTalentStatModifiers(character).magicPower).toBe(3);
    const stateMods = calculateItemStateStatModifiers({ armor });
    expect(stateMods.armor).toBe(0);
  });

  it("generates build warnings for risky gear and weak defensive builds", () => {
    const fragileWeapon = withStates(instanceFromTemplateId("weapon_belt_dagger", createRng("fragile")), [
      { id: "fragile" },
      { id: "contraband" }
    ]);
    const cursedCharm = withStates(instanceFromTemplateId("trinket_minor_ward", createRng("curse")), [
      { id: "cursed" }
    ]);
    const character = {
      ...makeCharacter("arcanist"),
      equipped: { weapon: fragileWeapon, trinket1: cursedCharm }
    };

    const summary = generateBuildSummary({
      character,
      ancestry: getAncestry("human"),
      classDefinition: getClass("arcanist")
    });

    expect(summary.riskScore).toBeGreaterThanOrEqual(5);
    expect(summary.warnings.map(warning => warning.type)).toEqual(
      expect.arrayContaining(["fragileGear", "cursedGear", "contraband", "lowDefense"])
    );
    expect(summary.primaryTags).toContain("highRisk");
  });
});

function makeCharacter(classId: Character["classId"] = "scout"): Character {
  const cls = getClass(classId);
  return {
    id: `char-${classId}`,
    name: "Preview Delver",
    ancestryId: "human",
    classId,
    level: 1,
    xp: 0,
    abilityScores: {
      might: 12,
      agility: 14,
      endurance: 12,
      intellect: 12,
      will: 10,
      presence: 10
    },
    derivedStats: {
      maxHp: cls.baseHp + 2,
      armor: cls.baseArmor,
      accuracy: cls.baseAccuracy,
      evasion: 12,
      critChance: 5,
      carryCapacity: 25,
      magicPower: cls.magicBonus + 1,
      trapSense: 2
    },
    hp: cls.baseHp + 2,
    maxHp: cls.baseHp + 2,
    equipped: {},
    progression: makeProgression()
  };
}

function withAffix(item: ItemInstance, affix: ItemAffix): ItemInstance {
  return { ...item, affixes: [affix] };
}

function withStates(item: ItemInstance, states: Array<Partial<ItemState> & Pick<ItemState, "id">>): ItemInstance {
  return {
    ...item,
    states: states.map((state, index) => ({
      source: "debug",
      appliedAt: index,
      ...state
    }))
  };
}

function makeProgression(overrides: Partial<CharacterProgressionState> = {}): CharacterProgressionState {
  return {
    level: 1,
    xp: 0,
    totalXpEarned: 0,
    unspentTalentPoints: 0,
    spentTalentPoints: 0,
    learnedTalentIds: [],
    activeCombatActionIds: [],
    unlockedPassiveIds: [],
    unlockedBuildFlags: {},
    ...overrides
  };
}
