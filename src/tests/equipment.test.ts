import { describe, expect, it } from "vitest";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";
import {
  canEquipItem,
  equipItem,
  getPreferredEquipmentSlot,
  getValidEquipmentSlotsForItem,
  previewEquipmentChange,
  unequipItem
} from "../game/equipment";
import { instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { Character, CharacterProgressionState, DungeonRun, ItemInstance, ItemState } from "../game/types";

describe("equipment", () => {
  it("validates item categories against equipment slots", () => {
    const character = makeCharacter();
    const weapon = instanceFromTemplateId("weapon_short_sword", createRng("eq-weapon"));
    const armor = instanceFromTemplateId("armor_padded_coat", createRng("eq-armor"));
    const trinket = instanceFromTemplateId("trinket_minor_ward", createRng("eq-trinket"));

    expect(getValidEquipmentSlotsForItem(weapon)).toEqual(["weapon"]);
    expect(getValidEquipmentSlotsForItem(trinket)).toEqual(["trinket1", "trinket2"]);
    expect(canEquipItem({ character, item: weapon, slot: "weapon" }).canEquip).toBe(true);
    expect(canEquipItem({ character, item: armor, slot: "weapon" }).canEquip).toBe(false);
  });

  it("keeps merchant-compatible preferred slot behavior", () => {
    const trinketA = instanceFromTemplateId("trinket_minor_ward", createRng("slot-a"));
    const trinketB = instanceFromTemplateId("trinket_silk_picks", createRng("slot-b"));

    expect(getPreferredEquipmentSlot(instanceFromTemplateId("weapon_short_sword", createRng("slot-w")))).toBe("weapon");
    expect(getPreferredEquipmentSlot(trinketA, {})).toBe("trinket1");
    expect(getPreferredEquipmentSlot(trinketB, { trinket1: trinketA })).toBe("trinket2");
  });

  it("equips and unequips items without mutating the original character", () => {
    const character = makeCharacter();
    const weapon = instanceFromTemplateId("weapon_short_sword", createRng("equip"));
    const equipped = equipItem({ character, item: weapon, slot: "weapon" });

    expect(equipped.equipped.weapon?.instanceId).toBe(weapon.instanceId);
    expect(character.equipped.weapon).toBeUndefined();

    const unequipped = unequipItem({ character: equipped, slot: "weapon" });
    expect(unequipped.success).toBe(true);
    expect(unequipped.character.equipped.weapon).toBeUndefined();
  });

  it("blocks cursed equipment removal during active runs", () => {
    const cursedArmor = withStates(instanceFromTemplateId("armor_padded_coat", createRng("cursed-armor")), [
      { id: "cursed" }
    ]);
    const character = { ...makeCharacter(), equipped: { armor: cursedArmor } };
    const result = unequipItem({
      character,
      slot: "armor",
      activeRun: { runId: "run" } as DungeonRun
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain("cursed");
    expect(result.character.equipped.armor).toBeDefined();
  });

  it("previews stat differences and warnings for a risky equipment swap", () => {
    const currentArmor = instanceFromTemplateId("armor_heavy_gambeson", createRng("preview-current"));
    const newArmor = withStates(instanceFromTemplateId("armor_traveler_leathers", createRng("preview-new")), [
      { id: "fragile" }
    ]);
    const character = { ...makeCharacter(), equipped: { armor: currentArmor } };

    const preview = previewEquipmentChange({
      character,
      item: newArmor,
      slot: "armor",
      ancestry: getAncestry("human"),
      classDefinition: getClass("scout")
    });

    expect(preview.currentItem?.instanceId).toBe(currentArmor.instanceId);
    expect(preview.newItem?.instanceId).toBe(newArmor.instanceId);
    expect(preview.statDiff.armor).toBeLessThan(0);
    expect(preview.statDiff.evasion).toBeGreaterThan(0);
    expect(preview.warnings.map(warning => warning.type)).toContain("fragileGear");
  });
});

function makeCharacter(): Character {
  return {
    id: "char-equipment",
    name: "Slot Tester",
    ancestryId: "human",
    classId: "scout",
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
      maxHp: 26,
      armor: 1,
      accuracy: 4,
      evasion: 12,
      critChance: 5,
      carryCapacity: 25,
      magicPower: 1,
      trapSense: 2
    },
    hp: 26,
    maxHp: 26,
    equipped: {},
    progression: makeProgression()
  };
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
