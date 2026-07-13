import type { ScreenId } from "../game/types";
import { useGameStore } from "../store/gameStore";
import { playSfx } from "../game/audio";
import "./GlobalNav.css";

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

  const places: Array<{ id: ScreenId; label: string }> = [
    { id: returnTarget, label: returnLabel },
    { id: "character", label: "You" },
    { id: "stash", label: "Pack" },
    { id: "quests", label: "Chronicle" }
  ];

  const hpPct = player.maxHp > 0 ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100)) : 0;
  const hpTier = hpPct <= 25 ? "realm-hp-low" : hpPct <= 50 ? "realm-hp-mid" : "";

  return (
    <nav className="realm-band" aria-label="Game navigation">
      <div className="realm-band-places">
        {places.map((place, index) => {
          const active = screen === place.id;
          return (
            <span key={place.id} style={{ display: "flex", alignItems: "center" }}>
              {index > 0 && <span className="realm-band-sep" aria-hidden="true">&middot;</span>}
              <button
                type="button"
                className={`realm-place${active ? " realm-place-active" : ""}`}
                onClick={() => {
                  if (active) return;
                  playSfx("button");
                  goToScreen(place.id);
                }}
                disabled={active}
                aria-current={active ? "page" : undefined}
              >
                {place.label}
              </button>
            </span>
          );
        })}
      </div>
      <div className="realm-plate">
        <div
          className={`realm-hp${hpTier ? ` ${hpTier}` : ""}`}
          role="img"
          aria-label={`HP ${player.hp} of ${player.maxHp}`}
        >
          <div className="realm-hp-fill" style={{ width: `${hpPct}%` }} />
        </div>
        <div className="realm-plate-id">
          <span className="realm-plate-name">{player.name}</span>
          <span className={`realm-plate-meta${inCombat ? " realm-plate-meta-combat" : ""}`}>
            {inCombat ? "In Combat" : inRun ? `Depth ${state.activeRun?.tier}` : "At Rest"}
          </span>
        </div>
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
  if (screen === "dungeon") return "The Delve";
  return "Village";
}
