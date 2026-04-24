import { Button } from "../components/Button";
import { useGameStore } from "../store/gameStore";
import { hasSave } from "../game/save";

export function MainMenuScreen() {
  const newGame = useGameStore(s => s.newGame);
  const continueGame = useGameStore(s => s.continueGame);
  const resetSave = useGameStore(s => s.resetSave);
  const hasExisting = hasSave();

  return (
    <div className="screen menu-screen">
      <div className="menu-card">
        <h1 className="title">Chronicles of the Realm</h1>
        <p className="tagline">A solo extraction crawl through cold and forgotten places.</p>
        <div className="menu-actions">
          <Button onClick={newGame}>New Game</Button>
          {hasExisting && <Button variant="secondary" onClick={continueGame}>Continue</Button>}
          {hasExisting && <Button variant="danger" onClick={() => {
            if (confirm("Delete your save and start fresh?")) resetSave();
          }}>Reset Save</Button>}
        </div>
        <p className="hint">Loot what you can. Get out alive. The village is waiting.</p>
      </div>
    </div>
  );
}
