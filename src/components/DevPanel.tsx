import { useMemo, useState } from "react";
import { Button } from "./Button";
import type { RunSummary } from "../game/types";
import { useGameStore } from "../store/gameStore";

export function DevPanel() {
  const [showJson, setShowJson] = useState(false);
  const state = useGameStore(s => s.state);
  const newGame = useGameStore(s => s.newGame);
  const debugGenerateDungeonSeed = useGameStore(s => s.debugGenerateDungeonSeed);
  const debugGiveGold = useGameStore(s => s.debugGiveGold);
  const debugHealPlayer = useGameStore(s => s.debugHealPlayer);
  const debugSpawnTestLoot = useGameStore(s => s.debugSpawnTestLoot);
  const debugKillPlayer = useGameStore(s => s.debugKillPlayer);
  const debugForceExtraction = useGameStore(s => s.debugForceExtraction);
  const debugCompleteQuest = useGameStore(s => s.debugCompleteQuest);

  const metrics = useMemo(() => calculateRunMetrics(state.runSummaries), [state.runSummaries]);
  const saveJson = useMemo(() => JSON.stringify(state, null, 2), [state]);

  return (
    <details className="dev-panel">
      <summary>Dev</summary>
      <div className="dev-panel-body">
        <div className="dev-actions">
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Delete the current local save and start a new game?")) newGame();
            }}
          >
            New Game
          </Button>
          <Button variant="secondary" onClick={debugGenerateDungeonSeed}>New Seed</Button>
          <Button variant="secondary" onClick={debugGiveGold}>+100 Gold</Button>
          <Button variant="secondary" onClick={debugHealPlayer}>Heal</Button>
          <Button variant="secondary" onClick={debugSpawnTestLoot}>Spawn Loot</Button>
          <Button variant="danger" onClick={debugKillPlayer} disabled={!state.activeRun}>Kill Player</Button>
          <Button variant="danger" onClick={debugForceExtraction} disabled={!state.activeRun}>Force Extract</Button>
          <Button variant="secondary" onClick={debugCompleteQuest} disabled={!state.village}>Complete Quest</Button>
          <Button variant="ghost" onClick={() => setShowJson(value => !value)}>Save JSON</Button>
        </div>

        <div className="dev-metrics">
          <span>Runs {metrics.totalRuns}</span>
          <span>Death {metrics.deathRate}</span>
          <span>Avg extract rooms {metrics.avgRoomsBeforeExtraction}</span>
          <span>Avg death rooms {metrics.avgRoomsBeforeDeath}</span>
          <span>Avg gold out {metrics.avgGoldExtracted}</span>
          <span>Avg item value out {metrics.avgItemValueExtracted}</span>
          <span>Ignored quests {metrics.questIgnoredRate}</span>
          <span>Immediate extracts {metrics.immediateExtractRate}</span>
          <span>Never extracted {metrics.neverExtractRate}</span>
        </div>

        {showJson && <textarea className="dev-save-json" readOnly value={saveJson} />}
      </div>
    </details>
  );
}

function calculateRunMetrics(summaries: RunSummary[]) {
  const totalRuns = summaries.length;
  const extracted = summaries.filter(summary =>
    summary.reason === "extracted" || summary.reason === "debugExtracted"
  );
  const deaths = summaries.filter(summary => summary.reason === "dead");
  const neverExtracted = summaries.filter(summary => summary.reason === "dead" || summary.reason === "abandoned");
  const immediateExtracts = extracted.filter(summary => summary.roomsVisited <= 2);
  const ignoredQuestRuns = summaries.filter(summary =>
    summary.questProgress.some(quest => quest.beforeCount === quest.afterCount)
  );

  return {
    totalRuns,
    deathRate: formatPercent(deaths.length, totalRuns),
    avgRoomsBeforeExtraction: formatAverage(extracted.map(summary => summary.roomsVisited)),
    avgRoomsBeforeDeath: formatAverage(deaths.map(summary => summary.roomsVisited)),
    avgGoldExtracted: formatAverage(extracted.map(summary => summary.goldGained)),
    avgItemValueExtracted: formatAverage(extracted.map(summary => summary.itemValueExtracted)),
    questIgnoredRate: formatPercent(ignoredQuestRuns.length, totalRuns),
    immediateExtractRate: formatPercent(immediateExtracts.length, totalRuns),
    neverExtractRate: formatPercent(neverExtracted.length, totalRuns)
  };
}

function formatAverage(values: number[]): string {
  if (values.length === 0) return "0";
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return avg.toFixed(avg >= 10 ? 0 : 1);
}

function formatPercent(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}
