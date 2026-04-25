import { AFFIX_DEFINITIONS } from "../data/affixDefinitions";
import { AFFIX_RULES } from "./constants";
import type {
  AffixDefinition,
  AffixType,
  ItemAffix,
  ItemCategory,
  ItemGenerationContext,
  ItemInstance,
  Rarity,
  StatModifierBlock
} from "./types";
import type { Rng } from "./rng";

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export function getEligibleAffixes(params: {
  item: ItemInstance;
  context: ItemGenerationContext;
  affixType?: AffixType;
}): AffixDefinition[] {
  return AFFIX_DEFINITIONS.filter(def => {
    if (params.affixType && def.type !== params.affixType) return false;
    if (rarityIndex(params.item.rarity) < rarityIndex(def.minRarity)) return false;
    if (def.maxRarity && rarityIndex(params.item.rarity) > rarityIndex(def.maxRarity)) return false;
    if (params.context.tier < def.minTier || params.context.tier > def.maxTier) return false;
    return def.allowedCategories.some(category => categoryAllows(category, params.item.category));
  });
}

export function rollAffixesForItem(params: {
  item: ItemInstance;
  context: ItemGenerationContext;
  rng: Rng;
}): ItemAffix[] {
  const slots = AFFIX_RULES.affixSlotsByRarity[params.item.rarity];
  const picked: AffixDefinition[] = [];
  picked.push(...rollType({ ...params, affixType: "prefix", count: slots.prefixes, picked }));
  picked.push(...rollType({ ...params, affixType: "suffix", count: slots.suffixes, picked }));
  return picked.map(definition => createItemAffixFromDefinition({ definition, rng: params.rng }));
}

export function createItemAffixFromDefinition(params: {
  definition: AffixDefinition;
  rng: Rng;
}): ItemAffix {
  const value = params.definition.rollType === "flat" || params.definition.rollType === "percent"
    ? params.rng.nextInt(params.definition.minValue ?? 1, params.definition.maxValue ?? params.definition.minValue ?? 1)
    : undefined;
  return {
    id: `${params.definition.id}-${params.rng.nextInt(1000, 9999)}`,
    definitionId: params.definition.id,
    name: params.definition.name,
    type: params.definition.type,
    description: value === undefined
      ? params.definition.descriptionTemplate
      : params.definition.descriptionTemplate.replace("{value}", String(value)),
    statKey: params.definition.statKey,
    rollType: params.definition.rollType,
    value,
    tags: [...params.definition.tags],
    stats: params.definition.statKey && value !== undefined
      ? { [params.definition.statKey]: value }
      : undefined
  };
}

export function applyAffixesToItemName(params: {
  item: ItemInstance;
  affixes: ItemAffix[];
}): string {
  const prefixes = params.affixes.filter(a => a.type === "prefix").map(a => a.name);
  const suffixes = params.affixes.filter(a => a.type === "suffix").map(a => a.name);
  return `${prefixes.join(" ")} ${params.item.name}${suffixes.length ? ` ${suffixes.join(" ")}` : ""}`.trim();
}

export function getAffixStatModifiers(affixes: ItemAffix[]): StatModifierBlock {
  const stats: StatModifierBlock = {};
  for (const affix of affixes) {
    if (affix.statKey && typeof affix.value === "number") {
      stats[affix.statKey] = (stats[affix.statKey] ?? 0) + affix.value;
    } else if (affix.stats) {
      addStats(stats, affix.stats);
    }
  }
  return stats;
}

function rollType(params: {
  item: ItemInstance;
  context: ItemGenerationContext;
  rng: Rng;
  affixType: AffixType;
  count: number;
  picked: AffixDefinition[];
}): AffixDefinition[] {
  const chosen: AffixDefinition[] = [];
  for (let i = 0; i < params.count; i++) {
    const existing = [...params.picked, ...chosen];
    const pool = getEligibleAffixes({ item: params.item, context: params.context, affixType: params.affixType })
      .filter(def => !existing.some(other => conflicts(def, other)));
    if (pool.length === 0) break;
    chosen.push(params.rng.pickWeighted(pool.map(def => ({ value: def, weight: getContextWeight(def, params.context) }))));
  }
  return chosen;
}

function getContextWeight(def: AffixDefinition, context: ItemGenerationContext): number {
  let weight = def.weight;
  if (context.playerClassId && def.classTags?.includes(context.playerClassId)) weight *= 1 + AFFIX_RULES.classBiasedAffixChance;
  if (def.biomeTags?.includes(context.biome)) weight *= 1 + AFFIX_RULES.biomeAffixChance;
  return weight;
}

function conflicts(a: AffixDefinition, b: AffixDefinition): boolean {
  return a.id === b.id || Boolean(a.exclusiveGroup && b.exclusiveGroup && a.exclusiveGroup === b.exclusiveGroup);
}

function categoryAllows(allowed: string, category: ItemCategory): boolean {
  if (allowed === category) return true;
  if (allowed === "anyEquipment") return ["weapon", "armor", "shield", "trinket"].includes(category);
  if (allowed === "anyWeapon") return category === "weapon";
  if (allowed === "anyArmor") return category === "armor" || category === "shield";
  if (allowed === "anyTrinket") return category === "trinket";
  return false;
}

function rarityIndex(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

function addStats(target: StatModifierBlock, source: StatModifierBlock): void {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number") {
      const statKey = key as keyof StatModifierBlock;
      target[statKey] = (target[statKey] ?? 0) + value;
    }
  }
}
