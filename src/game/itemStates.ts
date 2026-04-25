import { ITEM_STATE_DEFINITIONS, getItemStateDefinition } from "../data/itemStateDefinitions";
import { ITEM_STATE_RULES } from "./constants";
import type {
  BuildWarning,
  ItemGenerationContext,
  ItemInstance,
  ItemState,
  ItemStateId,
  Rarity,
  StatModifierBlock
} from "./types";
import type { Rng } from "./rng";

const EQUIPMENT_CATEGORIES = ["weapon", "armor", "shield", "trinket"];
const STATE_NAME_PREFIXES: ItemStateId[] = ["contraband", "cursed", "fragile", "damaged", "protected", "reinforced", "bound"];

export function hasItemState(params: {
  item: ItemInstance;
  stateId: ItemStateId;
}): boolean {
  return Boolean(params.item.states?.some(state => state.id === params.stateId)) ||
    (params.stateId === "protected" && Boolean(params.item.protected));
}

export function addItemState(params: {
  item: ItemInstance;
  state: ItemState;
}): ItemInstance {
  const states = (params.item.states ?? []).filter(state => state.id !== params.state.id);
  return {
    ...params.item,
    protected: params.item.protected || params.state.id === "protected",
    states: [...states, params.state]
  };
}

export function removeItemState(params: {
  item: ItemInstance;
  stateId: ItemStateId;
}): ItemInstance {
  return {
    ...params.item,
    protected: params.stateId === "protected" ? false : params.item.protected,
    states: (params.item.states ?? []).filter(state => state.id !== params.stateId)
  };
}

export function rollItemStatesForItem(params: {
  item: ItemInstance;
  context: ItemGenerationContext;
  rng: Rng;
  now?: number;
}): ItemState[] {
  if (!EQUIPMENT_CATEGORIES.includes(params.item.category) || params.item.stackable) return [];
  const chance = ITEM_STATE_RULES.generationChanceByRarity[params.item.rarity];
  if (params.rng.nextFloat() > chance) return [];
  const weights = ITEM_STATE_RULES.stateWeightsByRarity[params.item.rarity];
  const stateId = params.rng.pickWeighted(
    Object.entries(weights).map(([value, weight]) => ({ value: value as ItemStateId, weight }))
  );
  return [{
    id: stateId,
    source: "lootGeneration",
    appliedAt: params.now ?? Date.now(),
    valueModifier: getValueModifier(stateId),
    statModifier: getStatModifier(stateId, params.item.rarity)
  }];
}

export function canDropItemDuringRun(item: ItemInstance): boolean {
  return !hasItemState({ item, stateId: "cursed" });
}

export function survivesDeath(item: ItemInstance): boolean {
  return hasItemState({ item, stateId: "protected" });
}

export function applyItemStateDeathBehavior(params: {
  items: ItemInstance[];
  rng: Rng;
}): {
  returnedToStash: ItemInstance[];
  lost: ItemInstance[];
  broken: ItemInstance[];
} {
  const returnedToStash: ItemInstance[] = [];
  const lost: ItemInstance[] = [];
  const broken: ItemInstance[] = [];
  for (const item of params.items) {
    if (hasItemState({ item, stateId: "fragile" }) && params.rng.nextFloat() < ITEM_STATE_RULES.fragile.breakChanceOnDeath) {
      broken.push(item);
    } else if (survivesDeath(item)) {
      returnedToStash.push(item);
    } else {
      lost.push(item);
    }
  }
  return { returnedToStash, lost, broken };
}

export function getItemRiskWarnings(item: ItemInstance): BuildWarning[] {
  const warnings: BuildWarning[] = [];
  for (const state of item.states ?? []) {
    const definition = getItemStateDefinition(state.id);
    if (!definition?.visible) continue;
    if (state.id === "protected") {
      warnings.push({ type: "fragileGear", severity: "info", message: `${item.name} is protected and survives death.` });
    } else if (state.id === "fragile") {
      warnings.push({ type: "fragileGear", severity: "warning", message: `${item.name} may break on death or extraction complications.` });
    } else if (state.id === "cursed") {
      warnings.push({ type: "cursedGear", severity: "danger", message: `${item.name} cannot be dropped during a run.` });
    } else if (state.id === "contraband") {
      warnings.push({ type: "contraband", severity: "warning", message: `${item.name} is valuable contraband and raises risk.` });
    }
  }
  return warnings;
}

export function getItemStateStatModifiers(item: ItemInstance): StatModifierBlock {
  const stats: StatModifierBlock = {};
  for (const state of item.states ?? []) {
    for (const [key, value] of Object.entries(state.statModifier ?? {})) {
      if (typeof value === "number") {
        const statKey = key as keyof StatModifierBlock;
        stats[statKey] = (stats[statKey] ?? 0) + value;
      }
    }
  }
  return stats;
}

export function getItemValueWithStateModifiers(item: ItemInstance): number {
  const multiplier = (item.states ?? []).reduce((value, state) => value * (state.valueModifier ?? getValueModifier(state.id) ?? 1), 1);
  return Math.max(0, Math.ceil(item.value * multiplier));
}

export function getVisibleItemStateLabels(item: ItemInstance): string[] {
  return (item.states ?? [])
    .filter(state => getItemStateDefinition(state.id).visible)
    .map(state => getItemStateDefinition(state.id).label);
}

export function applyItemStatesToItemName(item: ItemInstance): string {
  const visibleStateIds = new Set(
    (item.states ?? [])
      .filter(state => getItemStateDefinition(state.id).visible)
      .map(state => state.id)
  );
  const stateId = STATE_NAME_PREFIXES.find(candidate => visibleStateIds.has(candidate));
  if (!stateId) return item.name;
  const label = ITEM_STATE_DEFINITIONS.find(state => state.id === stateId)?.label;
  if (!label || item.name.startsWith(label)) return item.name;
  return `${label} ${item.name}`;
}

function getValueModifier(stateId: ItemStateId): number | undefined {
  if (stateId === "contraband") return ITEM_STATE_RULES.contraband.valueMultiplier;
  if (stateId === "cursed") return ITEM_STATE_RULES.cursed.valueMultiplier;
  if (stateId === "damaged") return ITEM_STATE_RULES.damaged.valueMultiplier;
  if (stateId === "reinforced") return ITEM_STATE_RULES.reinforced.valueMultiplier;
  return undefined;
}

function getStatModifier(stateId: ItemStateId, rarity: Rarity): ItemState["statModifier"] {
  if (stateId === "damaged") return { armor: -1, accuracy: -1 };
  if (stateId === "reinforced") return { armor: 1 };
  if (stateId === "protected" && rarity === "legendary") return { will: 1 };
  return undefined;
}
