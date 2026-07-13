// The delve run state machine (Pillar 5) — the keystone tying lamp, noise,
// hunters, place, and encounters into one pure reducer. No React, no Zustand;
// the store slice composes this later. See docs/design/the-delve.md.
//
// Shape: createDelveRun(params) builds the initial DelveRunState;
// applyDelveAction(state, action, deps) is the single reducer-style entry
// point. Character stats/hp/inventory stay OUTSIDE this state — the engine
// reads a snapshot from deps and reports hp/inventory changes as events for
// the store to apply, which keeps it pure and directly testable.

import type {
  DelveAction,
  DelveActionResult,
  DelveNarrativeEntry,
  DelveRunDeps,
  DelveRunEvent,
  DelveRunState,
  DelveSupplyCache,
  Direction,
  EncounterOptionKind,
  Hunter,
  HunterSignal,
  NoiseEvent,
  PlaceExit,
  PlaceExtract,
  PlaceFloor,
  PlaceRoom,
  SenseTag
} from "./types";
import type { ItemInstance } from "../types";
import { createRng, makeId, type Rng } from "../rng";
import { getLightState, refillFromFlask, spendOil } from "./lamp";
import {
  bfsPath,
  emitNoise,
  graphDistance,
  moveNoiseLoudness,
  NOISE_LOUDNESS,
  type RoomAdjacency
} from "./noise";
import { tickHunters } from "./hunters";
import { buildAdjacency, getPlace, populateFloor } from "./place";
import { openEncounter, resolveFightBeat, resolveOption } from "./encounters";
import { getThreatLevelFromPoints } from "../threat";
import { DEPTH_RULES } from "../constants";
import { generateLootForRoomLootTableId, rollGold } from "../lootGenerator";
import { ENEMIES } from "../../data/enemies";

// ---------------------------------------------------------------------------
// Tuning constants (documented judgment calls)
// ---------------------------------------------------------------------------

/** Default global run timer: actions until the flooded stair closes. */
export const DEFAULT_WATER_CLOCK = 45;

/** Chance that one lockwork attempt opens a locked/jammed door. */
const LOCKWORK_SUCCESS_CHANCE = 0.65;

/** Chance a defeated hunter drops loot into the room's pending pool. */
const HUNTER_LOOT_DROP_CHANCE = 0.5;

/** Alertness level (THREAT_RULES "Hunting") that spawns a reinforcement. */
const REINFORCEMENT_ALERTNESS_LEVEL = 3;

/** How far "listen" reaches, vs. the passive 2-room hunter signals. */
const LISTEN_DISTANCE = 3;

// ---------------------------------------------------------------------------
// createDelveRun
// ---------------------------------------------------------------------------

export interface CreateDelveRunParams {
  placeId: string;
  seed: string;
  tier?: number;
  hasMapItem?: boolean;
  flasksPacked?: number;
  lampCapacity?: number;
  waterClock?: number;
}

export function createDelveRun(params: CreateDelveRunParams): DelveRunState {
  const {
    placeId,
    seed,
    tier = 1,
    hasMapItem = false,
    flasksPacked = 1,
    lampCapacity = 20,
    waterClock = DEFAULT_WATER_CLOCK
  } = params;

  const place = getPlace(placeId);
  const floor = floorData(place.id, 1);
  const rng = createRng(`${seed}:populate:1`);
  const populated = populateFloor({ floor, rng, tier });

  const hunters = spawnFloorHunters(floor, populated.hunterSpawnRoomIds, place.biome, tier, rng);

  const state: DelveRunState = {
    placeId,
    floor: 1,
    seed,
    tier,
    status: "active",
    actionCount: 0,
    currentRoomId: floor.entranceRoomId,
    cameFromRoomId: undefined,
    visitedRoomIds: [floor.entranceRoomId],
    lamp: { oil: lampCapacity, capacity: lampCapacity, flasksPacked },
    hunters,
    alertness: 0,
    waterClock,
    cranksDone: {},
    doorOverrides: populated.doorOverrides,
    roomProse: populated.roomProse,
    lootRoomIds: populated.lootRoomIds,
    searchedRoomIds: [],
    supplyCaches: populated.supplyRoomIds.map(s => ({ ...s, found: false })),
    pendingLoot: {},
    activeEncounter: undefined,
    hasMapItem,
    narrative: []
  };

  const ctx = makeCtx(state);
  appendRoomProse(ctx, floor.entranceRoomId, true);
  state.narrative = ctx.allNarrative;
  return state;
}

function spawnFloorHunters(
  floor: PlaceFloor,
  spawnRoomIds: string[],
  biome: string,
  tier: number,
  rng: Rng
): Hunter[] {
  const pool = enemyPoolFor(biome, tier, floor.floor);
  // populateFloor already rolled the count and rooms; spin the hunters up
  // directly so the budget roll isn't consumed twice.
  return spawnRoomIds.map((roomId): Hunter => ({
    id: makeId(rng, "hunter"),
    enemyId: rng.pickOne(pool),
    roomId,
    state: "dormant"
  }));
}

function enemyPoolFor(biome: string, tier: number, floor: number): string[] {
  const cap = Math.max(1, tier + floor - 1);
  const inTier = ENEMIES.filter(e => e.biome === biome && e.tier <= cap).map(e => e.id);
  if (inTier.length > 0) return inTier;
  const anyBiome = ENEMIES.filter(e => e.biome === biome).map(e => e.id);
  if (anyBiome.length > 0) return anyBiome;
  throw new Error(`No bestiary entries for biome "${biome}"`);
}

