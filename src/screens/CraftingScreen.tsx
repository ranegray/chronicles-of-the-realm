import { Card } from "../components/Card";
import { CraftingPanel } from "../components/CraftingPanel";
import { getUnlockedRecipes } from "../game/crafting";
import { useGameStore } from "../store/gameStore";

export function CraftingScreen() {
  const state = useGameStore(s => s.state);
  const craft = useGameStore(s => s.craftRecipe);
  return (
    <div className="screen">
      <Card title="Crafting" subtitle="Recipes unlocked through village services">
        <CraftingPanel recipes={getUnlockedRecipes({ gameState: state })} inventory={state.stash} onCraft={craft} />
      </Card>
    </div>
  );
}
