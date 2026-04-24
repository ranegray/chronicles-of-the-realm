import { Button } from "./Button";
import type { ScreenId } from "../game/types";
import { useGameStore } from "../store/gameStore";

const SHELL_SCREENS = new Set<ScreenId>([
  "village",
  "dungeon",
  "combat",
  "merchant",
  "stash",
  "character",
  "quests",
  "runSummary"
]);

export function shouldShowGlobalNav(screen: ScreenId, hasPlayer: boolean): boolean {
  return hasPlayer && SHELL_SCREENS.has(screen);
}

export function GlobalNav() {
  const screen = useGameStore(s => s.screen);
  const state = useGameStore(s => s.state);
  const goToScreen = useGameStore(s => s.goToScreen);
  const player = state.player;
  if (!player) return null;

  const returnTarget = getReturnTarget(state);
  const returnLabel = getReturnLabel(returnTarget);
  const inRun = state.activeRun?.status === "active";
  const inCombat = Boolean(state.activeCombat);

  return (
    <nav className="global-nav" aria-label="Game navigation">
      <div className="global-nav-main">
        <Button
          variant={screen === returnTarget ? "secondary" : "ghost"}
          onClick={() => goToScreen(returnTarget)}
          disabled={screen === returnTarget}
        >
          {returnLabel}
        </Button>
        <Button
          variant={screen === "character" ? "secondary" : "ghost"}
          onClick={() => goToScreen("character")}
          disabled={screen === "character"}
        >
          Character
        </Button>
        <Button
          variant={screen === "stash" ? "secondary" : "ghost"}
          onClick={() => goToScreen("stash")}
          disabled={screen === "stash"}
        >
          Inventory
        </Button>
        <Button
          variant={screen === "quests" ? "secondary" : "ghost"}
          onClick={() => goToScreen("quests")}
          disabled={screen === "quests"}
        >
          Quests
        </Button>
      </div>
      <div className="global-nav-status">
        <span>{player.name}</span>
        <span>HP {player.hp}/{player.maxHp}</span>
        {inCombat && <span>Combat</span>}
        {!inCombat && inRun && <span>Depth {state.activeRun?.tier}</span>}
      </div>
    </nav>
  );
}

function getReturnTarget(state: ReturnType<typeof useGameStore.getState>["state"]): ScreenId {
  if (state.activeCombat) return "combat";
  if (state.activeRun?.status === "active") return "dungeon";
  return "village";
}

function getReturnLabel(screen: ScreenId): string {
  if (screen === "combat") return "Combat";
  if (screen === "dungeon") return "Dungeon";
  return "Village";
}
