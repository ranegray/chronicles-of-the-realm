import type { DiceFormula, ItemInstance } from "./types";
import { formatDice, rollDice } from "./dice";
import type { Rng } from "./rng";

export interface ConsumableHealFormula {
  dice: DiceFormula;
  base: number;
}

export function getConsumableHealFormula(item: ItemInstance): ConsumableHealFormula | undefined {
  if (item.category !== "consumable" || !item.tags?.includes("heal")) return undefined;
  if (item.tags.includes("strong")) {
    return { dice: { count: 2, sides: 6 }, base: 4 };
  }
  if (item.tags.includes("small")) {
    return { dice: { count: 1, sides: 6 }, base: 2 };
  }
  return { dice: { count: 1, sides: 4 }, base: 1 };
}

export function formatConsumableHealFormula(item: ItemInstance): string | undefined {
  const formula = getConsumableHealFormula(item);
  if (!formula) return undefined;
  return formatDice({ ...formula.dice, modifier: formula.base });
}

export function rollConsumableHealAmount(
  item: ItemInstance,
  rng: Rng
): number {
  const formula = getConsumableHealFormula(item);
  if (!formula) return 0;
  return Math.max(1, rollDice({ ...formula.dice, modifier: formula.base }, rng));
}
