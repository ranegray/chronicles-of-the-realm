import { Button } from "../components/Button";
import { calculateInventoryWeight } from "../game/inventory";
import { useGameStore } from "../store/gameStore";
import { ServiceLevelBadge } from "../components/ServiceLevelBadge";
import { getCurrentServiceLevelDefinition, getRelationshipLabel } from "../game/villageProgression";

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
  const preparedWeight = calculateInventoryWeight(preparedInventory);
  const queuedQuest = activeQuests[0] ?? availableQuests[0];

  return (
    <div className="screen village-screen">
      <section className="delve-hero">
        <div className="delve-hero-body">
          <div className="delve-hero-place">
            <span className="delve-hero-place-name">{village.name}</span>
            <button
              type="button"
              className="delve-hero-reset"
              title="Reset save and return to the title"
              onClick={() => { if (confirm("Reset save and return to the title?")) resetSave(); }}
            >Reset</button>
          </div>
          <h1>Enter the Dungeon</h1>
          <div className="delve-hero-meta">
            <span><em>Pack</em> {preparedWeight} / {player.derivedStats.carryCapacity}</span>
            <span><em>Gold</em> {stash.gold}</span>
            <span><em>Active quests</em> {activeQuests.length}</span>
            <span><em>Renown</em> {village.renown}</span>
          </div>
        </div>
        <div className="delve-hero-actions">
          <Button className="btn-hero" onClick={() => startRun()}>Enter the Dungeon</Button>
          <Button variant="secondary" onClick={() => goToScreen("stash")}>Pack Gear</Button>
        </div>
      </section>

      {message && <p className="msg village-message">{message}</p>}

      <section className="village-courtyard">
        <header className="village-courtyard-head">
          <h2>Courtyard</h2>
          <span className="muted small">{village.npcs.length} in town</span>
        </header>
        <ul className="npc-grid">
          {village.npcs.map(npc => {
            const currentLevel = getCurrentServiceLevelDefinition({ npc });
            return (
              <li key={npc.id} className="npc-tile" onClick={() => openMerchant(npc.id)}>
                <div className="npc-tile-head">
                  <strong>{npc.name}</strong>
                  <span className="muted small">{capitalize(npc.role)}</span>
                </div>
                <div className="npc-tile-sub">
                  <ServiceLevelBadge level={npc.service.level} label={currentLevel?.title} />
                  <span className="muted small">Trust {getRelationshipLabel(npc.relationship)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="village-footer">
        <div className="village-quest-strip">
          <div className="village-quest-strip-main">
            <span className="village-quest-eyebrow">Quest Board</span>
            {queuedQuest ? (
              <>
                <strong>{queuedQuest.title}</strong>
                <span className="muted small">
                  {queuedQuest.status === "active"
                    ? `Progress ${queuedQuest.currentCount}/${queuedQuest.requiredCount}`
                    : "New posting"}
                </span>
              </>
            ) : (
              <span className="muted">No posted work.</span>
            )}
          </div>
          <div className="village-quest-strip-actions">
            {queuedQuest?.status === "available" && (
              <Button variant="ghost" onClick={() => toggleQuest(queuedQuest.id)}>Accept</Button>
            )}
            <Button variant="secondary" onClick={() => goToScreen("quests")}>
              Quest Log · {availableQuests.length} open · {completedQuests.length} ready
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
