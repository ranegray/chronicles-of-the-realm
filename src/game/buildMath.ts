import type {
  AbilityName,
  AncestryDefinition,
  BuildSummary,
  BuildTag,
  BuildWarning,
  Character,
  ClassDefinition,
  DerivedStats,
  EquipmentChangePreview,
  EquipmentSlots,
  EquipmentSlotName,
  ItemAffix,
  ItemInstance,
  ItemState,
  PreparedRunModifier,
  StatModifierBlock
} from "./types";

type ItemWithV4Fields = ItemInstance & {
  affixes?: ItemAffix[];
  states?: ItemState[];
};

type CharacterWithProgression = Character & {
  progression?: {
    learnedTalentIds?: string[];
    unlockedPassiveIds?: string[];
    activeCombatActionIds?: string[];
  };
};

const EQUIPMENT_SLOTS: EquipmentSlotName[] = ["weapon", "offhand", "armor", "trinket1", "trinket2"];

const RARITY_SCORE: Record<ItemInstance["rarity"], number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5
};

const RISK_SCORE_BY_STATE: Record<string, number> = {
  fragile: 1,
  damaged: 1,
  cursed: 2,
  bound: 1,
  contraband: 2,
  protected: -1,
  reinforced: -1
};

const TALENT_STAT_MODIFIERS: Record<string, StatModifierBlock> = {
  "scout-keen-eye": { trapSense: 2 },
  "scout-light-pack": { carryCapacity: 5 },
  "arcanist-spell-surge": { magicPower: 1 },
  "arcanist-glass-focus": { magicPower: 2, maxHp: -2 },
  "devout-steady-faith": { will: 1 },
  "devout-sacred-guard": { armor: 1 },
  "warden-herbal-recovery": {},
  "warden-trail-reader": { trapSense: 1 }
};

const ESCAPE_TALENTS = new Set(["scout-slip-away", "scout-ghost-step", "warrior-iron-nerve"]);

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function emptyModifierBlock(): StatModifierBlock {
  return {};
}

function addToBlock(block: StatModifierBlock, key: keyof StatModifierBlock, amount: number): StatModifierBlock {
  if (!Number.isFinite(amount) || amount === 0) return block;
  return { ...block, [key]: (block[key] ?? 0) + amount };
}

function mergeBlocks(...blocks: (StatModifierBlock | undefined)[]): StatModifierBlock {
  let merged = emptyModifierBlock();
  for (const block of blocks) {
    if (!block) continue;
    for (const [key, value] of Object.entries(block) as Array<[keyof StatModifierBlock, number | undefined]>) {
      if (typeof value === "number") merged = addToBlock(merged, key, value);
    }
  }
  return merged;
}

function statValue(block: StatModifierBlock | undefined, key: keyof StatModifierBlock): number {
  return block?.[key] ?? 0;
}

function itemStates(item: ItemInstance | undefined): ItemState[] {
  if (!item) return [];
  const states = (item as ItemWithV4Fields).states ?? [];
  if (item.protected && !states.some(state => state.id === "protected")) {
    return [...states, { id: "protected", source: "debug", appliedAt: 0 }];
  }
  return states;
}

function itemAffixes(item: ItemInstance | undefined): ItemAffix[] {
  if (!item) return [];
  return (item as ItemWithV4Fields).affixes ?? [];
}

function equippedItems(equipped: EquipmentSlots): ItemInstance[] {
  return EQUIPMENT_SLOTS.map(slot => equipped[slot]).filter(Boolean) as ItemInstance[];
}

function affixStatBlock(affix: ItemAffix): StatModifierBlock {
  let block = mergeBlocks(affix.stats);
  if (affix.statKey && typeof affix.value === "number") {
    block = addToBlock(block, affix.statKey as keyof StatModifierBlock, affix.value);
  }
  return block;
}

function baseEquipmentStatModifiers(equipped: EquipmentSlots): StatModifierBlock {
  return mergeBlocks(...equippedItems(equipped).map(item => item.stats));
}

export function calculateEquipmentStatModifiers(equipped: EquipmentSlots): StatModifierBlock {
  const blocks: StatModifierBlock[] = [];
  for (const item of equippedItems(equipped)) {
    blocks.push(item.stats ?? {});
    for (const affix of itemAffixes(item)) {
      blocks.push(affixStatBlock(affix));
    }
  }
  return mergeBlocks(...blocks);
}

export function calculateTalentStatModifiers(character: Character): StatModifierBlock {
  const learned = new Set((character as CharacterWithProgression).progression?.learnedTalentIds ?? []);
  let block = emptyModifierBlock();
  for (const talentId of learned) {
    block = mergeBlocks(block, TALENT_STAT_MODIFIERS[talentId]);
  }

  const weaponTags = character.equipped.weapon?.tags ?? [];
  if (learned.has("warrior-weapon-mastery") && weaponTags.includes("melee")) {
    block = addToBlock(block, "accuracy", 1);
  }
  return block;
}

