import type {
  Character,
  DungeonBiome,
  DungeonRoom,
  DungeonRun,
  ExtractionPoint,
  ExtractionVariant,
  ItemInstance
} from "./types";
import { DEPTH_RULES, EXTRACTION_RULES } from "./constants";
import { getEncountersForBiome } from "../data/encounters";
import { applyThreatChange, getCombinedPressureLevel, getThreatModifiers } from "./threat";
import { addDungeonLogEntry } from "./dungeonLog";
import { calculateInventoryWeight, removeItem } from "./inventory";
import type { Rng } from "./rng";

const VARIANT_ORDER: ExtractionVariant[] = [
  "stable",
  "delayed",
  "guarded",
  "unstable",
  "burdened"
];

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function generateExtractionPoint(params: {
  roomId: string;
  biome: DungeonBiome;
  tier: number;
  rng: Rng;
}): ExtractionPoint {
  const { roomId, biome, tier, rng } = params;
  const weights = getDepthExtractionWeights(tier);
  const entries = VARIANT_ORDER.map(v => ({ value: v, weight: weights[v] }));
  const variant = rng.pickWeighted(entries);
  return buildExtractionPoint({ roomId, biome, tier, variant, rng });
}

function getDepthExtractionWeights(tier: number): Record<ExtractionVariant, number> {
  const depthBonus = Math.min(DEPTH_RULES.extraction.maxDepthWeightBonus, Math.max(0, tier - 1));
  const base = EXTRACTION_RULES.variantWeightsTierOne;
  return {
    stable: Math.max(10, base.stable - depthBonus * DEPTH_RULES.extraction.stableWeightLossPerDepth),
    delayed: base.delayed + depthBonus * DEPTH_RULES.extraction.delayedWeightPerDepth,
    guarded: base.guarded + depthBonus * DEPTH_RULES.extraction.guardedWeightPerDepth,
    unstable: base.unstable + depthBonus * DEPTH_RULES.extraction.unstableWeightPerDepth,
    burdened: base.burdened + Math.floor(depthBonus / 2)
  };
}

function buildExtractionPoint(params: {
  roomId: string;
  biome: DungeonBiome;
  tier: number;
  variant: ExtractionVariant;
  rng: Rng;
}): ExtractionPoint {
  const { roomId, biome, tier, variant, rng } = params;

  switch (variant) {
    case "stable":
      return {
        id: `extraction:${roomId}:stable`,
        variant: "stable",
        state: "available",
        title: "Clear Way Out",
        description: "The way out is clear. You can leave now.",
        activationText: "You step through the threshold and back into the air.",
        successText: "You extract with the spoils you carry."
      };

    case "delayed":
      return {
        id: `extraction:${roomId}:delayed`,
        variant: "delayed",
        state: "available",
        title: "Old Chain Lift",
        description: "The old lift still works, but the chains need time to rise.",
        activationText: "The chains take the strain with a long, ringing groan.",
        successText: "The lift clears the shaft. You step out into open air.",
        failureText: "The chains slip — something heard them.",
        requiredTurns: rng.nextInt(
          EXTRACTION_RULES.delayed.minTurns,
          EXTRACTION_RULES.delayed.maxTurns
        )
      };

    case "guarded":
      return {
        id: `extraction:${roomId}:guarded`,
        variant: "guarded",
        state: "blocked",
        title: "Guarded Passage",
        description: "A hulking shape waits between you and the way out.",
        activationText: "It notices you the moment you step forward.",
        successText: "With the guard dead, the passage opens.",
        failureText: "You cannot leave until the guard falls.",
        guardEncounterId: pickGuardEncounter(biome, tier, rng),
        guardDefeated: false
      };

    case "unstable":
      return {
        id: `extraction:${roomId}:unstable`,
        variant: "unstable",
        state: "available",
        title: "Unstable Portal",
        description: "The portal flickers like a dying candle.",
        activationText: "You step into the flicker.",
        successText: "The portal closes behind you and the dungeon is gone.",
        failureText: "The flicker catches. Something goes wrong.",
        baseComplicationChance: EXTRACTION_RULES.unstable.baseComplicationChance,
        threatSensitive: true
      };

    case "burdened":
      return {
        id: `extraction:${roomId}:burdened`,
        variant: "burdened",
        state: "available",
        title: "Narrow Crawlway",
        description: "The crawlway out is barely wide enough for you and your pack.",
        activationText: "You wedge through on hands and knees.",
        successText: "You come up onto the surface, breath shaking.",
        failureText: "You cannot fit through carrying this much.",
        burdenedWeightLimitRatio: EXTRACTION_RULES.burdened.weightLimitRatio
      };
  }
}

