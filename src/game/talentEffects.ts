import type { Character, DerivedStats, DungeonBiome, RoomType } from "./types";
import { getLearnedTalentEffects } from "./talents";
import { initializeCharacterProgression } from "./characterProgression";

export function applyTalentEffectsToDerivedStats(params: {
  character: Character;
  baseStats: DerivedStats;
}): DerivedStats {
  const stats = { ...params.baseStats };
  for (const effect of getLearnedTalentEffects(params.character)) {
    if (effect.type !== "derivedStatBonus" && effect.type !== "abilityScoreBonus") continue;
    if (!effect.statKey || typeof effect.amount !== "number") continue;
    if (effect.statKey in stats) {
      const key = effect.statKey as keyof DerivedStats;
      stats[key] += effect.amount;
    }
  }
  return stats;
}

export function getTalentBonusForContext(params: {
  character: Character;
  context:
    | "scouting"
    | "trapDetection"
    | "trapDisarm"
    | "flee"
    | "searchThreat"
    | "extraction"
    | "healingReceived"
    | "critChance";
  roomType?: RoomType;
  biome?: DungeonBiome;
  itemTags?: string[];
}): number {
  let bonus = 0;
  for (const effect of getLearnedTalentEffects(params.character)) {
    if (effect.roomType && effect.roomType !== params.roomType) continue;
    if (effect.biome && effect.biome !== params.biome) continue;
    if (effect.itemTag && !(params.itemTags ?? []).includes(effect.itemTag)) continue;
    const amount = effect.amount ?? 0;
    if (params.context === "scouting" && effect.type === "improveScouting") bonus += amount;
    if ((params.context === "trapDetection" || params.context === "trapDisarm") && effect.type === "improveTrapHandling") bonus += amount;
    if (params.context === "flee" && effect.type === "improveFleeChance") bonus += amount;
    if (params.context === "searchThreat" && effect.type === "reduceThreatGain") bonus -= amount;
    if (params.context === "extraction" && effect.type === "improveExtraction") bonus += amount;
    if (params.context === "healingReceived" && effect.type === "increaseHealingReceived") bonus += amount;
    if (params.context === "critChance" && effect.type === "modifyCritChance") bonus += amount;
  }
  return bonus;
}

export function hasPassiveFlag(params: {
  character: Character;
  passiveFlag: string;
}): boolean {
  const character = initializeCharacterProgression({ character: params.character });
  if (character.progression.unlockedPassiveIds.includes(params.passiveFlag)) return true;
  if (character.progression.unlockedBuildFlags[params.passiveFlag]) return true;
  return getLearnedTalentEffects(params.character).some(effect =>
    effect.passiveFlag === params.passiveFlag ||
    effect.type === "unlockPassiveFlag" && effect.passiveFlag === params.passiveFlag
  );
}