// ---------------------------------------------------------------------------
// Working context: collects narrative/events while building the next state
// ---------------------------------------------------------------------------

interface Ctx {
  state: DelveRunState; // a fresh mutable draft, never the caller's object
  narrative: DelveNarrativeEntry[]; // entries appended by this action
  allNarrative: DelveNarrativeEntry[];
  events: DelveRunEvent[];
  seq: number;
}

function makeCtx(state: DelveRunState): Ctx {
  // Shallow-clone the layers this reducer mutates; nested payloads
  // (ItemInstance, Hunter, narrative entries) are replaced, not mutated.
  const draft: DelveRunState = {
    ...state,
    lamp: { ...state.lamp },
    hunters: state.hunters.map(h => ({ ...h })),
    visitedRoomIds: [...state.visitedRoomIds],
    searchedRoomIds: [...state.searchedRoomIds],
    supplyCaches: state.supplyCaches.map(s => ({ ...s })),
    cranksDone: { ...state.cranksDone },
    doorOverrides: { ...state.doorOverrides },
    pendingLoot: Object.fromEntries(
      Object.entries(state.pendingLoot).map(([k, v]) => [
        k,
        { items: [...v.items], gold: v.gold, materials: { ...v.materials } }
      ])
    ),
    activeEncounter: state.activeEncounter
      ? { ...state.activeEncounter, options: [...state.activeEncounter.options], log: [...state.activeEncounter.log] }
      : undefined
  };
  return { state: draft, narrative: [], allNarrative: [...state.narrative], events: [], seq: 0 };
}

function say(ctx: Ctx, kind: DelveNarrativeEntry["kind"], text: string): void {
  const entry: DelveNarrativeEntry = {
    id: `n${ctx.state.actionCount}_${ctx.seq++}`,
    kind,
    text
  };
  ctx.narrative.push(entry);
  ctx.allNarrative.push(entry);
}

function finish(ctx: Ctx): DelveActionResult {
  ctx.state.narrative = ctx.allNarrative;
  return { state: ctx.state, narrative: ctx.narrative, events: ctx.events };
}

// ---------------------------------------------------------------------------
// Place helpers
// ---------------------------------------------------------------------------

function floorData(placeId: string, floor: number): PlaceFloor {
  const data = getPlace(placeId).floors.find(f => f.floor === floor);
  if (!data) throw new Error(`Place "${placeId}" has no floor ${floor}`);
  return data;
}

function roomById(floor: PlaceFloor, roomId: string): PlaceRoom {
  const room = floor.rooms.find(r => r.id === roomId);
  if (!room) throw new Error(`Unknown room "${roomId}" on floor ${floor.floor}`);
  return room;
}

function makeDirectionOf(floor: PlaceFloor): (from: string, to: string) => Direction | undefined {
  return (from, to) => roomById(floor, from).exits.find(e => e.to === to)?.direction;
}

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

function exitLine(state: DelveRunState, roomId: string, exit: PlaceExit): string {
  const senses = (exit.senses ?? []).map(s => SENSE_TEXT[s]).join(", ");
  const doorState = state.doorOverrides[`${roomId}:${exit.direction}`];
  let line = `To the ${exit.direction}, a way on`;
  if (senses) line += ` — ${senses}`;
  if (doorState === "locked") line += ". The door there is locked fast";
  else if (doorState === "jammed") line += ". The door there is jammed in its frame";
  else if (doorState === "shut") line += ". The door there is shut";
  return `${line}.`;
}

function appendRoomProse(ctx: Ctx, roomId: string, firstVisit: boolean): void {
  const floor = floorData(ctx.state.placeId, ctx.state.floor);
  const room = roomById(floor, roomId);
  if (firstVisit) {
    say(ctx, "room", `${room.name}. ${ctx.state.roomProse[roomId] ?? room.prose[0]}`);
  } else {
    say(ctx, "room", `${room.name}, again.`);
  }
  for (const exit of room.exits) {
    say(ctx, "sense", exitLine(ctx.state, roomId, exit));
  }
  const pool = ctx.state.pendingLoot[roomId];
  if (pool && (pool.items.length > 0 || pool.gold > 0)) {
    say(ctx, "sense", "What you left ungathered still lies here.");
  }
}

// ---------------------------------------------------------------------------
// Alertness, water clock, hunter tick — the shared per-action simulation step
// ---------------------------------------------------------------------------

const ESCALATION_LINES: Record<number, string> = {
  1: "Something is listening now.",
  2: "The halls begin to stir.",
  3: "Footsteps you don't own, drawing closer.",
  4: "You are being hunted.",
  5: "The dungeon wakes fully."
};

function hunterTexture(state: Hunter["state"]): string {
  switch (state) {
    case "hunting": return "closing in";
    case "drawn": return "moving toward you";
    case "roaming": return "shuffling about";
    case "dormant": return "still";
  }
}

function signalLine(signal: HunterSignal): string {
  if (signal.distance === 0) return "It is here, in the room with you.";
  const where = signal.direction === "near"
    ? "close by"
    : `to the ${signal.direction}`;
  const range = signal.distance === 1 ? "close" : "farther off";
  return `Something ${signal.texture} ${where}, ${range}.`;
}

