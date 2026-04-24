import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { QuestChainPanel } from "../components/QuestChainPanel";
import { QUEST_CHAIN_DEFINITIONS } from "../data/questChains";
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
  const chains = village.questChains ?? [];

  return (
    <div className="screen quest-screen">
      <header className="quest-hero">
        <div className="quest-hero-main">
          <span className="quest-hero-eyebrow">{village.name}</span>
          <h1>Quest Board</h1>
        </div>
        <div className="quest-hero-meta">
          <span><em>Active</em> {active.length}</span>
          <span><em>Ready</em> {completed.length}</span>
          <span><em>Available</em> {available.length}</span>
          <span><em>Claimed</em> {claimed.length}</span>
        </div>
      </header>

      <div className="quest-grid">
        <QuestColumn title="Active" quests={active}>
          {quest => <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Drop</Button>}
        </QuestColumn>

        <QuestColumn title="Ready to Turn In" quests={completed}>
          {() => <span className="muted small">{awayFromVillage ? "Return to village, then visit the quest giver." : "Visit the quest giver to turn in."}</span>}
        </QuestColumn>

        <QuestColumn title="Available" quests={available}>
          {quest => <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Accept</Button>}
        </QuestColumn>

        <QuestColumn title="Claimed" quests={claimed} />
      </div>

      {chains.length > 0 && (
        <Card title="Quest Chains" subtitle="Villager stories that unlock services">
          <QuestChainPanel chains={chains} definitions={QUEST_CHAIN_DEFINITIONS} quests={village.quests} />
        </Card>
      )}
    </div>
  );
}

function QuestColumn({
  title,
  quests,
  children
}: {
  title: string;
  quests: Quest[];
  children?: (quest: Quest) => ReactNode;
}) {
  return (
    <section className="quest-column">
      <header className="quest-column-head">
        <span className="quest-column-title">{title}</span>
        <span className="muted small">{quests.length}</span>
      </header>
      {quests.length === 0 ? (
        <div className="quest-column-empty muted small">None.</div>
      ) : (
        <ul className="quest-column-list">
          {quests.map(quest => (
            <li key={quest.id} className="quest-column-item">
              <div className="quest-column-item-head">
                <strong>{quest.title}</strong>
                <span className="muted small">{quest.currentCount}/{quest.requiredCount}</span>
              </div>
              <p className="muted small">{quest.description}</p>
              {children && <div className="quest-column-item-actions">{children(quest)}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
