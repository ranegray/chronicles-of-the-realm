// Pure view-model derivation for DelveScreen: turns a DelveRunState into the
// ordered list of choices the narrative column's foot should render. No
// React here — kept pure and unit-testable (src/tests/delveScreenChoices.test.ts)
// separately from the component that renders it.
//
// Priority, per docs/design/the-delve.md Pillar 4 and issue #37:
//   1. An active encounter's options (+ fight stances, since applyDelveAction's
//      fightBeat resolves a beat regardless of whether "fight" was chosen from
//      the decision set first — see friction note in the PR description).
//   2. Pending loot in the current room.
//   3. Otherwise: exits as prose lines, plus contextual actions.
import { getPlace } from "../game/delve/place";
import type {
  DelveRunState,
  Direction,
  EncounterOptionKind,
  FightStance,
  PlaceExit,
  PlaceExtract,
  SenseTag
} from "../game/delve/types";

export type DelveChoice =
  | { kind: "encounterOption"; optionKind: EncounterOptionKind; label: string; available: boolean; unavailableReason?: string }
  | { kind: "fightStance"; stance: FightStance; label: string }
  | { kind: "takeAllLoot"; label: string }
  | { kind: "leaveLoot"; label: string }
  | { kind: "move"; direction: Direction; label: string }
  | { kind: "search"; label: string }
  | { kind: "listen"; label: string }
  | { kind: "refillLamp"; label: string }
  | { kind: "consultMap"; label: string }
  | { kind: "crank"; extractId: string; label: string }
  | { kind: "extract"; extractId: string; label: string }
  | { kind: "descend"; stairRoomId: string; label: string };

const SENSE_TEXT: Record<SenseTag, string> = {
  tallow: "tallow smoke",
  warmAir: "warm air",
  coldDraft: "a cold draft",
  waterSound: "the sound of water",
  greaseSmell: "the smell of old grease",
  rotSmell: "the smell of rot",
  silence: "a dead silence",
  chittering: "faint chittering",
  lightBeyond: "a hint of light beyond",
  narrowSqueeze: "a narrow squeeze"
};

const DIRECTION_LABELS: Record<Direction, string> = {
  north: "North",
  east: "East",
  south: "South",
  west: "West",
  up: "Up",
  down: "Down"
};

const FIGHT_STANCE_LABELS: Record<FightStance, string> = {
  press: "Press the attack",
  guard: "Guard",
  breakAway: "Break away"
};

function exitButtonLabel(state: DelveRunState, roomId: string, exit: PlaceExit): string {
  const senses = (exit.senses ?? []).map(s => SENSE_TEXT[s]).join(", ");
  const doorState = state.doorOverrides[`${roomId}:${exit.direction}`];
  let label = `${DIRECTION_LABELS[exit.direction]} — ${senses || "a way on"}`;
  if (doorState === "locked") label += " (locked)";
  else if (doorState === "jammed") label += " (jammed)";
  else if (doorState === "shut") label += " (shut)";
  return label;
}

/** Every place extract co-located with the current room. */
function extractsInCurrentRoom(state: DelveRunState): PlaceExtract[] {
  const place = getPlace(state.placeId);
  const floor = place.floors.find(f => f.floor === state.floor);
  if (!floor) return [];
  return floor.extracts.filter(e => e.roomId === state.currentRoomId);
}

function crankOrExtractChoices(state: DelveRunState): DelveChoice[] {
  const choices: DelveChoice[] = [];
  for (const extract of extractsInCurrentRoom(state)) {
    if (extract.condition === "cranked") {
      const required = extract.cranksRequired ?? 1;
      const done = state.cranksDone[extract.id] ?? 0;
      if (done < required) {
        choices.push({
          kind: "crank",
          extractId: extract.id,
          label: `Crank the winch (${done}/${required})`
        });
        continue;
      }
    }
    choices.push({ kind: "extract", extractId: extract.id, label: extract.label });
  }
  return choices;
}

/**
 * Whether a next floor exists to descend to. There is no authored "this is
 * the stair" marker on PlaceRoom/PlaceFloor (see friction notes) — descend is
 * offered from any room on a floor once a next floor exists, matching
 * applyDelveAction's own permissiveness (it only checks the target floor
 * exists and the player is standing in the room named as `stairRoomId`).
 */
function hasNextFloor(state: DelveRunState): boolean {
  const place = getPlace(state.placeId);
  return place.floors.some(f => f.floor === state.floor + 1);
}

export function buildChoiceList(state: DelveRunState): DelveChoice[] {
  if (state.status !== "active") return [];

  const encounter = state.activeEncounter;
  if (encounter) {
    const choices: DelveChoice[] = [];
    for (const option of encounter.options) {
      if (option.kind === "fight") continue; // realized via stance buttons below
      choices.push({
        kind: "encounterOption",
        optionKind: option.kind,
        label: option.label,
        available: option.available,
        unavailableReason: option.unavailableReason
      });
    }
    for (const stance of ["press", "guard", "breakAway"] as const) {
      choices.push({ kind: "fightStance", stance, label: FIGHT_STANCE_LABELS[stance] });
    }
    return choices;
  }

  const pool = state.pendingLoot[state.currentRoomId];
  if (pool && (pool.items.length > 0 || pool.gold > 0)) {
    return [
      { kind: "takeAllLoot", label: "Take All" },
      { kind: "leaveLoot", label: "Leave the Rest" }
    ];
  }

  const place = getPlace(state.placeId);
  const floor = place.floors.find(f => f.floor === state.floor);
  const room = floor?.rooms.find(r => r.id === state.currentRoomId);
  const choices: DelveChoice[] = [];

  if (room) {
    for (const exit of room.exits) {
      choices.push({ kind: "move", direction: exit.direction, label: exitButtonLabel(state, room.id, exit) });
    }
  }

  if (!state.searchedRoomIds.includes(state.currentRoomId)) {
    choices.push({ kind: "search", label: "Search" });
  }
  choices.push({ kind: "listen", label: "Listen" });
  if (state.lamp.flasksPacked > 0) {
    choices.push({ kind: "refillLamp", label: "Refill the lamp" });
  }
  if (state.hasMapItem && state.lamp.oil > 0) {
    choices.push({ kind: "consultMap", label: "Consult the map" });
  }

  choices.push(...crankOrExtractChoices(state));

  if (hasNextFloor(state)) {
    choices.push({ kind: "descend", stairRoomId: state.currentRoomId, label: "Descend" });
  }

  return choices;
}
