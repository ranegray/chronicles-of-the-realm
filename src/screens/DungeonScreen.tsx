import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DungeonLog } from "../components/DungeonLog";
import { ThreatMeter } from "../components/ThreatMeter";
import { useGameStore } from "../store/gameStore";
import { getRoomById } from "../game/dungeonGenerator";
import { getBiome } from "../data/biomes";
import { calculateInventoryWeight } from "../game/inventory";
import { RUN_RULES } from "../game/constants";
import type { Character, DungeonRoom, DungeonRun, VillageState } from "../game/types";
import { getRoomRevealPreview, type RoomRevealPreview } from "../game/reveal";
import { nextStepToKnownExtraction } from "../game/pathing";

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
  const village = useGameStore(s => s.state.village);
  const moveToRoom = useGameStore(s => s.moveToRoom);
  const search = useGameStore(s => s.searchRoom);
  const loot = useGameStore(s => s.lootRoom);
  const extract = useGameStore(s => s.attemptExtract);
  const descend = useGameStore(s => s.descendDungeon);
  const abandon = useGameStore(s => s.abandonRun);
  const lastMessage = useGameStore(s => s.lastRoomMessage);
  const engage = useGameStore(s => s.engageCurrentRoomCombat);
  const goToScreen = useGameStore(s => s.goToScreen);

  if (!run || !player) return <div className="screen">No active run.</div>;
  const current = getRoomById(run.roomGraph, run.currentRoomId);
  if (!current) return <div className="screen">Lost in the dark…</div>;

  const biome = getBiome(run.biome);
  const adjacents = current.connectedRoomIds
    .map(id => getRoomById(run.roomGraph, id))
    .filter(Boolean) as ReturnType<typeof getRoomById>[];
  const exitCount = Math.min(adjacents.length, 4);
  const raidWeight = calculateInventoryWeight(run.raidInventory);
  const carryCapacity = player.derivedStats.carryCapacity;
  const packValue = calculateInventoryValue(run.raidInventory);
  const unchartedRooms = run.roomGraph.filter(room => !run.visitedRoomIds.includes(room.id)).length;
  const extractionDistance = nearestKnownExtractionDistance(run, current.id);
  const extractionText = extractionDistance === undefined
    ? "No known extraction"
    : extractionDistance === 0
      ? "Extraction here"
      : `Extraction ${extractionDistance} room${extractionDistance === 1 ? "" : "s"} back`;
  const woundedWithLoot = player.hp <= Math.floor(player.maxHp * 0.75) && packValue >= 18;
  const nearbyExtractionStepId = nextStepToKnownExtraction(run, current.id);
  const pressureActive = woundedWithLoot && extractionDistance !== undefined && extractionDistance <= 2;

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

      <ThreatMeter threat={run.threat} />

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
            {current.type === "boss" && current.completed && run.tier < RUN_RULES.maxDungeonDepth && (
              <Button variant="secondary" onClick={descend}>Descend</Button>
            )}
            {current.type === "boss" && current.completed && run.tier >= RUN_RULES.maxDungeonDepth && (
              <span className="muted small">No deeper stair opens.</span>
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
                    <ExitLabel
                      room={r}
                      character={player}
                      village={village}
                      isBearingExit={r.id === nearbyExtractionStepId}
                    />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status" subtitle={`HP ${player.hp} / ${player.maxHp}`}>
          <div className="status-row status-row-wrap">
            <span>Armor {player.derivedStats.armor}</span>
            <span>Acc +{player.derivedStats.accuracy}</span>
            <span>Eva {player.derivedStats.evasion}</span>
            <span>Pack {raidWeight}/{carryCapacity}</span>
            <span>{run.raidInventory.gold} g</span>
            <span>Value {packValue}</span>
            <span>{unchartedRooms} uncharted</span>
            <span className={pressureActive ? "extraction-urgent" : undefined}>{extractionText}</span>
          </div>
          {pressureActive && (
            <ExtractionPressureBanner
              hp={player.hp}
              maxHp={player.maxHp}
              packValue={packValue}
              extractionDistance={extractionDistance!}
            />
          )}
          <div className="room-actions">
            <Button variant="secondary" onClick={() => goToScreen("character")}>Character</Button>
            <Button variant="secondary" onClick={() => goToScreen("stash")}>Inventory</Button>
            <Button variant="ghost" onClick={() => goToScreen("quests")}>Quests</Button>
          </div>
        </Card>

        <Card title="Dungeon Map" subtitle={`${run.visitedRoomIds.length}/${run.roomGraph.length} rooms charted`}>
          <DungeonMap run={run} current={current} onMove={moveToRoom} />
        </Card>

        <Card title="Dungeon Log" subtitle={`${run.dungeonLog.length} event${run.dungeonLog.length === 1 ? "" : "s"}`}>
          <DungeonLog entries={run.dungeonLog} />
        </Card>
      </div>
    </div>
  );
}

