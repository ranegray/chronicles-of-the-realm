import type { DungeonRoom, RoomSignTag, ScoutedRoomInfo } from "../game/types";
import { Button } from "./Button";
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
  return (
    <Button variant="ghost" onClick={() => onMove(room.id)}>
      <span className="exit-direction">{direction}</span>
      {room.visited ? (
        <VisitedLabel room={room} />
      ) : intel ? (
        <ScoutedLabel room={room} intel={intel} />
      ) : (
        <UnknownLabel />
      )}
      {isBearingExit && (
        <span className="exit-bearing" title="Toward nearest known extraction">→ Exit</span>
      )}
    </Button>
  );
}

function VisitedLabel({ room }: { room: DungeonRoom }) {
  const typeLabel = TYPE_LABELS[room.type] ?? room.type;
  return (
    <span className="exit-label">
      {room.title} · {typeLabel}
      {room.dangerRating > 0 && ` · D${room.dangerRating}`}
    </span>
  );
}

function ScoutedLabel({ room, intel }: { room: DungeonRoom; intel: ScoutedRoomInfo }) {
  const parts: string[] = [];

  if (intel.shownType) {
    parts.push(TYPE_LABELS[intel.shownType] ?? intel.shownType);
  } else if (intel.likelyTypes.length > 0) {
    const names = intel.likelyTypes.map(t => TYPE_LABELS[t] ?? t).slice(0, 3);
    parts.push(`Maybe ${names.join(" or ")}`);
  } else if (intel.knowledgeLevel === "signsOnly") {
    parts.push("Unscouted");
  } else if (intel.knowledgeLevel === "dangerKnown") {
    parts.push("Unscouted");
  } else {
    parts.push("Unknown passage");
  }

  if (intel.dangerBand !== "unknown") {
    parts.push(`Danger: ${DANGER_BAND_LABELS[intel.dangerBand] ?? intel.dangerBand}`);
  }

  if (intel.signs.length > 0) {
    const signsText = intel.signs.map((sign: RoomSignTag) => describeSign(sign)).join(", ");
    parts.push(`Signs: ${signsText}`);
  }

  const sourceLabel = intel.knowledgeLevel === "exactType"
    ? "Scouted"
    : intel.knowledgeLevel === "likelyType"
      ? "Scouted"
      : intel.knowledgeLevel === "dangerKnown"
        ? "Rough read"
        : "Faint signs";

  void room;

  return (
    <span className="exit-label">
      {parts.join(" · ")}
      {intel.warning && <span className="warn"> — {intel.warning}</span>}
      <span className="muted small"> ({sourceLabel})</span>
    </span>
  );
}

function UnknownLabel() {
  return <span className="exit-label">Unknown passage</span>;
}
