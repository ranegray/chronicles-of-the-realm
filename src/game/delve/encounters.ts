// Inline encounters (Pillar 4): decision-set assembly + beat resolution.
// Pure, React-free. Resolves contact with a hunter in 1-3 weighty beats
// instead of a combat screen, reusing the swing-level math in ../combat.ts
// rather than duplicating accuracy/evasion/armor/damage formulas.
// See docs/design/the-delve.md.

import type {
  ActiveEncounter,
  EncounterBeatResult,
  EncounterOption,
  EncounterOptionKind,
  FightStance,
  Hunter,
  LightState,
  NoiseEvent,
  OilAction
} from "./types";
import type { Character, EnemyInstance, ItemInstance } from "../types";
import type { Rng } from "../rng";
import { getEnemy } from "../../data/enemies";
import { buildEnemyInstance } from "../encounterGenerator";
import { rollD20, rollDice } from "../dice";
import { getModifier } from "../characterMath";
import { COMBAT_RULES } from "../constants";
import { getDamageBonus, guessWeaponDice } from "../combat";
import { moveNoiseLoudness, NOISE_LOUDNESS } from "./noise";

/** @deprecated The contract now carries oilAction; use EncounterBeatResult. */
export type DelveEncounterBeatResult = EncounterBeatResult;

// ---------------------------------------------------------------------------
// Tuning constants (documented judgment calls; see docs/design/the-delve.md
// Pillar 4). Every chance is clamped to keep both success and failure always
// reachable.
// ---------------------------------------------------------------------------

const SLIP_BASE_CHANCE = 0.6;
const SLIP_PACK_PENALTY = 0.3; // full penalty at 100% pack capacity
const SLIP_DIM_PENALTY = 0.15;
const SLIP_AGILITY_SCALE = 0.05; // matches the agility scaling combat.ts uses for flee chance
const SLIP_MIN = 0.05;
const SLIP_MAX = 0.9;

const FOLLOW_BASE_CHANCE = 0.2;
const FOLLOW_ALERTNESS_SCALE = 0.12;
const FOLLOW_MAX_CHANCE = 0.85;

const PARLEY_BASE_CHANCE = 0.45;
const PARLEY_PRESENCE_SCALE = 0.05;
const PARLEY_MIN = 0.1;
const PARLEY_MAX = 0.85;

const THROW_RATIONS_CHANCE = 0.75;

const LURE_BASE_CHANCE = 0.55;
const LURE_AGILITY_SCALE = 0.04;
const LURE_MIN = 0.15;
const LURE_MAX = 0.9;

const BREAK_AWAY_BASE_CHANCE = 0.3;
const BREAK_AWAY_WORN_ENEMY_BONUS = 0.4; // scales with how depleted the enemy's hp is
const BREAK_AWAY_AGILITY_SCALE = 0.05;
const BREAK_AWAY_MIN = 0.1;
const BREAK_AWAY_MAX = 0.9;

/**
 * Fight-beat aggregation: each beat is "roughly 2.5 swings per side" per the
 * design doc. Press leans aggressive (more, harder swings; guards less, so
 * the enemy also swings more and hits easier). Guard trims both sides down
 * and rewards a clean parry with a small counter. The fractional swing count
 * becomes a probabilistic bonus swing so beats don't always resolve on the
 * same number of dice rolls.
 */
interface StanceProfile {
  playerSwings: number;
  playerAccuracyMod: number;
  playerDamageMultiplier: number;
  enemySwings: number;
  enemyAccuracyMod: number;
  enemyDamageMultiplier: number;
}

const STANCE_PROFILES: Record<"press" | "guard", StanceProfile> = {
  press: {
    playerSwings: 3,
    playerAccuracyMod: 1,
    playerDamageMultiplier: 1.15,
    enemySwings: 3,
    enemyAccuracyMod: 1, // "guards less": easier for the enemy to land its own hits
    enemyDamageMultiplier: 1
  },
  guard: {
    playerSwings: 2,
    playerAccuracyMod: 0,
    playerDamageMultiplier: 0.85,
    enemySwings: 2,
    enemyAccuracyMod: 0,
    enemyDamageMultiplier: 0.5 // reuses COMBAT_RULES.defendDamageReduction's magnitude
  }
};

/** Small accuracy penalty applied to the player's fight-beat swings; the
 * lamp's light states make aiming worse before they make sneaking impossible. */
