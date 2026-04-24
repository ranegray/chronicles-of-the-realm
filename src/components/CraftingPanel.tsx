import type { CraftingRecipe, Inventory } from "../game/types";
import { RecipeCard } from "./RecipeCard";

export interface CraftingPanelProps {
  recipes: CraftingRecipe[];
  inventory: Inventory;
  onCraft: (recipeId: string) => void;
}

export function CraftingPanel({ recipes, inventory, onCraft }: CraftingPanelProps) {
  if (recipes.length === 0) return <div className="inv-empty">No unlocked recipes at this station.</div>;
  return (
    <div className="crafting-panel">
      {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} inventory={inventory} onCraft={onCraft} />)}
    </div>
  );
}
