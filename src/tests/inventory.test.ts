import { describe, it, expect } from "vitest";
import {
  addItem,
  calculateInventoryWeight,
  canCarryItem,
  createEmptyInventory,
  instanceFromTemplateId,
  moveRaidInventoryToStash,
  removeItem
} from "../game/inventory";
import { createRng } from "../game/rng";

describe("inventory", () => {
  const rng = createRng("inv-test");

  it("starts empty", () => {
    const inv = createEmptyInventory();
    expect(inv.items).toHaveLength(0);
    expect(inv.gold).toBe(0);
  });

  it("adds items and stacks where stackable", () => {
    let inv = createEmptyInventory();
    const ration1 = instanceFromTemplateId("consumable_trail_ration", rng, 2);
    const ration2 = instanceFromTemplateId("consumable_trail_ration", rng, 3);
    inv = addItem(inv, ration1);
    inv = addItem(inv, ration2);
    expect(inv.items).toHaveLength(1);
    expect(inv.items[0]!.quantity).toBe(5);
  });

  it("adds non-stackable items as separate entries", () => {
    let inv = createEmptyInventory();
    const sword1 = instanceFromTemplateId("weapon_short_sword", rng);
    const sword2 = instanceFromTemplateId("weapon_short_sword", rng);
    inv = addItem(inv, sword1);
    inv = addItem(inv, sword2);
    expect(inv.items).toHaveLength(2);
  });

  it("removes items", () => {
    let inv = createEmptyInventory();
    const r = instanceFromTemplateId("consumable_trail_ration", rng, 3);
    inv = addItem(inv, r);
    inv = removeItem(inv, inv.items[0]!.instanceId, 2);
    expect(inv.items[0]!.quantity).toBe(1);
    inv = removeItem(inv, inv.items[0]!.instanceId, 1);
    expect(inv.items).toHaveLength(0);
  });

  it("moves raid inventory to stash on extraction", () => {
    const stash = { ...createEmptyInventory(), gold: 10 };
    const raid = createEmptyInventory();
    const item = instanceFromTemplateId("material_bone_dust", rng, 4);
    const merged = moveRaidInventoryToStash(addItem({ ...raid, gold: 5 }, item), stash);
    expect(merged.stash.gold).toBe(15);
    expect(merged.stash.items.length).toBe(1);
    expect(merged.raid.items).toHaveLength(0);
  });

  it("calculates inventory weight", () => {
    let inv = createEmptyInventory();
    const sword = instanceFromTemplateId("weapon_short_sword", rng);
    inv = addItem(inv, sword);
    expect(calculateInventoryWeight(inv)).toBe(sword.weight);
  });

  it("respects carry capacity", () => {
    let inv = createEmptyInventory();
    const heavy = instanceFromTemplateId("armor_heavy_gambeson", rng);
    inv = addItem(inv, heavy);
    expect(canCarryItem(inv, heavy, 4)).toBe(false);
    expect(canCarryItem(inv, heavy, 100)).toBe(true);
  });
});
