import { describe, expect, it } from "vitest";
import {
  addItemState,
  applyItemStateDeathBehavior,
  canDropItemDuringRun,
  getItemRiskWarnings,
  getItemStateStatModifiers,
  getItemValueWithStateModifiers,
  hasItemState,
  removeItemState,
  rollItemStatesForItem,
  survivesDeath
} from "../game/itemStates";
import { instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { ItemGenerationContext, ItemState } from "../game/types";

const context: ItemGenerationContext = {
  seed: "states",
  biome: "crypt",
  tier: 1,
  source: "treasure"
};

function state(id: ItemState["id"]): ItemState {
  return { id, source: "debug", appliedAt: 1 };
}

describe("itemStates", () => {
  it("adds, checks, and removes item states", () => {
    const item = instanceFromTemplateId("trinket_minor_ward", createRng("state-item"));
    const protectedItem = addItemState({ item, state: state("protected") });
    expect(hasItemState({ item: protectedItem, stateId: "protected" })).toBe(true);
    expect(protectedItem.protected).toBe(true);

    const normalItem = removeItemState({ item: protectedItem, stateId: "protected" });
    expect(hasItemState({ item: normalItem, stateId: "protected" })).toBe(false);
    expect(normalItem.protected).toBe(false);
  });

  it("handles protected, fragile, and normal death behavior", () => {
    const normal = instanceFromTemplateId("weapon_short_sword", createRng("normal"));
    const protectedItem = addItemState({
      item: instanceFromTemplateId("trinket_minor_ward", createRng("protected")),
      state: state("protected")
    });
    const fragileItem = addItemState({
      item: instanceFromTemplateId("weapon_ember_wand", createRng("fragile")),
      state: state("fragile")
    });

    const result = applyItemStateDeathBehavior({
      items: [normal, protectedItem, fragileItem],
      rng: createRng("fragile-breaks")
    });

    expect(result.returnedToStash).toContain(protectedItem);
    expect(result.lost).toContain(normal);
    expect([...result.broken, ...result.lost]).toContain(fragileItem);
  });

  it("enforces cursed drop restrictions and exposes warnings", () => {
    const cursed = addItemState({
      item: instanceFromTemplateId("trinket_gravegold", createRng("curse")),
      state: state("cursed")
    });
    expect(canDropItemDuringRun(cursed)).toBe(false);
    expect(getItemRiskWarnings(cursed).some(warning => warning.type === "cursedGear")).toBe(true);
  });

  it("applies value and stat modifier helpers", () => {
    const contraband = addItemState({
      item: instanceFromTemplateId("trinket_gravegold", createRng("contraband")),
      state: { ...state("contraband"), valueModifier: 1.5 }
    });
    expect(getItemValueWithStateModifiers(contraband)).toBeGreaterThan(contraband.value);

    const damaged = addItemState({
      item: instanceFromTemplateId("armor_reinforced_leather", createRng("damaged")),
      state: { ...state("damaged"), statModifier: { armor: -1 }, valueModifier: 0.6 }
    });
    expect(getItemStateStatModifiers(damaged).armor).toBe(-1);
    expect(getItemValueWithStateModifiers(damaged)).toBeLessThan(damaged.value);
  });

  it("rolls visible states deterministically for eligible generated gear", () => {
    const item = {
      ...instanceFromTemplateId("weapon_whispersteel_dirk", createRng("state-roll")),
      rarity: "legendary" as const
    };
    const a = rollItemStatesForItem({ item, context, rng: createRng("state-seed"), now: 10 });
    const b = rollItemStatesForItem({ item, context, rng: createRng("state-seed"), now: 10 });
    expect(a).toEqual(b);
    expect(a.length).toBeLessThanOrEqual(1);
  });

  it("keeps old protected boolean compatible", () => {
    const item = { ...instanceFromTemplateId("trinket_minor_ward", createRng("legacy")), protected: true };
    expect(survivesDeath(item)).toBe(true);
  });
});
