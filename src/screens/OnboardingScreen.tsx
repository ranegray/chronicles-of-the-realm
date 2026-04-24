import { useState } from "react";
import { Button } from "../components/Button";
import { useGameStore } from "../store/gameStore";

const PANELS = [
  {
    title: "A Frontier Village",
    body: "You arrive alone in a small village ringed by old stone. Lanterns are still lit. The villagers have been waiting."
  },
  {
    title: "The Dungeons Below",
    body: "Beneath the villages and ruins, halls shift in the dark. Each delve is different. Each carries weight."
  },
  {
    title: "Loot is Not Yours Until You Return",
    body: "Anything you find inside is fragile. Die or fail to extract, and the dungeon keeps it all. Gear carried in is also lost."
  },
  {
    title: "Extract Alive",
    body: "Find an extraction point and leave the dungeon. What you carry out is finally safe in your stash."
  },
  {
    title: "Help the Village Grow",
    body: "Villagers offer tasks and unlock services in return. The forge, the brewer, the cartographer — all wait on you."
  }
];

export function OnboardingScreen() {
  const [panel, setPanel] = useState(0);
  const finish = useGameStore(s => s.setOnboardingComplete);
  const startCharacter = useGameStore(s => s.startCharacterCreation);
  const isLast = panel === PANELS.length - 1;
  const p = PANELS[panel]!;

  const onNext = () => {
    if (isLast) {
      finish();
      startCharacter();
    } else {
      setPanel(panel + 1);
    }
  };
  const onSkip = () => {
    finish();
    startCharacter();
  };

  return (
    <div className="screen onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-counter">{panel + 1} / {PANELS.length}</div>
        <h2>{p.title}</h2>
        <p>{p.body}</p>
        <div className="onboarding-actions">
          {panel > 0 && <Button variant="ghost" onClick={() => setPanel(panel - 1)}>Back</Button>}
          <Button onClick={onNext}>{isLast ? "Begin" : "Next"}</Button>
          {!isLast && <Button variant="ghost" onClick={onSkip}>Skip</Button>}
        </div>
      </div>
    </div>
  );
}
