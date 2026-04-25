import { getCombatActionDefinition } from "../data/combatActions";
import { COMBAT_ACTION_RULES, COMBAT_RULES } from "./constants";
import { getModifier } from "./characterMath";
import { getUnlockedCombatActions } from "./talents";
import type {
  Character,
  CombatActionDefinition,
  CombatActionRuntimeState,
  CombatState,
  EnemyInstance
} from "./types";
import type { Rng } from "./rng";

const FLEE_CHANCE_MIN = 0.1;
const FLEE_CHANCE_MAX = 0.95;

export function getAvailableCombatActions(params: {
  character: Character;
  combatState: CombatState;
}): CombatActionDefinition[] {
  if (params.combatState.over) return [];
  return getUnlockedCombatActions(params.character);
}

export function canUseCombatAction(params: {
  character: Character;
  combatState: CombatState;
  actionId: string;
}): {
  canUse: boolean;
  reason?: string;
} {
  if (params.combatState.over) return { canUse: false, reason: "Combat is already over." };

  const action = getAvailableCombatActions(params).find(candidate => candidate.id === params.actionId);
  if (!action) return { canUse: false, reason: "Action is not unlocked." };

  const runtime = getRuntimeForAction(params.combatState, params.actionId);
  if (action.oncePerCombat && runtime?.usedThisCombat) {
    return { canUse: false, reason: "Already used this combat." };
  }
  if ((runtime?.remainingCooldown ?? 0) > 0) {
    return { canUse: false, reason: `Cooldown: ${runtime!.remainingCooldown} turn(s).` };
  }
  if (action.id === "shield-bash" && !hasShield(params.character)) {
    return { canUse: false, reason: "Requires a shield or defensive offhand item." };
  }
  if (action.target === "singleEnemy" && !params.combatState.enemies.some(enemy => enemy.hp > 0)) {
    return { canUse: false, reason: "No living target." };
  }

  return { canUse: true };
}

export function resolveCombatAction(params: {
  character: Character;
  combatState: CombatState;
  actionId: string;
  targetEnemyInstanceId?: string;
  rng: Rng;
}): {
  character: Character;
  combatState: CombatState;
  logMessages: string[];
} {
  const action = getCombatActionDefinition(params.actionId);
  const check = canUseCombatAction(params);
  if (!action || !check.canUse) {
    const message = check.reason ?? "Action cannot be used.";
    return {
      character: params.character,
      combatState: {
        ...params.combatState,
        log: [...params.combatState.log, message]
      },
      logMessages: [message]
    };
  }

  let character: Character = { ...params.character };
  const logMessages: string[] = [action.logMessage];
  let combatState: CombatState = {
    ...params.combatState,
    enemies: params.combatState.enemies.map(enemy => ({ ...enemy })),
    log: [...params.combatState.log, action.logMessage],
    actionRuntimeState: tickCooldowns(params.combatState.actionRuntimeState ?? [], action.id),
    actionThreatDeltas: [...(params.combatState.actionThreatDeltas ?? [])]
  };

  if (action.id === "defend") {
    combatState.playerDefending = true;
  } else if (action.type === "escape") {
    const chance = clampFleeChance(
      COMBAT_RULES.fleeBaseChance +
        getModifier(character.abilityScores.agility) * 0.05 +
        (action.fleeChanceModifier ?? 0)
    );
    if (params.rng.nextFloat() < chance) {
      const message = "You break away into the dark.";
      combatState.log.push(message);
      logMessages.push(message);
      combatState.over = true;
      combatState.outcome = "fled";
    } else {
      const message = "You fail to find a clean exit.";
      combatState.log.push(message);
      logMessages.push(message);
      combatState.playerDefending = false;
    }
  } else if (action.healingAmount && action.healingAmount > 0) {
    const before = character.hp;
    character = {
      ...character,
      hp: Math.min(character.maxHp, character.hp + action.healingAmount)
    };
    const message = `${character.name} recovers ${character.hp - before} HP.`;
    combatState.log.push(message);
    logMessages.push(message);
    combatState.playerDefending = false;
  } else if (action.target === "allEnemies") {
    for (const enemy of combatState.enemies.filter(enemy => enemy.hp > 0)) {
      const message = resolveStrike({
        character,
        enemy,
        action,
        rng: params.rng
      });
      combatState.log.push(message);
      logMessages.push(message);
    }
    combatState.playerDefending = false;
  } else if (action.target === "singleEnemy") {
    const target = selectTarget(combatState.enemies, params.targetEnemyInstanceId);
    if (!target) {
      const message = "There is no living target.";
      combatState.log.push(message);
      logMessages.push(message);
    } else {
      const message = resolveStrike({
        character,
        enemy: target,
        action,
        rng: params.rng
      });
      combatState.log.push(message);
      logMessages.push(message);
    }
    combatState.playerDefending = false;
  }

  if (action.threatChange && action.threatChange > 0) {
    const message = `${action.name} stirs the dungeon (+${action.threatChange} threat).`;
    combatState.actionThreatDeltas = [
      ...(combatState.actionThreatDeltas ?? []),
      {
        actionId: action.id,
        amount: action.threatChange,
        reason: action.type === "magic" ? "usedLoudMagic" : "debug",
        message
      }
    ];
    combatState.log.push(message);
    logMessages.push(message);
  }

  combatState.actionRuntimeState = markActionUsed(
    combatState.actionRuntimeState ?? [],
    action
  );

  if (!combatState.over && combatState.enemies.every(enemy => enemy.hp <= 0)) {
    combatState = {
      ...combatState,
      over: true,
      outcome: "victory",
      log: [...combatState.log, "The room is yours."]
    };
    logMessages.push("The room is yours.");
  }

  if (!combatState.over) {
    combatState = { ...combatState, turn: combatState.turn + 1 };
  }

  return { character, combatState, logMessages };
}

