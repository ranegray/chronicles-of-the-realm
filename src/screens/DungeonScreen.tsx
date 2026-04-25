import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DungeonLog } from "../components/DungeonLog";
import { EventChoicePanel } from "../components/EventChoicePanel";
import { ExtractionPanel } from "../components/ExtractionPanel";
import { GearRiskBadge } from "../components/GearRiskBadge";
import { Tooltip } from "../components/Tooltip";
import { useGameStore } from "../store/gameStore";
import { getRoomById } from "../game/dungeonGenerator";
import { getBiome } from "../data/biomes";
import { calculateInventoryWeight } from "../game/inventory";
import { RUN_RULES } from "../game/constants";
import { getThreatLabel } from "../game/threat";
import type { ActiveTrap, DungeonRoom, DungeonRun, RoomSignTag, ScoutedRoomInfo } from "../game/types";
import type { ItemWithV4Fields } from "../components/v04UiTypes";
import { SEARCH_RULES } from "../game/constants";
import { getTrapTemplate } from "../data/trapTables";
import { getEventTemplate } from "../data/eventTemplates";
import { describeSign } from "../data/roomSigns";

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
  const disarm = useGameStore(s => s.disarmTrap);
  const chooseEvent = useGameStore(s => s.chooseRoomEventOption);
  const loot = useGameStore(s => s.lootRoom);
  const extract = useGameStore(s => s.attemptExtract);
  const continueExtract = useGameStore(s => s.continueExtraction);
  const descend = useGameStore(s => s.descendDungeon);
  const abandon = useGameStore(s => s.abandonRun);
  const lastMessage = useGameStore(s => s.lastRoomMessage);
  const engage = useGameStore(s => s.engageCurrentRoomCombat);

  // Threat-rise glow: pulse the mood word for ~1.8s when threat level climbs.
  const threatLevel = run?.threat.level ?? 0;
  const prevThreat = useRef<number | null>(null);
  const [moodRising, setMoodRising] = useState(false);
  useEffect(() => {
    if (prevThreat.current === null) {
      prevThreat.current = threatLevel;
      return;
    }
    if (threatLevel > prevThreat.current) {
      setMoodRising(true);
      const t = window.setTimeout(() => setMoodRising(false), 1800);
      prevThreat.current = threatLevel;
      return () => window.clearTimeout(t);
    }
    prevThreat.current = threatLevel;
  }, [threatLevel]);

  if (!run || !player) return <div className="screen">No active run.</div>;
  const current = getRoomById(run.roomGraph, run.currentRoomId);
  if (!current) return <div className="screen">Lost in the dark…</div>;

  const biome = getBiome(run.biome);
  const exitCount = Math.min(current.connectedRoomIds.length, 4);
  const raidWeight = calculateInventoryWeight(run.raidInventory);
  const carryCapacity = player.derivedStats.carryCapacity;
  const packValue = calculateInventoryValue(run.raidInventory);
  const unchartedRooms = run.roomGraph.filter(room => !run.visitedRoomIds.includes(room.id)).length;
  const riskyItems = [
    ...Object.values(player.equipped).filter(Boolean),
    ...run.raidInventory.items
  ].filter(item => (((item as ItemWithV4Fields).states ?? []).filter(state => state.id !== "normal").length > 0));

  const threatMood = getThreatLabel(run.threat.level);
  const lowHp = player.hp / player.maxHp <= 0.25;

  return (
    <div className="screen dungeon-screen">
      {lowHp && <div className="low-hp-vignette" aria-hidden="true" />}
      <header className="dungeon-header">
        <div className="dungeon-header-title">
          <span className="dungeon-header-eyebrow" title={`Seed: ${run.seed}`}>
            Depth {run.tier} · {biome.name} · <span className={`dungeon-header-mood dungeon-header-mood-${run.threat.level}${moodRising ? " dungeon-header-mood-rising" : ""}`}>{threatMood}</span>
          </span>
          <h2>{current.title}</h2>
          <p className="muted">{biome.description}</p>
        </div>
        <div className="dungeon-actions">
          <Button variant="danger" onClick={() => {
            if (confirm("Abandon the run? You will lose carried loot.")) abandon();
          }}>Abandon Run</Button>
        </div>
      </header>

      <div className="dungeon-hud">
        <div className="dungeon-hud-hp">
          <span className="dungeon-hud-label">HP</span>
          <div className="hp-bar hp-bar-compact" style={{ width: 160 }}>
            <div
              className="hp-bar-fill"
              style={{ width: `${Math.round((player.hp / player.maxHp) * 100)}%` }}
            />
            <span className="hp-bar-label">{player.hp} / {player.maxHp}</span>
          </div>
        </div>
        <span className="dungeon-hud-chip"><em>Pack</em> {raidWeight}/{carryCapacity}</span>
        <span className="dungeon-hud-chip"><em>Gold</em> {run.raidInventory.gold}</span>
        <span className="dungeon-hud-chip"><em>Value</em> {packValue}</span>
        <span className="dungeon-hud-chip"><em>Uncharted</em> {unchartedRooms}</span>
      </div>

      <div className="dungeon-grid dungeon-grid-noexits">
        <Card title={current.title} subtitle={`${TYPE_LABELS[current.type] ?? current.type} · Danger ${current.dangerRating} · ${exitCount}/4 exits`} variant={current.dangerRating > 2 ? "danger" : "default"}>
          <p>{current.description}</p>
          {current.trapId && <p className="warn">Trap detected: {current.trapId}</p>}
          {lastMessage && <p className="msg">{lastMessage}</p>}

          {current.activeEvent && (
            <EventChoicePanel
              event={current.activeEvent}
              definition={tryEventTemplate(current.activeEvent.eventId) ?? fallbackDefinition(current.activeEvent.eventId)}
              character={player}
              run={run}
              onChoose={chooseEvent}
            />
          )}

          <div className="room-actions">
            {current.activeEvent && !current.activeEvent.resolved ? null : (
            <>
            {(current.type === "treasure" || current.type === "lockedChest" || current.type === "shrine") && !current.activeEvent && (
              <>
                <Button onClick={search}>Search</Button>
                <Button variant="secondary" onClick={loot}>Take All</Button>
              </>
            )}
            {(current.type === "combat" || current.type === "boss" || current.type === "eliteCombat") && !current.completed && (
              <Button onClick={engage}>Engage</Button>
            )}
            {(current.type === "trap" || current.type === "empty" ||
              (current.completed && (current.type === "combat" || current.type === "eliteCombat" || current.type === "boss")) ||
              current.type === "extraction"
            ) && canStillSearch(current) && (
              <Button onClick={search}>{searchLabelFor(current)}</Button>
            )}
            {current.activeTrap?.detected && !current.activeTrap.disarmed && !current.activeTrap.triggered && (
              <Button variant="secondary" onClick={disarm}>Disarm Trap</Button>
            )}
            {current.extractionPoint && !current.extraction && (
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
            {current.type === "npcEvent" && !current.activeEvent && (
              <Button onClick={search}>Listen</Button>
            )}
            </>
            )}
          </div>
          {current.activeTrap && (
            <TrapStatus trap={current.activeTrap} />
          )}
          {current.extraction && (
            <ExtractionPanel
              run={run}
              character={player}
              room={current}
              onActivate={extract}
              onContinue={continueExtract}
            />
          )}
        </Card>

        <Card title="Dungeon Map" subtitle={`${run.visitedRoomIds.length}/${run.roomGraph.length} rooms charted · Hover for intel`}>
          <DungeonMap run={run} current={current} onMove={moveToRoom} />
        </Card>

        <Card title="Dungeon Log" subtitle={`${run.dungeonLog.length} event${run.dungeonLog.length === 1 ? "" : "s"}`}>
          <DungeonLog entries={run.dungeonLog} />
        </Card>

        {riskyItems.length > 0 && (
          <Card title="Gear Risk" subtitle="Visible item states affecting this delve">
            <ul className="risk-item-list">
              {riskyItems.map(item => (
                <li key={item!.instanceId}>
                  <strong>{item!.name}</strong>
                  <GearRiskBadge states={(item as ItemWithV4Fields).states} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function canStillSearch(room: DungeonRoom): boolean {
  const count = room.searchState?.searchCount ?? 0;
  return count < SEARCH_RULES.maxSearchesPerRoom;
}

function searchLabelFor(room: DungeonRoom): string {
  if (room.activeTrap?.detected && !room.activeTrap.disarmed && !room.activeTrap.triggered) {
    return "Search Again";
  }
  if (room.type === "trap") return "Search for Traps";
  return "Search";
}

function TrapStatus({ trap }: { trap: ActiveTrap }) {
  const template = tryTrapTemplate(trap.trapId);
  if (trap.triggered) {
    return <p className="warn">The {template?.name.toLowerCase() ?? "trap"} has been sprung.</p>;
  }
  if (trap.disarmed) {
    return <p className="msg">The {template?.name.toLowerCase() ?? "trap"} is defused.</p>;
  }
  if (trap.detected) {
    return (
      <p className="warn">
        {template?.name ?? "A trap"} — detected. Try to disarm, or leave it to rest.
      </p>
    );
  }
  return null;
}

function tryTrapTemplate(id: string) {
  try { return getTrapTemplate(id); } catch { return undefined; }
}

function tryEventTemplate(id: string) {
  try { return getEventTemplate(id); } catch { return undefined; }
}

function fallbackDefinition(id: string) {
  return {
    id,
    type: "obstacle" as const,
    title: "Something Happens",
    description: "The moment passes without drama.",
    minTier: 1,
    maxTier: 5,
    weight: 0,
    choices: []
  };
}

const DANGER_BAND_LABELS: Record<string, string> = {
  safe: "Safe",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  severe: "Severe",
  unknown: "Unknown"
};

function RoomTooltip({
  room,
  intel,
  isVisited,
  isCurrent,
  direction
}: {
  room: DungeonRoom;
  intel?: ScoutedRoomInfo;
  isVisited: boolean;
  isCurrent: boolean;
  direction: string;
}) {
  const title = isVisited
    ? `${room.title}`
    : intel?.shownType
      ? TYPE_LABELS[intel.shownType] ?? "Unknown"
      : intel && intel.likelyTypes.length > 0
        ? `Maybe ${intel.likelyTypes.map(t => TYPE_LABELS[t] ?? t).slice(0, 2).join(" or ")}`
        : "Unscouted passage";
  const rows: Array<{ label: string; value: string }> = [];
  if (direction) rows.push({ label: "Bearing", value: direction });
  if (isVisited) {
    rows.push({ label: "Type", value: TYPE_LABELS[room.type] ?? room.type });
    if (room.dangerRating > 0) rows.push({ label: "Danger", value: `${room.dangerRating}` });
  } else if (intel) {
    if (intel.dangerBand !== "unknown") {
      rows.push({ label: "Danger", value: DANGER_BAND_LABELS[intel.dangerBand] ?? intel.dangerBand });
    }
    if (intel.signs.length > 0) {
      rows.push({
        label: "Signs",
        value: intel.signs.map((sign: RoomSignTag) => describeSign(sign)).join(", ")
      });
    }
  }
  return (
    <>
      <span className="tooltip-title">{title}</span>
      {isCurrent && <span className="tooltip-row muted small">You are here.</span>}
      {rows.map(r => (
        <span className="tooltip-row" key={r.label}><em>{r.label}</em> {r.value}</span>
      ))}
      {!isVisited && !intel && (
        <span className="tooltip-row muted small">No intel yet.</span>
      )}
      {isVisited && room.description && (
        <span className="tooltip-row muted small">{room.description}</span>
      )}
    </>
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
          const direction = getDirectionLabel(current, room);
          const intel = run.knownRoomIntel[room.id];
          const tooltipContent = (
            <RoomTooltip
              room={room}
              intel={intel}
              isVisited={isVisited}
              isCurrent={room.id === current.id}
              direction={room.id === current.id ? "Here" : direction}
            />
          );

          const tile = canTravel ? (
            <button
              type="button"
              className={className}
              onClick={() => onMove(room.id)}
            >
              {label}
            </button>
          ) : (
            <div className={className}>{label}</div>
          );

          return (
            <Tooltip
              key={room.id}
              content={tooltipContent}
              placement="top"
              as="div"
              className="map-room-anchor"
              style={{ gridColumn: col, gridRow: row }}
            >
              {tile}
            </Tooltip>
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
