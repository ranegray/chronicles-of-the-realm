import { Card } from "../components/Card";
import { ItemCard } from "../components/ItemCard";
import { StatBlock } from "../components/StatBlock";
import type { EquipmentSlots } from "../game/types";
import { useGameStore } from "../store/gameStore";

const EQUIPMENT_LABELS: Record<keyof EquipmentSlots, string> = {
  weapon: "Weapon",
  offhand: "Offhand",
  armor: "Armor",
  trinket1: "Trinket I",
  trinket2: "Trinket II"
};

export function CharacterScreen() {
  const player = useGameStore(s => s.state.player);
  const run = useGameStore(s => s.state.activeRun);

  if (!player) return <div className="screen">No character.</div>;

  const hpPct = Math.round((player.hp / player.maxHp) * 100);

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

        <Card title="Loadout" subtitle={run ? "At risk until extraction" : "Safe in the village"}>
          <div className="equipment-grid">
            {(Object.keys(EQUIPMENT_LABELS) as Array<keyof EquipmentSlots>).map(slot => {
              const item = player.equipped[slot];
              return (
                <div className="equipment-slot" key={slot}>
                  <div className="equipment-slot-header">
                    <strong>{EQUIPMENT_LABELS[slot]}</strong>
                  </div>
                  {item ? <ItemCard item={item} compact /> : <em className="muted">Empty</em>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
