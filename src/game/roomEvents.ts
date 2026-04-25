import type {
  ActiveRoomEvent,
  Character,
  DungeonBiome,
  DungeonRoom,
  DungeonRun,
  EventChoice,
  EventChoiceRequirement,
  EventOutcome,
  ItemInstance,
  RoomEventDefinition,
  RoomEventType,
  ScoutedRoomInfo,
  StatCheckDefinition,
  StatCheckResult,
  ThreatChangeReason
} from "./types";
import { getModifier } from "./characterMath";
import { rollD20 } from "./dice";
import { applyThreatChange } from "./threat";
import { addDungeonLogEntry } from "./dungeonLog";
import { EVENT_TEMPLATES, getEventTemplate } from "../data/eventTemplates";
import { getLootTableForBiome } from "../data/lootTables";
import { generateLootForRoomLootTableId } from "./lootGenerator";
import { addItem, calculateInventoryWeight, removeItem } from "./inventory";
import type { Rng } from "./rng";
import { createRng } from "./rng";
import { scoutRoom } from "./scouting";
import { ROOM_EVENT_RULES } from "./constants";

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function generateRoomEvent(params: {
  room: DungeonRoom;
  biome: DungeonBiome;
  tier: number;
  rng: Rng;
}): ActiveRoomEvent | undefined {
  const { room, biome, tier, rng } = params;
  const eligible = EVENT_TEMPLATES.filter(t => {
    if (tier < t.minTier || tier > t.maxTier) return false;
    if (t.biomeTags && t.biomeTags.length > 0 && !t.biomeTags.includes(biome)) return false;
    return typeAllowedForRoom(t.type, room.type);
  });
  if (eligible.length === 0) return undefined;
  const template = rng.pickWeighted(eligible.map(t => ({ value: t, weight: t.weight })));
  return {
    eventId: template.id,
    roomId: room.id,
    resolved: false
  };
}