function ExitLabel({
  room,
  character,
  village,
  isBearingExit
}: {
  room: DungeonRoom;
  character: Character;
  village?: VillageState;
  isBearingExit: boolean;
}) {
  const preview = getRoomRevealPreview({ room, character, village });
  const bearing = isBearingExit
    ? <span className="exit-bearing" title="Toward nearest known extraction">→ Exit</span>
    : null;

  if (room.visited) {
    return (
      <>
        {`${room.title} · ${TYPE_LABELS[room.type] ?? room.type}`}
        {room.dangerRating > 0 && ` · D${room.dangerRating}`}
        {bearing}
      </>
    );
  }

  return (
    <>
      {describeUnscoutedRoom(room, preview)}
      {bearing}
    </>
  );
}

function describeUnscoutedRoom(room: DungeonRoom, preview: RoomRevealPreview): string {
  const fragments: string[] = [];
  if (preview.knowsType) {
    fragments.push(TYPE_LABELS[room.type] ?? room.type);
  } else {
    fragments.push("Unscouted");
  }
  if (preview.knowsDanger) {
    fragments.push(`Danger ~${room.dangerRating}`);
  }
  if (preview.trapWarning && !preview.knowsType) {
    fragments.push("Trap ahead?");
  }
  if (preview.sourceLabel) {
    fragments.push(`(${preview.sourceLabel})`);
  }
  return fragments.join(" · ");
}

function ExtractionPressureBanner({
  hp,
  maxHp,
  packValue,
  extractionDistance
}: {
  hp: number;
  maxHp: number;
  packValue: number;
  extractionDistance: number;
}) {
  const hpPct = Math.round((hp / maxHp) * 100);
  const subject = extractionDistance === 0
    ? "Stand on the stair and leave."
    : extractionDistance === 1
      ? "The exit is one room away."
      : `The exit is ${extractionDistance} rooms away.`;
  return (
    <div className="run-pressure-banner" role="status" aria-live="polite">
      <strong>Bloodied and packed.</strong>
      <span> HP {hpPct}%. Raid value {packValue}. {subject} Push or leave?</span>
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

function calculateInventoryValue(inv: DungeonRun["raidInventory"]): number {
  return inv.gold + inv.items.reduce((sum, item) => sum + item.value * item.quantity, 0);
}

function nearestKnownExtractionDistance(run: DungeonRun, currentRoomId: string): number | undefined {
  const queue: Array<{ id: string; distance: number }> = [{ id: currentRoomId, distance: 0 }];
  const seen = new Set<string>([currentRoomId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const room = getRoomById(run.roomGraph, current.id);
    if (!room) continue;
    if (room.extractionPoint && run.visitedRoomIds.includes(room.id)) {
      return current.distance;
    }
    for (const connectedId of room.connectedRoomIds) {
      if (seen.has(connectedId) || !run.visitedRoomIds.includes(connectedId)) continue;
      seen.add(connectedId);
      queue.push({ id: connectedId, distance: current.distance + 1 });
    }
  }

  return undefined;
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