export function pickGuardEncounter(biome: DungeonBiome, tier: number, rng: Rng): string {
  const pool = getEncountersForBiome(biome, tier).filter(e =>
    e.dangerRating >= EXTRACTION_RULES.guarded.tierOneGuardDangerRating
  );
  if (pool.length === 0) {
    return getEncountersForBiome(biome, tier)[0]?.id ?? "";
  }
  const entries = pool.map(e => ({ value: e.id, weight: e.weight }));
  return rng.pickWeighted(entries);
}

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

export function canAttemptExtraction(params: {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
}): { canAttempt: boolean; reason?: string } {
  const { run, character, room } = params;
  const extraction = room.extraction;
  if (!extraction) {
    if (room.extractionPoint) return { canAttempt: true };
    return { canAttempt: false, reason: "This is not an extraction point." };
  }
  if (extraction.state === "completed") {
    return { canAttempt: false, reason: "This extraction has already been used." };
  }

  switch (extraction.variant) {
    case "guarded":
      // Clicking is always valid — it engages the guard first, then extracts.
      return { canAttempt: true };
    case "burdened": {
      const limit = getExtractionWeightLimit({ character, extraction });
      const weight = calculateInventoryWeight(run.raidInventory);
      if (weight > limit) {
        return {
          canAttempt: false,
          reason: `Drop loot until your pack weighs ${limit} or less (currently ${weight}).`
        };
      }
      return { canAttempt: true };
    }
    case "stable":
    case "delayed":
    case "unstable":
      return { canAttempt: true };
  }
}

