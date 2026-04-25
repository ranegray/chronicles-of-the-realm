import { COMBAT_ACTION_DEFINITIONS } from "../data/combatActions";
import { getTalentTreeDefinition, TALENT_TREES } from "../data/talentTrees";
import { TALENT_RULES } from "./constants";
import { initializeCharacterProgression, spendTalentPoint } from "./characterProgression";
import type {
  Character,
  ClassId,
  CombatActionDefinition,
  TalentEffect,
  TalentNodeDefinition,
  TalentTreeDefinition,
  TalentUnlockStatus,
  VillageState
} from "./types";

export function getTalentTreeForClass(classId: ClassId): TalentTreeDefinition {
  const tree = getTalentTreeDefinition(classId);
  if (!tree) throw new Error(`Missing talent tree for class ${classId}`);
  return tree;
}

export function getTalentDefinition(talentId: string): TalentNodeDefinition | undefined {
  for (const tree of TALENT_TREES) {
    const talent = tree.nodes.find(node => node.id === talentId);
    if (talent) return talent;
  }
  return undefined;
}

export function getTalentStatus(params: {
  character: Character;
  talent: TalentNodeDefinition;
  village?: VillageState;
}): TalentUnlockStatus {
  const character = initializeCharacterProgression({ character: params.character });
  if (character.progression.learnedTalentIds.includes(params.talent.id)) return "learned";
  return canLearnTalent({ character, talentId: params.talent.id, village: params.village }).canLearn
    ? "available"
    : "locked";
}

export function canLearnTalent(params: {
  character: Character;
  talentId: string;
  village?: VillageState;
}): { canLearn: boolean; reason?: string } {
  const character = initializeCharacterProgression({ character: params.character });
  const talent = getTalentDefinition(params.talentId);
  if (!talent) return { canLearn: false, reason: "Unknown talent." };
  if (talent.classId !== character.classId) return { canLearn: false, reason: "Wrong class." };
  if (character.progression.learnedTalentIds.includes(talent.id)) return { canLearn: false, reason: "Already learned." };
  if (character.progression.unspentTalentPoints < talent.cost) return { canLearn: false, reason: "No talent points available." };
  const tierLevel = TALENT_RULES.tierUnlockLevels[talent.tier as keyof typeof TALENT_RULES.tierUnlockLevels];
  if (tierLevel && character.progression.level < tierLevel) return { canLearn: false, reason: `Requires level ${tierLevel}.` };
  const learnedCapstones = getTalentTreeForClass(character.classId).nodes
    .filter(node => node.type === "capstone" && character.progression.learnedTalentIds.includes(node.id));
  if (talent.type === "capstone" && learnedCapstones.length >= TALENT_RULES.maxLearnedCapstones) {
    return { canLearn: false, reason: "Only one capstone can be learned." };
  }
  for (const req of talent.requirements ?? []) {
    if (req.minCharacterLevel && character.progression.level < req.minCharacterLevel) {
      return { canLearn: false, reason: `Requires level ${req.minCharacterLevel}.` };
    }
    if (req.talentId && !character.progression.learnedTalentIds.includes(req.talentId)) {
      const required = getTalentDefinition(req.talentId);
      return { canLearn: false, reason: `Requires ${required?.name ?? req.talentId}.` };
    }
    if (req.villageFlag && !params.village?.unlockFlags[req.villageFlag]) {
      return { canLearn: false, reason: "Requires a village unlock." };
    }
    if (req.minServiceRole && req.minServiceLevel) {
      const service = params.village?.npcs.find(npc => npc.role === req.minServiceRole)?.service;
      if (!service || service.level < req.minServiceLevel) {
        return { canLearn: false, reason: `Requires ${req.minServiceRole} service level ${req.minServiceLevel}.` };
      }
    }
  }
  return { canLearn: true };
}

export function learnTalent(params: {
  character: Character;
  talentId: string;
  village?: VillageState;
}): { character: Character; success: boolean; message: string } {
  const check = canLearnTalent(params);
  if (!check.canLearn) {
    return { character: initializeCharacterProgression({ character: params.character }), success: false, message: check.reason ?? "Talent is locked." };
  }
  const talent = getTalentDefinition(params.talentId)!;
  let character = spendTalentPoint({ character: params.character, talentId: params.talentId });
  const actionIds = talent.effects
    .map(effect => effect.combatActionId)
    .filter(Boolean) as string[];
  const passiveIds = talent.effects
    .map(effect => effect.passiveFlag)
    .filter(Boolean) as string[];
  character = {
    ...character,
    progression: {
      ...character.progression,
      activeCombatActionIds: addActionSlots(character.progression.activeCombatActionIds, actionIds),
      unlockedPassiveIds: unique([...character.progression.unlockedPassiveIds, ...passiveIds]),
      unlockedBuildFlags: passiveIds.reduce(
        (flags, id) => ({ ...flags, [id]: true }),
        character.progression.unlockedBuildFlags
      )
    }
  };
  return { character, success: true, message: `Learned ${talent.name}.` };
}

export function getLearnedTalentEffects(character: Character): TalentEffect[] {
  const initialized = initializeCharacterProgression({ character });
  return initialized.progression.learnedTalentIds
    .map(getTalentDefinition)
    .filter((talent): talent is TalentNodeDefinition =>
      Boolean(talent) && talent!.classId === initialized.classId
    )
    .flatMap(talent => talent!.effects);
}

export function getUnlockedCombatActions(character: Character): CombatActionDefinition[] {
  const initialized = initializeCharacterProgression({ character });
  const learned = new Set(initialized.progression.learnedTalentIds);
  return COMBAT_ACTION_DEFINITIONS.filter(action => {
    if (!action.requiredTalentId) return action.type === "basic" || action.id === "defend" || action.id === "flee" || action.id === "use-item";
    return action.classId === initialized.classId && learned.has(action.requiredTalentId);
  });
}

function addActionSlots(existing: string[], actionIds: string[]): string[] {
  return unique([...existing, ...actionIds]).slice(0, TALENT_RULES.activeCombatActionSlots);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
