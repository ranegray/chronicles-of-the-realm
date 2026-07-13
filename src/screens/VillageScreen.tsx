import { useState } from "react";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { calculateInventoryWeight } from "../game/inventory";
import { useGameStore } from "../store/gameStore";
import { getRelationshipLabel } from "../game/villageProgression";
import type { NpcRole, Quest } from "../game/types";
import "./VillageScreen.css";

const ROLE_VERB_PHRASES: Record<NpcRole, string> = {
  blacksmith: "works the forge",
  alchemist: "keeps the still going behind a curtain of bitter herbs",
  enchanter: "reads the marks on old metal",
  quartermaster: "minds the stores",
  cartographer: "sketches the dungeon's margins in pale ink",
  elder: "speaks for what's left of the village",
  healer: "binds wounds with quiet patience",
  trader: "haggles by the gate"
};

const TRUST_TAGS: Record<string, string> = {
  Stranger: "barely knows you",
  Trusted: "has come to trust you",
  Ally: "counts you as an ally",
  Devoted: "would go to war for you"
};

export function VillageScreen() {
  const player = useGameStore(s => s.state.player);
  const village = useGameStore(s => s.state.village);
  const stash = useGameStore(s => s.state.stash);
  const preparedInventory = useGameStore(s => s.state.preparedInventory);
  const startDelveRun = useGameStore(s => s.startDelveRun);
  const goToScreen = useGameStore(s => s.goToScreen);
  const openMerchant = useGameStore(s => s.openMerchant);
  const toggleQuest = useGameStore(s => s.toggleQuestActive);
  const resetSave = useGameStore(s => s.resetSave);
  const message = useGameStore(s => s.lastVillageMessage);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!player || !village) {
    return <div className="screen">Loading…</div>;
  }

  const availableQuests = village.quests.filter(q => q.status === "available");
  const activeQuests = village.quests.filter(q => q.status === "active");
  const completedQuests = village.quests.filter(q => q.status === "completed");
  const preparedWeight = calculateInventoryWeight(preparedInventory);
  const noticeQuests = [...activeQuests, ...availableQuests].slice(0, 3);

  return (
    <div className="screen village-screen village-screen-prose">
      <div className="narrative-scroll">
        <div className="narrative-column">
          <div className="village-hero-row">
            <span className="village-hero-name">{village.name}</span>
            <button
              type="button"
              className="village-hero-reset"
              title="Reset save and return to the title"
              onClick={() => setShowResetConfirm(true)}
            >Reset</button>
          </div>

          {showResetConfirm && (
            <ConfirmDialog
              title="Burn the chronicle"
              body="Burn the chronicle and begin again. Nothing of this journey will remain."
              confirmLabel="Burn it"
              cancelLabel="Keep going"
              danger
              onConfirm={() => { setShowResetConfirm(false); resetSave(); }}
              onCancel={() => setShowResetConfirm(false)}
            />
          )}

          <p className="village-hero-prose">
            The morning comes in cold, the kind that sits in the joints. Lanterns still burn
            along the palisade, though the sky beyond the tree line has gone the grey of first
            light. Somewhere below the frost line the dungeon waits; it has never once been in
            a hurry.
          </p>

          {message && <p className="msg village-message">{message}</p>}

          <section className="village-decision" aria-label="Today's decision">
            <h1 className="village-decision-title">Enter the Warrens</h1>
            <div className="village-decision-actions">
              <Button className="btn-hero" onClick={() => startDelveRun("goblinWarrens")}>Enter the Warrens</Button>
              <Button variant="secondary" onClick={() => goToScreen("stash")}>Pack Gear</Button>
            </div>
            <div className="village-decision-meta muted small">
              <span><em>Pack</em> {preparedWeight} / {player.derivedStats.carryCapacity}</span>
              <span><em>Gold</em> {stash.gold}</span>
              <span><em>Active quests</em> {activeQuests.length}</span>
              <span><em>Renown</em> {village.renown}</span>
            </div>
          </section>

          <section className="village-section" aria-label="Villagers">
            <h3 className="village-section-heading">In the Village</h3>
            <ul className="roster-list">
              {village.npcs.map(npc => {
                const trustLabel = getRelationshipLabel(npc.relationship);
                const trustTag = TRUST_TAGS[trustLabel] ?? trustLabel.toLowerCase();
                const verb = ROLE_VERB_PHRASES[npc.role] ?? npc.description.toLowerCase();
                return (
                  <li key={npc.id}>
                    <button
                      type="button"
                      className="roster-line"
                      onClick={() => openMerchant(npc.id)}
                    >
                      <span className="roster-sentence">
                        <strong>{npc.name}</strong> {verb}; {trustTag}.
                      </span>
                      <span className="roster-trust-tag">{trustLabel}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="village-section" aria-label="Quest board">
            <h3 className="village-section-heading">Posted Notices</h3>
            <div className="notice-board">
              {noticeQuests.length === 0 ? (
                <p className="notice-empty">No postings on the board today.</p>
              ) : (
                noticeQuests.map(quest => (
                  <div className="notice-item" key={quest.id}>
                    <div className="notice-item-main">
                      <strong className="notice-item-title">{quest.title}</strong>
                      <span className="muted small">{describeQuestStatus(quest)}</span>
                    </div>
                    {quest.status === "available" && (
                      <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Accept</Button>
                    )}
                  </div>
                ))
              )}
              <div className="notice-board-footer">
                <Button variant="secondary" onClick={() => goToScreen("quests")}>
                  Quest Log · {availableQuests.length} open · {completedQuests.length} ready
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function describeQuestStatus(quest: Quest): string {
  if (quest.status === "active") return `Progress ${quest.currentCount}/${quest.requiredCount}`;
  return "New posting";
}
