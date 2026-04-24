import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import type { Quest } from "../game/types";
import { useGameStore } from "../store/gameStore";

export function QuestScreen() {
  const village = useGameStore(s => s.state.village);
  const activeRun = useGameStore(s => s.state.activeRun);
  const activeCombat = useGameStore(s => s.state.activeCombat);
  const toggleQuest = useGameStore(s => s.toggleQuestActive);

  if (!village) return <div className="screen">No quests available.</div>;

  const available = village.quests.filter(q => q.status === "available");
  const active = village.quests.filter(q => q.status === "active");
  const completed = village.quests.filter(q => q.status === "completed");
  const claimed = village.quests.filter(q => q.status === "claimed");
  const awayFromVillage = Boolean(activeRun || activeCombat);

  return (
    <div className="screen quest-screen">
      <header className="screen-header">
        <div>
          <h2>Quests</h2>
          <p className="muted">Work, favors, and promises tied to the village.</p>
        </div>
      </header>

      <div className="quest-grid">
        <QuestList title="Active" quests={active} villageName={village.name}>
          {quest => <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Drop</Button>}
        </QuestList>

        <QuestList title="Ready to Turn In" quests={completed} villageName={village.name}>
          {() => <span className="muted small">{awayFromVillage ? "Return to the village, then visit the quest giver." : "Visit the quest giver to turn in."}</span>}
        </QuestList>

        <QuestList title="Available" quests={available} villageName={village.name}>
          {quest => <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Accept</Button>}
        </QuestList>

        <QuestList title="Claimed" quests={claimed} villageName={village.name} />
      </div>
    </div>
  );
}

function QuestList({
  title,
  quests,
  villageName,
  children
}: {
  title: string;
  quests: Quest[];
  villageName: string;
  children?: (quest: Quest) => ReactNode;
}) {
  return (
    <Card title={title} subtitle={villageName}>
      {quests.length === 0 ? <div className="inv-empty">None.</div> : (
        <ul className="quest-list">
          {quests.map(quest => (
            <li key={quest.id}>
              <strong>{quest.title}</strong>
              <p>{quest.description}</p>
              <div className="muted">Progress: {quest.currentCount} / {quest.requiredCount} - {quest.status}</div>
              {children?.(quest)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
