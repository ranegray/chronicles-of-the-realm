import { useState } from "react";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useGameStore } from "../store/gameStore";
import { hasSave } from "../game/save";

export function MainMenuScreen() {
  const newGame = useGameStore(s => s.newGame);
  const continueGame = useGameStore(s => s.continueGame);
  const resetSave = useGameStore(s => s.resetSave);
  const hasExisting = hasSave();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="screen menu-screen">
      <div className="menu-card">
        <h1 className="title">Chronicles of the Realm</h1>
        <p className="tagline">A solo extraction crawl through cold and forgotten places.</p>
        <div className="menu-actions">
          <Button onClick={newGame}>New Game</Button>
          {hasExisting && <Button variant="secondary" onClick={continueGame}>Continue</Button>}
          {hasExisting && <Button variant="danger" onClick={() => setShowResetConfirm(true)}>Reset Save</Button>}
        </div>
        <p className="hint">Loot what you can. Get out alive. The village is waiting.</p>
      </div>

      {showResetConfirm && (
        <ConfirmDialog
          title="Burn the chronicle"
          body="Burn the chronicle and begin again. Your save will be gone for good."
          confirmLabel="Burn it"
          cancelLabel="Keep it"
          danger
          onConfirm={() => { setShowResetConfirm(false); resetSave(); }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  );
}
