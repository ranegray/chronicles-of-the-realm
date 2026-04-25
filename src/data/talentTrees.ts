import type { ClassId, TalentEffect, TalentNodeDefinition, TalentNodeType, TalentTreeDefinition } from "../game/types";

function node(
  classId: ClassId,
  id: string,
  tier: number,
  type: TalentNodeType,
  name: string,
  description: string,
  effects: TalentEffect[],
  tags: string[],
  requires?: string
): TalentNodeDefinition {
  return {
    id,
    classId,
    name,
    description,
    type,
    tier,
    cost: 1,
    requirements: [
      { minCharacterLevel: tier === 1 ? 2 : tier === 2 ? 4 : 7 },
      ...(requires ? [{ talentId: requires }] : [])
    ],
    effects,
    tags
  };
}

export const TALENT_TREES: TalentTreeDefinition[] = [
  {
    classId: "warrior",
    name: "Warrior",
    description: "Reliable melee survivor. Strong when standing ground.",
    nodes: [
      node("warrior", "warrior-weapon-mastery", 1, "passive", "Weapon Mastery", "Your close weapon work is cleaner and safer.", [{ type: "derivedStatBonus", statKey: "accuracy", amount: 1, description: "+1 Accuracy while wielding melee weapons." }], ["melee", "combat"]),
      node("warrior", "warrior-hold-the-line", 1, "passive", "Hold the Line", "Defending turns more hits aside.", [{ type: "unlockPassiveFlag", passiveFlag: "warrior_hold_the_line", description: "Defending reduces incoming damage by an additional amount." }], ["defensive"]),
      node("warrior", "warrior-shield-bash", 2, "combatAction", "Shield Bash", "A shield-first strike that disrupts pressure.", [{ type: "unlockCombatAction", combatActionId: "shield-bash", description: "Unlocks Shield Bash." }], ["combat", "shield"], "warrior-hold-the-line"),
      node("warrior", "warrior-iron-nerve", 2, "passive", "Iron Nerve", "Pain makes you steadier, not louder.", [{ type: "improveFleeChance", amount: 1, description: "Reduced flee penalty while wounded." }, { type: "reduceThreatGain", amount: 1, description: "Fleeing raises less threat." }], ["extraction", "wounded"]),
      node("warrior", "warrior-cleaving-strike", 3, "combatAction", "Cleaving Strike", "A broad cut built for crowded rooms.", [{ type: "unlockCombatAction", combatActionId: "cleaving-strike", description: "Unlocks Cleaving Strike." }], ["melee", "combat"], "warrior-weapon-mastery"),
      node("warrior", "warrior-scarred-veteran", 3, "capstone", "Scarred Veteran", "Once per run, refuse the first lethal blow.", [{ type: "modifyDeathPenalty", passiveFlag: "warrior_scarred_veteran", description: "Once per run, survive a lethal hit at 1 HP." }], ["defensive", "death"], "warrior-iron-nerve")
    ]
  },
  {
    classId: "scout",
    name: "Scout",
    description: "Information, traps, escape, ambush, and loot efficiency.",
    nodes: [
      node("scout", "scout-keen-eye", 1, "exploration", "Keen Eye", "You read small signs before they become problems.", [{ type: "improveScouting", amount: 2, description: "+2 scouting score." }], ["scouting"]),
      node("scout", "scout-quick-hands", 1, "exploration", "Quick Hands", "Locks and trapwork stay quiet under your fingers.", [{ type: "improveTrapHandling", amount: 2, description: "+2 trap disarm and locked chest checks." }, { type: "reduceThreatGain", amount: 1, description: "Searching raises less threat." }], ["trapHandling", "loot"]),
      node("scout", "scout-slip-away", 2, "combatAction", "Slip Away", "Escape through timing instead of strength.", [{ type: "unlockCombatAction", combatActionId: "slip-away", description: "Unlocks Slip Away." }, { type: "improveFleeChance", amount: 0.12, description: "Better flee chance." }], ["extraction", "evasive"], "scout-quick-hands"),
      node("scout", "scout-ambusher", 2, "combatAction", "Ambusher", "Your first move lands before the room settles.", [{ type: "unlockCombatAction", combatActionId: "ambush-strike", description: "Unlocks Ambush Strike." }], ["combat", "stealth"], "scout-keen-eye"),
      node("scout", "scout-light-pack", 3, "utility", "Light Pack", "You carry better without losing your feet.", [{ type: "increaseCarryCapacity", amount: 5, description: "+5 carry capacity." }, { type: "improveExtraction", amount: 1, description: "Better burdened extraction handling." }], ["lootFocused", "carryCapacity"], "scout-quick-hands"),
      node("scout", "scout-ghost-step", 3, "capstone", "Ghost Step", "Once per run, turn a failed ambush or trap check into a narrow miss.", [{ type: "unlockPassiveFlag", passiveFlag: "scout_ghost_step", description: "Avoid one ambush or trap trigger after a failed check each run." }], ["trapHandling", "evasive"], "scout-slip-away")
    ]
  },
  {
    classId: "arcanist",
    name: "Arcanist",
    description: "Fragile burst caster with magical detection and threat-sensitive power.",
    nodes: [
      node("arcanist", "arcanist-rune-sense", 1, "exploration", "Rune Sense", "You notice pressure in old marks and wrong air.", [{ type: "improveScouting", amount: 2, description: "+2 detecting magical traps and events." }], ["magic", "scouting"]),
      node("arcanist", "arcanist-spell-surge", 1, "passive", "Spell Surge", "Your focused casts bite harder.", [{ type: "derivedStatBonus", statKey: "magicPower", amount: 1, description: "+1 Magic Power." }, { type: "modifyCritChance", amount: 2, description: "Magic criticals improve slightly." }], ["magic", "combat"]),
      node("arcanist", "arcanist-cinder-bolt", 2, "combatAction", "Cinder Bolt", "A bright bolt that hurts and announces you.", [{ type: "unlockCombatAction", combatActionId: "cinder-bolt", description: "Unlocks Cinder Bolt." }], ["magic", "combat"], "arcanist-spell-surge"),
      node("arcanist", "arcanist-arcane-ward", 2, "defensive", "Arcane Ward", "A thin ward catches the first hit each fight.", [{ type: "unlockPassiveFlag", passiveFlag: "arcanist_arcane_ward", description: "Reduce the first incoming hit each combat." }], ["defensive", "magic"]),
      node("arcanist", "arcanist-glass-focus", 3, "passive", "Glass Focus", "More power, less body to spend.", [{ type: "derivedStatBonus", statKey: "magicPower", amount: 2, description: "+2 Magic Power." }, { type: "derivedStatBonus", statKey: "maxHp", amount: -2, description: "-2 Max HP." }], ["magic", "highRisk"], "arcanist-cinder-bolt"),
      node("arcanist", "arcanist-veil-tear", 3, "capstone", "Veil Tear", "A decisive spell that wakes the dungeon.", [{ type: "unlockCombatAction", combatActionId: "veil-tear", description: "Unlocks Veil Tear." }], ["magic", "highRisk"], "arcanist-glass-focus")
    ]
  },
  {
    classId: "warden",
    name: "Warden",
    description: "Self-sufficient delver and reader of dangerous rooms.",
    nodes: [
      node("warden", "warden-trail-reader", 1, "exploration", "Trail Reader", "Creature signs become useful before they become teeth.", [{ type: "improveScouting", amount: 2, description: "+2 scouting for creature signs." }], ["scouting", "ranged"]),
      node("warden", "warden-herbal-recovery", 1, "passive", "Herbal Recovery", "You stretch every useful herb further.", [{ type: "increaseHealingReceived", amount: 2, description: "Healing consumables restore +2 HP." }], ["healing", "sustain"]),
      node("warden", "warden-hunters-mark", 2, "combatAction", "Hunter's Mark", "Name a target, then take it apart.", [{ type: "unlockCombatAction", combatActionId: "hunters-mark", description: "Unlocks Hunter's Mark." }], ["combat", "ranged"], "warden-trail-reader"),
      node("warden", "warden-snarecraft", 2, "utility", "Snarecraft", "Detected traps become materials instead of only risks.", [{ type: "improveTrapHandling", amount: 2, description: "Better trap handling." }], ["trapHandling", "loot"]),
      node("warden", "warden-rooting-shot", 3, "combatAction", "Rooting Shot", "Pin threats where the room works against them.", [{ type: "unlockCombatAction", combatActionId: "rooting-shot", description: "Unlocks Rooting Shot." }], ["combat", "ranged"], "warden-hunters-mark"),
      node("warden", "warden-deepwoods-instinct", 3, "capstone", "Deepwoods Instinct", "Once per run, feel out the safest adjacent path.", [{ type: "improveExtraction", amount: 2, description: "Reveal safer adjacent room routing once per run." }], ["extraction", "scouting"], "warden-snarecraft")
    ]
  },
  {
    classId: "devout",
    name: "Devout",
    description: "Defensive faith-based survivor with healing and curse resistance.",
    nodes: [
      node("devout", "devout-steady-faith", 1, "passive", "Steady Faith", "Fear and old malice find less purchase.", [{ type: "abilityScoreBonus", statKey: "will", amount: 1, description: "+1 Will." }, { type: "improveEventCheck", amount: 1, description: "Better curse-related event checks." }], ["defensive", "curse"]),
      node("devout", "devout-watchful-vow", 1, "passive", "Watchful Vow", "You notice unclean patterns before you have to touch them.", [{ type: "improveScouting", amount: 1, description: "+1 scouting around cursed rooms and shrines." }], ["scouting", "curse"]),
      node("devout", "devout-field-prayer", 1, "combatAction", "Field Prayer", "A short prayer steadies blood and breath.", [{ type: "unlockCombatAction", combatActionId: "field-prayer", description: "Unlocks Field Prayer." }], ["healing", "combat"]),
      node("devout", "devout-sacred-guard", 2, "defensive", "Sacred Guard", "Your first guard is deliberate and hard to break.", [{ type: "derivedStatBonus", statKey: "armor", amount: 1, description: "+1 Armor." }, { type: "unlockPassiveFlag", passiveFlag: "devout_sacred_guard", description: "First defend each combat is stronger." }], ["defensive"], "devout-steady-faith"),
      node("devout", "devout-cursebreaker", 2, "exploration", "Cursebreaker", "Cursed gear becomes a problem you can plan around.", [{ type: "reduceThreatGain", amount: 1, description: "Reduced threat gain from cursed gear." }, { type: "improveEventCheck", amount: 2, description: "Better cursed shrine and obelisk outcomes." }], ["curse", "utility"], "devout-steady-faith"),
      node("devout", "devout-smite-the-hollow", 3, "combatAction", "Smite the Hollow", "Conviction becomes force against hollow things.", [{ type: "unlockCombatAction", combatActionId: "smite-the-hollow", description: "Unlocks Smite the Hollow." }], ["combat", "curse"], "devout-sacred-guard"),
      node("devout", "devout-last-benediction", 3, "capstone", "Last Benediction", "Wounded extraction becomes steadier under pressure.", [{ type: "improveExtraction", amount: 2, description: "Reduce extraction complications while wounded once per run." }], ["extraction", "healing"], "devout-cursebreaker")
    ]
  }
];

export function getTalentTreeDefinition(classId: ClassId): TalentTreeDefinition | undefined {
  return TALENT_TREES.find(tree => tree.classId === classId);
}