function lightAccuracyPenalty(lightState: LightState): number {
  switch (lightState) {
    case "dim": return -1;
    case "dark": return -2;
    case "bright": return 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Decision-set assembly
// ---------------------------------------------------------------------------

/**
 * Chance to slip past a hunter without a fight. Heavier packs and dimmer
 * light both make it worse; agility helps, at the same scale combat.ts uses
 * for flee chance (getModifier(agility) * 0.05).
 */
export function slipChance(params: {
  packRatio: number;
  lightState: LightState;
  agilityModifier: number;
}): number {
  if (params.lightState === "dark") return 0; // never offered in the dark; kept honest for callers that ask anyway
  let chance = SLIP_BASE_CHANCE;
  chance -= Math.max(0, params.packRatio) * SLIP_PACK_PENALTY;
  if (params.lightState === "dim") chance -= SLIP_DIM_PENALTY;
  chance += params.agilityModifier * SLIP_AGILITY_SCALE;
  return clamp(chance, SLIP_MIN, SLIP_MAX);
}

/** Chance a hunter follows through a fall-back; rises with how awake the place is. */
function hunterFollowChance(alertnessLevel: number): number {
  return Math.min(FOLLOW_MAX_CHANCE, FOLLOW_BASE_CHANCE + Math.max(0, alertnessLevel) * FOLLOW_ALERTNESS_SCALE);
}

function parleyChance(character: Character): number {
  return clamp(
    PARLEY_BASE_CHANCE + getModifier(character.abilityScores.presence) * PARLEY_PRESENCE_SCALE,
    PARLEY_MIN,
    PARLEY_MAX
  );
}

function lureChance(agilityModifier: number): number {
  return clamp(LURE_BASE_CHANCE + agilityModifier * LURE_AGILITY_SCALE, LURE_MIN, LURE_MAX);
}

function breakAwayChance(enemyHpRatio: number, agilityModifier: number): number {
  const wornBonus = (1 - clamp(enemyHpRatio, 0, 1)) * BREAK_AWAY_WORN_ENEMY_BONUS;
  return clamp(
    BREAK_AWAY_BASE_CHANCE + wornBonus + agilityModifier * BREAK_AWAY_AGILITY_SCALE,
    BREAK_AWAY_MIN,
    BREAK_AWAY_MAX
  );
}

/**
 * Heuristic for which enemies can be reasoned with: goblins are organized
 * raiders with language and self-interest (lootTags include "goblin"), so
 * parley is on the table. Vermin, beasts, spirits, and stone/undead
 * constructs (rats, beetles, hounds, wisps, husks, slimes, gargoyles,
 * skeletons, leeches) cannot be talked to. Conservative on purpose — extend
 * this only when a place adds another clearly-sapient bestiary entry.
 */
function isParleyable(enemyDef: ReturnType<typeof getEnemy>): boolean {
  return enemyDef.lootTags.includes("goblin");
}

function buildSlipOption(lightState: LightState): EncounterOption {
  const available = lightState !== "dark";
  return {
    kind: "slipPast",
    label: "Slip along the far wall",
    available,
    unavailableReason: available ? undefined : "No light to slip by"
  };
}

function buildFallBackOption(cameFromRoomId?: string): EncounterOption {
  const available = Boolean(cameFromRoomId);
  return {
    kind: "fallBack",
    label: "Fall back the way you came",
    available,
    unavailableReason: available ? undefined : "Nowhere behind you"
  };
}

function buildParleyOption(enemyDef: ReturnType<typeof getEnemy>): EncounterOption {
  const available = isParleyable(enemyDef);
  return {
    kind: "parley",
    label: "Try words, not blades",
    available,
    unavailableReason: available ? undefined : "It won't understand you"
  };
}

function buildThrowRationsOption(carriedItems: ItemInstance[]): EncounterOption {
  const available = carriedItems.some(item => item.tags?.includes("ration"));
  return {
    kind: "throwRations",
    label: "Toss the rations and hope it bites",
    available,
    unavailableReason: available ? undefined : "No rations to spare"
  };
}

function buildLureOption(lightState: LightState, adjacentRoomIds: string[]): EncounterOption {
  const available = lightState === "bright" && adjacentRoomIds.length > 0;
  let reason: string | undefined;
  if (!available) {
    reason = lightState !== "bright" ? "Not enough light to lead it away" : "Nowhere to lead it";
  }
  return { kind: "lure", label: "Lead it toward the dark ahead", available, unavailableReason: reason };
}

const LIGHT_APPRAISAL_LINES: Record<LightState, string> = {
  bright: "The lamp holds steady; you have it in full view.",
  dim: "The lamp gutters low, and the shape of it blurs at the edges.",
  dark: "You cannot see it. You can hear it, close."
};

function buildAppraisalProse(enemyDef: ReturnType<typeof getEnemy>, lightState: LightState): string[] {
  return [enemyDef.description, LIGHT_APPRAISAL_LINES[lightState]];
}

/**
 * Open an encounter on contact with a hunter: appraisal prose plus the
 * context-assembled decision set (Pillar 4). Note this signature carries a
 * few params ("carriedItems", "alertnessLevel", "adjacentRoomIds", not in
 * the design doc's shorthand list) needed to derive throwRations/parley/lure
 * availability and the fall-back follow chance — see final report.
 */
export function openEncounter(params: {
  hunter: Hunter;
  character: Character;
  carriedItems: ItemInstance[];
  lightState: LightState;
  packRatio: number;
  cameFromRoomId?: string;
  alertnessLevel: number;
  adjacentRoomIds: string[];
  rng: Rng;
}): ActiveEncounter {
  const { hunter, carriedItems, lightState, cameFromRoomId, adjacentRoomIds, rng } = params;
  const enemyDef = getEnemy(hunter.enemyId);
  const enemyInstance = buildEnemyInstance(hunter.enemyId, rng.forkChild(`${hunter.id}:stats`), 1);

  const options: EncounterOption[] = [
    { kind: "fight", label: "Meet it head-on", available: true },
    buildSlipOption(lightState),
    buildFallBackOption(cameFromRoomId),
    buildParleyOption(enemyDef),
    buildThrowRationsOption(carriedItems),
    buildLureOption(lightState, adjacentRoomIds)
  ];

  return {
    hunterId: hunter.id,
    enemyId: hunter.enemyId,
    enemyHp: enemyInstance.hp,
    enemyMaxHp: enemyInstance.maxHp,
    beat: 1,
    options,
    log: buildAppraisalProse(enemyDef, lightState)
  };
}

// ---------------------------------------------------------------------------
// Swing primitives — thin wrappers over ../combat.ts and ../dice.ts, not
// reimplementations. Kept local because combat.ts's per-turn functions are
// tied to CombatState/EnemyInstance[] shapes the delve encounter doesn't use.
// ---------------------------------------------------------------------------

interface SwingResult {
  hit: boolean;
  damage: number;
}

function playerSwing(params: {
  character: Character;
  enemy: EnemyInstance;
  accuracyMod: number;
  damageMultiplier: number;
  lightState: LightState;
  rng: Rng;
}): SwingResult {
  const { character, enemy, accuracyMod, damageMultiplier, lightState, rng } = params;
  const roll = rollD20(rng);
  const accuracy = character.derivedStats.accuracy + accuracyMod + lightAccuracyPenalty(lightState);
  const total = roll + accuracy;
  const isCrit = roll === COMBAT_RULES.naturalCrit;
  const isFumble = roll === COMBAT_RULES.naturalFumble;
  const hit = !isFumble && (isCrit || total >= enemy.evasion);
  if (!hit) return { hit: false, damage: 0 };

  const weapon = character.equipped.weapon;
  const dice = guessWeaponDice(weapon ?? ({ tags: [] } as unknown as ItemInstance));
  let damage = rollDice(dice, rng) + getDamageBonus(character, weapon);
  if (isCrit) damage *= COMBAT_RULES.critMultiplier;
  damage = Math.max(1, damage - enemy.armor);
  damage = Math.max(0, Math.round(damage * damageMultiplier));
  return { hit: true, damage };
}

function enemySwing(params: {
  character: Character;
  enemy: EnemyInstance;
  accuracyMod: number;
  damageMultiplier: number;
  rng: Rng;
}): SwingResult {
  const { character, enemy, accuracyMod, damageMultiplier, rng } = params;
  const roll = rollD20(rng);
  const accuracy = enemy.accuracy + accuracyMod;
  const total = roll + accuracy;
  const isCrit = roll === COMBAT_RULES.naturalCrit;
  const isFumble = roll === COMBAT_RULES.naturalFumble;
  const hit = !isFumble && (isCrit || total >= character.derivedStats.evasion);
  if (!hit) return { hit: false, damage: 0 };

  let damage = rollDice(enemy.damageDice, rng);
  if (isCrit) damage *= COMBAT_RULES.critMultiplier;
  damage = Math.max(1, damage - character.derivedStats.armor);
  damage = Math.max(0, Math.round(damage * damageMultiplier));
  return { hit: true, damage };
}

function enemyInstanceFor(encounterEnemyId: string, hunterId: string, rng: Rng): EnemyInstance {
  // Only `instanceId` is randomized inside buildEnemyInstance; every other
  // stat is a pure function of (enemyId, depthTier). Forking off a fixed
  // label keeps this call from disturbing the rng stream the caller uses
  // for its own swing rolls.
  return buildEnemyInstance(encounterEnemyId, rng.forkChild(`${hunterId}:stats`), 1);
}

// ---------------------------------------------------------------------------
// Non-fight option resolution
// ---------------------------------------------------------------------------

function degradeToFightWithFreeExchange(params: {
  encounter: ActiveEncounter;
  character: Character;
  rng: Rng;
  roomId: string;
  prose: string[];
}): DelveEncounterBeatResult {
  const { encounter, character, rng, roomId, prose } = params;
  const enemy = enemyInstanceFor(encounter.enemyId, encounter.hunterId, rng);
  // The enemy gets an unanswered swing — the option failed because it saw
  // you first, so it strikes before you can set your feet. +1 accuracy
  // documents that opening advantage.
  const swing = enemySwing({ character, enemy, accuracyMod: 1, damageMultiplier: 1, rng });
  const playerHpDelta = -swing.damage;
  const noise: NoiseEvent = { roomId, loudness: NOISE_LOUDNESS.fightBeat, cause: "fightBeat" };
  const lines = [
    ...prose,
    swing.hit ? "It gets a free strike in before you can answer." : "It lunges, but you twist clear of the worst of it."
  ];
  const playerHpAfter = character.hp + playerHpDelta;
  if (playerHpAfter <= 0) {
    return { prose: lines, playerHpDelta, enemyHpDelta: 0, noise, over: true, outcome: "dead", oilAction: "encounterBeat" };
  }
  return { prose: lines, playerHpDelta, enemyHpDelta: 0, noise, over: false, oilAction: "encounterBeat" };
}

/**
 * Resolve a non-fight decision (slipPast / fallBack / parley / throwRations /
 * lure). A failed slipPast or fallBack — and, for consistency, a failed
 * parley/throwRations/lure — degrades into the fight at beat 1 with the
 * enemy getting a free exchange, per the design doc.
 */
export function resolveOption(params: {
  encounter: ActiveEncounter;
  kind: Exclude<EncounterOptionKind, "fight">;
  character: Character;
  lightState: LightState;
  packRatio: number;
  alertnessLevel: number;
  rng: Rng;
  roomId: string;
}): DelveEncounterBeatResult {
  const { encounter, kind, character, lightState, packRatio, alertnessLevel, rng, roomId } = params;
  const enemyLabel = getEnemy(encounter.enemyId).name;
  const agilityMod = getModifier(character.abilityScores.agility);

  switch (kind) {
    case "slipPast": {
      const chance = slipChance({ packRatio, lightState, agilityModifier: agilityMod });
      if (rng.nextFloat() < chance) {
        const noise: NoiseEvent = { roomId, loudness: moveNoiseLoudness({ packRatio, lightState }), cause: "move" };
        return {
          prose: [`You slip past ${enemyLabel} while it's looking the wrong way.`, "The passage swallows the sound of your steps."],
          playerHpDelta: 0,
          enemyHpDelta: 0,
          noise,
          over: true,
          outcome: "escaped",
          oilAction: "encounterBeat"
        };
      }
      return degradeToFightWithFreeExchange({
        encounter,
        character,
        rng,
        roomId,
        prose: ["You break from cover a half-step too soon.", `${enemyLabel} turns before you clear the wall.`]
      });
    }

    case "fallBack": {
      const chance = 1 - hunterFollowChance(alertnessLevel);
      if (rng.nextFloat() < chance) {
        const noise: NoiseEvent = { roomId, loudness: moveNoiseLoudness({ packRatio, lightState }), cause: "move" };
        return {
          prose: ["You give ground, back through the way you came.", `${enemyLabel} doesn't follow.`],
          playerHpDelta: 0,
          enemyHpDelta: 0,
          noise,
          over: true,
          outcome: "escaped",
          oilAction: "encounterBeat"
        };
      }
      return degradeToFightWithFreeExchange({
        encounter,
        character,
        rng,
        roomId,
        prose: [`You give ground, but ${enemyLabel} is faster.`]
      });
    }

    case "parley": {
      const chance = parleyChance(character);
      if (rng.nextFloat() < chance) {
        const noise: NoiseEvent = { roomId, loudness: 1, cause: "other" };
        return {
          prose: ["You raise empty hands and speak low, offering terms.", `${enemyLabel} weighs it, then backs off, muttering.`],
          playerHpDelta: 0,
          enemyHpDelta: 0,
          noise,
          over: true,
          outcome: "escaped",
          oilAction: "encounterBeat"
        };
      }
      return degradeToFightWithFreeExchange({
        encounter,
        character,
        rng,
        roomId,
        prose: [`You try words. ${enemyLabel} isn't in the mood.`]
      });
    }

    case "throwRations": {
      if (rng.nextFloat() < THROW_RATIONS_CHANCE) {
        const noise: NoiseEvent = { roomId, loudness: 2, cause: "other" };
        return {
          prose: ["You lob the rations into the dark.", `${enemyLabel} scrabbles after the food, forgetting you.`],
          playerHpDelta: 0,
          enemyHpDelta: 0,
          noise,
          over: true,
          outcome: "escaped",
          oilAction: "encounterBeat"
        };
      }
      return degradeToFightWithFreeExchange({
        encounter,
        character,
        rng,
        roomId,
        prose: [`The rations hit the floor. ${enemyLabel} doesn't care.`]
      });
    }

    case "lure": {
      const chance = lureChance(agilityMod);
      if (rng.nextFloat() < chance) {
        const noise: NoiseEvent = { roomId, loudness: 2, cause: "other" };
        return {
          prose: ["You feint toward the next passage and let it give chase.", `${enemyLabel} takes the bait, blundering past you.`],
          playerHpDelta: 0,
          enemyHpDelta: 0,
          noise,
          over: true,
          outcome: "escaped",
          oilAction: "encounterBeat"
        };
      }
      return degradeToFightWithFreeExchange({
        encounter,
        character,
        rng,
        roomId,
        prose: ["It doesn't take the feint."]
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Fight-beat resolution
// ---------------------------------------------------------------------------

const STANCE_VERBS: Record<"press" | "guard", { hit: string; miss: string }> = {
  press: { hit: "You bull in and put steel where it counts.", miss: "You bull in, but it turns aside at the last." },
  guard: { hit: "You hold the guard and answer where you can.", miss: "You hold the guard; nothing gets through." }
};

function buildFightBeatProse(params: {
  stance: "press" | "guard";
  playerDamage: number;
  enemyDamage: number;
  lightState: LightState;
  outcome?: EncounterBeatResult["outcome"];
}): string[] {
  const { stance, playerDamage, enemyDamage, lightState, outcome } = params;
  const lines: string[] = [STANCE_VERBS[stance][playerDamage > 0 ? "hit" : "miss"]];
  lines.push(enemyDamage > 0 ? "It answers back, and the blow lands." : "It swings and finds nothing but air.");
  if (lightState === "dim" && playerDamage === 0) {
    lines.push("The dim lamp cost you the opening.");
  }
  if (outcome === "won") {
    lines.push("It goes down and stays down.");
  } else if (outcome === "dead") {
    lines.push("Your lamp gutters. The floor tilts up to meet you.");
  }
  return lines;
}

function buildBreakAwayProse(params: { success: boolean; parting: SwingResult; lightState: LightState }): string[] {
  const lines: string[] = [
    params.success ? "You wrench free of the exchange." : "You try to wrench free, but it keeps hold of the fight."
  ];
  lines.push(params.parting.hit ? "It gets one parting cut in as you go." : "It swings after you and misses.");
  if (params.lightState === "dark" && params.parting.hit) {
    lines.push("You can't see how bad it is, only that it hurts.");
  }
  return lines;
}

/**
 * Resolve one fight beat. Press and guard aggregate ~2.5 swings per side
 * over the existing combat math (see StanceProfile above); breakAway
 * attempts to end the encounter outright, taking a parting exchange either
 * way and always emitting "flee" noise (loudness 4) rather than "fightBeat"
 * (loudness 3), per the design doc's noise table.
 */
export function resolveFightBeat(params: {
  encounter: ActiveEncounter;
  stance: FightStance;
  character: Character;
  rng: Rng;
  lightState: LightState;
  roomId: string;
}): DelveEncounterBeatResult {
  const { encounter, stance, character, rng, lightState, roomId } = params;
  const enemy = enemyInstanceFor(encounter.enemyId, encounter.hunterId, rng);

  if (stance === "breakAway") {
    const enemyHpRatio = encounter.enemyMaxHp > 0 ? encounter.enemyHp / encounter.enemyMaxHp : 0;
    const agilityMod = getModifier(character.abilityScores.agility);
    const chance = breakAwayChance(enemyHpRatio, agilityMod);
    const success = rng.nextFloat() < chance;
    // A parting exchange happens regardless of whether the break succeeds —
    // glancing, since you're already moving (0.75x damage).
    const parting = enemySwing({ character, enemy, accuracyMod: 0, damageMultiplier: 0.75, rng });
    const playerHpDelta = -parting.damage;
    const noise: NoiseEvent = { roomId, loudness: NOISE_LOUDNESS.flee, cause: "flee" };
    const prose = buildBreakAwayProse({ success, parting, lightState });
    const playerHpAfter = character.hp + playerHpDelta;
    if (playerHpAfter <= 0) {
      return { prose, playerHpDelta, enemyHpDelta: 0, noise, over: true, outcome: "dead", oilAction: "encounterBeat" };
    }
    if (success) {
      return { prose, playerHpDelta, enemyHpDelta: 0, noise, over: true, outcome: "escaped", oilAction: "encounterBeat" };
    }
    return { prose, playerHpDelta, enemyHpDelta: 0, noise, over: false, oilAction: "encounterBeat" };
  }

  const profile = STANCE_PROFILES[stance];

  let playerDamage = 0;
  const playerSwingCount = Math.floor(profile.playerSwings) +
    (rng.nextFloat() < profile.playerSwings - Math.floor(profile.playerSwings) ? 1 : 0);
  for (let i = 0; i < playerSwingCount; i++) {
    const swing = playerSwing({
      character,
      enemy,
      accuracyMod: profile.playerAccuracyMod,
      damageMultiplier: profile.playerDamageMultiplier,
      lightState,
      rng
    });
    playerDamage += swing.damage;
  }

  let enemyDamage = 0;
  let anyEnemyMiss = false;
  const enemySwingCount = Math.floor(profile.enemySwings) +
    (rng.nextFloat() < profile.enemySwings - Math.floor(profile.enemySwings) ? 1 : 0);
  for (let i = 0; i < enemySwingCount; i++) {
    const swing = enemySwing({
      character,
      enemy,
      accuracyMod: profile.enemyAccuracyMod,
      damageMultiplier: profile.enemyDamageMultiplier,
      rng
    });
    enemyDamage += swing.damage;
    if (!swing.hit) anyEnemyMiss = true;
  }

  if (stance === "guard" && anyEnemyMiss) {
    // Small counter: a whiffed enemy swing while holding the guard earns one
    // extra, weaker player swing (low accuracy bonus offset, reduced damage).
    const counter = playerSwing({
      character,
      enemy,
      accuracyMod: -2,
      damageMultiplier: 0.6,
      lightState,
      rng
    });
    playerDamage += counter.damage;
  }

  const enemyHpDelta = -playerDamage;
  const playerHpDelta = -enemyDamage;
  const noise: NoiseEvent = { roomId, loudness: NOISE_LOUDNESS.fightBeat, cause: "fightBeat" };
  const enemyHpAfter = Math.max(0, encounter.enemyHp + enemyHpDelta);
  const playerHpAfter = character.hp + playerHpDelta;

  let over = false;
  let outcome: EncounterBeatResult["outcome"];
  if (playerHpAfter <= 0) {
    over = true;
    outcome = "dead";
  } else if (enemyHpAfter <= 0) {
    over = true;
    outcome = "won";
  }

  const prose = buildFightBeatProse({ stance, playerDamage, enemyDamage, lightState, outcome });

  return { prose, playerHpDelta, enemyHpDelta, noise, over, outcome, oilAction: "encounterBeat" };
}