export function calculateItemStateStatModifiers(equipped: EquipmentSlots): StatModifierBlock {
  let block = emptyModifierBlock();
  for (const item of equippedItems(equipped)) {
    const direct = mergeBlocks(...itemStates(item).map(state => state.statModifier));
    block = mergeBlocks(block, direct);

    if (hasState(item, "damaged")) {
      const positiveStats = mergeBlocks(item.stats, ...itemAffixes(item).map(affixStatBlock));
      for (const [key, value] of Object.entries(positiveStats) as Array<[keyof StatModifierBlock, number | undefined]>) {
        if (typeof value === "number" && value > 0) {
          block = addToBlock(block, key, -Math.max(1, Math.floor(value * 0.25)));
        }
      }
    }

    if (hasState(item, "reinforced")) {
      if (item.category === "weapon") block = addToBlock(block, "accuracy", 1);
      if (item.category === "armor" || item.category === "shield") block = addToBlock(block, "armor", 1);
      if (item.category === "trinket") block = addToBlock(block, "evasion", 1);
    }
  }
  return block;
}

function calculateRunPreparationStatModifiers(preparations: PreparedRunModifier[] | undefined): StatModifierBlock {
  let block = emptyModifierBlock();
  for (const prep of preparations ?? []) {
    if (prep.consumed) continue;
    if (prep.effect.type === "increaseCarryCapacity") {
      block = addToBlock(block, "carryCapacity", prep.effect.amount ?? 0);
    }
    if (prep.effect.type === "temporaryStatBonus" && prep.effect.statKey) {
      block = addToBlock(block, prep.effect.statKey as keyof StatModifierBlock, prep.effect.amount ?? 0);
    }
  }
  return block;
}

export function calculateFullDerivedStats(params: {
  character: Character;
  ancestry: AncestryDefinition;
  classDefinition: ClassDefinition;
  equipped: EquipmentSlots;
  activeRunPreparations?: PreparedRunModifier[];
}): DerivedStats {
  const equipment = calculateEquipmentStatModifiers(params.equipped);
  const itemStates = calculateItemStateStatModifiers(params.equipped);
  const talents = calculateTalentStatModifiers(params.character);
  const preparations = calculateRunPreparationStatModifiers(params.activeRunPreparations);
  const all = mergeBlocks(params.ancestry.bonuses, equipment, itemStates, talents, preparations);

  const might = params.character.abilityScores.might + statValue(all, "might");
  const agility = params.character.abilityScores.agility + statValue(all, "agility");
  const endurance = params.character.abilityScores.endurance + statValue(all, "endurance");
  const intellect = params.character.abilityScores.intellect + statValue(all, "intellect");

  const mightMod = getModifier(might);
  const agilityMod = getModifier(agility);
  const enduranceMod = getModifier(endurance);
  const intellectMod = getModifier(intellect);

  return {
    maxHp: Math.max(1, params.classDefinition.baseHp + enduranceMod * 2 + statValue(all, "maxHp")),
    armor: Math.max(0, params.classDefinition.baseArmor + statValue(all, "armor")),
    accuracy: params.classDefinition.baseAccuracy + statValue(all, "accuracy"),
    evasion: 10 + agilityMod + statValue(all, "evasion"),
    critChance: Math.max(0, 5 + statValue(all, "critChance")),
    carryCapacity: Math.max(0, 20 + mightMod * 3 + enduranceMod * 2 + statValue(all, "carryCapacity")),
    magicPower: params.classDefinition.magicBonus + intellectMod + statValue(all, "magicPower"),
    trapSense: agilityMod + intellectMod + statValue(all, "trapSense")
  };
}

export function generateBuildSummary(params: {
  character: Character;
  ancestry: AncestryDefinition;
  classDefinition: ClassDefinition;
}): BuildSummary {
  const totalStats = calculateFullDerivedStats({
    character: params.character,
    ancestry: params.ancestry,
    classDefinition: params.classDefinition,
    equipped: params.character.equipped
  });
  const items = equippedItems(params.character.equipped);
  const riskScore = Math.max(0, items.reduce((sum, item) => sum + getItemRiskScore(item), 0));
  const equippedItemScore = items.reduce((sum, item) => {
    const affixCount = itemAffixes(item).length;
    const stateCount = itemStates(item).filter(state => state.id !== "normal").length;
    return sum + RARITY_SCORE[item.rarity] * 10 + affixCount * 5 + stateCount * 3;
  }, 0);
  const combatPowerScore = Math.max(0, Math.round(totalStats.armor + totalStats.accuracy + totalStats.magicPower + totalStats.critChance / 5));
  const explorationScore = Math.max(0, Math.round(totalStats.trapSense + itemTagScore(items, ["scouting", "picks", "tool", "light"])));
  const extractionSafetyScore = Math.max(
    0,
    Math.round(totalStats.evasion / 3 + totalStats.trapSense / 2 + totalStats.carryCapacity / 10 + protectedCount(items) - riskScore)
  );
  const summaryWithoutWarnings: BuildSummary = {
    characterId: params.character.id,
    primaryTags: calculatePrimaryTags(params.character, totalStats, riskScore),
    totalStats,
    equippedItemScore,
    riskScore,
    extractionSafetyScore,
    combatPowerScore,
    explorationScore,
    warnings: []
  };
  return {
    ...summaryWithoutWarnings,
    warnings: getBuildWarnings({ character: params.character, summary: summaryWithoutWarnings })
  };
}