/**
 * The cross-cutting per-action step: alertness rises by the loudness emitted,
 * escalation lines land at threshold crossings (with a reinforcement hunter
 * at Hunting), the water clock ticks down, and the hunter simulation runs.
 * Contact opens an encounter unless one is already active.
 * `excludeHunterId` skips one hunter this tick (it was just evaded/engaged).
 */
function applySimTick(
  ctx: Ctx,
  deps: DelveRunDeps,
  rng: Rng,
  noises: NoiseEvent[],
  excludeHunterId?: string
): void {
  const state = ctx.state;
  const floor = floorData(state.placeId, state.floor);
  const adjacency = buildAdjacency(floor);

  // Alertness only rises; points equal the loudness emitted this action.
  const emitted = noises.map(n => emitNoise(n));
  const gained = emitted.reduce((sum, n) => sum + n.loudness, 0);
  const previousLevel = getThreatLevelFromPoints(state.alertness);
  state.alertness += gained;
  const newLevel = getThreatLevelFromPoints(state.alertness);

  for (let level = previousLevel + 1; level <= newLevel; level++) {
    const line = ESCALATION_LINES[level];
    if (line) say(ctx, "system", line);
    ctx.events.push({ kind: "alertnessLevel", level });
    if (level === REINFORCEMENT_ALERTNESS_LEVEL) {
      spawnReinforcement(ctx, floor, adjacency, rng);
    }
  }

  // The water clock is a global, actions-based timer.
  if (state.waterClock > 0) {
    state.waterClock -= 1;
    if (state.waterClock === 0) {
      say(ctx, "system", "Somewhere below, water swallows stone. The flooded stair is drowning.");
    }
  }

  // Hunter simulation.
  const ticking = state.hunters.filter(h => h.id !== excludeHunterId);
  const held = state.hunters.filter(h => h.id === excludeHunterId);
  const result = tickHunters({
    hunters: ticking,
    adjacency,
    playerRoomId: state.currentRoomId,
    noises: emitted,
    alertnessLevel: newLevel,
    rng,
    directionOf: makeDirectionOf(floor)
  });
  state.hunters = [...result.hunters, ...held];

  if (!state.activeEncounter) {
    for (const signal of result.signals) {
      if (signal.distance === 0) continue; // contact handles distance 0
      say(ctx, "sense", signalLine(signal));
    }
    const contactId = result.contacts[0];
    if (contactId) {
      beginEncounter(ctx, deps, rng, contactId);
    }
  }
}

function spawnReinforcement(ctx: Ctx, floor: PlaceFloor, adjacency: RoomAdjacency, rng: Rng): void {
  const state = ctx.state;
  const place = getPlace(state.placeId);
  const nearEntrance = [floor.entranceRoomId, ...(adjacency[floor.entranceRoomId] ?? [])];
  const candidates = nearEntrance.filter(id => id !== state.currentRoomId);
  const roomId = rng.pickOne(candidates.length > 0 ? candidates : nearEntrance);
  const hunter: Hunter = {
    id: makeId(rng, "hunter"),
    enemyId: rng.pickOne(enemyPoolFor(place.biome, state.tier, state.floor)),
    roomId,
    state: "roaming"
  };
  state.hunters = [...state.hunters, hunter];
  say(ctx, "system", "From back toward the entrance: new voices, and they are not lost.");
  ctx.events.push({ kind: "reinforcement", hunterId: hunter.id, roomId });
}

// ---------------------------------------------------------------------------
// Encounter plumbing
// ---------------------------------------------------------------------------

function beginEncounter(ctx: Ctx, deps: DelveRunDeps, rng: Rng, hunterId: string): void {
  const state = ctx.state;
  const hunter = state.hunters.find(h => h.id === hunterId);
  if (!hunter) return;
  const floor = floorData(state.placeId, state.floor);
  const adjacency = buildAdjacency(floor);
  const encounter = openEncounter({
    hunter,
    character: deps.character,
    carriedItems: deps.carriedItems,
    lightState: getLightState(state.lamp),
    packRatio: packRatio(deps),
    cameFromRoomId: state.cameFromRoomId,
    alertnessLevel: getThreatLevelFromPoints(state.alertness),
    adjacentRoomIds: adjacency[state.currentRoomId] ?? [],
    rng: rng.forkChild(`open:${hunterId}`)
  });
  state.activeEncounter = encounter;
  for (const line of encounter.log) {
    say(ctx, "encounter", line);
  }
}

function packRatio(deps: DelveRunDeps): number {
  if (deps.carryCapacity <= 0) return 1;
  return deps.carriedWeight / deps.carryCapacity;
}

/** Shove an evaded hunter into an adjacent room; it lost track of you. */
function displaceHunter(ctx: Ctx, hunterId: string, rng: Rng): void {
  const state = ctx.state;
  const floor = floorData(state.placeId, state.floor);
  const adjacency = buildAdjacency(floor);
  state.hunters = state.hunters.map(h => {
    if (h.id !== hunterId) return h;
    const neighbors = adjacency[h.roomId] ?? [];
    const roomId = neighbors.length > 0 ? rng.pickOne(neighbors) : h.roomId;
    return { ...h, roomId, state: "roaming", heardAt: undefined };
  });
}

