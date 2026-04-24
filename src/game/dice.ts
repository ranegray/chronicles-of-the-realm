import type { DiceFormula } from "./types";
import type { Rng } from "./rng";

export function rollDie(sides: number, rng: Rng): number {
  return rng.nextInt(1, sides);
}

export function rollDice(formula: DiceFormula, rng: Rng): number {
  let total = 0;
  for (let i = 0; i < formula.count; i++) {
    total += rollDie(formula.sides, rng);
  }
  return total + (formula.modifier ?? 0);
}

export function rollD20(rng: Rng): number {
  return rollDie(20, rng);
}

export interface AbilityRollResult {
  rolls: number[];
  dropped: number[];
  kept: number[];
  total: number;
}

export function rollAbilityScore(
  rng: Rng,
  diceCount = 4,
  sides = 6,
  dropLowest = 1
): AbilityRollResult {
  const rolls: number[] = [];
  for (let i = 0; i < diceCount; i++) rolls.push(rollDie(sides, rng));
  const sorted = [...rolls].sort((a, b) => a - b);
  const dropped = sorted.slice(0, dropLowest);
  const kept = sorted.slice(dropLowest);
  const total = kept.reduce((s, x) => s + x, 0);
  return { rolls, dropped, kept, total };
}

export function formatDice(formula: DiceFormula): string {
  const mod = formula.modifier ?? 0;
  const base = `${formula.count}d${formula.sides}`;
  if (mod === 0) return base;
  return mod > 0 ? `${base}+${mod}` : `${base}${mod}`;
}
