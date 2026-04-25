import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ItemTooltip } from "../components/ItemTooltip";
import { MaterialInventory } from "../components/MaterialInventory";
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
  const title = success ? "Returned Alive" : summary.reason === "dead" ? "Lost Below" : "Run Abandoned";
  const state = success ? "success" : summary.reason === "dead" ? "lost" : "abandoned";
  const protectedItems = getDynamicItemList(summary, "protectedItems", "protectedReturned", "returnedToStash");
  const brokenItems = getDynamicItemList(summary, "brokenItems", "gearBroken", "broken");
  const outcomeText = describeRunOutcome(summary, protectedItems.length, brokenItems.length);

  return (
    <div className="screen summary-screen">
      <header className={`summary-hero summary-hero-${state}`}>
        <div className="summary-hero-main">
          <span className="summary-hero-eyebrow">Depth {summary.tier} · {summary.roomsVisited} rooms · {summary.roomsCompleted} cleared</span>
          <h1>{title}</h1>
          <p>{outcomeText}</p>
          <p className="muted">{summary.reasonText}</p>
        </div>
        <div className="summary-hero-stats">
          <SummaryStat label="Gold gained" value={summary.goldGained} />
          <SummaryStat label="XP gained" value={summary.xpGained} />
          <SummaryStat label="Items out" value={summary.itemValueExtracted} />
          <SummaryStat label="Gold lost" value={summary.goldLost} />
        </div>
      </header>

      <div className="summary-scroll">
      {summary.reason === "dead" && (
        <Card title="The Way Out" variant="warm">
          <p className="muted">The last route tells you what the next delve must survive.</p>
          <div className="summary-stat-grid">
            <SummaryStat label="Raid value lost" value={summary.raidValueLost} />
            <SummaryStat label="Total value lost" value={summary.itemValueLost + summary.goldLost} />
          </div>
          <p>{describeDeathExtraction(summary)}</p>
        </Card>
      )}

      <Card title="What Came Home">
        {hasMaterials(summary.materialsExtracted) && (
          <div className="summary-materials">
            <MaterialInventory materials={summary.materialsExtracted} compact />
          </div>
        )}
        <ItemList
          items={summary.lootExtracted}
          empty={hasMaterials(summary.materialsExtracted) ? "No item loot came home." : "Nothing extracted. The village stash did not grow."}
        />
      </Card>

      <Card title="What Stayed Below">
        {hasMaterials(summary.materialsLost) && (
          <div className="summary-materials">
            <MaterialInventory materials={summary.materialsLost} compact />
          </div>
        )}
        <ItemList
          items={summary.lootLost}
          empty={hasMaterials(summary.materialsLost) ? "No item loot was lost." : "No raid-pack loot was lost."}
        />
      </Card>

      <Card title="Gear Left Behind">
        <ItemList
          items={summary.gearLost}
          empty="No equipped gear was lost."
        />
      </Card>

      {(protectedItems.length > 0 || brokenItems.length > 0) && (
        <Card title="Item Fate">
          {protectedItems.length > 0 && (
            <>
              <h4 className="good">Protected</h4>
              <ItemList items={protectedItems} empty="No protected items returned." />
            </>
          )}
          {brokenItems.length > 0 && (
            <>
              <h4 className="danger">Broken</h4>
              <ItemList items={brokenItems} empty="No fragile items broke." />
            </>
          )}
        </Card>
      )}

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
      </div>

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

function hasMaterials(materials: RunSummary["materialsExtracted"]): boolean {
  return Object.values(materials ?? {}).some(amount => amount && amount > 0);
}

function ItemList({ items, empty }: { items: RunSummary["lootExtracted"]; empty: string }) {
  if (items.length === 0) return <em>{empty}</em>;
  return (
    <div className="inv-items">
      {items.map(item => <ItemTooltip key={item.instanceId} item={item} />)}
    </div>
  );
}

function getDynamicItemList(summary: RunSummary, ...keys: string[]): RunSummary["lootExtracted"] {
  const dynamic = summary as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = dynamic[key];
    if (Array.isArray(value)) return value as RunSummary["lootExtracted"];
  }
  return [];
}

function describeRunOutcome(summary: RunSummary, protectedCount: number, brokenCount: number): string {
  if (summary.reason === "extracted" || summary.reason === "debugExtracted") {
    const itemWord = summary.lootExtracted.length === 1 ? "item" : "items";
    const materialCount = countMaterials(summary.materialsExtracted);
    const materialWord = materialCount === 1 ? "material" : "materials";
    return summary.lootExtracted.length > 0 || summary.goldGained > 0 || materialCount > 0
      ? `You made it back with ${summary.goldGained} gold, ${summary.lootExtracted.length} ${itemWord}, and ${materialCount} ${materialWord}.`
      : "You made it back alive, but the pack came home light.";
  }
  if (summary.reason === "dead") {
    const protectedText = protectedCount > 0
      ? ` ${protectedCount} protected item${protectedCount === 1 ? "" : "s"} found the way home.`
      : "";
    const brokenText = brokenCount > 0
      ? ` ${brokenCount} fragile item${brokenCount === 1 ? "" : "s"} broke below.`
      : "";
    return `The dungeon kept the raid pack.${protectedText}${brokenText}`;
  }
  return "You turned back before the delve could be settled.";
}

function countMaterials(materials: RunSummary["materialsExtracted"]): number {
  return Object.values(materials ?? {}).reduce((sum, amount) => sum + (amount ?? 0), 0);
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