function movePlayer(ctx: Ctx, toRoomId: string): void {
  const state = ctx.state;
  state.cameFromRoomId = state.currentRoomId;
  state.currentRoomId = toRoomId;
  const firstVisit = !state.visitedRoomIds.includes(toRoomId);
  if (firstVisit) state.visitedRoomIds = [...state.visitedRoomIds, toRoomId];
  appendRoomProse(ctx, toRoomId, firstVisit);
}

function dropHunterLoot(ctx: Ctx, roomId: string, rng: Rng): void {
  const state = ctx.state;
  if (rng.nextFloat() >= HUNTER_LOOT_DROP_CHANCE) return;
  const floor = floorData(state.placeId, state.floor);
  const room = roomById(floor, roomId);
  const place = getPlace(state.placeId);
  const tableId = room.lootTableId ?? `loot_${place.biome === "goblinWarrens" ? "goblin" : place.biome}_t1`;
  let items: ItemInstance[] = [];
  try {
    items = generateLootForRoomLootTableId(tableId, rng.forkChild("drop"), 1, {
      tier: state.tier,
      source: "combat"
    });
  } catch {
    return; // no matching table for this biome — no drop
  }
  const gold = rollGold(rng, state.tier);
  addToPendingLoot(state, roomId, items, gold);
  say(ctx, "action", "It was carrying something worth stooping for.");
  ctx.events.push({ kind: "lootFound", roomId });
}

function addToPendingLoot(state: DelveRunState, roomId: string, items: ItemInstance[], gold: number): void {
  const existing = state.pendingLoot[roomId] ?? { items: [], gold: 0, materials: {} };
  state.pendingLoot = {
    ...state.pendingLoot,
    [roomId]: {
      items: [...existing.items, ...items],
      gold: existing.gold + gold,
      materials: existing.materials
    }
  };
}

// ---------------------------------------------------------------------------
// applyDelveAction
// ---------------------------------------------------------------------------

export function applyDelveAction(
  state: DelveRunState,
  action: DelveAction,
  deps: DelveRunDeps
): DelveActionResult {
  const ctx = makeCtx(state);
  ctx.state.actionCount += 1;
  ctx.seq = 0;
  const rng = createRng(`${state.seed}:action:${ctx.state.actionCount}:${action.type}`);

  if (ctx.state.status !== "active") {
    say(ctx, "system", ctx.state.status === "dead"
      ? "The run is over. The Warrens keep what they took."
      : "You are already out, under open sky.");
    return finish(ctx);
  }

  if (ctx.state.activeEncounter && action.type !== "encounterOption" && action.type !== "fightBeat") {
    say(ctx, "encounter", "It is between you and everything else. Deal with it first.");
    return finish(ctx);
  }

  switch (action.type) {
    case "move": return doMove(ctx, deps, rng, action.direction);
    case "search": return doSearch(ctx, deps, rng);
    case "listen": return doListen(ctx, deps, rng);
    case "takeLoot": return doTakeLoot(ctx, deps, action.itemInstanceId);
    case "takeAllLoot": return doTakeAllLoot(ctx, deps);
    case "leaveLoot": return doLeaveLoot(ctx);
    case "refillLamp": return doRefillLamp(ctx);
    case "consultMap": return doConsultMap(ctx);
    case "encounterOption": return doEncounterOption(ctx, deps, rng, action.kind);
    case "fightBeat": return doFightBeat(ctx, deps, rng, action.stance);
    case "crank": return doCrank(ctx, deps, rng, action.extractId);
    case "extract": return doExtract(ctx, action.extractId);
    case "descend": return doDescend(ctx, action.stairRoomId);
  }
}

// --- move --------------------------------------------------------------

function doMove(ctx: Ctx, deps: DelveRunDeps, rng: Rng, direction: Direction): DelveActionResult {
  const state = ctx.state;
  const floor = floorData(state.placeId, state.floor);
  const room = roomById(floor, state.currentRoomId);
  const exit = room.exits.find(e => e.direction === direction);

  if (!exit) {
    say(ctx, "system", `There is no way ${direction} from here.`);
    return finish(ctx);
  }

  const lightState = getLightState(state.lamp);
  const overrideKey = `${state.currentRoomId}:${direction}`;
  const doorState = state.doorOverrides[overrideKey];

  if (doorState === "locked" || doorState === "jammed") {
    // Lockwork: oil 2 ("disarm" on the oil track), noise 3, may fail.
    state.lamp = spendOil(state.lamp, "disarm");
    const noise: NoiseEvent = { roomId: state.currentRoomId, loudness: NOISE_LOUDNESS.lockwork, cause: "lockwork" };
    const succeeded = rng.nextFloat() < LOCKWORK_SUCCESS_CHANCE;
    if (succeeded) {
      delete state.doorOverrides[overrideKey];
      say(ctx, "action", doorState === "locked"
        ? "The lock gives with a grind of cheap iron, louder than you'd like."
        : "You lever the door out of its frame. The wood screams about it.");
      movePlayer(ctx, exit.to);
    } else {
      say(ctx, "action", doorState === "locked"
        ? "The pick slips. The lock rattles its complaint down the passage."
        : "The door doesn't budge, and the whole frame booms with the effort.");
    }
    applySimTick(ctx, deps, rng, [noise]);
    return finish(ctx);
  }

  if (doorState === "shut") {
    delete state.doorOverrides[overrideKey];
    say(ctx, "action", "You ease the door open.");
  }

  state.lamp = spendOil(state.lamp, "move");
  const noise: NoiseEvent = {
    roomId: exit.to,
    loudness: moveNoiseLoudness({ packRatio: packRatio(deps), lightState }),
    cause: "move"
  };
  movePlayer(ctx, exit.to);
  applySimTick(ctx, deps, rng, [noise]);
  return finish(ctx);
}

