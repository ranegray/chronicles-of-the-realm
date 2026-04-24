import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ItemCard } from "../components/ItemCard";
import type { RunSummary } from "../game/types";
import { useGameStore } from "../store/gameStore";

export function RunSummaryScreen() {
  const summary = useGameStore(s => s.state.lastRunSummary);
  const goToScreen = useGameStore(s => s.goToScreen);

  if (!summary) {
    return (
      <div className="screen summary-screen">
        <p>No run summary to show.</p>
        <Button onClick={() => goToScreen("village")}>Back</Button>
      </div>
    );
  }

  const success = summary.reason === "extracted" || summary.reason === "debugExtracted";
  const title = success ? "Run Extracted" : summary.reason === "dead" ? "Run Lost" : "Run Abandoned";
  const state = success ? "success" : summary.reason === "dead" ? "lost" : "abandoned";

  return (
    <div className="screen summary-screen">
      <header className={`summary-hero summary-hero-${state}`}>
        <div className="summary-hero-main">
          <span className="summary-hero-eyebrow">{summary.roomsVisited} rooms · {summary.roomsCompleted} cleared</span>
          <h1>{title}</h1>
          <p className="muted">{summary.reasonText}</p>
        </div>
        <div className="summary-hero-stats">
          <SummaryStat label="Gold gained" value={summary.goldGained} />
          <SummaryStat label="XP gained" value={summary.xpGained} />
          <SummaryStat label="Items out" value={summary.itemValueExtracted} />
          <SummaryStat label="Gold lost" value={summary.goldLost} />
        </div>
      </header>

      {summary.reason === "dead" && (
        <Card title="What Might Have Been" variant="warm">
          <p className="muted">Next time is made from this.</p>
          <div className="summary-stat-grid">
            <SummaryStat label="Raid value lost" value={summary.raidValueLost} />
            <SummaryStat label="Total value lost" value={summary.itemValueLost + summary.goldLost} />
          </div>
          <p>{describeDeathExtraction(summary)}</p>
        </Card>
      )}

      <Card title="Loot Extracted">
        <ItemList
          items={summary.lootExtracted}
          empty="Nothing extracted. The village stash did not grow."
        />
      </Card>

      <Card title="Loot Lost">
        <ItemList
          items={summary.lootLost}
          empty="No raid-pack loot was lost."
        />
      </Card>

      <Card title="Gear Lost">
        <ItemList
          items={summary.gearLost}
          empty="No equipped gear was lost."
        />
      </Card>

      <Card title="Quest Progress">
        {summary.questProgress.length === 0 ? (
          <em>No tracked quest progress this run.</em>
        ) : (
          <ul className="quest-list">
            {summary.questProgress.map(quest => (
              <li key={quest.questId}>
                <strong>{quest.title}</strong>
                <div className="muted">
                  {quest.beforeCount} → {quest.afterCount} / {quest.requiredCount} · {quest.status}
                </div>
              </li>
            ))}
          </ul>
        )}
        {summary.questsCompleted.length > 0 && (
          <p className="msg">{summary.questsCompleted.length} quest{summary.questsCompleted.length === 1 ? "" : "s"} ready to turn in.</p>
        )}
      </Card>

      <Card title="NPC Unlocks">
        {summary.unlocksApplied.length === 0 ? (
          <em>No village unlocks applied from this run.</em>
        ) : (
          <ul className="quest-list">
            {summary.unlocksApplied.map((unlock, index) => <li key={index}>{unlock}</li>)}
          </ul>
        )}
      </Card>

      <div className="summary-actions">
        <Button onClick={() => goToScreen("village")}>Return to Village</Button>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ItemList({ items, empty }: { items: RunSummary["lootExtracted"]; empty: string }) {
  if (items.length === 0) return <em>{empty}</em>;
  return (
    <div className="inv-items">
      {items.map(item => <ItemCard key={item.instanceId} item={item} compact />)}
    </div>
  );
}

function describeDeathExtraction(summary: RunSummary): string {
  const dist = summary.deathExtractionDistance;
  if (dist === undefined) {
    return "No extraction existed that could have saved this run.";
  }
  if (dist === 0) {
    return "You fell on the extraction stair itself.";
  }
  const knownPart = summary.deathExtractionKnown
    ? "An extraction you had already scouted"
    : "An extraction you hadn't found yet";
  const roomWord = dist === 1 ? "room" : "rooms";
  return `${knownPart} was ${dist} ${roomWord} away.`;
}