function resolveStrike(params: {
  character: Character;
  enemy: EnemyInstance;
  action: CombatActionDefinition;
  rng: Rng;
}): string {
  const roll = params.rng.nextInt(1, 20);
  const accuracy = params.character.derivedStats.accuracy + (params.action.accuracyModifier ?? 0);
  const total = roll + accuracy;
  const isCrit = roll === COMBAT_RULES.naturalCrit;
  const isFumble = roll === COMBAT_RULES.naturalFumble;
  const hit = !isFumble && (isCrit || total >= params.enemy.evasion);

  if (!hit) {
    return `${params.action.name} misses ${params.enemy.name} (rolled ${roll}${formatSigned(accuracy)}=${total}).`;
  }

  let damage = baseActionDamage(params.character, params.action, params.rng);
  if (isCrit) damage *= COMBAT_RULES.critMultiplier;
  damage = Math.max(1, damage - params.enemy.armor);
  params.enemy.hp = Math.max(0, params.enemy.hp - damage);
  const defeated = params.enemy.hp <= 0 ? ` ${params.enemy.name} falls.` : "";
  const crit = isCrit ? " (crit!)" : "";
  return `${params.action.name} hits ${params.enemy.name} for ${damage}${crit}.${defeated}`;
}

function baseActionDamage(
  character: Character,
  action: CombatActionDefinition,
  rng: Rng
): number {
  const classBonus = action.type === "magic"
    ? Math.max(0, character.derivedStats.magicPower)
    : Math.max(0, getModifier(character.abilityScores.might));
  const rolled = rng.nextInt(1, 6);
  const modified = (rolled + classBonus + (action.damageModifier ?? 0)) * (action.damageMultiplier ?? 1);
  return Math.max(1, Math.floor(modified));
}

function selectTarget(
  enemies: EnemyInstance[],
  targetEnemyInstanceId?: string
): EnemyInstance | undefined {
  if (targetEnemyInstanceId) {
    const target = enemies.find(enemy => enemy.instanceId === targetEnemyInstanceId && enemy.hp > 0);
    if (target) return target;
  }
  return enemies.find(enemy => enemy.hp > 0);
}

function getRuntimeForAction(
  combatState: CombatState,
  actionId: string
): CombatActionRuntimeState | undefined {
  return combatState.actionRuntimeState?.find(runtime => runtime.actionId === actionId);
}

function tickCooldowns(
  runtimeStates: CombatActionRuntimeState[],
  actionIdBeingUsed: string
): CombatActionRuntimeState[] {
  return runtimeStates.map(runtime =>
    runtime.actionId === actionIdBeingUsed
      ? runtime
      : {
          ...runtime,
          remainingCooldown: Math.max(0, runtime.remainingCooldown - 1)
        }
  );
}

function markActionUsed(
  runtimeStates: CombatActionRuntimeState[],
  action: CombatActionDefinition
): CombatActionRuntimeState[] {
  const cooldown = Math.min(
    action.cooldownTurns ?? 0,
    COMBAT_ACTION_RULES.maxCooldownTurns
  );
  const existing = runtimeStates.find(runtime => runtime.actionId === action.id);
  const nextRuntime: CombatActionRuntimeState = {
    actionId: action.id,
    remainingCooldown: cooldown,
    usedThisCombat: true
  };
  if (!existing) return [...runtimeStates, nextRuntime];
  return runtimeStates.map(runtime => runtime.actionId === action.id ? nextRuntime : runtime);
}

function hasShield(character: Character): boolean {
  const offhand = character.equipped.offhand;
  return Boolean(
    offhand &&
      (offhand.category === "shield" ||
        offhand.tags?.includes("shield") ||
        offhand.tags?.includes("defensive"))
  );
}

function clampFleeChance(chance: number): number {
  if (chance < FLEE_CHANCE_MIN) return FLEE_CHANCE_MIN;
  if (chance > FLEE_CHANCE_MAX) return FLEE_CHANCE_MAX;
  return chance;
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
