import type {
  BuildSummary,
  BuildWarning,
  Character,
  CharacterProgressionState,
  CombatActionDefinition,
  CombatState,
  EquipmentChangePreview,
  EquipmentSlotName,
  ItemAffix,
  ItemInstance,
  ItemState,
  TalentNodeDefinition,
  TalentTreeDefinition,
  TalentUnlockStatus,
  VillageState
} from "../game/types";

export type {
  BuildSummary,
  BuildWarning,
  CombatActionDefinition,
  EquipmentChangePreview,
  EquipmentSlotName,
  ItemAffix as ItemAffixView,
  ItemState as ItemStateView,
  TalentNodeDefinition,
  TalentTreeDefinition,
  TalentUnlockStatus
};

export interface ActiveCombatActionView extends CombatActionDefinition {
  disabled?: boolean;
  disabledReason?: string;
  remainingCooldown?: number;
  usedThisCombat?: boolean;
}

export type CharacterWithProgression = Character & {
  progression?: CharacterProgressionState;
};

export type CharacterProgressionView = CharacterProgressionState;

export type ItemWithV4Fields = ItemInstance & {
  affixes?: ItemAffix[];
  states?: ItemState[];
};

export type GameStorePreview = (itemInstanceId: string, slot: EquipmentSlotName) => EquipmentChangePreview | undefined;

export interface TalentTreePanelProps {
  character: Character;
  tree: TalentTreeDefinition;
  village?: VillageState;
  onLearnTalent: (talentId: string) => void;
}

export interface ActiveActionBarProps {
  actions: ActiveCombatActionView[];
  combatState?: CombatState;
  onUseAction: (actionId: string) => void;
}