function typeAllowedForRoom(eventType: RoomEventType, roomType: DungeonRoom["type"]): boolean {
  if (roomType === "shrine") return eventType === "shrine" || eventType === "obelisk";
  if (roomType === "npcEvent") return eventType === "stranger" || eventType === "merchantShade";
  if (roomType === "lockedChest") return eventType === "strangeChest";
  if (roomType === "empty") {
    return eventType === "obstacle" || eventType === "oldCamp" ||
      eventType === "ominousSilence" || eventType === "obelisk" ||
      eventType === "merchantShade";
  }
  return false;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export interface EventResolutionResult {
  run: DungeonRun;
  character: Character;
  resultMessage: string;
  checkResult?: StatCheckResult;
  choiceId: string;
}

export function resolveEventChoice(params: {
  run: DungeonRun;
  character: Character;
  event: ActiveRoomEvent;
  choiceId: string;
  rng: Rng;
  now?: number;
}): EventResolutionResult {
  const { event, choiceId } = params;
  const now = params.now ?? Date.now();
  let { run, character } = params;

  const template = getEventTemplate(event.eventId);
  const choice = template.choices.find(c => c.id === choiceId);
  if (!choice) {
    return {
      run, character, choiceId,
      resultMessage: "That choice is no longer available."
    };
  }
  if (event.resolved) {
    return {
      run, character, choiceId,
      resultMessage: "This event has already been resolved."
    };
  }

  // Gate check
  const requirementGate = checkChoiceRequirements({ choice, character, run });
  if (!requirementGate.allowed) {
    return {
      run, character, choiceId,
      resultMessage: requirementGate.reason ?? "You cannot make that choice."
    };
  }

  // Stat check, if any
  let checkResult: StatCheckResult | undefined;
  let outcomes: EventOutcome[];
  let baseMessage: string;

  if (choice.statCheck) {
    checkResult = resolveStatCheck({
      character, check: choice.statCheck, rng: params.rng
    });
    if (checkResult.passed) {
      outcomes = choice.successOutcomes;
      baseMessage = choice.statCheck.successMessage;
    } else {
      outcomes = choice.failureOutcomes ?? [];
      baseMessage = choice.statCheck.failureMessage;
    }
  } else {
    outcomes = choice.successOutcomes;
    baseMessage = "";
  }

  const outcomeLogStart = run.dungeonLog.length;

  // Apply outcomes in order
  for (const outcome of outcomes) {
    ({ run, character } = applyEventOutcome({
      run, character, outcome, rng: params.rng, now, roomId: event.roomId
    }));
  }

  const outcomeMessages = run.dungeonLog
    .slice(outcomeLogStart)
    .map(entry => entry.message)
    .filter(Boolean);
  const visibleResult = [baseMessage || `You chose: ${choice.label}.`, ...outcomeMessages]
    .filter((message, index, all) => message && all.indexOf(message) === index)
    .join(" ");

  // Mark event resolved
  run = updateRoomEvent(run, event.roomId, ev => ({
    ...ev,
    resolved: true,
    selectedChoiceId: choiceId,
    resultMessage: visibleResult
  }));

  // Log the event resolution
  const title = template.title;
  const logMessage = baseMessage
    ? `${title}: ${baseMessage}`
    : `${title}: ${choice.label}.`;
  run = addDungeonLogEntry({
    run, type: "event", now, roomId: event.roomId,
    message: logMessage
  });

  return {
    run, character, choiceId,
    resultMessage: visibleResult,
    checkResult
  };
}

export function resolveStatCheck(params: {
  character: Character;
  check: StatCheckDefinition;
  rng: Rng;
}): StatCheckResult {
  const { character, check, rng } = params;
  const roll = rollD20(rng);
  const modifier = getStatCheckModifier(character, check.ability);
  const total = roll + modifier;
  const naturalPass = roll === ROOM_EVENT_RULES.choiceCheck.naturalSuccess;
  const naturalFail = roll === ROOM_EVENT_RULES.choiceCheck.naturalFailure;
  const passed = naturalFail ? false : (naturalPass ? true : total >= check.difficulty);
  return {
    passed,
    roll,
    modifier,
    total,
    difficulty: check.difficulty
  };
}

export function applyEventOutcome(params: {
  run: DungeonRun;
  character: Character;
  outcome: EventOutcome;
  rng: Rng;
  now?: number;
  roomId: string;
}): { run: DungeonRun; character: Character } {
  const { outcome, rng, roomId } = params;
  const now = params.now ?? Date.now();
  let { run, character } = params;

  switch (outcome.type) {
    case "heal": {
      const amount = outcome.amount ?? 0;
      if (amount > 0) {
        const newHp = Math.min(character.maxHp, character.hp + amount);
        if (newHp !== character.hp) {
          character = { ...character, hp: newHp, wounded: undefined };
        }
      }
      if (outcome.message) run = addDungeonLogEntry({ run, type: "info", now, roomId, message: outcome.message });
      break;
    }
    case "damage": {
      const amount = outcome.amount ?? 0;
      if (amount > 0) {
        character = { ...character, hp: Math.max(0, character.hp - amount) };
      }
      if (outcome.message) run = addDungeonLogEntry({ run, type: "danger", now, roomId, message: outcome.message });
      break;
    }
    case "gainGold": {
      const amount = outcome.amount ?? 0;
      if (amount > 0) {
        run = {
          ...run,
          raidInventory: { ...run.raidInventory, gold: run.raidInventory.gold + amount }
        };
      }
      if (outcome.message) run = addDungeonLogEntry({ run, type: "loot", now, roomId, message: outcome.message });
      break;
    }
    case "loseGold": {
      const amount = outcome.amount ?? 0;
      if (amount > 0) {
        const newGold = Math.max(0, run.raidInventory.gold - amount);
        run = { ...run, raidInventory: { ...run.raidInventory, gold: newGold } };
      }
      if (outcome.message) run = addDungeonLogEntry({ run, type: "info", now, roomId, message: outcome.message });
      break;
    }
    case "gainLootFromTable": {
      const room = run.roomGraph.find(r => r.id === roomId);
      const biome = room?.biome ?? run.biome;
      const table = outcome.lootTableId
        ? outcome.lootTableId
        : getLootTableForBiome(biome, run.tier).id;
      const items = generateLootForRoomLootTableId(table, rng, 1, {
        biome,
        tier: run.tier,
        roomType: room?.type,
        source: "event",
        threatLevel: run.threat.level,
        playerClassId: character.classId
      });
      const capacity = character.derivedStats.carryCapacity;
      let raid = run.raidInventory;
      const taken: ItemInstance[] = [];
      for (const item of items) {
        const weight = calculateInventoryWeight(raid) + item.weight * item.quantity;
        if (weight <= capacity) {
          raid = addItem(raid, item);
          taken.push(item);
        }
      }
      run = { ...run, raidInventory: raid };
      const gainedText = taken.length > 0
        ? `You gain ${taken.map(i => i.name).join(", ")}.`
        : "You leave it behind - too much to carry.";
      const displayMsg = outcome.message ? `${outcome.message} ${gainedText}` : gainedText;
      run = addDungeonLogEntry({ run, type: "loot", now, roomId, message: displayMsg });
      break;
    }
    case "loseRandomItem": {
      const count = outcome.amount ?? 1;
      const toDrop = run.raidInventory.items.slice(0, count).map(i => i.instanceId);
      let raid = run.raidInventory;
      for (const id of toDrop) raid = removeItem(raid, id, 1);
      run = { ...run, raidInventory: raid };
      if (outcome.message) run = addDungeonLogEntry({ run, type: "info", now, roomId, message: outcome.message });
      break;
    }
    case "increaseThreat": {
      const amount = outcome.amount ?? 0;
      if (amount !== 0) {
        run = applyEventThreat(run, amount, "eventChoice", outcome.message, now, roomId);
      }
      break;
    }
    case "decreaseThreat": {
      const amount = outcome.amount ?? 0;
      if (amount !== 0) {
        run = applyEventThreat(run, -amount, "eventChoice", outcome.message, now, roomId);
      }
      break;
    }
    case "revealAdjacentRoom": {
      run = revealSomeAdjacentRoom({ run, character, rng, now, roomId });
      if (outcome.message) run = addDungeonLogEntry({ run, type: "info", now, roomId, message: outcome.message });
      break;
    }
    case "improveRoomScouting": {
      run = improveScoutingIntel({ run, character, rng, now, roomId });
      if (outcome.message) run = addDungeonLogEntry({ run, type: "info", now, roomId, message: outcome.message });
      break;
    }
    case "markRoomCompleted": {
      run = {
        ...run,
        roomGraph: run.roomGraph.map(r => r.id === roomId ? { ...r, completed: true } : r)
      };
      break;
    }
    case "addDungeonLog": {
      if (outcome.message) run = addDungeonLogEntry({ run, type: "event", now, roomId, message: outcome.message });
      break;
    }
    case "applyStatus":
    case "questProgress":
    case "startCombat":
    case "triggerTrap":
    case "gainItem":
      // Deferred; log for now.
      if (outcome.message) run = addDungeonLogEntry({ run, type: "event", now, roomId, message: outcome.message });
      break;
  }

  return { run, character };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function checkChoiceRequirements(params: {
  choice: EventChoice;
  character: Character;
  run: DungeonRun;
}): { allowed: boolean; reason?: string } {
  const { choice, character, run } = params;
  if (choice.alwaysAvailable) return { allowed: true };
  const reqs = choice.requirements ?? [];
  for (const req of reqs) {
    const check = evaluateRequirement(req, character, run);
    if (!check.allowed) return check;
  }
  return { allowed: true };
}

function evaluateRequirement(
  req: EventChoiceRequirement,
  character: Character,
  run: DungeonRun
): { allowed: boolean; reason?: string } {
  switch (req.type) {
    case "hasGold": {
      const required = typeof req.value === "number" ? req.value : 0;
      if (run.raidInventory.gold < required) {
        return { allowed: false, reason: `Needs ${required} gold.` };
      }
      return { allowed: true };
    }
    case "hasItem": {
      const templateId = String(req.value ?? req.key);
      const has = run.raidInventory.items.some(i => i.templateId === templateId) ||
        Object.values(character.equipped).some(i => i?.templateId === templateId);
      return has ? { allowed: true } : { allowed: false, reason: `Needs ${templateId}.` };
    }
    case "class": {
      return character.classId === req.value
        ? { allowed: true }
        : { allowed: false, reason: `Only a ${req.value} can attempt this.` };
    }
    case "ancestry": {
      return character.ancestryId === req.value
        ? { allowed: true }
        : { allowed: false, reason: `Only ${req.value} may try this.` };
    }
    case "minAbility": {
      const score = character.abilityScores[req.key as keyof typeof character.abilityScores] ?? 0;
      const threshold = typeof req.value === "number" ? req.value : 0;
      return score >= threshold
        ? { allowed: true }
        : { allowed: false, reason: `${req.key} ${threshold}+ required.` };
    }
    case "minThreat": {
      const threshold = typeof req.value === "number" ? req.value : 0;
      return run.threat.level >= threshold
        ? { allowed: true }
        : { allowed: false, reason: `Requires threat level ${threshold}+.` };
    }
    case "maxThreat": {
      const threshold = typeof req.value === "number" ? req.value : 5;
      return run.threat.level <= threshold
        ? { allowed: true }
        : { allowed: false, reason: `Only while threat ≤ ${threshold}.` };
    }
    case "serviceUnlocked":
      return { allowed: true };
  }
}

function getStatCheckModifier(character: Character, ability: StatCheckDefinition["ability"]): number {
  if (ability === "trapSense") return character.derivedStats.trapSense;
  if (ability === "magicPower") return character.derivedStats.magicPower;
  return getModifier(character.abilityScores[ability]);
}

function applyEventThreat(
  run: DungeonRun,
  amount: number,
  reason: ThreatChangeReason,
  message: string | undefined,
  now: number,
  roomId: string
): DungeonRun {
  const { threat, change } = applyThreatChange({ threat: run.threat, amount, reason, now, message });
  let next: DungeonRun = { ...run, threat };
  next = addDungeonLogEntry({
    run: next, type: "threat", now: change.timestamp, roomId,
    message: `${message ?? change.message} (${amount >= 0 ? "+" : ""}${amount})`
  });
  return next;
}

function updateRoomEvent(
  run: DungeonRun,
  roomId: string,
  mutator: (ev: ActiveRoomEvent) => ActiveRoomEvent
): DungeonRun {
  return {
    ...run,
    roomGraph: run.roomGraph.map(room => {
      if (room.id !== roomId || !room.activeEvent) return room;
      return { ...room, activeEvent: mutator(room.activeEvent) };
    })
  };
}

function revealSomeAdjacentRoom(params: {
  run: DungeonRun;
  character: Character;
  rng: Rng;
  now: number;
  roomId: string;
}): DungeonRun {
  const { character, rng, roomId } = params;
  let { run } = params;
  const room = run.roomGraph.find(r => r.id === roomId);
  if (!room) return run;
  const candidates = room.connectedRoomIds
    .map(id => run.roomGraph.find(r => r.id === id))
    .filter(Boolean) as DungeonRoom[];
  const unknownOrWeak = candidates.filter(r => {
    if (r.visited) return false;
    const intel = run.knownRoomIntel[r.id];
    return !intel || intel.knowledgeLevel !== "exactType";
  });
  if (unknownOrWeak.length === 0) return run;
  const target = rng.pickOne(unknownOrWeak);
  // Build a forced-exact-type intel entry deterministically for this room.
  const forced: ScoutedRoomInfo = {
    roomId: target.id,
    knowledgeLevel: "exactType",
    dangerBand: dangerBandForRating(target.dangerRating),
    shownType: target.type,
    likelyTypes: [target.type],
    signs: target.scoutingProfile?.signs.slice(0, 3) ?? [],
    warning: undefined,
    confidence: 0.95,
    scoutedAtThreatLevel: run.threat.level,
    scoutedAt: Date.now()
  };
  run = { ...run, knownRoomIntel: { ...run.knownRoomIntel, [target.id]: forced } };
  void character;
  return run;
}

function dangerBandForRating(rating: number): ScoutedRoomInfo["dangerBand"] {
  if (rating <= 0) return "safe";
  if (rating <= 2) return "low";
  if (rating <= 4) return "moderate";
  if (rating <= 6) return "high";
  return "severe";
}

function improveScoutingIntel(params: {
  run: DungeonRun;
  character: Character;
  rng: Rng;
  now: number;
  roomId: string;
}): DungeonRun {
  const { character, rng, roomId } = params;
  let { run } = params;
  const current = run.roomGraph.find(r => r.id === roomId);
  if (!current) return run;
  const merged: Record<string, ScoutedRoomInfo> = { ...run.knownRoomIntel };
  for (const neighborId of current.connectedRoomIds) {
    const neighbor = run.roomGraph.find(r => r.id === neighborId);
    if (!neighbor || neighbor.visited) continue;
    const existing = merged[neighborId];
    if (existing?.knowledgeLevel === "exactType") continue;
    // Re-scout with a +4 bonus applied via a fresh rng that uses a boosted roll.
    // Simpler: run scoutRoom once; if it yields anything better than existing, keep it.
    const improved = scoutRoom({
      room: neighbor, character, run, rng
    });
    if (!existing || rankKnowledge(improved.knowledgeLevel) > rankKnowledge(existing.knowledgeLevel)) {
      merged[neighborId] = improved;
    }
  }
  run = { ...run, knownRoomIntel: merged };
  return run;
}

function rankKnowledge(level: ScoutedRoomInfo["knowledgeLevel"]): number {
  switch (level) {
    case "unknown": return 0;
    case "signsOnly": return 1;
    case "dangerKnown": return 2;
    case "likelyType": return 3;
    case "exactType": return 4;
  }
}

// Deterministic event rng for a given room
export function eventRngForRoom(run: DungeonRun, roomId: string, extra = ""): Rng {
  return createRng(`${run.seed}:event:${roomId}:${extra}`);
}

// Re-export for convenience
export { getEventTemplate };
