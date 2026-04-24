import type {
  ActiveTrap,
  Character,
  DungeonBiome,
  DungeonRoom,
  DungeonRun,
  StatCheckResult,
  ThreatChangeReason,
  TrapDefinition,
  TrapOutcome,
  TrapResolutionResult
} from "./types";
import { TRAP_RULES } from "./constants";
import { rollDice, rollD20 } from "./dice";
import { getTrapsForBiome, getTrapTemplate } from "../data/trapTables";
import { applyThreatChange, getThreatModifiers } from "./threat";
import { addDungeonLogEntry } from "./dungeonLog";
import type { Rng } from "./rng";

export function generateTrapForRoom(params: {
  room: DungeonRoom;
  biome: DungeonBiome;
  tier: number;
  rng: Rng;
}): ActiveTrap | undefined {
  const { room, biome, tier, rng } = params;
  const templates = getTrapsForBiome(biome, tier);
  if (templates.length === 0) return undefined;
  const template = rng.pickWeighted(templates.map(t => ({ value: t, weight: t.weight })));
  return {
    trapId: template.id,
    roomId: room.id,
    detected: false,
    disarmed: false,
    triggered: false
  };
}

export function detectTrap(params: {
  run: DungeonRun;
  character: Character;
  trap: ActiveTrap;
  rng: Rng;
}): TrapResolutionResult {
  const { run, character, trap, rng } = params;
  if (trap.disarmed || trap.triggered) {
    return makeResolution(trap.trapId, trap.detected, trap.triggered, "Nothing more to find here.");
  }

  const template = getTrapTemplate(trap.trapId);
  const difficulty = effectiveDetectionDifficulty(template, run);
  const check = rollCheck({
    rng,
    modifier: character.derivedStats.trapSense,
    difficulty
  });

  if (check.passed) {
    return {
      trapId: trap.trapId,
      detected: true,
      triggered: false,
      checkResult: check,
      message: `You spot a ${template.name.toLowerCase()} — ${template.description}`
    };
  }

  return {
    trapId: trap.trapId,
    detected: false,
    triggered: false,
    checkResult: check,
    message: `You find nothing, but the room does not feel safe.`
  };
}

export function disarmTrap(params: {
  run: DungeonRun;
  character: Character;
  trap: ActiveTrap;
  rng: Rng;
}): TrapResolutionResult {
  const { run, character, trap, rng } = params;
  if (trap.disarmed) {
    return { ...makeResolution(trap.trapId, true, false, "The trap is already defused."), disarmed: true };
  }
  if (trap.triggered) {
    return makeResolution(trap.trapId, true, true, "The trap has already sprung.");
  }

  const template = getTrapTemplate(trap.trapId);
  const difficulty = effectiveDisarmDifficulty(template, run);
  const check = rollCheck({
    rng,
    modifier: character.derivedStats.trapSense,
    difficulty
  });

  if (check.passed) {
    return {
      trapId: trap.trapId,
      detected: true,
      disarmed: true,
      triggered: false,
      checkResult: check,
      message: `You defuse the ${template.name.toLowerCase()}.`
    };
  }

  return {
    trapId: trap.trapId,
    detected: true,
    disarmed: false,
    triggered: true,
    checkResult: check,
    message: `Your hand slips — the ${template.name.toLowerCase()} snaps shut.`
  };
}

export function triggerTrap(params: {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
  trap: ActiveTrap;
  rng: Rng;
  now?: number;
}): {
  run: DungeonRun;
  character: Character;
  result: TrapResolutionResult;
} {
  const { character, room, trap, rng } = params;
  const now = params.now ?? Date.now();
  const template = getTrapTemplate(trap.trapId);
  let run = params.run;
  let nextCharacter = character;

  // Apply damage
  const modifier = getThreatModifiers(run.threat.level);
  const damage = rollTrapDamage(template, run.tier, rng) + modifier.trapDamageBonus;
  if (damage > 0) {
    nextCharacter = { ...nextCharacter, hp: Math.max(0, nextCharacter.hp - damage) };
    run = addDungeonLogEntry({
      run, type: "trap", now,
      roomId: room.id,
      message: `${template.name} triggers for ${damage} damage.`
    });
  } else {
    run = addDungeonLogEntry({
      run, type: "trap", now, roomId: room.id,
      message: `${template.name} triggers.`
    });
  }

  // Apply outcomes other than damage (damage handled above)
  for (const outcome of template.outcomesOnTrigger) {
    ({ run, character: nextCharacter } = applyTrapOutcome({
      run, character: nextCharacter, room, outcome, now
    }));
  }

  // Apply trap-level threat increase (if not already represented in outcomes)
  const threatAmount = template.threatIncreaseOnTrigger ?? TRAP_RULES.threatIncreaseOnTrigger;
  const hasThreatOutcome = template.outcomesOnTrigger.some(o => o.type === "increaseThreat");
  if (!hasThreatOutcome && threatAmount > 0) {
    ({ run } = applyRunThreatChange(run, threatAmount, "failedTrap", `The ${template.name.toLowerCase()} raises the dungeon's attention.`, now, room.id));
  }

  return {
    run,
    character: nextCharacter,
    result: {
      trapId: trap.trapId,
      detected: true,
      triggered: true,
      message: `The ${template.name.toLowerCase()} is sprung.`
    }
  };
}

