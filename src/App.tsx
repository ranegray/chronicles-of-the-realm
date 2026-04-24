import { useEffect } from "react";
import { useGameStore } from "./store/gameStore";
import { MainMenuScreen } from "./screens/MainMenuScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { VillageScreen } from "./screens/VillageScreen";
import { DungeonScreen } from "./screens/DungeonScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { RunSummaryScreen } from "./screens/RunSummaryScreen";
import { StashScreen } from "./screens/StashScreen";
import { MerchantScreen } from "./screens/MerchantScreen";

export default function App() {
  const screen = useGameStore(s => s.screen);
  const boot = useGameStore(s => s.boot);

  useEffect(() => {
    boot();
  }, [boot]);

  return (
    <div className="app-root">
      {screen === "mainMenu" && <MainMenuScreen />}
      {screen === "onboarding" && <OnboardingScreen />}
      {screen === "characterCreation" && <CharacterCreationScreen />}
      {screen === "village" && <VillageScreen />}
      {screen === "dungeon" && <DungeonScreen />}
      {screen === "combat" && <CombatScreen />}
      {screen === "runSummary" && <RunSummaryScreen />}
      {screen === "stash" && <StashScreen />}
      {screen === "merchant" && <MerchantScreen />}
    </div>
  );
}
