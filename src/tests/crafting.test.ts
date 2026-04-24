import { describe, expect, it } from "vitest";
import { defaultGameState } from "../game/save";
import { generateVillage } from "../game/npcGenerator";
import { createRng } from "../game/rng";
import { initializeVillageProgression } from "../game/villageProgression";
import { canCraftRecipe, craftRecipe, getUnlockedRecipes } from "../game/crafting";

describe("crafting", () => {
  it("shows unlocked service recipes and crafts into stash", () => {
    const village = initializeVillageProgression({ village: generateVillage(createRng("craft-village")) });
    const gameState = {
      ...defaultGameState(),
      village,
      stash: { items: [], gold: 10, materials: { ironOre: 3, scrapIron: 2 } }
    };
    expect(getUnlockedRecipes({ gameState, role: "blacksmith" }).map(recipe => recipe.id)).toContain("recipe-iron-shortblade");
    expect(canCraftRecipe({ gameState, recipeId: "recipe-iron-shortblade" }).canCraft).toBe(true);
    const result = craftRecipe({ gameState, recipeId: "recipe-iron-shortblade", rng: createRng("craft") });
    expect(result.success).toBe(true);
    expect(result.craftedItems[0]?.templateId).toBe("weapon_short_sword");
    expect(result.gameState.stash.items).toHaveLength(1);
    expect(result.gameState.stash.gold).toBe(5);
  });

  it("fails when materials are missing or a run is active", () => {
    const village = initializeVillageProgression({ village: generateVillage(createRng("craft-fail")) });
    const gameState = { ...defaultGameState(), village, stash: { items: [], gold: 10, materials: {} } };
    expect(canCraftRecipe({ gameState, recipeId: "recipe-iron-shortblade" }).canCraft).toBe(false);
    expect(canCraftRecipe({ gameState: { ...gameState, activeRun: { runId: "x" } as never }, recipeId: "recipe-iron-shortblade" }).reason).toMatch(/village/i);
  });
});
