import type { CombatActionDefinition } from "../game/types";

export const COMBAT_ACTION_DEFINITIONS: CombatActionDefinition[] = [
  {
    id: "attack",
    name: "Attack",
    description: "Make a direct weapon attack.",
    type: "basic",
    target: "singleEnemy",
    logMessage: "You strike at the enemy."
  },
  {
    id: "defend",
    name: "Defend",
    description: "Brace yourself and reduce incoming damage.",
    type: "defensive",
    target: "self",
    logMessage: "You set yourself, ready to absorb."
  },
  {
    id: "use-item",
    name: "Use Item",
    description: "Use a carried consumable.",
    type: "utility",
    target: "self",
    logMessage: "You reach for a supply."
  },
  {
    id: "flee",
    name: "Flee",
    description: "Try to escape the combat.",
    type: "escape",
    target: "self",
    logMessage: "You look for a way out."
  },
  {
    id: "shield-bash",
    name: "Shield Bash",
    description: "Strike with your shield, dealing light damage and disrupting the enemy.",
    classId: "warrior",
    type: "class",
    target: "singleEnemy",
    requiredTalentId: "warrior-shield-bash",
    accuracyModifier: 0,
    damageModifier: -1,
    cooldownTurns: 2,
    logMessage: "You slam your shield forward."
  },
  {
    id: "cleaving-strike",
    name: "Cleaving Strike",
    description: "A heavy swing that threatens multiple enemies.",
    classId: "warrior",
    type: "class",
    target: "allEnemies",
    requiredTalentId: "warrior-cleaving-strike",
    accuracyModifier: -1,
    damageModifier: 1,
    cooldownTurns: 3,
    logMessage: "You carve a wide arc through the fray."
  },
  {
    id: "slip-away",
    name: "Slip Away",
    description: "Use timing and misdirection to escape danger.",
    classId: "scout",
    type: "escape",
    target: "self",
    requiredTalentId: "scout-slip-away",
    fleeChanceModifier: 0.2,
    cooldownTurns: 0,
    logMessage: "You look for the smallest opening and move."
  },
  {
    id: "ambush-strike",
    name: "Ambush Strike",
    description: "A precise opening attack that is strongest early in combat.",
    classId: "scout",
    type: "class",
    target: "singleEnemy",
    requiredTalentId: "scout-ambusher",
    accuracyModifier: 1,
    damageModifier: 2,
    oncePerCombat: true,
    logMessage: "You strike before the enemy fully understands the danger."
  },
  {
    id: "cinder-bolt",
    name: "Cinder Bolt",
    description: "Hurl a compact bolt of ember-bright force.",
    classId: "arcanist",
    type: "magic",
    target: "singleEnemy",
    requiredTalentId: "arcanist-cinder-bolt",
    accuracyModifier: 1,
    damageModifier: 3,
    threatChange: 2,
    cooldownTurns: 1,
    logMessage: "You loose a bolt of cinders into the dark."
  },
  {
    id: "veil-tear",
    name: "Veil Tear",
    description: "Tear force through the room at great cost to subtlety.",
    classId: "arcanist",
    type: "magic",
    target: "singleEnemy",
    requiredTalentId: "arcanist-veil-tear",
    accuracyModifier: 2,
    damageModifier: 6,
    threatChange: 5,
    cooldownTurns: 4,
    logMessage: "The veil splits and raw light answers."
  },
  {
    id: "hunters-mark",
    name: "Hunter's Mark",
    description: "Mark an enemy, making your next strikes more effective.",
    classId: "warden",
    type: "class",
    target: "singleEnemy",
    requiredTalentId: "warden-hunters-mark",
    damageModifier: 1,
    cooldownTurns: 2,
    logMessage: "You mark your target and wait for the opening."
  },
  {
    id: "rooting-shot",
    name: "Rooting Shot",
    description: "A pinning shot that buys distance.",
    classId: "warden",
    type: "class",
    target: "singleEnemy",
    requiredTalentId: "warden-rooting-shot",
    accuracyModifier: 1,
    damageModifier: 1,
    cooldownTurns: 3,
    logMessage: "Your shot drives the enemy back onto bad footing."
  },
  {
    id: "field-prayer",
    name: "Field Prayer",
    description: "Steady yourself with a short prayer, restoring a little health.",
    classId: "devout",
    type: "defensive",
    target: "self",
    requiredTalentId: "devout-field-prayer",
    healingAmount: 5,
    oncePerCombat: true,
    logMessage: "You whisper a prayer and force your hands to stop shaking."
  },
  {
    id: "smite-the-hollow",
    name: "Smite the Hollow",
    description: "Strike with conviction. Especially effective against cursed or undead foes.",
    classId: "devout",
    type: "class",
    target: "singleEnemy",
    requiredTalentId: "devout-smite-the-hollow",
    accuracyModifier: 1,
    damageModifier: 2,
    cooldownTurns: 2,
    logMessage: "You strike with a hard, ringing conviction."
  }
];

export function getCombatActionDefinition(id: string): CombatActionDefinition | undefined {
  return COMBAT_ACTION_DEFINITIONS.find(action => action.id === id);
}
