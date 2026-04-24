import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { StatBlock } from "../components/StatBlock";
import { InventoryList } from "../components/InventoryList";
import { useGameStore } from "../store/gameStore";

export function VillageScreen() {
  const player = useGameStore(s => s.state.player);
  const village = useGameStore(s => s.state.village);
  const stash = useGameStore(s => s.state.stash);
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
  const claimedQuests = village.quests.filter(q => q.status === "claimed");

  return (
    <div className="screen village-screen">
      <header className="village-header">
        <div>
          <h2>{village.name}</h2>
          <p className="muted">A small place, lit and waiting. The road out leads down.</p>
        </div>
        <div className="village-actions">
          <Button onClick={() => startRun()}>Enter the Dungeon</Button>
          <Button variant="secondary" onClick={() => goToScreen("stash")}>Inventory</Button>
          <Button variant="ghost" onClick={() => {
            if (confirm("Reset save and return to the title?")) resetSave();
          }}>Reset</Button>
        </div>
      </header>
      {message && <p className="msg">{message}</p>}

      <div className="village-grid">
        <Card title={`${player.name}`} subtitle={`Level ${player.level} ${capitalize(player.ancestryId)} ${capitalize(player.classId)}`}>
          <StatBlock character={player} />
        </Card>

        <Card title="Stash" subtitle={`${stash.items.length} item(s) · ${stash.gold} gold`}>
          <InventoryList inventory={stash} emptyText="Nothing yet. Bring something back." />
        </Card>

        <Card title="Quests Available">
          {availableQuests.length === 0 ? <em>None.</em> : (
            <ul className="quest-list">
              {availableQuests.map(q => {
                const giver = village.npcs.find(n => n.id === q.npcId);
                return (
                  <li key={q.id}>
                    <strong>{q.title}</strong>
                    <div className="muted">— {giver?.name ?? "Unknown"} ({giver?.role})</div>
                    <p>{q.description}</p>
                    <Button variant="ghost" onClick={() => toggleQuest(q.id)}>Accept</Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Active Quests">
          {activeQuests.length === 0 ? <em>None active.</em> : (
            <ul className="quest-list">
              {activeQuests.map(q => (
                <li key={q.id}>
                  <strong>{q.title}</strong>
                  <p>{q.description}</p>
                  <div className="muted">Progress: {q.currentCount} / {q.requiredCount}</div>
                  <Button variant="ghost" onClick={() => toggleQuest(q.id)}>Drop</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Villagers">
          <ul className="npc-list">
            {village.npcs.map(npc => (
              <li key={npc.id}>
                <strong>{npc.name}</strong> — <em>{capitalize(npc.role)}</em> (svc {npc.serviceLevel})
                <div className="muted">{npc.personality}</div>
                <div className="muted">{npc.description}</div>
                <Button variant="ghost" onClick={() => openMerchant(npc.id)}>Visit</Button>
              </li>
            ))}
          </ul>
        </Card>

        {claimedQuests.length > 0 && (
          <Card title="Past Deeds">
            <ul className="quest-list">
              {claimedQuests.map(q => (
                <li key={q.id}><strong>{q.title}</strong> — claimed</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
