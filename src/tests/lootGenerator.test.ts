import { describe, it, expect } from "vitest";
import { rollRarity, generateLootForTable } from "../game/lootGenerator";
import { getLootTableForBiome } from "../data/lootTables";
import { createRng } from "../game/rng";

describe("lootGenerator", () => {
  it("rollRarity heavily favors common at tier 1", () => {
    const r = createRng("rare-test");
    const counts: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      const rar = rollRarity(1, r);
      counts[rar] = (counts[rar] ?? 0) + 1;
    }
    expect(counts.common).toBeGreaterThan(counts.uncommon ?? 0);
    expect(counts.uncommon).toBeGreaterThan(counts.rare ?? 0);
  });

  it("higher depths produce meaningfully better rarity distribution", () => {
    const shallow = countRarities(1);
    const deep = countRarities(8);
    expect((deep.rare ?? 0) + (deep.epic ?? 0) + (deep.legendary ?? 0))
      .toBeGreaterThan((shallow.rare ?? 0) + (shallow.epic ?? 0) + (shallow.legendary ?? 0));
    expect(deep.epic ?? 0).toBeGreaterThan(0);
    expect(deep.legendary ?? 0).toBeGreaterThan(0);
  });

  it("generates valid loot from a table", () => {
    const r = createRng("loot");
    const table = getLootTableForBiome("crypt", 1);
    const items = generateLootForTable(table, r, 5);
    expect(items).toHaveLength(5);
    for (const item of items) {
      expect(item.instanceId).toMatch(/^item_/);
      expect(item.name).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
    }
  });

  it("is deterministic with same seed", () => {
    const table = getLootTableForBiome("crypt", 1);
    const a = generateLootForTable(table, createRng("same"), 5);
    const b = generateLootForTable(table, createRng("same"), 5);
    expect(a.map(i => i.templateId)).toEqual(b.map(i => i.templateId));
  });
});

function countRarities(tier: number): Record<string, number> {
  const r = createRng(`rarity-depth-${tier}`);
  const counts: Record<string, number> = {};
  for (let i = 0; i < 2000; i++) {
    const rar = rollRarity(tier, r);
    counts[rar] = (counts[rar] ?? 0) + 1;
  }
  return counts;
}
