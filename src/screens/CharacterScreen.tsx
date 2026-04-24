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

  return (
    <div className="screen character-screen">
      <header className="screen-header">
        <div>
          <h2>{player.name}</h2>
          <p className="muted">Level {player.level} {capitalize(player.ancestryId)} {capitalize(player.classId)}</p>
        </div>
      </header>

      <div className="character-grid">
        <Card title="Stats" subtitle={`${player.xp} XP`}>
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
                  {item ? <ItemCard item={item} compact /> : <em>Empty</em>}
                </div>
              );
            })}
          </div>
        </Card>

        {run && (
          <Card title="Current Delve" subtitle={`Depth ${run.tier}`}>
            <p className="muted">Biome: {run.biome}</p>
            <p className="muted">Rooms charted: {run.visitedRoomIds.length} / {run.roomGraph.length}</p>
            <p className="muted">Carried gold: {run.raidInventory.gold}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
