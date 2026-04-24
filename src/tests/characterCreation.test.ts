import { describe, it, expect } from "vitest";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { ABILITY_NAMES } from "../game/constants";

describe("CharacterCreationService", () => {
  it("creates an empty draft", () => {
    const d = createEmptyDraft("seed1");
    expect(d.name).toEqual("");
    expect(d.rolledScores).toHaveLength(0);
  });

  it("rolls six ability scores using 4d6 drop lowest", () => {
    const d = CharacterCreationService.rollAllAbilityScores(createEmptyDraft("scores1"));
    expect(d.rolledScores).toHaveLength(ABILITY_NAMES.length);
    for (const v of d.rolledScores) {
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(18);
    }
  });

  it("enforces reroll limit", () => {
    let d = CharacterCreationService.rollAllAbilityScores(createEmptyDraft("rr"));
    for (let i = 0; i < 10; i++) {
      d = CharacterCreationService.rerollAllAbilityScores(d);
    }
    expect(d.rerollsUsed).toBeLessThanOrEqual(3);
  });

  it("auto-assigns scores prioritizing class abilities", () => {
    let d = createEmptyDraft("auto");
    d = CharacterCreationService.selectClass(d, "warrior");
    d = CharacterCreationService.rollAllAbilityScores(d);
    d = CharacterCreationService.autoAssignScoresForClass(d);
    expect(d.abilityScores).toBeDefined();
    const scores = d.abilityScores!;
    // warrior prefers might+endurance — both should be among the top scores
    const sorted = [...d.rolledScores].sort((a, b) => b - a);
    expect([scores.might, scores.endurance].sort((a, b) => b - a)).toEqual(sorted.slice(0, 2));
  });

  it("finalizes a complete character", () => {
    let d = createEmptyDraft("final");
    d = CharacterCreationService.setName(d, "Test Adventurer");
    d = CharacterCreationService.selectAncestry(d, "human");
    d = CharacterCreationService.selectClass(d, "warrior");
    d = CharacterCreationService.rollAllAbilityScores(d);
    d = CharacterCreationService.autoAssignScoresForClass(d);
    d = CharacterCreationService.chooseStarterKit(d, "warrior_sword_shield");
    expect(CharacterCreationService.isReadyToFinalize(d)).toBe(true);

    const { character, equipment } = CharacterCreationService.finalizeCharacter(d);
    expect(character.name).toEqual("Test Adventurer");
    expect(character.classId).toEqual("warrior");
    expect(character.ancestryId).toEqual("human");
    expect(character.maxHp).toBeGreaterThan(0);
    expect(character.hp).toEqual(character.maxHp);
    expect(equipment.length).toBeGreaterThan(0);
    expect(character.equipped.weapon).toBeDefined();
  });

  it("rejects finalizing when incomplete", () => {
    const d = createEmptyDraft("incomplete");
    expect(() => CharacterCreationService.finalizeCharacter(d)).toThrow();
  });
});