// --- search ------------------------------------------------------------

function doSearch(ctx: Ctx, deps: DelveRunDeps, rng: Rng): DelveActionResult {
  const state = ctx.state;
  const lightState = getLightState(state.lamp);

  if (lightState === "dark") {
    say(ctx, "system", "You can't search what you can't see. The dark gives nothing up.");
    return finish(ctx);
  }

  state.lamp = spendOil(state.lamp, "search");
  const roomId = state.currentRoomId;
  const noise: NoiseEvent = { roomId, loudness: NOISE_LOUDNESS.search, cause: "search" };

  if (state.searchedRoomIds.includes(roomId)) {
    say(ctx, "action", "You have already turned this room over. Nothing new.");
    applySimTick(ctx, deps, rng, [noise]);
    return finish(ctx);
  }
  state.searchedRoomIds = [...state.searchedRoomIds, roomId];

  let foundAnything = false;

  // Marked loot rooms roll from the existing loot system into the pending pool.
  if (state.lootRoomIds.includes(roomId)) {
    const floor = floorData(state.placeId, state.floor);
    const room = roomById(floor, roomId);
    if (room.lootTableId) {
      // Dim light: search yields worse (fewer items, less coin).
      const itemCount = lightState === "dim" ? 1 : rng.nextInt(1, 2);
      const items = generateLootForRoomLootTableId(room.lootTableId, rng.forkChild("loot"), itemCount, {
        tier: state.tier,
        source: "treasure"
      });
      let gold = rollGold(rng, state.tier);
      if (lightState === "dim") gold = Math.floor(gold / 2);
      addToPendingLoot(state, roomId, items, gold);
      say(ctx, "action", lightState === "dim"
        ? "In the guttering light you find some of what's hidden here — surely not all of it."
        : "Your hands find what the Warrens squirreled away here.");
      ctx.events.push({ kind: "lootFound", roomId });
      foundAnything = true;
    }
  }

  // Supply caches yield oil flasks / rations as items.
  const cache = state.supplyCaches.find(s => s.roomId === roomId && !s.found);
  if (cache) {
    cache.found = true;
    const item = cache.kind === "oilFlask" ? makeOilFlaskItem(rng) : makeRationsItem(rng);
    addToPendingLoot(state, roomId, [item], 0);
    say(ctx, "action", cache.kind === "oilFlask"
      ? "Tucked behind a loose brace: a stoppered flask of lamp oil."
      : "A bundle of rations, wrapped and forgotten.");
    ctx.events.push({ kind: "lootFound", roomId });
    foundAnything = true;
  }

  if (!foundAnything) {
    say(ctx, "action", "You turn the room over and come up with nothing but grime.");
  }

  applySimTick(ctx, deps, rng, [noise]);
  return finish(ctx);
}

function makeOilFlaskItem(rng: Rng): ItemInstance {
  return {
    instanceId: makeId(rng, "item"),
    templateId: "delve_oil_flask",
    name: "Oil Flask",
    category: "consumable",
    rarity: "common",
    description: "A stoppered flask of lamp oil. A full refill.",
    value: 10,
    weight: 2,
    stackable: true,
    quantity: 1,
    tags: ["oilFlask", "oil"],
    affixes: [],
    states: []
  };
}

function makeRationsItem(rng: Rng): ItemInstance {
  return {
    instanceId: makeId(rng, "item"),
    templateId: "consumable_trail_ration",
    name: "Trail Ration",
    category: "consumable",
    rarity: "common",
    description: "Hard bread, dried meat, a little salt.",
    value: 2,
    weight: 1,
    stackable: true,
    quantity: 1,
    tags: ["food", "ration"],
    affixes: [],
    states: []
  };
}

// --- listen ------------------------------------------------------------

function doListen(ctx: Ctx, deps: DelveRunDeps, rng: Rng): DelveActionResult {
  const state = ctx.state;
  state.lamp = spendOil(state.lamp, "listen");
  say(ctx, "action", "You still your breathing and listen.");

  // No noise emitted: listening is the one quiet way to spend time.
  applySimTick(ctx, deps, rng, []);
  if (state.activeEncounter) return finish(ctx); // contact interrupted the listen

  const floor = floorData(state.placeId, state.floor);
  const adjacency = buildAdjacency(floor);
  const directionOf = makeDirectionOf(floor);
  let heardAny = false;
  for (const hunter of state.hunters) {
    const distance = graphDistance(adjacency, state.currentRoomId, hunter.roomId);
    if (distance === undefined || distance === 0 || distance > LISTEN_DISTANCE) continue;
    const path = bfsPath(adjacency, state.currentRoomId, hunter.roomId);
    const firstStep = path && path.length > 1 ? path[1] : undefined;
    const direction = firstStep ? directionOf(state.currentRoomId, firstStep) : undefined;
    const where = direction ? `to the ${direction}` : "close by";
    const range = distance === 1 ? "one room off" : `${distance} rooms off`;
    say(ctx, "sense", `Something ${hunterTexture(hunter.state)} ${where}, ${range}.`);
    heardAny = true;
  }
  if (!heardAny) {
    say(ctx, "sense", "Nothing but your own blood in your ears.");
  }
  return finish(ctx);
}

