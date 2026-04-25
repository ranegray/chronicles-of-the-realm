import { CHARACTER_PROGRESSION_RULES } from "./constants";
import type {
  Character,
  CharacterLevel,
  CharacterProgressionState,
  ClassId
} from "./types";

export function initializeCharacterProgression(params: {
  character: Character;
}): Character {
  const progression = normalizeCharacterProgression(params.character);
  return syncCharacterWithProgression({
    ...params.character,
    progression
  });
}

export function getLevelFromXp(xp: number): CharacterLevel {
  const safeXp = Math.max(0, Math.floor(xp));
  let level: CharacterLevel = 1;

  for (const candidate of Object.keys(CHARACTER_PROGRESSION_RULES.xpByLevel)
    .map(Number)
    .sort((a, b) => a - b) as CharacterLevel[]) {
    if (safeXp >= CHARACTER_PROGRESSION_RULES.xpByLevel[candidate]) {
      level = candidate;
    }
  }

  return level;
}

export function getXpRequiredForLevel(level: CharacterLevel): number {
  return CHARACTER_PROGRESSION_RULES.xpByLevel[level];
}

export function awardCharacterXp(params: {
  character: Character;
  xp: number;
}): {
  character: Character;
  leveledUp: boolean;
  levelsGained: number;
  talentPointsGained: number;
} {
  const initialized = initializeCharacterProgression({ character: params.character });
  const progression = initialized.progression;
  const xpAward = Math.max(0, Math.floor(params.xp));
  if (xpAward === 0) {
    return {
      character: initialized,
      leveledUp: false,
      levelsGained: 0,
      talentPointsGained: 0
    };
  }

  const oldLevel = progression.level;
  const nextXp = progression.xp + xpAward;
  const nextLevel = maxCharacterLevel(oldLevel, getLevelFromXp(nextXp));
  const levelsGained = Math.max(0, nextLevel - oldLevel);
  const talentPointsGained = calculateTalentPointsBetweenLevels(oldLevel, nextLevel);
  const hpGained = getHpGainForClass(initialized.classId) * levelsGained;

  const nextCharacter: Character = {
    ...initialized,
    level: nextLevel,
    xp: nextXp,
    maxHp: initialized.maxHp + hpGained,
    hp: initialized.hp + hpGained,
    derivedStats: {
      ...initialized.derivedStats,
      maxHp: initialized.derivedStats.maxHp + hpGained
    },
    progression: {
      ...progression,
      level: nextLevel,
      xp: nextXp,
      totalXpEarned: progression.totalXpEarned + xpAward,
      unspentTalentPoints: progression.unspentTalentPoints + talentPointsGained
    }
  };

  return {
    character: syncCharacterWithProgression(nextCharacter),
    leveledUp: levelsGained > 0,
    levelsGained,
    talentPointsGained
  };
}

export function spendTalentPoint(params: {
  character: Character;
  talentId: string;
}): Character {
  const character = initializeCharacterProgression({ character: params.character });
  const talentId = params.talentId.trim();
  if (!talentId || character.progression.learnedTalentIds.includes(talentId)) {
    return character;
  }
  if (character.progression.unspentTalentPoints <= 0) {
    return character;
  }

  return syncCharacterWithProgression({
    ...character,
    progression: {
      ...character.progression,
      unspentTalentPoints: character.progression.unspentTalentPoints - 1,
      spentTalentPoints: character.progression.spentTalentPoints + 1,
      learnedTalentIds: [...character.progression.learnedTalentIds, talentId]
    }
  });
}

export function refundTalents(params: {
  character: Character;
}): Character {
  const character = initializeCharacterProgression({ character: params.character });
  const totalPoints = calculateTalentPointsForLevel(character.progression.level);

  return syncCharacterWithProgression({
    ...character,
    progression: {
      ...character.progression,
      unspentTalentPoints: totalPoints,
      spentTalentPoints: 0,
      learnedTalentIds: [],
      activeCombatActionIds: [],
      unlockedPassiveIds: [],
      unlockedBuildFlags: {}
    }
  });
}

export function calculateTalentPointsForLevel(level: number): number {
  const cappedLevel = clampCharacterLevel(level);
  let total = 0;
  for (const candidate of Object.keys(CHARACTER_PROGRESSION_RULES.talentPointsByLevel)
    .map(Number)
    .sort((a, b) => a - b) as CharacterLevel[]) {
    if (candidate <= cappedLevel) {
      total += CHARACTER_PROGRESSION_RULES.talentPointsByLevel[candidate];
    }
  }
  return total;
}

export function normalizeCharacterProgression(character: Character): CharacterProgressionState {
  const existing = character.progression;
  const xp = Math.max(0, Math.floor(existing?.xp ?? character.xp ?? 0));
  const legacyLevel = clampCharacterLevel(existing?.level ?? character.level ?? 1);
  const xpLevel = getLevelFromXp(xp);
  const level = maxCharacterLevel(legacyLevel, xpLevel);
  const learnedTalentIds = uniqueStrings(existing?.learnedTalentIds);
  const spentTalentPoints = Math.max(
    existing?.spentTalentPoints ?? learnedTalentIds.length,
    learnedTalentIds.length
  );
  const earnedTalentPoints = calculateTalentPointsForLevel(level);
  const unspentTalentPoints = Math.max(
    0,
    existing?.unspentTalentPoints ?? earnedTalentPoints - spentTalentPoints
  );

  return {
    level,
    xp,
    totalXpEarned: Math.max(0, Math.floor(existing?.totalXpEarned ?? xp)),
    unspentTalentPoints,
    spentTalentPoints,
    learnedTalentIds,
    activeCombatActionIds: uniqueStrings(existing?.activeCombatActionIds),
    unlockedPassiveIds: uniqueStrings(existing?.unlockedPassiveIds),
    unlockedBuildFlags: normalizeBuildFlags(existing?.unlockedBuildFlags)
  };
}

function syncCharacterWithProgression(character: Character): Character {
  return {
    ...character,
    level: character.progression.level,
    xp: character.progression.xp
  };
}

function calculateTalentPointsBetweenLevels(
  fromLevel: CharacterLevel,
  toLevel: CharacterLevel
): number {
  if (toLevel <= fromLevel) return 0;
  let total = 0;
  for (let level = fromLevel + 1; level <= toLevel; level += 1) {
    total += CHARACTER_PROGRESSION_RULES.talentPointsByLevel[level as CharacterLevel] ?? 0;
  }
  return total;
}

function getHpGainForClass(classId: ClassId): number {
  return CHARACTER_PROGRESSION_RULES.hpGainByClass[classId];
}

function clampCharacterLevel(level: number): CharacterLevel {
  const max = CHARACTER_PROGRESSION_RULES.maxLevel;
  return Math.min(max, Math.max(1, Math.floor(level))) as CharacterLevel;
}

function maxCharacterLevel(a: CharacterLevel, b: CharacterLevel): CharacterLevel {
  return Math.max(a, b) as CharacterLevel;
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === "string"))];
}

function normalizeBuildFlags(value: unknown): Record<string, boolean> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value)) {
    if (typeof flag === "boolean") out[key] = flag;
  }
  return out;
}
