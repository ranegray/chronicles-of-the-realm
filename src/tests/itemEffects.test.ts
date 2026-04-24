import { describe, expect, it } from "vitest";
import { formatConsumableHealFormula, rollConsumableHealAmount } from "../game/itemEffects";
import { instanceFromTemplateId } from "../game/inventory";
import { createRng, type Rng } from "../game/rng";

function fixedRollRng(value: number): Rng {
  return {
    seed: `fixed-${value}`,
    nextFloat: () => 0,
    nextInt: (min, max) => Math.min(max, Math.max(min, value)),
    pickOne: arr => arr[0]!,
    pickWeighted: entries => entries[0]!.value,
    shuffle: arr => [...arr],
    forkChild: () => fixedRollRng(value)
  };
}

describe("item effects", () => {
  it("describes healing consumables as dice plus base healing", () => {
    const potion = instanceFromTemplateId("consumable_small_draught", createRng("potion"));
    expect(formatConsumableHealFormula(potion)).toBe("1d6+2");
  });

  it("rolls healing dice and adds base healing", () => {
    const potion = instanceFromTemplateId("consumable_small_draught", createRng("small-potion"));
    const heal = rollConsumableHealAmount(potion, fixedRollRng(3));
    expect(heal).toBe(5);
  });
});