// --- loot (quiet, quick: no oil, no noise, no tick) ---------------------

function doTakeLoot(ctx: Ctx, deps: DelveRunDeps, itemInstanceId?: string): DelveActionResult {
  const state = ctx.state;
  const roomId = state.currentRoomId;
  const pool = state.pendingLoot[roomId];
  if (!pool) {
    say(ctx, "system", "Nothing here to take.");
    return finish(ctx);
  }

  if (!itemInstanceId) {
    // Bare takeLoot sweeps the weightless part of the pool: coin and materials.
    if (pool.gold <= 0 && Object.keys(pool.materials).length === 0) {
      say(ctx, "system", "No coin here — name what you want to carry.");
      return finish(ctx);
    }
    const gold = pool.gold;
    const materials = pool.materials;
    updatePool(state, roomId, { ...pool, gold: 0, materials: {} });
    say(ctx, "action", gold > 0 ? `You pocket ${gold} gold.` : "You pocket what's worth pocketing.");
    ctx.events.push({ kind: "itemsTaken", roomId, items: [], gold, materials });
    return finish(ctx);
  }

  const item = pool.items.find(i => i.instanceId === itemInstanceId);
  if (!item) {
    say(ctx, "system", "That isn't here.");
    return finish(ctx);
  }
  if (deps.carriedWeight + item.weight * item.quantity > deps.carryCapacity) {
    say(ctx, "system", `The ${item.name} won't fit. Your pack is already straining.`);
    return finish(ctx);
  }
  takeItems(ctx, roomId, [item], 0, {});
  return finish(ctx);
}

function doTakeAllLoot(ctx: Ctx, deps: DelveRunDeps): DelveActionResult {
  const state = ctx.state;
  const roomId = state.currentRoomId;
  const pool = state.pendingLoot[roomId];
  if (!pool || (pool.items.length === 0 && pool.gold <= 0 && Object.keys(pool.materials).length === 0)) {
    say(ctx, "system", "Nothing here to take.");
    return finish(ctx);
  }

  const taken: ItemInstance[] = [];
  let weight = deps.carriedWeight;
  for (const item of pool.items) {
    const itemWeight = item.weight * item.quantity;
    if (weight + itemWeight <= deps.carryCapacity) {
      taken.push(item);
      weight += itemWeight;
    }
  }
  const leftBehind = pool.items.length - taken.length;
  takeItems(ctx, roomId, taken, pool.gold, pool.materials);
  if (leftBehind > 0) {
    say(ctx, "system", `Your pack can't hold everything. ${leftBehind} thing${leftBehind > 1 ? "s" : ""} stay behind.`);
  }
  return finish(ctx);
}

function takeItems(
  ctx: Ctx,
  roomId: string,
  items: ItemInstance[],
  gold: number,
  materials: Record<string, number>
): void {
  const state = ctx.state;
  const pool = state.pendingLoot[roomId]!;
  const takenIds = new Set(items.map(i => i.instanceId));
  updatePool(state, roomId, {
    items: pool.items.filter(i => !takenIds.has(i.instanceId)),
    gold: pool.gold - gold,
    // Materials are taken all-or-nothing (they're weightless dust and scrap).
    materials: Object.keys(materials).length > 0 ? {} : pool.materials
  });

  // Bagging an oil flask also stocks the lamp's refill count; the item event
  // still fires so the store can account for pack weight.
  const flasks = items.filter(i => i.tags?.includes("oilFlask")).reduce((n, i) => n + i.quantity, 0);
  if (flasks > 0) {
    state.lamp = { ...state.lamp, flasksPacked: state.lamp.flasksPacked + flasks };
  }

  const names = items.map(i => (i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name));
  const parts = [...names];
  if (gold > 0) parts.push(`${gold} gold`);
  say(ctx, "action", parts.length > 0 ? `Into the pack: ${parts.join(", ")}.` : "You take what's here.");
  ctx.events.push({ kind: "itemsTaken", roomId, items, gold, materials });
}

function updatePool(
  state: DelveRunState,
  roomId: string,
  pool: { items: ItemInstance[]; gold: number; materials: Record<string, number> }
): void {
  if (pool.items.length === 0 && pool.gold <= 0 && Object.keys(pool.materials).length === 0) {
    const next = { ...state.pendingLoot };
    delete next[roomId];
    state.pendingLoot = next;
  } else {
    state.pendingLoot = { ...state.pendingLoot, [roomId]: pool };
  }
}

function doLeaveLoot(ctx: Ctx): DelveActionResult {
  const state = ctx.state;
  const roomId = state.currentRoomId;
  if (!state.pendingLoot[roomId]) {
    say(ctx, "system", "Nothing here to leave.");
    return finish(ctx);
  }
  const next = { ...state.pendingLoot };
  delete next[roomId];
  state.pendingLoot = next;
  say(ctx, "action", "You leave it where it lies. Weight is its own kind of noise.");
  return finish(ctx);
}

// --- lamp --------------------------------------------------------------

