import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { calculateInventoryWeight } from "../game/inventory";
import type { Quest } from "../game/types";
import { useGameStore } from "../store/gameStore";

export function VillageScreen() {
  const player = useGameStore(s => s.state.player);
  const village = useGameStore(s => s.state.village);
  const stash = useGameStore(s => s.state.stash);
  const preparedInventory = useGameStore(s => s.state.preparedInventory);
  const startRun = useGameStore(s => s.startDungeonRun);
  const goToScreen = useGameStore(s => s.goToScreen);
  const openMerchant = useGameStore(s => s.openMerchant);
  const toggleQuest = useGameStore(s => s.toggleQuestActive);
  const resetSave = useGameStore(s => s.resetSave);
  const message = useGameStore(s => s.lastVillageMessage);

  if (!player || !village) {
    return <div className="screen">Loading…</div>;
  }

  const availableQuests = village.quests.filter(q => q.status === "available");
  const activeQuests = village.quests.filter(q => q.status === "active");
  const completedQuests = village.quests.filter(q => q.status === "completed");
  const claimedQuests = village.quests.filter(q => q.status === "claimed");
  const preparedWeight = calculateInventoryWeight(preparedInventory);

  return (
    <div className="screen village-screen">
      <header className="village-header">
        <div>
          <h2>{village.name}</h2>
          <p className="muted">A small place, lit and waiting. The road out leads down.</p>
        </div>
        <div className="village-actions">
          <Button variant="ghost" onClick={() => {
            if (confirm("Reset save and return to the title?")) resetSave();
          }}>Reset</Button>
        </div>
      </header>
      {message && <p className="msg">{message}</p>}

      <div className="village-grid">
        <Card title="Next Delve" subtitle={`${preparedWeight} / ${player.derivedStats.carryCapacity} packed · ${stash.gold} gold stashed`}>
          <div className="village-status-list">
            <span>{player.name}, level {player.level}</span>
            <span>HP {player.hp}/{player.maxHp}</span>
            <span>{activeQuests.length} active quest{activeQuests.length === 1 ? "" : "s"}</span>
          </div>
          <div className="room-actions">
            <Button onClick={() => startRun()}>Enter the Dungeon</Button>
            <Button variant="secondary" onClick={() => goToScreen("stash")}>Pack Gear</Button>
          </div>
        </Card>

        <Card title="Quest Board" subtitle={`${availableQuests.length} available · ${completedQuests.length} ready`}>
          <QuestPreview
            quests={activeQuests.length > 0 ? activeQuests.slice(0, 2) : availableQuests.slice(0, 3)}
            emptyText="No posted work right now."
            action={quest =>
              quest.status === "available"
                ? <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Accept</Button>
                : <span className="muted small">Progress {quest.currentCount}/{quest.requiredCount}</span>
            }
          />
          <div className="room-actions">
            <Button variant="secondary" onClick={() => goToScreen("quests")}>Open Quest Log</Button>
          </div>
        </Card>

        <div className="village-services">
          <Card title="Village Services" subtitle={`${village.npcs.length} people in town`}>
            <ul className="service-list">
            {village.npcs.map(npc => (
              <li key={npc.id}>
                <div>
                  <strong>{npc.name}</strong>
                  <div className="muted">{capitalize(npc.role)} · service {npc.serviceLevel} · {npc.personality}</div>
                  <div className="muted small">{npc.description}</div>
                </div>
                <Button variant="ghost" onClick={() => openMerchant(npc.id)}>Visit</Button>
              </li>
            ))}
            </ul>
          </Card>
        </div>

        {claimedQuests.length > 0 && (
          <Card title="Past Deeds" subtitle={`${claimedQuests.length} claimed`}>
            <ul className="quest-list">
              {claimedQuests.slice(0, 4).map(q => (
                <li key={q.id}><strong>{q.title}</strong> — claimed</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function QuestPreview({
  quests,
  emptyText,
  action
}: {
  quests: Quest[];
  emptyText: string;
  action: (quest: Quest) => ReactNode;
}) {
  const village = useGameStore(s => s.state.village);
  if (quests.length === 0) return <div className="inv-empty">{emptyText}</div>;
  return (
    <ul className="quest-list quest-list-compact">
      {quests.map(quest => {
        const giver = village?.npcs.find(n => n.id === quest.npcId);
        return (
          <li key={quest.id}>
            <div>
              <strong>{quest.title}</strong>
              <div className="muted">{giver?.name ?? "Unknown"} · {giver?.role}</div>
              <p>{quest.description}</p>
            </div>
            {action(quest)}
          </li>
        );
      })}
    </ul>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
