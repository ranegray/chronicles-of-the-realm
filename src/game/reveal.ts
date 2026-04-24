import type { Character, DungeonRoom, VillageState } from "./types";

export interface RoomRevealPreview {
  /** Whether the room is visited. Visited always shows everything. */
  visited: boolean;
  /** Whether the player knows the danger rating of this room without visiting. */
  knowsDanger: boolean;
  /** Whether the player knows the room type of this room without visiting. */
  knowsType: boolean;
  /** Whether the player has a specific warning that this room is a trap. */
  trapWarning: boolean;
  /** Source descriptor for UI hover text, e.g. "Cartographer · Lv 2". */
  sourceLabel?: string;
}

const SOURCE_CARTOGRAPHER = "Cartographer";
const SOURCE_TRAP_SENSE = "Trap Sense";

/**
 * What the player can preview about an adjacent, unscouted room.
 *
 * - The Cartographer NPC gates passive map intel:
 *   - service 2+: danger rating of adjacent unscouted rooms
 *   - service 3+: type of adjacent unscouted rooms
 * - Character trap sense gives a specific warning on adjacent trap rooms.
 */
export function getRoomRevealPreview(args: {
  room: DungeonRoom;
  character: Character;
  village?: VillageState;
}): RoomRevealPreview {
  const { room, character, village } = args;
  if (room.visited) {
    return { visited: true, knowsDanger: true, knowsType: true, trapWarning: false };
  }

  const cartographerLevel = getCartographerServiceLevel(village);
  const knowsDanger = cartographerLevel >= 2;
  const knowsType = cartographerLevel >= 3;

  const trapSense = character.derivedStats.trapSense;
  const trapWarning = trapSense >= 2 && room.type === "trap";

  let sourceLabel: string | undefined;
  if (knowsType) {
    sourceLabel = `${SOURCE_CARTOGRAPHER} · Lv ${cartographerLevel}`;
  } else if (knowsDanger) {
    sourceLabel = `${SOURCE_CARTOGRAPHER} · Lv ${cartographerLevel}`;
  } else if (trapWarning) {
    sourceLabel = SOURCE_TRAP_SENSE;
  }

  return { visited: false, knowsDanger, knowsType, trapWarning, sourceLabel };
}

function getCartographerServiceLevel(village?: VillageState): number {
  if (!village) return 1;
  const cartographer = village.npcs.find(npc => npc.role === "cartographer");
  return cartographer?.serviceLevel ?? 0;
}