function doRefillLamp(ctx: Ctx): DelveActionResult {
  const state = ctx.state;
  if (state.lamp.flasksPacked <= 0) {
    say(ctx, "system", "You pat the pack down twice. No oil left to pour.");
    return finish(ctx);
  }
  state.lamp = refillFromFlask(state.lamp);
  say(ctx, "action", "You feed the lamp from a flask. The light steadies and spreads.");
  ctx.events.push({ kind: "flaskConsumed" });
  return finish(ctx);
}

// --- map ---------------------------------------------------------------

function doConsultMap(ctx: Ctx): DelveActionResult {
  const state = ctx.state;
  if (!state.hasMapItem) {
    say(ctx, "system", "You carry no map of this place. Prose and memory will have to serve.");
    return finish(ctx);
  }
  if (getLightState(state.lamp) === "dark") {
    say(ctx, "system", "There is no light to read by. The sketch stays a rumor in your pocket.");
    return finish(ctx);
  }
  state.lamp = spendOil(state.lamp, "consultMap");
  say(ctx, "map", "You unfold the cartographer's sketch and mark where you've been.");
  return finish(ctx);
}

// --- encounters ----------------------------------------------------------

function doEncounterOption(
  ctx: Ctx,
  deps: DelveRunDeps,
  rng: Rng,
  kind: EncounterOptionKind
): DelveActionResult {
  const state = ctx.state;
  const encounter = state.activeEncounter;
  if (!encounter) {
    say(ctx, "system", "There is nothing to face here.");
    return finish(ctx);
  }
  const option = encounter.options.find(o => o.kind === kind);
  if (!option || !option.available) {
    say(ctx, "system", option?.unavailableReason ?? "That isn't a choice you have.");
    return finish(ctx);
  }

  if (kind === "fight") {
    say(ctx, "encounter", "You set your feet and meet it.");
    return finish(ctx);
  }

  const result = resolveOption({
    encounter,
    kind,
    character: deps.character,
    lightState: getLightState(state.lamp),
    packRatio: packRatio(deps),
    alertnessLevel: getThreatLevelFromPoints(state.alertness),
    rng,
    roomId: state.currentRoomId
  });
  return concludeBeat(ctx, deps, rng, result, { via: kind });
}

function doFightBeat(
  ctx: Ctx,
  deps: DelveRunDeps,
  rng: Rng,
  stance: "press" | "guard" | "breakAway"
): DelveActionResult {
  const state = ctx.state;
  const encounter = state.activeEncounter;
  if (!encounter) {
    say(ctx, "system", "There is nothing to fight here.");
    return finish(ctx);
  }
  const result = resolveFightBeat({
    encounter,
    stance,
    character: deps.character,
    rng,
    lightState: getLightState(state.lamp),
    roomId: state.currentRoomId
  });
  return concludeBeat(ctx, deps, rng, result, { via: stance });
}

function concludeBeat(
  ctx: Ctx,
  deps: DelveRunDeps,
  rng: Rng,
  result: ReturnType<typeof resolveFightBeat>,
  origin: { via: string }
): DelveActionResult {
  const state = ctx.state;
  const encounter = state.activeEncounter!;
  const hunterId = encounter.hunterId;
  const roomWhereItHappened = state.currentRoomId;

  state.lamp = spendOil(state.lamp, result.oilAction);

  for (const line of result.prose) {
    say(ctx, "encounter", line);
  }
  if (result.playerHpDelta !== 0) {
    ctx.events.push({ kind: "hpDelta", amount: result.playerHpDelta });
  }
  if (origin.via === "throwRations" && result.outcome === "escaped") {
    ctx.events.push({ kind: "itemConsumed", tag: "ration" });
  }

  let excludeFromTick: string | undefined;

  if (!result.over) {
    // The beat resolved but the fight goes on.
    state.activeEncounter = {
      ...encounter,
      enemyHp: Math.max(0, encounter.enemyHp + result.enemyHpDelta),
      beat: encounter.beat + 1,
      log: [...encounter.log, ...result.prose]
    };
  } else {
    state.activeEncounter = undefined;
    switch (result.outcome) {
      case "dead": {
        state.status = "dead";
        ctx.events.push({ kind: "died" });
        break;
      }
      case "won": {
        state.hunters = state.hunters.filter(h => h.id !== hunterId);
        ctx.events.push({ kind: "enemyDefeated", hunterId, enemyId: encounter.enemyId });
        dropHunterLoot(ctx, roomWhereItHappened, rng);
        break;
      }
      case "escaped": {
        excludeFromTick = hunterId;
        if (origin.via === "fallBack" || origin.via === "breakAway") {
          // The player gives ground; the hunter keeps the room.
          if (state.cameFromRoomId) {
            movePlayer(ctx, state.cameFromRoomId);
          } else {
            displaceHunter(ctx, hunterId, rng);
          }
        } else {
          // slipPast / parley / throwRations / lure: the hunter loses you.
          displaceHunter(ctx, hunterId, rng);
        }
        break;
      }
    }
  }

  if (state.status !== "dead") {
    // The fight was loud: hunters tick after the encounter resolves.
    applySimTick(ctx, deps, rng, [result.noise], excludeFromTick ?? state.activeEncounter?.hunterId);
  }
  return finish(ctx);
}

// --- winch ---------------------------------------------------------------

