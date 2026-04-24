import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { InventoryList } from "../components/InventoryList";
import { useGameStore } from "../store/gameStore";
import { getRoomById } from "../game/dungeonGenerator";
import { getBiome } from "../data/biomes";
import type { DungeonRoom, DungeonRun } from "../game/types";

const TYPE_LABELS: Record<string, string> = {
  entrance: "Entrance",
  combat: "Combat",
  eliteCombat: "Elite",
  treasure: "Treasure",
  trap: "Trap",
  shrine: "Shrine",
  npcEvent: "Voice",
  questObjective: "Objective",
  lockedChest: "Chest",
  extraction: "Extraction",
  boss: "Boss",
  empty: "Quiet"
};

const TYPE_MARKS: Record<string, string> = {
  entrance: "E",
  combat: "C",
  eliteCombat: "!",
  treasure: "$",
  trap: "T",
  shrine: "+",
  npcEvent: "V",
  questObjective: "Q",
  lockedChest: "L",
  extraction: "X",
  boss: "B",
  empty: "."
};

export function DungeonScreen() {
  const run = useGameStore(s => s.state.activeRun);
  const player = useGameStore(s => s.state.player);
  const moveToRoom = useGameStore(s => s.moveToRoom);
  const search = useGameStore(s => s.searchRoom);
  const loot = useGameStore(s => s.lootRoom);
  const extract = useGameStore(s => s.attemptExtract);
  const descend = useGameStore(s => s.descendDungeon);
  const abandon = useGameStore(s => s.abandonRun);
  const lastMessage = useGameStore(s => s.lastRoomMessage);
  const engage = useGameStore(s => s.engageCurrentRoomCombat);

  if (!run || !player) return <div className="screen">No active run.</div>;
  const current = getRoomById(run.roomGraph, run.currentRoomId);
  if (!current) return <div className="screen">Lost in the dark…</div>;

  const biome = getBiome(run.biome);
  const adjacents = current.connectedRoomIds
    .map(id => getRoomById(run.roomGraph, id))
    .filter(Boolean) as ReturnType<typeof getRoomById>[];
  const exitCount = Math.min(adjacents.length, 4);

  return (
    <div className="screen dungeon-screen">
      <header className="dungeon-header">
        <div>
          <h2>{biome.name}</h2>
          <p className="muted">{biome.description}</p>
          <p className="muted small">Seed: <code>{run.seed}</code> · Tier {run.tier}</p>
        </div>
        <div className="dungeon-actions">
          <Button variant="danger" onClick={() => {
            if (confirm("Abandon the run? You will lose carried loot.")) abandon();
          }}>Abandon Run</Button>
        </div>
      </header>

      <div className="dungeon-grid">
        <Card title={current.title} subtitle={`Danger ${current.dangerRating} · Exits ${exitCount}/4`} variant={current.dangerRating > 2 ? "danger" : "default"}>
          <p>{current.description}</p>
          <p className="muted">Type: {TYPE_LABELS[current.type] ?? current.type}</p>
          {current.trapId && <p className="warn">Trap: {current.trapId}</p>}
          {lastMessage && <p className="msg">{lastMessage}</p>}

          <div className="room-actions">
            {(current.type === "treasure" || current.type === "lockedChest" || current.type === "shrine") && (
              <>
                <Button onClick={search}>Search</Button>
                <Button variant="secondary" onClick={loot}>Take All</Button>
              </>
            )}
            {(current.type === "combat" || current.type === "boss" || current.type === "eliteCombat") && !current.completed && (
              <Button onClick={engage}>Engage</Button>
            )}
            {current.extractionPoint && (
              <Button onClick={extract}>Extract</Button>
            )}
            {current.type === "boss" && current.completed && (
              <Button variant="secondary" onClick={descend}>Descend</Button>
            )}
            {current.type === "questObjective" && (
              <Button onClick={search}>Investigate</Button>
            )}
            {current.type === "npcEvent" && (
              <Button onClick={search}>Listen</Button>
            )}
          </div>
        </Card>

        <Card title="Exits" subtitle={`${exitCount}/4 attached rooms`}>
          {adjacents.length === 0 ? <em>Dead end.</em> : (
            <ul className="adjacent-list">
              {adjacents.map(r => r && (
                <li key={r.id}>
                  <Button variant="ghost" onClick={() => moveToRoom(r.id)}>
                    <span className="exit-direction">{getDirectionLabel(current, r)}</span>
                    {r.visited ? `${r.title} · ${TYPE_LABELS[r.type] ?? r.type}` : "Unscouted room"}
                    {r.dangerRating > 0 && r.visited && ` · D${r.dangerRating}`}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Adventurer" subtitle={`HP ${player.hp} / ${player.maxHp}`}>
          <div className="status-row">
            <span>Armor {player.derivedStats.armor}</span>
            <span>Acc +{player.derivedStats.accuracy}</span>
            <span>Eva {player.derivedStats.evasion}</span>
          </div>
          <p className="muted">Carry: {Math.round(player.derivedStats.carryCapacity)}</p>
        </Card>

        <Card title="Raid Pack" subtitle={`${run.raidInventory.gold} g`}>
          <InventoryList inventory={run.raidInventory} capacity={player.derivedStats.carryCapacity} emptyText="Empty for now." />
        </Card>

        <Card title="Dungeon Map" subtitle={`${run.visitedRoomIds.length}/${run.roomGraph.length} rooms charted`}>
          <DungeonMap run={run} current={current} onMove={moveToRoom} />
        </Card>
      </div>
    </div>
  );
}

interface MapPosition {
  x: number;
  y: number;
}

interface DungeonMapProps {
  run: DungeonRun;
  current: DungeonRoom;
  onMove: (roomId: string) => void;
}

function DungeonMap({ run, current, onMove }: DungeonMapProps) {
  const positions = buildRoomPositions(run.roomGraph);
  const visitedIds = new Set(run.visitedRoomIds);
  const visibleRoomIds = new Set<string>(run.visitedRoomIds);

  for (const room of run.roomGraph) {
    if (!visitedIds.has(room.id)) continue;
    for (const connectedId of room.connectedRoomIds) {
      visibleRoomIds.add(connectedId);
    }
  }
  visibleRoomIds.add(current.id);

  const visibleRooms = run.roomGraph.filter(room => visibleRoomIds.has(room.id));
  const bounds = getMapBounds(visibleRooms, positions);
  const columns = (bounds.maxX - bounds.minX) * 2 + 1;
  const rows = (bounds.maxY - bounds.minY) * 2 + 1;

  const baseCells = [];
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= columns; col++) {
      baseCells.push(
        <div
          key={`base-${col}-${row}`}
          className="map-base-cell"
          style={{ gridColumn: col, gridRow: row }}
        />
      );
    }
  }

  const corridors = buildVisibleCorridors(run.roomGraph, visibleRoomIds, positions, bounds);

  return (
    <div className="dungeon-map-wrap">
      <div
        className="dungeon-map-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 34px)`,
          gridTemplateRows: `repeat(${rows}, 34px)`
        }}
      >
        {baseCells}
        {corridors.map(corridor => (
          <div
            key={corridor.key}
            className={[
              "map-corridor",
              corridor.horizontal ? "map-corridor-horizontal" : "map-corridor-vertical",
              corridor.frontier ? "map-corridor-frontier" : ""
            ].filter(Boolean).join(" ")}
            style={{ gridColumn: corridor.col, gridRow: corridor.row }}
          />
        ))}
        {visibleRooms.map(room => {
          const pos = positions.get(room.id)!;
          const canTravel = current.connectedRoomIds.includes(room.id);
          const isVisited = visitedIds.has(room.id);
          const col = (pos.x - bounds.minX) * 2 + 1;
          const row = (pos.y - bounds.minY) * 2 + 1;
          const className = [
            "map-room",
            room.id === current.id ? "map-room-current" : "",
            isVisited ? "map-room-visited" : "map-room-frontier",
            room.completed ? "map-room-done" : "",
            room.extractionPoint && isVisited ? "map-room-extract" : "",
            room.type === "boss" && isVisited ? "map-room-boss" : "",
            canTravel ? "map-room-travel" : ""
          ].filter(Boolean).join(" ");
          const label = isVisited ? TYPE_MARKS[room.type] ?? "?" : "?";
          const title = isVisited
            ? `${room.title} (${TYPE_LABELS[room.type] ?? room.type})`
            : "Unscouted room";

          if (canTravel) {
            return (
              <button
                key={room.id}
                type="button"
                className={className}
                style={{ gridColumn: col, gridRow: row }}
                onClick={() => onMove(room.id)}
                title={title}
              >
                {label}
              </button>
            );
          }

          return (
            <div
              key={room.id}
              className={className}
              style={{ gridColumn: col, gridRow: row }}
              title={title}
            >
              {label}
            </div>
          );
        })}
      </div>
      <div className="map-legend" aria-hidden="true">
        <span><i className="legend-current" /> Current</span>
        <span><i className="legend-visited" /> Explored</span>
        <span><i className="legend-frontier" /> Fog</span>
      </div>
    </div>
  );
}

function buildRoomPositions(rooms: DungeonRoom[]): Map<string, MapPosition> {
  const positions = new Map<string, MapPosition>();
  const hasGeneratedPositions = rooms.every(room =>
    typeof room.mapX === "number" && typeof room.mapY === "number"
  );

  if (hasGeneratedPositions) {
    for (const room of rooms) {
      positions.set(room.id, { x: room.mapX!, y: room.mapY! });
    }
    return positions;
  }

  const columns = Math.ceil(Math.sqrt(rooms.length));
  rooms.forEach((room, index) => {
    positions.set(room.id, {
      x: index % columns,
      y: Math.floor(index / columns)
    });
  });
  return positions;
}

function getMapBounds(
  rooms: DungeonRoom[],
  positions: Map<string, MapPosition>
): { minX: number; minY: number; maxX: number; maxY: number } {
  const coords = rooms.map(room => positions.get(room.id)).filter(Boolean) as MapPosition[];
  if (coords.length === 0) {
    return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  }

  return {
    minX: Math.min(...coords.map(coord => coord.x)) - 1,
    minY: Math.min(...coords.map(coord => coord.y)) - 1,
    maxX: Math.max(...coords.map(coord => coord.x)) + 1,
    maxY: Math.max(...coords.map(coord => coord.y)) + 1
  };
}

function buildVisibleCorridors(
  rooms: DungeonRoom[],
  visibleRoomIds: Set<string>,
  positions: Map<string, MapPosition>,
  bounds: { minX: number; minY: number },
): Array<{ key: string; col: number; row: number; horizontal: boolean; frontier: boolean }> {
  const roomsById = new Map(rooms.map(room => [room.id, room]));
  const corridors = [];
  const seen = new Set<string>();

  for (const room of rooms) {
    if (!visibleRoomIds.has(room.id)) continue;
    const from = positions.get(room.id);
    if (!from) continue;

    for (const connectedId of room.connectedRoomIds) {
      if (!visibleRoomIds.has(connectedId)) continue;
      const neighbor = roomsById.get(connectedId);
      const to = positions.get(connectedId);
      if (!neighbor || !to) continue;

      const distance = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
      if (distance !== 1) continue;

      const key = [room.id, connectedId].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);

      corridors.push({
        key,
        col: ((from.x + to.x) / 2 - bounds.minX) * 2 + 1,
        row: ((from.y + to.y) / 2 - bounds.minY) * 2 + 1,
        horizontal: from.y === to.y,
        frontier: !room.visited || !neighbor.visited
      });
    }
  }

  return corridors;
}

function getDirectionLabel(from: DungeonRoom, to: DungeonRoom): string {
  if (
    typeof from.mapX !== "number" ||
    typeof from.mapY !== "number" ||
    typeof to.mapX !== "number" ||
    typeof to.mapY !== "number"
  ) {
    return "Passage";
  }

  const dx = to.mapX - from.mapX;
  const dy = to.mapY - from.mapY;
  if (dy === -1) return "North";
  if (dx === 1) return "East";
  if (dy === 1) return "South";
  if (dx === -1) return "West";
  return "Passage";
}