export function getBuildWarnings(params: {
  character: Character;
  summary: BuildSummary;
}): BuildWarning[] {
  const warnings: BuildWarning[] = [];
  const items = equippedItems(params.character.equipped);
  const equipmentWeight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);

  if (equipmentWeight > params.summary.totalStats.carryCapacity) {
    warnings.push({
      type: "overweight",
      message: "Equipped gear exceeds your carry capacity before loot.",
      severity: "danger"
    });
  }
  if (items.some(item => hasState(item, "fragile"))) {
    warnings.push({
      type: "fragileGear",
      message: "Fragile gear may break on death or extraction complications.",
      severity: "warning"
    });
  }
  if (items.some(item => hasState(item, "cursed"))) {
    warnings.push({
      type: "cursedGear",
      message: "Cursed gear cannot be dropped during a delve.",
      severity: "danger"
    });
  }
  if (items.some(item => hasState(item, "contraband"))) {
    warnings.push({
      type: "contraband",
      message: "Contraband increases reward but makes extraction riskier.",
      severity: "warning"
    });
  }
  if (params.summary.totalStats.armor < 3) {
    warnings.push({
      type: "lowDefense",
      message: "Low armor leaves little room for mistakes in direct combat.",
      severity: "warning"
    });
  }
  if (params.summary.combatPowerScore < 4) {
    warnings.push({
      type: "lowDamage",
      message: "Combat power is low; avoid extended fights.",
      severity: "warning"
    });
  }
  if (!hasEscapeTool(params.character)) {
    warnings.push({
      type: "noEscapeTools",
      message: "No equipped item or learned talent clearly improves escape.",
      severity: "info"
    });
  }

  return warnings;
}

function calculatePrimaryTags(character: Character, stats: DerivedStats, riskScore: number): BuildTag[] {
  const tags = new Set<BuildTag>();
  const items = equippedItems(character.equipped);
  const itemTags = new Set(items.flatMap(item => [...(item.tags ?? []), ...itemAffixes(item).flatMap(affix => affix.tags ?? [])]));

  if (itemTags.has("melee") || stats.accuracy >= 6) tags.add("melee");
  if (itemTags.has("ranged") || itemTags.has("bow")) tags.add("ranged");
  if (itemTags.has("magic") || stats.magicPower >= 6) tags.add("magic");
  if (stats.armor >= 6) tags.add("defensive");
  if (stats.evasion >= 14) tags.add("evasive");
  if (itemTags.has("scouting") || stats.trapSense >= 6) tags.add("scouting");
  if (itemTags.has("picks") || stats.trapSense >= 4) tags.add("trapHandling");
  if (stats.carryCapacity >= 24) tags.add("carryCapacity");
  if (hasEscapeTool(character) || stats.evasion >= 14) tags.add("extraction");
  if (itemTags.has("healing") || itemTags.has("potion")) tags.add("healing");
  if (riskScore >= 4) tags.add("highRisk");
  if (itemTags.has("loot") || stats.carryCapacity >= 26) tags.add("lootFocused");

  return [...tags].slice(0, 4);
}

function getItemRiskScore(item: ItemInstance): number {
  return itemStates(item).reduce((sum, state) => sum + (RISK_SCORE_BY_STATE[state.id] ?? 0), 0);
}

function hasState(item: ItemInstance, stateId: string): boolean {
  return itemStates(item).some(state => state.id === stateId);
}

function protectedCount(items: ItemInstance[]): number {
  return items.filter(item => hasState(item, "protected")).length;
}

function itemTagScore(items: ItemInstance[], tags: string[]): number {
  return items.reduce((sum, item) => sum + tags.filter(tag => item.tags?.includes(tag)).length, 0);
}

function hasEscapeTool(character: Character): boolean {
  const learned = new Set((character as CharacterWithProgression).progression?.learnedTalentIds ?? []);
  if ([...ESCAPE_TALENTS].some(talentId => learned.has(talentId))) return true;
  return equippedItems(character.equipped).some(item => {
    const tags = new Set([...(item.tags ?? []), ...itemAffixes(item).flatMap(affix => affix.tags ?? [])]);
    return tags.has("evasive") || tags.has("escape") || tags.has("stealth") || tags.has("light");
  });
}
