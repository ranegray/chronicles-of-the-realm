import { describe, expect, it } from "vitest";
import {
  applyAffixesToItemName,
  createItemAffixFromDefinition,
  getAffixStatModifiers,
  getEligibleAffixes,
  rollAffixesForItem
} from "../game/affixes";
import { AFFIX_DEFINITIONS } from "../data/affixDefinitions";
import { instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { ItemGenerationContext } from "../game/types";

const context: ItemGenerationContext = {
  seed: "affix-test",
  biome: "crypt",
  tier: 1,
  source: "treasure",
  playerClassId: "scout"
};

describe("affixes", () => {
  it("filters eligible affixes by item category and rarity", () => {
    const weapon = {
      ...instanceFromTemplateId("weapon_short_sword", createRng("weapon")),
      rarity: "rare" as const
    };
    const affixes = getEligibleAffixes({ item: weapon, context, affixType: "prefix" });
    expect(affixes.some(affix => affix.id === "prefix-keen")).toBe(true);
    expect(affixes.some(affix => affix.id === "prefix-stalwart")).toBe(false);

    const commonWeapon = { ...weapon, rarity: "common" as const };
    expect(getEligibleAffixes({ item: commonWeapon, context })).toHaveLength(0);
  });

  it("rolls affix counts by rarity and avoids duplicate exclusive groups", () => {
    const item = {
      ...instanceFromTemplateId("weapon_short_sword", createRng("item")),
      rarity: "rare" as const
    };
    const affixes = rollAffixesForItem({ item, context, rng: createRng("rare-affixes") });
    expect(affixes).toHaveLength(2);

    const groups = affixes
      .map(affix => AFFIX_DEFINITIONS.find(definition => definition.id === affix.definitionId)?.exclusiveGroup)
      .filter(Boolean);
    expect(new Set(groups).size).toBe(groups.length);
  });

  it("is deterministic for the same seed and item", () => {
    const item = {
      ...instanceFromTemplateId("weapon_whispersteel_dirk", createRng("same-item")),
      rarity: "legendary" as const
    };
    const a = rollAffixesForItem({ item, context, rng: createRng("same-affix-seed") });
    const b = rollAffixesForItem({ item, context, rng: createRng("same-affix-seed") });
    expect(a.map(affix => `${affix.definitionId}:${affix.value}`)).toEqual(
      b.map(affix => `${affix.definitionId}:${affix.value}`)
    );
  });

  it("formats affix names, descriptions, and stat modifiers", () => {
    const definition = AFFIX_DEFINITIONS.find(affix => affix.id === "prefix-keen");
    expect(definition).toBeDefined();
    const affix = createItemAffixFromDefinition({
      definition: definition!,
      rng: createRng("keen")
    });
    const item = instanceFromTemplateId("weapon_short_sword", createRng("base"));
    expect(affix.description).toContain("Accuracy");
    expect(applyAffixesToItemName({ item, affixes: [affix] })).toContain("Keen Short Sword");
    expect(getAffixStatModifiers([affix]).accuracy).toBe(affix.value);
  });
});
