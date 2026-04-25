import { describe, expect, it } from "vitest";
import {
  applyGeneratedItemProperties,
  generateItemInstance,
  generateLootItem
} from "../game/itemGeneration";
import { generateLootForTable } from "../game/lootGenerator";
import { getLootTableForBiome } from "../data/lootTables";
import { instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { ItemGenerationContext } from "../game/types";

const context: ItemGenerationContext = {
  seed: "item-generation",
  biome: "crypt",
  tier: 1,
  roomType: "treasure",
  source: "treasure",
  playerClassId: "scout"
};

describe("itemGeneration", () => {
  it("generates the same item for the same seed and context", () => {
    const a = generateLootItem({
      category: "weapon",
      rarity: "rare",
      context,
      rng: createRng("same-generated"),
      now: 100
    });
    const b = generateLootItem({
      category: "weapon",
      rarity: "rare",
      context,
      rng: createRng("same-generated"),
      now: 100
    });
    expect({
      templateId: a.item.templateId,
      name: a.item.name,
      affixes: a.affixesRolled.map(affix => `${affix.definitionId}:${affix.value}`),
      states: a.statesRolled.map(state => state.id)
    }).toEqual({
      templateId: b.item.templateId,
      name: b.item.name,
      affixes: b.affixesRolled.map(affix => `${affix.definitionId}:${affix.value}`),
      states: b.statesRolled.map(state => state.id)
    });
  });

  it("uses rarity to control affix count", () => {
    const common = generateItemInstance({
      templateId: "weapon_short_sword",
      context,
      rng: createRng("common"),
      now: 1
    });
    expect(common.affixesRolled).toHaveLength(0);

    const rareBase = {
      ...instanceFromTemplateId("weapon_short_sword", createRng("rare-base")),
      rarity: "rare" as const
    };
    const rare = applyGeneratedItemProperties({
      item: rareBase,
      context,
      rng: createRng("rare-generated"),
      now: 1
    });
    expect(rare.affixesRolled).toHaveLength(2);
  });

  it("produces readable affixed names and keeps affix/state arrays", () => {
    const result = generateLootItem({
      category: "trinket",
      rarity: "legendary",
      context: { ...context, biome: "sunkenTemple" },
      rng: createRng("readable"),
      now: 5
    });
    expect(result.item.name.split(" ").length).toBeGreaterThan(2);
    expect(result.item.affixes).toEqual(result.affixesRolled);
    expect(result.item.states).toEqual(result.statesRolled);
    expect(result.item.tags).toBeDefined();
  });

  it("can produce different affixes for different seeds", () => {
    const a = generateLootItem({
      category: "weapon",
      rarity: "legendary",
      context,
      rng: createRng("different-a"),
      now: 1
    });
    const b = generateLootItem({
      category: "weapon",
      rarity: "legendary",
      context,
      rng: createRng("different-b"),
      now: 1
    });
    expect(a.affixesRolled.map(affix => affix.definitionId)).not.toEqual(
      b.affixesRolled.map(affix => affix.definitionId)
    );
  });

  it("integrates affix and state generation into existing loot tables", () => {
    const table = getLootTableForBiome("crypt", 1);
    const items = generateLootForTable(table, createRng("table-v4"), 10, context);
    expect(items).toHaveLength(10);
    for (const item of items) {
      expect(item.affixes).toBeDefined();
      expect(item.states).toBeDefined();
      expect(item.tags).toBeDefined();
    }
  });
});
