import type {
  AncestryDefinition,
  Character,
  ClassDefinition,
  DungeonRun,
  EquipmentChangePreview,
  EquipmentSlots,
  EquipmentSlotName,
  ItemInstance
} from "./types";
import {
  calculateFullDerivedStats,
  generateBuildSummary
} from "./buildMath";

type ItemStateLike = {
  id: string;
};

type ItemWithStates = ItemInstance & {
  states?: ItemStateLike[];
};

const ALL_SLOTS: EquipmentSlotName[] = ["weapon", "offhand", "armor", "trinket1", "trinket2"];

export type { EquipmentChangePreview, EquipmentSlotName };

export function getValidEquipmentSlotsForItem(item: ItemInstance): EquipmentSlotName[] {
  switch (item.category) {
    case "weapon":
      return ["weapon"];
    case "shield":
      return ["offhand"];
    case "armor":
      return ["armor"];
    case "trinket":
      return ["trinket1", "trinket2"];
    default:
      return [];
  }
}

export function canEquipItem(params: {
  character: Character;
  item: ItemInstance;
  slot: EquipmentSlotName;
}): {
  canEquip: boolean;
  reason?: string;
} {
  const validSlots = getValidEquipmentSlotsForItem(params.item);
  if (!validSlots.includes(params.slot)) {
    return { canEquip: false, reason: `${params.item.name} cannot be equipped in ${formatSlot(params.slot)}.` };
  }
  return { canEquip: true };
}

export function equipItem(params: {
  character: Character;
  item: ItemInstance;
  slot: EquipmentSlotName;
}): Character {
  const gate = canEquipItem(params);
  if (!gate.canEquip) return params.character;
  return {
    ...params.character,
    equipped: {
      ...params.character.equipped,
      [params.slot]: params.item
    }
  };
}

export function unequipItem(params: {
  character: Character;
  slot: EquipmentSlotName;
  activeRun?: DungeonRun;
}): {
  character: Character;
  success: boolean;
  reason?: string;
} {
  const item = params.character.equipped[params.slot];
  if (!item) return { character: params.character, success: false, reason: "No item is equipped there." };
  if (params.activeRun && hasItemState(item, "cursed")) {
    return { character: params.character, success: false, reason: `${item.name} is cursed and cannot be removed during a delve.` };
  }

  const equipped: EquipmentSlots = { ...params.character.equipped };
  delete equipped[params.slot];
  return {
    character: {
      ...params.character,
      equipped
    },
    success: true
  };
}

export function previewEquipmentChange(params: {
  character: Character;
  item: ItemInstance;
  slot: EquipmentSlotName;
  ancestry: AncestryDefinition;
  classDefinition: ClassDefinition;
}): EquipmentChangePreview {
  const currentItem = params.character.equipped[params.slot];
  const currentStats = calculateFullDerivedStats({
    character: params.character,
    ancestry: params.ancestry,
    classDefinition: params.classDefinition,
    equipped: params.character.equipped
  });
  const previewEquipped: EquipmentSlots = {
    ...params.character.equipped,
    [params.slot]: params.item
  };
  const previewStats = calculateFullDerivedStats({
    character: params.character,
    ancestry: params.ancestry,
    classDefinition: params.classDefinition,
    equipped: previewEquipped
  });
  const statDiff = Object.fromEntries(
    (Object.keys(currentStats) as Array<keyof typeof currentStats>)
      .map(key => [key, previewStats[key] - currentStats[key]])
      .filter(([, diff]) => diff !== 0)
  ) as EquipmentChangePreview["statDiff"];
  const previewCharacter: Character = {
    ...params.character,
    equipped: previewEquipped,
    derivedStats: previewStats,
    maxHp: previewStats.maxHp,
    hp: Math.min(params.character.hp, previewStats.maxHp)
  };
  const summary = generateBuildSummary({
    character: previewCharacter,
    ancestry: params.ancestry,
    classDefinition: params.classDefinition
  });

  return {
    slot: params.slot,
    currentItem,
    newItem: params.item,
    currentStats,
    previewStats,
    statDiff,
    warnings: summary.warnings
  };
}

export function getPreferredEquipmentSlot(item: ItemInstance, equipped: EquipmentSlots = {}): EquipmentSlotName | undefined {
  const valid = getValidEquipmentSlotsForItem(item);
  if (item.category === "trinket") return equipped.trinket1 ? "trinket2" : "trinket1";
  return valid[0];
}

export function isEquipmentSlotName(value: string): value is EquipmentSlotName {
  return (ALL_SLOTS as string[]).includes(value);
}

function hasItemState(item: ItemInstance, stateId: string): boolean {
  const states = (item as ItemWithStates).states ?? [];
  return states.some(state => state.id === stateId) || (stateId === "protected" && item.protected === true);
}

function formatSlot(slot: EquipmentSlotName): string {
  switch (slot) {
    case "trinket1":
      return "Trinket I";
    case "trinket2":
      return "Trinket II";
    default:
      return slot;
  }
}