export function effectiveDetectionDifficulty(trap: TrapDefinition, run: DungeonRun): number {
  const byTier = TRAP_RULES.detectionDifficultyByTier as Record<number, number>;
  const base = byTier[run.tier] ?? trap.detectionDifficulty;
  return Math.max(base, trap.detectionDifficulty) + getThreatModifiers(run.threat.level).trapDifficultyBonus;
}

export function effectiveDisarmDifficulty(trap: TrapDefinition, run: DungeonRun): number {
  const byTier = TRAP_RULES.disarmDifficultyByTier as Record<number, number>;
  const base = byTier[run.tier] ?? trap.disarmDifficulty;
  return Math.max(base, trap.disarmDifficulty) + getThreatModifiers(run.threat.level).trapDifficultyBonus;
}

export function rollTrapDamage(trap: TrapDefinition, tier: number, rng: Rng): number {
  if (trap.damageDice) {
    return rollDice(trap.damageDice, rng);
  }
  const tierDice = (TRAP_RULES.triggerDamageByTier as Record<number, { count: number; sides: number; modifier: number }>)[tier];
  if (!tierDice) return 0;
  return rollDice(tierDice, rng);
}

function applyTrapOutcome(params: {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
  outcome: TrapOutcome;
  now: number;
}): { run: DungeonRun; character: Character } {
  const { outcome, room, now } = params;
  let { run, character } = params;

  switch (outcome.type) {
    case "damage":
      // Already applied via rollTrapDamage; no-op here.
      break;
    case "increaseThreat": {
      const amount = outcome.amount ?? 0;
      if (amount !== 0) {
        ({ run } = applyRunThreatChange(run, amount, "failedTrap", outcome.message, now, room.id));
      }
      break;
    }
    case "destroyRandomLoot": {
      const count = outcome.amount ?? 1;
      if (run.raidInventory.items.length > 0) {
        const toDrop = run.raidInventory.items.slice(0, count).map(i => i.instanceId);
        const remaining = run.raidInventory.items.filter(i => !toDrop.includes(i.instanceId));
        run = { ...run, raidInventory: { ...run.raidInventory, items: remaining } };
      }
      run = addDungeonLogEntry({ run, type: "trap", now, roomId: room.id, message: outcome.message });
      break;
    }
    case "addDungeonLog":
      run = addDungeonLogEntry({ run, type: "trap", now, roomId: room.id, message: outcome.message });
      break;
    case "applyStatus":
    case "startCombat":
    case "lockRoom":
      // Hooks for future features — record as log for now.
      run = addDungeonLogEntry({ run, type: "trap", now, roomId: room.id, message: outcome.message });
      break;
  }

  return { run, character };
}

function applyRunThreatChange(
  run: DungeonRun,
  amount: number,
  reason: ThreatChangeReason,
  message: string | undefined,
  now: number,
  roomId: string
): { run: DungeonRun } {
  const { threat, change } = applyThreatChange({ threat: run.threat, amount, reason, now, message });
  let updated: DungeonRun = { ...run, threat };
  updated = addDungeonLogEntry({
    run: updated, type: "threat", now: change.timestamp, roomId,
    message: message ?? change.message
  });
  return { run: updated };
}

function rollCheck(params: {
  rng: Rng;
  modifier: number;
  difficulty: number;
}): StatCheckResult {
  const roll = rollD20(params.rng);
  const total = roll + params.modifier;
  return {
    passed: total >= params.difficulty,
    roll,
    modifier: params.modifier,
    total,
    difficulty: params.difficulty
  };
}

function makeResolution(
  trapId: string,
  detected: boolean,
  triggered: boolean,
  message: string
): TrapResolutionResult {
  return { trapId, detected, triggered, message };
}
