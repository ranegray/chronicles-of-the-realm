import { useEffect } from "react";
import { useGameStore } from "./store/gameStore";
import { MainMenuScreen } from "./screens/MainMenuScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { VillageScreen } from "./screens/VillageScreen";
import { DelveScreen } from "./screens/DelveScreen";
import { RunSummaryScreen } from "./screens/RunSummaryScreen";
import { StashScreen } from "./screens/StashScreen";
import { MerchantScreen } from "./screens/MerchantScreen";
import { CharacterScreen } from "./screens/CharacterScreen";
import { QuestScreen } from "./screens/QuestScreen";
import { GlobalNav, shouldShowGlobalNav } from "./components/GlobalNav";
import { DevPanel } from "./components/DevPanel";
import { AudioControl } from "./components/AudioControl";
import { useAmbientAudio } from "./game/ambient";

export default function App() {
  const screen = useGameStore(s => s.screen);
  const hasPlayer = useGameStore(s => Boolean(s.state.player));
  const boot = useGameStore(s => s.boot);
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

  useEffect(() => {
    boot();
  }, [boot]);

  useAmbientAudio();

  return (
    <div className="app-root">
      <AudioControl />
      {shouldShowGlobalNav(screen, hasPlayer) && <GlobalNav />}
      {screen === "mainMenu" && <MainMenuScreen />}
      {screen === "onboarding" && <OnboardingScreen />}
      {screen === "characterCreation" && <CharacterCreationScreen />}
      {screen === "village" && <VillageScreen />}
      {screen === "delve" && <DelveScreen />}
      {screen === "runSummary" && <RunSummaryScreen />}
      {screen === "stash" && <StashScreen />}
      {screen === "character" && <CharacterScreen />}
      {screen === "quests" && <QuestScreen />}
      {screen === "merchant" && <MerchantScreen />}
      {isDev && <DevPanel />}
    </div>
  );
}
