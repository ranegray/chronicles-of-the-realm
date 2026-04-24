import { Button } from "./Button";
import { formatResourceCost } from "../game/materials";
import type { CraftingRecipe, Inventory, ResourceCost } from "../game/types";
import { canAffordResourceCost } from "../game/materials";

export function RecipeCard({ recipe, inventory, onCraft }: {
  recipe: CraftingRecipe;
  inventory: Inventory;
  onCraft: (recipeId: string) => void;
}) {
  const cost = recipeCost(recipe);
  const canCraft = canAffordResourceCost({ inventory, cost });
  return (
    <div className="recipe-card">
      <div>
        <strong>{recipe.name}</strong>
        <p>{recipe.description}</p>
        <div className="muted small">{recipe.stationRole} level {recipe.requiredServiceLevel} · {formatResourceCost(cost)}</div>
        <div className="muted small">Output: {recipe.outputs.map(output => output.itemTemplateId ?? output.materialId).join(", ")}</div>
      </div>
      <Button variant="ghost" disabled={!canCraft} onClick={() => onCraft(recipe.id)}>{canCraft ? "Craft" : "Missing"}</Button>
    </div>
  );
}

function recipeCost(recipe: CraftingRecipe): ResourceCost {
  const cost: ResourceCost = {};
  if (recipe.goldCost) cost.gold = recipe.goldCost;
  for (const ingredient of recipe.ingredients) {
    if (ingredient.materialId) {
      cost.materials = {
        ...(cost.materials ?? {}),
        [ingredient.materialId]: (cost.materials?.[ingredient.materialId] ?? 0) + ingredient.quantity
      };
    }
    if (ingredient.itemTemplateId) {
      cost.itemTemplateIds = [
        ...(cost.itemTemplateIds ?? []),
        ...Array.from({ length: ingredient.quantity }, () => ingredient.itemTemplateId!)
      ];
    }
  }
  return cost;
}