function doCrank(ctx: Ctx, deps: DelveRunDeps, rng: Rng, extractId: string): DelveActionResult {
  const state = ctx.state;
  const extract = findExtract(ctx, extractId);
  if (!extract) return finish(ctx);
  if (extract.condition !== "cranked") {
    say(ctx, "system", "There is nothing to crank here.");
    return finish(ctx);
  }
  if (extract.roomId !== state.currentRoomId) {
    say(ctx, "system", "The winch is not in this room.");
    return finish(ctx);
  }

  const required = extract.cranksRequired ?? 1;
  const done = state.cranksDone[extractId] ?? 0;
  if (done >= required) {
    say(ctx, "system", "The cage already waits at the top of the shaft.");
    return finish(ctx);
  }

  state.lamp = spendOil(state.lamp, "crank");
  state.cranksDone = { ...state.cranksDone, [extractId]: done + 1 };
  const noise: NoiseEvent = { roomId: state.currentRoomId, loudness: NOISE_LOUDNESS.crank, cause: "crank" };

  if (done + 1 >= required) {
    say(ctx, "action", "One last heave and the cage slams home at the top of the shaft. The whole warren heard that.");
  } else {
    say(ctx, "action", `You throw your weight on the crank. The cage grinds ${done + 1 === 1 ? "upward" : "higher"}, screaming on its rope. (${done + 1}/${required})`);
  }
  applySimTick(ctx, deps, rng, [noise]);
  return finish(ctx);
}

// --- extract ---------------------------------------------------------------

function findExtract(ctx: Ctx, extractId: string): PlaceExtract | undefined {
  const floor = floorData(ctx.state.placeId, ctx.state.floor);
  const extract = floor.extracts.find(e => e.id === extractId);
  if (!extract) {
    say(ctx, "system", "No way out goes by that name here.");
    return undefined;
  }
  return extract;
}

function doExtract(ctx: Ctx, extractId: string): DelveActionResult {
  const state = ctx.state;
  const extract = findExtract(ctx, extractId);
  if (!extract) return finish(ctx);
  if (extract.roomId !== state.currentRoomId) {
    say(ctx, "system", "That way out is not in this room.");
    return finish(ctx);
  }

  switch (extract.condition) {
    case "alwaysOpen":
      break;
    case "closesAtAlertness": {
      const level = getThreatLevelFromPoints(state.alertness);
      if (level >= (extract.alertnessLevel ?? Number.POSITIVE_INFINITY)) {
        say(ctx, "system", "The door is barred from the other side now. They knew you'd try the way you came.");
        return finish(ctx);
      }
      break;
    }
    case "waterClock": {
      if (state.waterClock <= 0) {
        say(ctx, "system", "Black water has taken the stair to the ceiling. Whatever window there was, it closed.");
        return finish(ctx);
      }
      break;
    }
    case "cranked": {
      const required = extract.cranksRequired ?? 1;
      if ((state.cranksDone[extractId] ?? 0) < required) {
        say(ctx, "system", "The cage hangs partway down the shaft. The winch wants more cranking before it will carry you.");
        return finish(ctx);
      }
      break;
    }
  }

  state.status = "extracted";
  say(ctx, "system", `${extract.label}: you take it, and the Warrens let you go.`);
  ctx.events.push({ kind: "extracted", extractId });
  return finish(ctx);
}

// --- descend ---------------------------------------------------------------

function doDescend(ctx: Ctx, stairRoomId: string): DelveActionResult {
  const state = ctx.state;
  if (stairRoomId !== state.currentRoomId) {
    say(ctx, "system", "The way down is not in this room.");
    return finish(ctx);
  }
  const place = getPlace(state.placeId);
  const nextFloorNumber = state.floor + 1;
  const nextFloor = place.floors.find(f => f.floor === nextFloorNumber);
  if (!nextFloor) {
    say(ctx, "system", "The Warrens go no deeper than this. Or if they do, you can't find the way.");
    return finish(ctx);
  }

  const rng = createRng(`${state.seed}:populate:${nextFloorNumber}`);
  const populated = populateFloor({ floor: nextFloor, rng, tier: state.tier });

  state.floor = nextFloorNumber;
  // Carryover: mirror createThreatStateWithCarryover's ratio — the floor
  // below has heard some of the racket above.
  state.alertness = Math.floor(state.alertness * DEPTH_RULES.floorThreatCarryoverRatio);
  state.hunters = spawnFloorHunters(nextFloor, populated.hunterSpawnRoomIds, place.biome, state.tier, rng);
  state.doorOverrides = { ...state.doorOverrides, ...populated.doorOverrides };
  state.roomProse = { ...state.roomProse, ...populated.roomProse };
  state.lootRoomIds = [...state.lootRoomIds, ...populated.lootRoomIds];
  state.supplyCaches = [
    ...state.supplyCaches,
    ...populated.supplyRoomIds.map((s): DelveSupplyCache => ({ ...s, found: false }))
  ];
  state.cameFromRoomId = undefined;
  state.currentRoomId = nextFloor.entranceRoomId;
  if (!state.visitedRoomIds.includes(nextFloor.entranceRoomId)) {
    state.visitedRoomIds = [...state.visitedRoomIds, nextFloor.entranceRoomId];
  }

  say(ctx, "system", "You take the stair down. The air changes its mind about you.");
  appendRoomProse(ctx, nextFloor.entranceRoomId, true);
  ctx.events.push({ kind: "descended", floor: nextFloorNumber });
  return finish(ctx);
}
