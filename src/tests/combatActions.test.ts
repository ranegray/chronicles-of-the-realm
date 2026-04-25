import { describe, expect, it } from "vitest";
import {
  canUseCombatAction,
  getAvailableCombatActions,
  resolveCombatAction
} from "../game/combatActions";
import { createRng } from "../game/rng";
import type { Character, CharacterLevel, ClassId, CombatState, EnemyInstance } from "../game/types";

function buildCharacter(
  classId: ClassId,
  learnedTalentIds: string[] = [],
  activeCombatActionIds: string[] = [],
  level: CharacterLevel = 7
): Character {
  return {
    id: `${classId}-combat-actions`,
    name: "Tester",
    ancestryId: "human",
    classId,
    level,
    xp: 0,
    abilityScores: {
      might: 14,
      agility: 14,
      endurance: 12,
      intellect: 14,
      will: 12,
      presence: 12
    },
    derivedStats: {
      maxHp: 28,
      armor: 1,
      accuracy: 8,
      evasion: 12,
      critChance: 5,
      carryCapacity: 20,
      magicPower: 3,
      trapSense: 2
    },
    hp: 18,
    maxHp: 28,
    equipped: {
      offhand: {
        instanceId: "shield-1",
        templateId: "shield-test",
        name: "Test Shield",
        category: "shield",
        rarity: "common",
        description: "A test shield.",
        value: 1,
        weight: 1,
        stackable: false,
        quantity: 1,
        tags: ["shield", "defensive"]
      }
    },
    progression: {
      level,
      xp: 0,
      totalXpEarned: 0,
      unspentTalentPoints: 0,
      spentTalentPoints: learnedTalentIds.length,
      learnedTalentIds,
      activeCombatActionIds,
      unlockedPassiveIds: [],
      unlockedBuildFlags: {}
    }
  };
}

function enemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  return {
    instanceId: "enemy-1",
    enemyId: "training-dummy",
    name: "Training Dummy",
    hp: 12,
    maxHp: 12,
    armor: 0,
    accuracy: 0,
    evasion: 1,
    damageDice: { count: 1, sides: 4 },
    ...overrides
  };
}

function combatState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    encounterId: "training",
    enemies: [enemy()],
    playerDefending: false,
    turn: 1,
    log: [],
    over: false,
    fromRoomId: "room-1",
    ...overrides
  };
}

describe("combat action definitions and runtime helpers", () => {
  it("does not show locked class actions", () => {
    const warrior = buildCharacter("warrior");
    const actions = getAvailableCombatActions({ character: warrior, combatState: combatState() });
    expect(actions.map(action => action.id)).toContain("attack");
    expect(actions.map(action => action.id)).not.toContain("shield-bash");
  });

  it("shows learned class actions", () => {
    const warrior = buildCharacter("warrior", ["warrior-shield-bash"], ["shield-bash"]);
    const actions = getAvailableCombatActions({ character: warrior, combatState: combatState() });
    expect(actions.map(action => action.id)).toContain("shield-bash");
  });

  it("prevents once-per-combat actions from being reused", () => {
    const scout = buildCharacter("scout", ["scout-ambusher"], ["ambush-strike"]);
    const first = resolveCombatAction({
      character: scout,
      combatState: combatState(),
      actionId: "ambush-strike",
      targetEnemyInstanceId: "enemy-1",
      rng: createRng("ambush")
    });
    expect(canUseCombatAction({
      character: first.character,
      combatState: first.combatState,
      actionId: "ambush-strike"
    }).canUse).toBe(false);
  });

  it("puts cooldown actions on cooldown after use", () => {
    const warrior = buildCharacter("warrior", ["warrior-shield-bash"], ["shield-bash"]);
    const result = resolveCombatAction({
      character: warrior,
      combatState: combatState(),
      actionId: "shield-bash",
      targetEnemyInstanceId: "enemy-1",
      rng: createRng("shield-bash")
    });
    const check = canUseCombatAction({
      character: result.character,
      combatState: result.combatState,
      actionId: "shield-bash"
    });
    expect(check.canUse).toBe(false);
    expect(check.reason).toContain("Cooldown");
  });

  it("modifies combat state and writes combat log entries", () => {
    const devout = buildCharacter("devout", ["devout-field-prayer"], ["field-prayer"]);
    const result = resolveCombatAction({
      character: devout,
      combatState: combatState(),
      actionId: "field-prayer",
      rng: createRng("prayer")
    });
    expect(result.character.hp).toBeGreaterThan(devout.hp);
    expect(result.combatState.log.some(line => line.includes("prayer"))).toBe(true);
  });

  it("applies threat-changing action deltas", () => {
    const arcanist = buildCharacter("arcanist", ["arcanist-cinder-bolt"], ["cinder-bolt"]);
    const result = resolveCombatAction({
      character: arcanist,
      combatState: combatState(),
      actionId: "cinder-bolt",
      targetEnemyInstanceId: "enemy-1",
      rng: createRng("cinder")
    });
    expect(result.combatState.actionThreatDeltas).toContainEqual(
      expect.objectContaining({
        actionId: "cinder-bolt",
        amount: 2,
        reason: "usedLoudMagic"
      })
    );
  });
});
