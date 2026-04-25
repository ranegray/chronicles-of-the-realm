import { ITEM_TEMPLATES, getItemTemplate } from "../data/items";
import { getItemStateDefinition } from "../data/itemStateDefinitions";
import { AFFIX_RULES } from "./constants";
import { applyAffixesToItemName, rollAffixesForItem } from "./affixes";
import { instanceFromTemplate } from "./inventory";
import { rollItemStatesForItem } from "./itemStates";
import type {
  GeneratedItemResult,
  ItemCategory,
  ItemGenerationContext,
  ItemInstance,
  Rarity
} from "./types";
import type { Rng } from "./rng";

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
const EQUIPMENT_CATEGORIES: ItemCategory[] = ["weapon", "armor", "shield", "trinket"];

export function generateItemInstance(params: {
  templateId: string;
  context: ItemGenerationContext;
  rng: Rng;
  now?: number;
}): GeneratedItemResult {
  const item = instanceFromTemplate(getItemTemplate(params.templateId), params.rng, 1);
  return applyGeneratedItemProperties({
    item,
    context: params.context,
    rng: params.rng,
    now: params.now
  });
}

export function generateLootItem(params: {
  category?: ItemCategory;
  rarity?: Rarity;
  context: ItemGenerationContext;
  rng: Rng;
  now?: number;
}): GeneratedItemResult {
  const rarity = params.rarity ?? "common";
  const basePool = ITEM_TEMPLATES.filter(template =>
    (!params.category || template.category === params.category) &&
    EQUIPMENT_CATEGORIES.includes(template.category) &&
    !template.stackable
  );
  const exactPool = basePool.filter(template => template.rarity === rarity);
  const floorPool = basePool.filter(template => rarityIndex(template.rarity) <= rarityIndex(rarity));
  const templatePool = exactPool.length > 0 ? exactPool : floorPool.length > 0 ? floorPool : basePool;
  if (templatePool.length === 0) {
    throw new Error(`No generated loot templates for category ${params.category ?? "any"}`);
  }
  const template = params.rng.pickOne(templatePool);
  const base = instanceFromTemplate(template, params.rng, 1);
  const item = params.rarity ? { ...base, rarity: params.rarity } : base;
  return applyGeneratedItemProperties({ item, context: params.context, rng: params.rng, now: params.now });
}

export function applyGeneratedItemProperties(params: {
  item: ItemInstance;
  context: ItemGenerationContext;
  rng: Rng;
  now?: number;
}): GeneratedItemResult {
  if (!EQUIPMENT_CATEGORIES.includes(params.item.category) || params.item.stackable) {
    return {
      item: {
        ...params.item,
        affixes: params.item.affixes ?? [],
        states: params.item.states ?? [],
        tags: params.item.tags ?? []
      },
      affixesRolled: [],
      statesRolled: []
    };
  }
  const affixesRolled = rollAffixesForItem(params);
  const statesRolled = rollItemStatesForItem(params);
  const baseValue = Math.ceil(
    params.item.value *
    AFFIX_RULES.valueMultiplierPerAffixRarity[params.item.rarity] *
    statesRolled.reduce((mult, state) => mult * (state.valueModifier ?? 1), 1)
  );
  const affixedName = applyAffixesToItemName({ item: params.item, affixes: affixesRolled });
  const statePrefix = getImportantStatePrefix(statesRolled);
  const item: ItemInstance = {
    ...params.item,
    name: `${statePrefix}${affixedName}`.trim(),
    value: baseValue,
    affixes: affixesRolled,
    states: statesRolled,
    tags: [...new Set([...(params.item.tags ?? []), ...affixesRolled.flatMap(affix => affix.tags ?? []), ...statesRolled.flatMap(state => getItemStateDefinition(state.id)?.tags ?? [])])]
  };
  return { item, affixesRolled, statesRolled };
}

function getImportantStatePrefix(states: GeneratedItemResult["statesRolled"]): string {
  const important = states.find(state => ["fragile", "cursed", "contraband", "damaged"].includes(state.id));
  if (!important) return "";
  return `${getItemStateDefinition(important.id)?.label ?? important.id} `;
}

function rarityIndex(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}
