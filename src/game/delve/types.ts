// Shared contracts for the Delve run engine (v0.5 rebuild).
// See docs/design/the-delve.md. These types are the interface between the
// engine core (lamp/noise/hunters/delveRun), authored place data, and the UI.

import type { ItemInstance } from "../types";

// ---------------------------------------------------------------------------
// Places (authored, fixed layouts)
// ---------------------------------------------------------------------------

export type Direction = "north" | "east" | "south" | "west" | "up" | "down";

/** Sensory tag rendered as prose on an exit line ("warm air, tallow smell"). */
export type SenseTag =
  | "tallow" | "warmAir" | "coldDraft" | "waterSound" | "greaseSmell"
  | "rotSmell" | "silence" | "chittering" | "lightBeyond" | "narrowSqueeze";

export interface PlaceExit {
  direction: Direction;
  to: string; // room id
  /** One-way exits (drops, chutes) cannot be traversed backwards. */
  oneWay?: boolean;
  /** Pool the per-run population draws from; omitted = always open. */
  doorStates?: Array<"open" | "shut" | "lockable" | "jammable">;
  senses?: SenseTag[];
}

export interface PlaceRoom {
  id: string;
  name: string;
  /** Prose variants; population picks one per run. */
  prose: string[];
  landmark?: boolean;
  exits: PlaceExit[];
  /** Loot table id from the existing loot system; omitted = no loot spawn. */
  lootTableId?: string;
  /** Eligible hunter spawn point. */
  hunterSpawn?: boolean;
  /** Eligible supply cache location (oil, rations). */
  supplySpawn?: boolean;
}

export type ExtractConditionKind =
  | "alwaysOpen"
  | "closesAtAlertness" // closes when alertness >= level
  | "waterClock"        // open only while run.waterClock > 0
  | "cranked";          // requires `cranksRequired` crank actions, each loud

export interface PlaceExtract {
  id: string;
  roomId: string;
  label: string;
  condition: ExtractConditionKind;
  /** For closesAtAlertness. */
  alertnessLevel?: number;
  /** For cranked. */
  cranksRequired?: number;
}

export interface Place {
  id: string;
  name: string;
  /** Biome id linking to existing bestiary/loot voice. */
  biome: string;
  floors: PlaceFloor[];
}

export interface PlaceFloor {
  floor: number;
  entranceRoomId: string;
  rooms: PlaceRoom[];
  extracts: PlaceExtract[];
  /** Room count the validator asserts (guards against authoring slips). */
  hunterBudget: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Lamp
// ---------------------------------------------------------------------------

export type LightState = "bright" | "dim" | "dark";

export interface LampState {
  oil: number;        // current units
  capacity: number;   // default 20
  flasksPacked: number; // refills carried (each weight 2 in pack)
}

export type OilAction =
  | "move" | "search" | "listen" | "encounterBeat" | "disarm"
  | "crank" | "consultMap";

// ---------------------------------------------------------------------------
// Noise & hunters
// ---------------------------------------------------------------------------

export interface NoiseEvent {
  roomId: string;
  loudness: number; // hunter hears if loudness >= graph distance to it
  cause: "move" | "search" | "fightBeat" | "lockwork" | "flee" | "crank" | "other";
}

export type HunterState = "dormant" | "roaming" | "drawn" | "hunting";

export interface Hunter {
  id: string;
  enemyId: string;    // existing bestiary id
  roomId: string;
  state: HunterState;
  /** Room id of the last noise it heard (drawn state target). */
  heardAt?: string;
}

/** What the player perceives after a tick; rendered as directional prose. */
export interface HunterSignal {
  hunterId: string;
  direction: Direction | "here" | "near";
  distance: 0 | 1 | 2;
  /** e.g. "dragging", "chittering" — derived from enemy definition tags. */
  texture: string;
}

// ---------------------------------------------------------------------------
// Encounters (inline, beat-based)
// ---------------------------------------------------------------------------

export type EncounterOptionKind =
  | "fight" | "slipPast" | "fallBack" | "parley" | "throwRations" | "lure";

export interface EncounterOption {
  kind: EncounterOptionKind;
  label: string;       // diegetic, e.g. "Slip along the far wall"
  available: boolean;
  unavailableReason?: string; // e.g. "Too heavy", "No light to slip by"
}

export type FightStance = "press" | "guard" | "breakAway";

export interface EncounterBeatResult {
  prose: string[];          // narrative lines for the column
  playerHpDelta: number;
  enemyHpDelta: number;
  noise: NoiseEvent;
  over: boolean;
  outcome?: "won" | "escaped" | "dead";
}

export interface ActiveEncounter {
  hunterId: string;
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  beat: number;             // 1-based
  options: EncounterOption[];
  log: string[];
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

export interface DelveRunState {
  placeId: string;
  floor: number;
  seed: string;
  currentRoomId: string;
  visitedRoomIds: string[];
  lamp: LampState;
  hunters: Hunter[];
  /** Alertness points; levels reuse THREAT_RULES thresholds. */
  alertness: number;
  waterClock: number; // actions remaining before the flooded stair closes
  cranksDone: Record<string, number>; // extractId -> cranks so far
  /** Per-run population results. */
  doorOverrides: Record<string, "shut" | "locked" | "jammed">; // "roomId:direction"
  pendingLoot: Record<string, { items: ItemInstance[]; gold: number; materials: Record<string, number> }>;
  activeEncounter?: ActiveEncounter;
  hasMapItem: boolean;
  narrative: DelveNarrativeEntry[];
}

export interface DelveNarrativeEntry {
  id: string;
  kind: "room" | "sense" | "action" | "encounter" | "system";
  text: string;
}
