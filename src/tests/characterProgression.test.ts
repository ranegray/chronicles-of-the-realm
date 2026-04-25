import { describe, expect, it } from "vitest";
import {
  awardCharacterXp,
  calculateTalentPointsForLevel,
  getLevelFromXp,
  getXpRequiredForLevel,
  initializeCharacterProgression,
  refundTalents,
  spendTalentPoint
} from "../game/characterProgression";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import type { Character } from "../game/types";

function buildLegacyPlayer(): Character {
  let draft = createEmptyDraft("progression");
  draft = CharacterCreationService.setName(draft, "Tester");
  draft = CharacterCreationService.selectAncestry(draft, "human");
  draft = CharacterCreationService.selectClass(draft, "scout");
  draft = CharacterCreationService.rollAllAbilityScores(draft);
  draft = CharacterCreationService.autoAssignScoresForClass(draft);
  draft = CharacterCreationService.chooseStarterKit(draft, "scout_bow_dagger");
  const player = CharacterCreationService.finalizeCharacter(draft).character;
  const { progression, ...legacy } = player;
  void progression;
  return legacy as Character;
}

describe("character progression", () => {
  it("initializes missing progression for a legacy character", () => {
    const player = initializeCharacterProgression({ character: buildLegacyPlayer() });

    expect(player.progression).toEqual({
      level: 1,
      xp: 0,
      totalXpEarned: 0,
      unspentTalentPoints: 0,
      spentTalentPoints: 0,
      learnedTalentIds: [],
      activeCombatActionIds: [],
      unlockedPassiveIds: [],
      unlockedBuildFlags: {}
    });
    expect(player.level).toBe(player.progression.level);
    expect(player.xp).toBe(player.progression.xp);
  });

  it("maps cumulative XP thresholds to character levels", () => {
    expect(getXpRequiredForLevel(2)).toBe(100);
    expect(getLevelFromXp(99)).toBe(1);
    expect(getLevelFromXp(100)).toBe(2);
    expect(getLevelFromXp(250)).toBe(3);
  });

  it("awards XP, levels up, grants talent points, and syncs legacy fields", () => {
    const player = initializeCharacterProgression({ character: buildLegacyPlayer() });
    const result = awardCharacterXp({ character: player, xp: 260 });

    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(2);
    expect(result.talentPointsGained).toBe(2);
    expect(result.character.progression.level).toBe(3);
    expect(result.character.progression.xp).toBe(260);
    expect(result.character.progression.totalXpEarned).toBe(260);
    expect(result.character.progression.unspentTalentPoints).toBe(2);
    expect(result.character.level).toBe(result.character.progression.level);
    expect(result.character.xp).toBe(result.character.progression.xp);
  });

  it("spends and refunds talent points without duplicating learned talents", () => {
    const leveled = awardCharacterXp({
      character: initializeCharacterProgression({ character: buildLegacyPlayer() }),
      xp: 260
    }).character;

    const firstSpend = spendTalentPoint({ character: leveled, talentId: "scout-keen-eye" });
    const duplicateSpend = spendTalentPoint({ character: firstSpend, talentId: "scout-keen-eye" });

    expect(duplicateSpend.progression.learnedTalentIds).toEqual(["scout-keen-eye"]);
    expect(duplicateSpend.progression.spentTalentPoints).toBe(1);
    expect(duplicateSpend.progression.unspentTalentPoints).toBe(1);

    const refunded = refundTalents({ character: duplicateSpend });
    expect(refunded.progression.learnedTalentIds).toEqual([]);
    expect(refunded.progression.spentTalentPoints).toBe(0);
    expect(refunded.progression.unspentTalentPoints).toBe(calculateTalentPointsForLevel(3));
  });

  it("does not duplicate talent points after serialization and reinitialization", () => {
    const leveled = awardCharacterXp({
      character: initializeCharacterProgression({ character: buildLegacyPlayer() }),
      xp: 450
    }).character;
    const reloaded = initializeCharacterProgression({
      character: JSON.parse(JSON.stringify(leveled)) as Character
    });

    expect(reloaded.progression.level).toBe(4);
    expect(reloaded.progression.unspentTalentPoints).toBe(3);
    expect(reloaded.progression.spentTalentPoints).toBe(0);
  });
});
