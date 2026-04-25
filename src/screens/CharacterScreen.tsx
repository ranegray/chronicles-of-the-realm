import { useState } from "react";
import { Card } from "../components/Card";
import { BuildSummaryPanel } from "../components/BuildSummaryPanel";
import { Button } from "../components/Button";
import { LoadoutBuilder } from "../components/LoadoutBuilder";
import { StatBlock } from "../components/StatBlock";
import { TalentPointSummary } from "../components/TalentPointSummary";
import { useGameStore } from "../store/gameStore";
import { TalentScreen } from "./TalentScreen";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";
import { generateBuildSummary } from "../game/buildMath";

export function CharacterScreen() {
  const player = useGameStore(s => s.state.player);
  const run = useGameStore(s => s.state.activeRun);
  const village = useGameStore(s => s.state.village);
  const learnTalent = useGameStore(s => s.learnTalent);
  const refundTalents = useGameStore(s => s.refundTalents);
  const [showTalents, setShowTalents] = useState(false);

  if (!player) return <div className="screen">No character.</div>;

  const hpPct = Math.round((player.hp / player.maxHp) * 100);
  const summary = generateBuildSummary({
    character: player,
    ancestry: getAncestry(player.ancestryId),
    classDefinition: getClass(player.classId)
  });

  if (showTalents) {
    return (
      <div className="screen character-screen">
        <TalentScreen
          character={player}
          village={village}
          onLearnTalent={learnTalent}
          onRefundTalents={refundTalents}
          onClose={() => setShowTalents(false)}
        />
      </div>
    );
  }

  return (
    <div className="screen character-screen">
      <header className="character-hero">
        <div className="character-hero-main">
          <span className="character-hero-eyebrow">Level {player.level} {capitalize(player.ancestryId)} {capitalize(player.classId)}</span>
          <h1>{player.name}</h1>
          <div className="character-hero-hp">
            <div className={`hp-bar ${hpPct <= 25 ? "hp-bar-low" : hpPct <= 50 ? "hp-bar-mid" : ""}`} style={{ maxWidth: 320 }}>
              <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
              <span className="hp-bar-label">HP {player.hp} / {player.maxHp}</span>
            </div>
            <span className="muted small">{player.xp} XP</span>
          </div>
          <div className="character-hero-actions">
            <TalentPointSummary character={player} />
            <Button variant="secondary" onClick={() => setShowTalents(true)}>Talents</Button>
          </div>
        </div>
        {run && (
          <div className="character-hero-delve">
            <span className="delve-hero-place-name">On Delve</span>
            <div className="character-delve-meta">
              <span><em>Depth</em> {run.tier}</span>
              <span><em>Charted</em> {run.visitedRoomIds.length} / {run.roomGraph.length}</span>
              <span><em>Carried</em> {run.raidInventory.gold} g</span>
            </div>
          </div>
        )}
      </header>

      <div className="character-grid">
        <Card title="Stats">
          <StatBlock character={player} />
        </Card>

        <Card title="Build Summary" subtitle="Stats, gear risk, and class identity">
          <BuildSummaryPanel summary={summary} />
        </Card>

        <Card title="Loadout" subtitle={run ? "At risk until extraction" : "Safe in the village"}>
          <LoadoutBuilder character={player} readOnly activeRun={Boolean(run)} />
        </Card>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
