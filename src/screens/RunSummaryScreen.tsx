import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ItemCard } from "../components/ItemCard";
import { useGameStore } from "../store/gameStore";

export function RunSummaryScreen() {
  const extraction = useGameStore(s => s.lastExtractionSummary);
  const death = useGameStore(s => s.lastDeathSummary);
  const goToScreen = useGameStore(s => s.goToScreen);

  if (extraction) {
    return (
      <div className="screen summary-screen">
        <h2>Extraction Successful</h2>
        <p>You walk back into the village with what you carried.</p>
        <Card title="Loot Secured">
          {extraction.itemsSecured.length === 0 ? <em>You came back empty-handed but alive.</em> :
            <div className="inv-items">
              {extraction.itemsSecured.map(i => <ItemCard key={i.instanceId} item={i} compact />)}
            </div>
          }
        </Card>
        <Card title="Rewards">
          <p>+{extraction.goldGained} gold</p>
          <p>+{extraction.xpGained} XP</p>
        </Card>
        <Card title="Quests Completed">
          {extraction.questsCompleted.length === 0 ? <em>No quest progress this delve.</em> :
            <ul className="quest-list">
              {extraction.questsCompleted.map(q => <li key={q.id}>{q.title}</li>)}
            </ul>
          }
          {extraction.questsCompleted.length > 0 && (
            <p className="muted">Return to the quest giver to turn these in.</p>
          )}
        </Card>
        {extraction.unlocksApplied.length > 0 && (
          <Card title="Village Progress">
            <ul>{extraction.unlocksApplied.map((u, i) => <li key={i}>{u}</li>)}</ul>
          </Card>
        )}
        <div className="summary-actions">
          <Button onClick={() => goToScreen("village")}>Return to Village</Button>
        </div>
      </div>
    );
  }

  if (death) {
    return (
      <div className="screen summary-screen">
        <h2>The Dungeon Keeps What It Took</h2>
        <p>Your carried raid pack is gone. If the dungeon took you, your equipped loadout is gone too.</p>
        <Card title="Lost">
          {death.itemsLost.length === 0 ? <em>Nothing to lose, this time.</em> : (
            <div className="inv-items">
              {death.itemsLost.map(i => <ItemCard key={i.instanceId} item={i} compact />)}
            </div>
          )}
          <p>{death.goldLost > 0 && `Lost ${death.goldLost} gold from the raid pack.`}</p>
        </Card>
        <Card title="Stash">
          <p>The stash in the village remains. Begin again when you are ready.</p>
        </Card>
        <div className="summary-actions">
          <Button onClick={() => goToScreen("village")}>Return to Village</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen summary-screen">
      <p>No run summary to show.</p>
      <Button onClick={() => goToScreen("village")}>Back</Button>
    </div>
  );
}
