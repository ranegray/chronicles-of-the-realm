import type {
  Character,
  CombatState,
  EnemyInstance,
  EncounterDefinition,
  ItemInstance,
  ThreatChangeReason,
  ThreatLevel
} from "./types";
import { COMBAT_RULES, THREAT_RULES } from "./constants";
import { rollD20, rollDice } from "./dice";
import { buildEncounterEnemies } from "./encounterGenerator";
import { getModifier } from "./characterMath";
import { rollConsumableHealAmount } from "./itemEffects";
import { getThreatModifiers } from "./threat";
import type { Rng } from "./rng";

export type CombatAction =
  | { kind: "attack"; targetId: string }
  | { kind: "powerAttack"; targetId: string }
  | { kind: "defend" }
  | { kind: "useItem"; itemInstanceId: string }
  | { kind: "flee" };

export interface CombatThreatDelta {
  amount: number;
  reason: ThreatChangeReason;
  message?: string;
}

export interface CombatResolveResult {
  combat: CombatState;
  player: Character;
  consumedItems: string[];
  threatDeltas: CombatThreatDelta[];
}

const FLEE_CHANCE_MIN = 0.1;
const FLEE_CHANCE_MAX = 0.85;

export function startCombat(
  encounter: EncounterDefinition,
  rng: Rng,
  fromRoomId: string
): CombatState {
  const enemies = buildEncounterEnemies(encounter, rng);
  return {
    encounterId: encounter.id,
    enemies,
    playerDefending: false,
    turn: 1,
    log: [`A ${encounter.name} blocks the way.`],
    over: false,
    fromRoomId
  };
}

function aliveEnemies(state: CombatState): EnemyInstance[] {
  return state.enemies.filter(e => e.hp > 0);
}

export function resolvePlayerAction(
  state: CombatState,
  player: Character,
  action: CombatAction,
  rng: Rng,
  carriedItems: ItemInstance[] = [],
  threatLevel: ThreatLevel = 0
): CombatResolveResult {
  if (state.over) {
    return { combat: state, player, consumedItems: [], threatDeltas: [] };
  }
  let next: CombatState = { ...state, log: [...state.log] };
  let nextPlayer: Character = { ...player };
  const consumed: string[] = [];
  const threatDeltas: CombatThreatDelta[] = [];

  if (action.kind === "attack" || action.kind === "powerAttack") {
    const isPowerAttack = action.kind === "powerAttack";
    const target = next.enemies.find(e => e.instanceId === action.targetId && e.hp > 0);
    if (!target) {
      next.log.push("There is no living target.");
      return { combat: next, player: nextPlayer, consumedItems: consumed, threatDeltas };
    }
    const roll = rollD20(rng);
    const accuracy = nextPlayer.derivedStats.accuracy - (isPowerAttack ? 2 : 0);
    const total = roll + accuracy;
    const isCrit = roll === COMBAT_RULES.naturalCrit;
    const isFumble = roll === COMBAT_RULES.naturalFumble;
    const hit = !isFumble && (isCrit || total >= target.evasion);

    if (!hit) {
      const verb = isPowerAttack ? "overcommit" : "swing";
      next.log.push(`You ${verb} (rolled ${roll}${formatSigned(accuracy)}=${total}) - miss.`);
    } else {
      const weapon = nextPlayer.equipped.weapon;
      const dmgFormula = weapon ? guessWeaponDice(weapon) : { count: 1, sides: 4 };
      let damage = rollDice(dmgFormula, rng) + getDamageBonus(nextPlayer, weapon);
      if (isPowerAttack) damage += 2 + Math.floor(nextPlayer.level / 2);
      const gearCrit = !isCrit && nextPlayer.derivedStats.critChance > 0 &&
        rng.nextInt(1, 100) <= nextPlayer.derivedStats.critChance;
      if (isCrit || gearCrit) damage *= COMBAT_RULES.critMultiplier;
      damage = Math.max(1, damage - target.armor);
      target.hp = Math.max(0, target.hp - damage);
      const critTxt = isCrit || gearCrit ? " (crit!)" : "";
      const verb = isPowerAttack ? "hammer" : "strike";
      next.log.push(`You ${verb} ${target.name} for ${damage}${critTxt}.`);
      if (target.hp <= 0) next.log.push(`${target.name} falls.`);
    }
    next.playerDefending = false;
  } else if (action.kind === "defend") {
    next.log.push("You set yourself, ready to absorb.");
    next.playerDefending = true;
  } else if (action.kind === "useItem") {
    const item = findInInventoryAndEquipped(nextPlayer, action.itemInstanceId, carriedItems);
    if (!item || item.category !== "consumable") {
      next.log.push("You fumble for nothing.");
    } else {
      const heal = rollConsumableHealAmount(item, rng);
      if (heal > 0) {
        const newHp = Math.min(nextPlayer.maxHp, nextPlayer.hp + heal);
        if (newHp === nextPlayer.hp) {
          next.log.push(`${nextPlayer.name} is already at full health.`);
          next.playerDefending = false;
          return { combat: next, player: nextPlayer, consumedItems: consumed, threatDeltas };
        }
        nextPlayer = { ...nextPlayer, hp: newHp };
        next.log.push(`You drink ${item.name} (+${heal} HP).`);
        consumed.push(item.instanceId);
      } else {
        next.log.push(`${item.name} does nothing useful here.`);
      }
    }
    next.playerDefending = false;
  } else if (action.kind === "flee") {
    const roll = rng.nextFloat();
    const chance = computeFleeChance(nextPlayer, threatLevel);
    if (roll < chance) {
      next.log.push("You break away into the dark.");
      next.over = true;
      next.outcome = "fled";
      threatDeltas.push({
        amount: THREAT_RULES.gains.fledCombat,
        reason: "fledCombat",
        message: "Your retreat rings through the halls."
      });
      return { combat: next, player: nextPlayer, consumedItems: consumed, threatDeltas };
    } else {
      next.log.push("You stumble. The thing in front of you laughs.");
    }
    next.playerDefending = false;
  }

  if (aliveEnemies(next).length === 0) {
    next.over = true;
    next.outcome = "victory";
    next.log.push("The room is yours.");
    return { combat: next, player: nextPlayer, consumedItems: consumed, threatDeltas };
  }

  // Enemy turn
  const enemyResult = resolveEnemyTurn(next, nextPlayer, rng);
  next = enemyResult.combat;
  nextPlayer = enemyResult.player;

  const roundJustCompleted = next.turn;
  next.turn += 1;

  if (!next.over && roundJustCompleted > THREAT_RULES.gains.extendedCombatAfterRound) {
    const amount = THREAT_RULES.gains.extendedCombatPerRound;
    threatDeltas.push({
      amount,
      reason: "extendedCombat",
      message: `The fight drags on (round ${roundJustCompleted}).`
    });
    next.log.push(`The dungeon grows restless as the fight drags on (+${amount} threat).`);
  }

  return { combat: next, player: nextPlayer, consumedItems: consumed, threatDeltas };
}

