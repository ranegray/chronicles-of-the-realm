import type {
  AbilityScores,
  AncestryDefinition,
  Character,
  ClassDefinition,
  DerivedStats,
  EquipmentSlots,
  StatModifierBlock
} from "./types";
import { calculateFullDerivedStats } from "./buildMath";

export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function sumStat(
  key: keyof StatModifierBlock,
  blocks: (StatModifierBlock | undefined)[]
): number {
  let sum = 0;
  for (const b of blocks) {
    if (!b) continue;
    const v = b[key];
    if (typeof v === "number") sum += v;
  }
  return sum;
}

export function calculateDerivedStats(
  abilityScores: AbilityScores,
  ancestry: AncestryDefinition,
  cls: ClassDefinition,
  equipped: EquipmentSlots
): DerivedStats {
  const equipBlocks: (StatModifierBlock | undefined)[] = [
    equipped.weapon?.stats,
    equipped.offhand?.stats,
    equipped.armor?.stats,
    equipped.trinket1?.stats,
    equipped.trinket2?.stats
  ];
  const allBlocks = [ancestry.bonuses, ...equipBlocks];

  const enduranceBonus = sumStat("endurance", allBlocks);
  const mightBonus = sumStat("might", allBlocks);
  const agilityBonus = sumStat("agility", allBlocks);
  const intellectBonus = sumStat("intellect", allBlocks);

  const endMod = getModifier(abilityScores.endurance + enduranceBonus);
  const mightMod = getModifier(abilityScores.might + mightBonus);
  const agilMod = getModifier(abilityScores.agility + agilityBonus);
  const intMod = getModifier(abilityScores.intellect + intellectBonus);

  const armorBonus = sumStat("armor", equipBlocks) + sumStat("armor", [ancestry.bonuses]);
  const accuracyBonus = sumStat("accuracy", allBlocks);
  const evasionBonus = sumStat("evasion", allBlocks);
  const critBonus = sumStat("critChance", allBlocks);
  const carryBonus = sumStat("carryCapacity", allBlocks);
  const magicBonus = sumStat("magicPower", allBlocks);
  const trapSenseBonus = sumStat("trapSense", allBlocks);

  return {
    maxHp: cls.baseHp + endMod * 2 + sumStat("maxHp", allBlocks),
    armor: cls.baseArmor + armorBonus,
    accuracy: cls.baseAccuracy + accuracyBonus,
    evasion: 10 + agilMod + evasionBonus,
    critChance: 5 + critBonus,
    carryCapacity: 20 + mightMod * 3 + endMod * 2 + carryBonus,
    magicPower: cls.magicBonus + intMod + magicBonus,
    trapSense: agilMod + intMod + trapSenseBonus
  };
}

export function recalculateCharacterStats(
  character: Character,
  ancestry: AncestryDefinition,
  cls: ClassDefinition
): Character {
  const derivedStats = calculateFullDerivedStats({
    character,
    ancestry,
    classDefinition: cls,
    equipped: character.equipped
  });
  const newMax = derivedStats.maxHp;
  const newHp = Math.min(character.hp, newMax);
  return {
    ...character,
    derivedStats,
    maxHp: newMax,
    hp: character.maxHp === 0 ? newMax : newHp
  };
}