export function getExtractionWeightLimit(params: {
  character: Character;
  extraction: ExtractionPoint;
}): number {
  const { character, extraction } = params;
  const ratio = extraction.burdenedWeightLimitRatio
    ?? EXTRACTION_RULES.burdened.weightLimitRatio;
  return Math.floor(character.derivedStats.carryCapacity * ratio);
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export interface ExtractionActivationResult {
  run: DungeonRun;
  character: Character;
  extracted: boolean;
  startedCombat?: boolean;
  combatEncounterId?: string;
  fromRoomId?: string;
  message: string;
  requiresPlayerChoice?: boolean;
}

export function activateExtraction(params: {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
  rng: Rng;
  now?: number;
}): ExtractionActivationResult {
  const { character, room, rng } = params;
  const now = params.now ?? Date.now();
  let { run } = params;
  const extraction = room.extraction;

  if (!extraction) {
    return {
      run, character, extracted: true,
      message: "You leave the dungeon with the spoils you carried."
    };
  }

  const gate = canAttemptExtraction({ run, character, room });
  if (!gate.canAttempt) {
    return {
      run, character, extracted: false,
      message: gate.reason ?? "You cannot extract from here."
    };
  }

  switch (extraction.variant) {
    case "stable":
      return finishExtraction({ run, character, room, extraction, now });

    case "burdened":
      // Weight already validated; same as stable from here.
      return finishExtraction({ run, character, room, extraction, now });

    case "guarded":
      // If the guard is already down, proceed to finish.
      if (extraction.guardDefeated) {
        return finishExtraction({ run, character, room, extraction, now });
      }
      return {
        run, character, extracted: false,
        startedCombat: true,
        combatEncounterId: extraction.guardEncounterId,
        fromRoomId: room.id,
        message: extraction.activationText
      };

    case "delayed": {
      const required = extraction.requiredTurns ?? EXTRACTION_RULES.delayed.minTurns;
      run = {
        ...run,
        roomGraph: run.roomGraph.map(r =>
          r.id === room.id
            ? { ...r, extraction: { ...extraction, state: "charging", turnsRemaining: required, activatedAt: now } }
            : r
        ),
        currentExtractionInteraction: {
          roomId: room.id,
          extractionId: extraction.id,
          turnsRemaining: required
        }
      };
      run = addDungeonLogEntry({
        run, type: "extraction", now, roomId: room.id,
        message: `${extraction.activationText} Hold here for ${required} more turn${required === 1 ? "" : "s"}.`
      });
      return {
        run, character, extracted: false,
        message: extraction.activationText,
        requiresPlayerChoice: true
      };
    }

    case "unstable":
      return resolveUnstableExtraction({ run, character, room, rng, now });
  }
}

export function resolveExtractionTurn(params: {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
  rng: Rng;
  now?: number;
}): ExtractionActivationResult {
  const { character, room, rng } = params;
  const now = params.now ?? Date.now();
  let { run } = params;
  const extraction = room.extraction;
  if (!extraction || extraction.variant !== "delayed") {
    return {
      run, character, extracted: false,
      message: "There is no delayed extraction to continue."
    };
  }
  const turnsLeft = extraction.turnsRemaining ?? 0;

  // Ambush roll per turn
  const modifier = getThreatModifiers(getCombinedPressureLevel({ threat: run.threat, strain: run.delveStrain }));
  const ambushChance = EXTRACTION_RULES.delayed.ambushChancePerTurn + modifier.ambushChance;
  if (rng.nextFloat() < ambushChance) {
    const guardId = pickGuardEncounter(run.biome, run.tier, rng);
    run = addDungeonLogEntry({
      run, type: "warning", now, roomId: room.id,
      message: "Something answers the noise of the lift."
    });
    return {
      run, character, extracted: false,
      startedCombat: true,
      combatEncounterId: guardId,
      fromRoomId: room.id,
      message: extraction.failureText ?? "An ambush closes on the lift."
    };
  }

  // Tick the counter
  const nextRemaining = Math.max(0, turnsLeft - 1);
  run = {
    ...run,
    roomGraph: run.roomGraph.map(r =>
      r.id === room.id
        ? { ...r, extraction: { ...extraction, turnsRemaining: nextRemaining } }
        : r
    ),
    currentExtractionInteraction: run.currentExtractionInteraction
      ? { ...run.currentExtractionInteraction, turnsRemaining: nextRemaining }
      : undefined
  };

  if (nextRemaining <= 0) {
    return finishExtraction({ run, character, room, extraction, now });
  }

  run = addDungeonLogEntry({
    run, type: "extraction", now, roomId: room.id,
    message: `The lift climbs. ${nextRemaining} turn${nextRemaining === 1 ? "" : "s"} to go.`
  });

  return {
    run, character, extracted: false,
    message: `The lift climbs. ${nextRemaining} turn${nextRemaining === 1 ? "" : "s"} to go.`,
    requiresPlayerChoice: true
  };
}

// ---------------------------------------------------------------------------
// Unstable
// ---------------------------------------------------------------------------

export function resolveUnstableExtraction(params: {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
  rng: Rng;
  now?: number;
}): ExtractionActivationResult {
  const { room, rng } = params;
  const now = params.now ?? Date.now();
  let { run, character } = params;
  const extraction = room.extraction;
  if (!extraction || extraction.variant !== "unstable") {
    return {
      run, character, extracted: false,
      message: "There is no unstable extraction here."
    };
  }

  const base = extraction.baseComplicationChance ?? EXTRACTION_RULES.unstable.baseComplicationChance;
  const pressureLevel = getCombinedPressureLevel({ threat: run.threat, strain: run.delveStrain });
  const modifier = getThreatModifiers(pressureLevel);
  const raw = base + modifier.extractionComplicationChance +
    run.delveStrain.level * DEPTH_RULES.extraction.strainComplicationChancePerLevel;
  const chance = Math.min(EXTRACTION_RULES.unstable.maxComplicationChance, Math.max(0, raw));

  if (rng.nextFloat() >= chance) {
    // Clean extract.
    return finishExtraction({ run, character, room, extraction, now });
  }

  // Complication fires — pick one of five flavours.
  const variants = [
    "threat",
    "damage",
    "drop",
    "delay",
    "ambush"
  ] as const;
  const pick = rng.pickOne(variants);

  switch (pick) {
    case "threat": {
      const amt = EXTRACTION_RULES.unstable.complicationThreatIncrease;
      const { threat, change } = applyThreatChange({
        threat: run.threat, amount: amt, reason: "extractionComplication", now,
        message: "The portal's sputter draws the dungeon's attention."
      });
      run = { ...run, threat };
      run = addDungeonLogEntry({
        run, type: "threat", now: change.timestamp, roomId: room.id,
        message: `${change.message} (+${amt})`
      });
      return finishExtraction({ run, character, room, extraction, now });
    }

    case "damage": {
      const damage = Math.max(1, rng.nextInt(2, 6));
      character = { ...character, hp: Math.max(0, character.hp - damage) };
      run = addDungeonLogEntry({
        run, type: "danger", now, roomId: room.id,
        message: `The portal arcs — ${damage} damage as you step through.`
      });
      if (character.hp <= 0) {
        return {
          run, character, extracted: false,
          message: "You do not make it through the portal."
        };
      }
      return finishExtraction({ run, character, room, extraction, now });
    }

    case "drop": {
      const unprotected = run.raidInventory.items.filter(i => !i.protected);
      if (unprotected.length > 0) {
        const lost: ItemInstance = rng.pickOne(unprotected);
        run = {
          ...run,
          raidInventory: removeItem(run.raidInventory, lost.instanceId, 1)
        };
        run = addDungeonLogEntry({
          run, type: "warning", now, roomId: room.id,
          message: `Something pulls ${lost.name} out of your pack as you cross.`
        });
      }
      return finishExtraction({ run, character, room, extraction, now });
    }

    case "delay": {
      run = {
        ...run,
        roomGraph: run.roomGraph.map(r =>
          r.id === room.id
            ? { ...r, extraction: { ...extraction, variant: "delayed", state: "charging", turnsRemaining: 1, requiredTurns: 1, activatedAt: now } }
            : r
        ),
        currentExtractionInteraction: {
          roomId: room.id,
          extractionId: extraction.id,
          turnsRemaining: 1
        }
      };
      run = addDungeonLogEntry({
        run, type: "extraction", now, roomId: room.id,
        message: "The portal steadies but won't catch yet. Hold one more turn."
      });
      return {
        run, character, extracted: false,
        message: "The portal steadies but won't catch yet. Hold one more turn.",
        requiresPlayerChoice: true
      };
    }

    case "ambush": {
      const guardId = pickGuardEncounter(run.biome, run.tier, rng);
      run = addDungeonLogEntry({
        run, type: "warning", now, roomId: room.id,
        message: "The flicker opens onto teeth."
      });
      return {
        run, character, extracted: false,
        startedCombat: true,
        combatEncounterId: guardId,
        fromRoomId: room.id,
        message: "Something comes through the flicker with you."
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Completion helper
// ---------------------------------------------------------------------------

function finishExtraction(params: {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
  extraction: ExtractionPoint;
  now: number;
}): ExtractionActivationResult {
  const { character, room, extraction, now } = params;
  let { run } = params;
  run = {
    ...run,
    roomGraph: run.roomGraph.map(r =>
      r.id === room.id
        ? { ...r, extraction: { ...extraction, state: "completed" } }
        : r
    ),
    currentExtractionInteraction: undefined
  };
  run = addDungeonLogEntry({
    run, type: "extraction", now, roomId: room.id,
    message: extraction.successText
  });
  return {
    run, character, extracted: true,
    message: extraction.successText
  };
}
