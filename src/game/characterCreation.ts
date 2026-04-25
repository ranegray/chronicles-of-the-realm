import type {
  AbilityName,
  AbilityScores,
  AncestryId,
  Character,
  ClassId,
  EquipmentSlots,
  ItemInstance
} from "./types";
import { ABILITY_NAMES, CHARACTER_CREATION } from "./constants";
import { getAncestry, ANCESTRIES } from "../data/ancestries";
import { getClass, getStarterKit, CLASSES } from "../data/classes";
import { calculateDerivedStats } from "./characterMath";
import { initializeCharacterProgression } from "./characterProgression";
import { instanceFromTemplateId } from "./inventory";
import type { Rng } from "./rng";
import { createRng, makeId, randomSeed } from "./rng";
import { rollAbilityScore } from "./dice";

export interface CharacterDraft {
  name: string;
  ancestryId?: AncestryId;
  classId?: ClassId;
  abilityScores?: AbilityScores;
  rolledScores: number[];
  rerollsUsed: number;
  starterKitId?: string;
  rng: Rng;
}

export function createEmptyDraft(seed: string = randomSeed()): CharacterDraft {
  return {
    name: "",
    rolledScores: [],
    rerollsUsed: 0,
    rng: createRng(`charcreate:${seed}`)
  };
}

export const CharacterCreationService = {
  selectAncestry(draft: CharacterDraft, ancestryId: AncestryId): CharacterDraft {
    return { ...draft, ancestryId };
  },

  selectClass(draft: CharacterDraft, classId: ClassId): CharacterDraft {
    return { ...draft, classId, starterKitId: undefined };
  },

  setName(draft: CharacterDraft, name: string): CharacterDraft {
    return { ...draft, name };
  },

  rollAllAbilityScores(draft: CharacterDraft): CharacterDraft {
    const cfg = CHARACTER_CREATION.abilityRolls;
    const rolls: number[] = [];
    for (let i = 0; i < ABILITY_NAMES.length; i++) {
      rolls.push(
        rollAbilityScore(draft.rng, cfg.diceCount, cfg.diceSides, cfg.dropLowest).total
      );
    }
    return { ...draft, rolledScores: rolls };
  },

  rerollAllAbilityScores(draft: CharacterDraft): CharacterDraft {
    if (draft.rerollsUsed >= CHARACTER_CREATION.abilityRolls.rerollLimit) return draft;
    const next = CharacterCreationService.rollAllAbilityScores(draft);
    return { ...next, rerollsUsed: draft.rerollsUsed + 1 };
  },

  assignScores(draft: CharacterDraft, scores: AbilityScores): CharacterDraft {
    return { ...draft, abilityScores: scores };
  },

  autoAssignScoresForClass(draft: CharacterDraft): CharacterDraft {
    if (!draft.classId || draft.rolledScores.length !== ABILITY_NAMES.length) {
      return draft;
    }
    const cls = getClass(draft.classId);
    const sorted = [...draft.rolledScores].sort((a, b) => b - a);
    const ordered: AbilityName[] = [];
    for (const a of cls.preferredAbilities) {
      if (!ordered.includes(a)) ordered.push(a);
    }
    for (const a of ABILITY_NAMES) {
      if (!ordered.includes(a)) ordered.push(a);
    }
    const assigned: AbilityScores = {} as AbilityScores;
    ordered.forEach((ability, i) => {
      assigned[ability] = sorted[i] ?? 10;
    });
    return { ...draft, abilityScores: assigned };
  },

  chooseStarterKit(draft: CharacterDraft, kitId: string): CharacterDraft {
    return { ...draft, starterKitId: kitId };
  },

  isReadyToFinalize(draft: CharacterDraft): boolean {
    return Boolean(
      draft.name.trim() &&
        draft.ancestryId &&
        draft.classId &&
        draft.abilityScores &&
        draft.starterKitId
    );
  },

  finalizeCharacter(draft: CharacterDraft): { character: Character; equipment: ItemInstance[] } {
    if (!CharacterCreationService.isReadyToFinalize(draft)) {
      throw new Error("Character draft is not complete.");
    }
    const ancestry = getAncestry(draft.ancestryId!);
    const cls = getClass(draft.classId!);
    const kit = getStarterKit(draft.classId!, draft.starterKitId!);
    const items: ItemInstance[] = kit.itemTemplateIds.map(id =>
      instanceFromTemplateId(id, draft.rng, 1)
    );

    const equipped: EquipmentSlots = {};
    for (const item of items) {
      if (item.category === "weapon" && !equipped.weapon) equipped.weapon = item;
      else if (item.category === "shield" && !equipped.offhand) equipped.offhand = item;
      else if (item.category === "armor" && !equipped.armor) equipped.armor = item;
      else if (item.category === "trinket") {
        if (!equipped.trinket1) equipped.trinket1 = item;
        else if (!equipped.trinket2) equipped.trinket2 = item;
      }
    }

    const derivedStats = calculateDerivedStats(
      draft.abilityScores!,
      ancestry,
      cls,
      equipped
    );

    const character: Character = initializeCharacterProgression({ character: {
      id: makeId(draft.rng, "char"),
      name: draft.name.trim(),
      ancestryId: ancestry.id,
      classId: cls.id,
      level: CHARACTER_CREATION.startingLevel,
      xp: 0,
      abilityScores: { ...draft.abilityScores! },
      derivedStats,
      hp: derivedStats.maxHp,
      maxHp: derivedStats.maxHp,
      equipped
    } as Character });

    return { character, equipment: items };
  },

  getAvailableAncestries() {
    return ANCESTRIES;
  },

  getAvailableClasses() {
    return CLASSES;
  }
};

export type { AbilityName };
