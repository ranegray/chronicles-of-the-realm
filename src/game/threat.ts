import type {
  ThreatChange,
  ThreatChangeReason,
  ThreatLevel,
  ThreatLevelModifier,
  ThreatState
} from "./types";
import { THREAT_RULES } from "./constants";
import type { Rng } from "./rng";

export function createInitialThreatState(now?: number): ThreatState {
  return {
    points: 0,
    level: 0,
    maxLevel: THREAT_RULES.maxLevel as ThreatLevel,
    lastChangedAt: now ?? Date.now(),
    changes: []
  };
}

export function getThreatLevelFromPoints(points: number): ThreatLevel {
  const clamped = Math.max(0, points);
  let level: ThreatLevel = 0;
  for (const threshold of THREAT_RULES.thresholds) {
    if (clamped >= threshold.minPoints) {
      level = threshold.level as ThreatLevel;
    } else {
      break;
    }
  }
  return level;
}

export function getThreatLabel(level: ThreatLevel): string {
  const threshold = THREAT_RULES.thresholds.find(t => t.level === level);
  return threshold?.label ?? "Unknown";
}

export function getThreatModifiers(level: ThreatLevel): ThreatLevelModifier {
  const modifiers = THREAT_RULES.modifiersByLevel[level];
  return modifiers as ThreatLevelModifier;
}

export function applyThreatChange(params: {
  threat: ThreatState;
  amount: number;
  reason: ThreatChangeReason;
  now?: number;
  message?: string;
}): { threat: ThreatState; change: ThreatChange } {
  const { threat, amount, reason, message } = params;
  const now = params.now ?? Date.now();
  const previousPoints = threat.points;
  const previousLevel = threat.level;
  const newPoints = Math.max(0, previousPoints + amount);
  const newLevel = getThreatLevelFromPoints(newPoints);

  const change: ThreatChange = {
    id: makeChangeId(threat, now),
    timestamp: now,
    reason,
    amount,
    previousPoints,
    newPoints,
    previousLevel,
    newLevel,
    message: message ?? defaultChangeMessage(reason, amount, previousLevel, newLevel)
  };

  const nextThreat: ThreatState = {
    ...threat,
    points: newPoints,
    level: newLevel,
    lastChangedAt: now,
    changes: [...threat.changes, change]
  };

  return { threat: nextThreat, change };
}

export function shouldTriggerAmbush(params: {
  threat: ThreatState;
  rng: Rng;
  additionalChance?: number;
}): boolean {
  const { threat, rng, additionalChance = 0 } = params;
  const modifier = getThreatModifiers(threat.level);
  const chance = Math.min(1, Math.max(0, modifier.ambushChance + additionalChance));
  if (chance <= 0) return false;
  return rng.nextFloat() < chance;
}

function makeChangeId(threat: ThreatState, now: number): string {
  const seq = threat.changes.length + 1;
  return `threat_${now.toString(36)}_${seq.toString(36)}`;
}

function defaultChangeMessage(
  reason: ThreatChangeReason,
  amount: number,
  previousLevel: ThreatLevel,
  newLevel: ThreatLevel
): string {
  const base = describeReason(reason);
  if (newLevel !== previousLevel) {
    return `${base} ${transitionPhrase(previousLevel, newLevel)}`;
  }
  return base;
}

function transitionPhrase(prev: ThreatLevel, next: ThreatLevel): string {
  if (next > prev) {
    if (next >= 5) return "The dungeon wakes fully.";
    if (next >= 4) return "You are being hunted.";
    if (next >= 3) return "Footsteps you don't own, drawing closer.";
    if (next >= 2) return "The halls begin to stir.";
    return "Something is listening now.";
  }
  return "The quiet creeps back in.";
}

function describeReason(reason: ThreatChangeReason): string {
  switch (reason) {
    case "enteredRoom": return "You press deeper into the dungeon.";
    case "searchedRoom": return "Your search disturbs the quiet.";
    case "failedTrap": return "A missed trap betrays your presence.";
    case "openedNoisyChest": return "The chest grinds open.";
    case "eventChoice": return "Your choice echoes through the halls.";
    case "extendedCombat": return "The fight drags on.";
    case "fledCombat": return "Your retreat rings out.";
    case "usedLoudMagic": return "Raw magic crackles through the stone.";
    case "carriedCursedLoot": return "Cursed weight pulls at the dungeon's attention.";
    case "extractionComplication": return "The extraction falters.";
    case "debug": return "Debug.";
  }
}
