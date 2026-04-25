import type { ItemStateDefinition } from "../game/types";

export const ITEM_STATE_DEFINITIONS: ItemStateDefinition[] = [
  {
    id: "normal",
    label: "Normal",
    description: "This item has no special risk behavior.",
    riskDescription: "Lost on death if carried into the dungeon.",
    visible: false,
    tags: []
  },
  {
    id: "protected",
    label: "Protected",
    description: "This item is marked by a protective rite.",
    riskDescription: "Survives death and returns to your stash.",
    visible: true,
    tags: ["safe", "enchanting"]
  },
  {
    id: "fragile",
    label: "Fragile",
    description: "This item is unstable or easily broken.",
    riskDescription: "May break on death or extraction complications.",
    visible: true,
    tags: ["risk"]
  },
  {
    id: "cursed",
    label: "Cursed",
    description: "This item clings to its carrier.",
    riskDescription: "Cannot be dropped during a dungeon run and may increase threat.",
    visible: true,
    tags: ["risk", "curse"]
  },
  {
    id: "bound",
    label: "Bound",
    description: "This item is bound by old vows or strange magic.",
    riskDescription: "Cannot be sold, but may have unusually strong properties.",
    visible: true,
    tags: ["magic"]
  },
  {
    id: "contraband",
    label: "Contraband",
    description: "This item is valuable but dangerous to carry.",
    riskDescription: "Worth more, but increases threat and extraction complications.",
    visible: true,
    tags: ["risk", "loot"]
  },
  {
    id: "damaged",
    label: "Damaged",
    description: "This item has seen rough use.",
    riskDescription: "Reduced value and weaker stats until repaired.",
    visible: true,
    tags: ["repair"]
  },
  {
    id: "reinforced",
    label: "Reinforced",
    description: "This item has been strengthened for a coming delve.",
    riskDescription: "Temporary bonus, usually expires after one run.",
    visible: true,
    tags: ["prepared", "blacksmith"]
  }
];

export function getItemStateDefinition(id: ItemStateDefinition["id"]): ItemStateDefinition {
  const definition = ITEM_STATE_DEFINITIONS.find(state => state.id === id);
  if (!definition) throw new Error(`Unknown item state: ${id}`);
  return definition;
}