export function computeFleeChance(player: Character, threatLevel: ThreatLevel): number {
  const base = COMBAT_RULES.fleeBaseChance + getModifier(player.abilityScores.agility) * 0.05;
  const penalty = getThreatModifiers(threatLevel).fleeChancePenalty;
  const chance = base - penalty;
  if (chance < FLEE_CHANCE_MIN) return FLEE_CHANCE_MIN;
  if (chance > FLEE_CHANCE_MAX) return FLEE_CHANCE_MAX;
  return chance;
}

export function resolveEnemyTurn(
  state: CombatState,
  player: Character,
  rng: Rng
): { combat: CombatState; player: Character } {
  const next: CombatState = { ...state, log: [...state.log] };
  let nextPlayer = { ...player };
  for (const enemy of aliveEnemies(next)) {
    const roll = rollD20(rng);
    const total = roll + enemy.accuracy;
    const isCrit = roll === COMBAT_RULES.naturalCrit;
    const isFumble = roll === COMBAT_RULES.naturalFumble;
    const target = nextPlayer.derivedStats.evasion;
    const hit = !isFumble && (isCrit || total >= target);
    if (!hit) {
      next.log.push(`${enemy.name} attacks (rolled ${roll}+${enemy.accuracy}=${total}) — misses.`);
      continue;
    }
    let damage = rollDice(enemy.damageDice, rng);
    if (isCrit) damage *= COMBAT_RULES.critMultiplier;
    damage = Math.max(1, damage - nextPlayer.derivedStats.armor);
    if (next.playerDefending) {
      damage = Math.ceil(damage * (1 - COMBAT_RULES.defendDamageReduction));
    }
    nextPlayer.hp = Math.max(0, nextPlayer.hp - damage);
    const critTxt = isCrit ? " (crit!)" : "";
    next.log.push(`${enemy.name} hits you for ${damage}${critTxt}.`);
    if (nextPlayer.hp <= 0) {
      next.log.push("Your vision dims and the lantern goes out.");
      next.over = true;
      next.outcome = "defeat";
      break;
    }
  }
  return { combat: next, player: nextPlayer };
}

export function checkCombatEnd(state: CombatState, player: Character): boolean {
  if (state.over) return true;
  if (player.hp <= 0) return true;
  if (aliveEnemies(state).length === 0) return true;
  return false;
}

function findInInventoryAndEquipped(
  player: Character,
  instanceId: string,
  carriedItems: ItemInstance[]
): ItemInstance | undefined {
  const carried = carriedItems.find(i => i.instanceId === instanceId);
  if (carried) return carried;
  const slots = player.equipped;
  const equippedItems = [slots.weapon, slots.offhand, slots.armor, slots.trinket1, slots.trinket2].filter(Boolean) as ItemInstance[];
  return equippedItems.find(i => i.instanceId === instanceId);
}

function guessWeaponDice(weapon: ItemInstance): { count: number; sides: number } {
  if (weapon.tags?.includes("two-handed")) return { count: 1, sides: 10 };
  if (weapon.tags?.includes("blade")) return { count: 1, sides: 8 };
  if (weapon.tags?.includes("blunt")) return { count: 1, sides: 8 };
  if (weapon.tags?.includes("axe")) return { count: 1, sides: 8 };
  if (weapon.tags?.includes("bow")) return { count: 1, sides: 8 };
  if (weapon.tags?.includes("magic")) return { count: 1, sides: 6 };
  return { count: 1, sides: 6 };
}

function getDamageBonus(player: Character, weapon?: ItemInstance): number {
  if (weapon?.tags?.includes("magic")) {
    return Math.max(0, player.derivedStats.magicPower);
  }
  return getModifier(player.abilityScores.might);
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
