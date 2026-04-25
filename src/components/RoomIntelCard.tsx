import type { DungeonRoom, RoomSignTag, ScoutedRoomInfo } from "../game/types";
import { describeSign } from "../data/roomSigns";

const TYPE_LABELS: Record<string, string> = {
  entrance: "Entrance",
  combat: "Combat",
  eliteCombat: "Elite",
  treasure: "Cache",
  trap: "Trap",
  shrine: "Shrine",
  npcEvent: "Voice",
  questObjective: "Objective",
  lockedChest: "Chest",
  extraction: "Extraction",
  boss: "Boss",
  empty: "Quiet"
};

const DANGER_BAND_LABELS: Record<string, string> = {
  safe: "Safe",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  severe: "Severe",
  unknown: "Unknown"
};

export interface RoomIntelCardProps {
  room: DungeonRoom;
  intel?: ScoutedRoomInfo;
  direction: string;
  onMove: (roomId: string) => void;
  isBearingExit?: boolean;
}

export function RoomIntelCard({ room, intel, direction, onMove, isBearingExit }: RoomIntelCardProps) {
  const summary = summarize(room, intel);
  const detail = detailText(room, intel);
  const classes = [
    "exit-tile",
    room.visited ? "exit-tile-visited" : "exit-tile-unvisited",
    isBearingExit ? "exit-tile-bearing" : ""
  ].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} onClick={() => onMove(room.id)} title={detail}>
      <span className="exit-tile-dir">{direction}</span>
      <span className="exit-tile-label">{summary}</span>
      {isBearingExit && <span className="exit-tile-bearing" aria-hidden="true">↑</span>}
    </button>
  );
}

function summarize(room: DungeonRoom, intel?: ScoutedRoomInfo): string {
  if (room.visited) {
    return TYPE_LABELS[room.type] ?? room.type;
  }
  if (!intel) return "Unknown";
  if (intel.shownType) return TYPE_LABELS[intel.shownType] ?? intel.shownType;
  if (intel.likelyTypes.length > 0) {
    const names = intel.likelyTypes.map(t => TYPE_LABELS[t] ?? t).slice(0, 2);
    return `Maybe ${names.join("/")}`;
  }
  if (intel.dangerBand !== "unknown") return `Signs · ${DANGER_BAND_LABELS[intel.dangerBand]}`;
  return "Signs";
}

function detailText(room: DungeonRoom, intel?: ScoutedRoomInfo): string {
  const parts: string[] = [];
  if (room.visited) {
    parts.push(`${room.title} · ${TYPE_LABELS[room.type] ?? room.type}`);
    if (room.dangerRating > 0) parts.push(`Danger ${room.dangerRating}`);
    return parts.join(" · ");
  }
  if (!intel) return "Unknown passage";
  if (intel.shownType) {
    parts.push(TYPE_LABELS[intel.shownType] ?? intel.shownType);
  } else if (intel.likelyTypes.length > 0) {
    const names = intel.likelyTypes.map(t => TYPE_LABELS[t] ?? t).slice(0, 3);
    parts.push(`Maybe ${names.join(" or ")}`);
  }
  if (intel.dangerBand !== "unknown") {
    parts.push(`Danger: ${DANGER_BAND_LABELS[intel.dangerBand]}`);
  }
  if (intel.signs.length > 0) {
    const signsText = intel.signs.map((sign: RoomSignTag) => describeSign(sign)).join(", ");
    parts.push(`Signs: ${signsText}`);
  }
  if (intel.warning) parts.push(intel.warning);
  return parts.join(" · ");
}
