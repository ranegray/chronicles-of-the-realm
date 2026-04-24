import { describe, expect, it } from "vitest";
import { addMaterials, canAffordResourceCost, createEmptyMaterialVault, removeMaterials, spendResourceCost } from "../game/materials";
import { createEmptyInventory } from "../game/inventory";

describe("materials", () => {
  it("initializes an empty vault", () => {
    expect(createEmptyMaterialVault()).toEqual({});
  });

  it("adds and removes material counts", () => {
    let inv = createEmptyInventory();
    inv = addMaterials({ inventory: inv, materials: { ironOre: 3, scrapIron: 2 } });
    expect(inv.materials?.ironOre).toBe(3);
    inv = removeMaterials({ inventory: inv, materials: { ironOre: 2 } });
    expect(inv.materials?.ironOre).toBe(1);
  });

  it("spends gold and materials only when affordable", () => {
    const inv = addMaterials({ inventory: { ...createEmptyInventory(), gold: 10 }, materials: { ironOre: 2 } });
    expect(canAffordResourceCost({ inventory: inv, cost: { gold: 6, materials: { ironOre: 2 } } })).toBe(true);
    const spent = spendResourceCost({ inventory: inv, cost: { gold: 6, materials: { ironOre: 2 } } });
    expect(spent.success).toBe(true);
    expect(spent.inventory.gold).toBe(4);
    expect(spent.inventory.materials?.ironOre).toBeUndefined();

    const failed = spendResourceCost({ inventory: inv, cost: { gold: 11 } });
    expect(failed.success).toBe(false);
    expect(failed.inventory).toBe(inv);
  });
});
