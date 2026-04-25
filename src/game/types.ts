export type AbilityName =
  | "might"
  | "agility"
  | "endurance"
  | "intellect"
  | "will"
  | "presence";

export type AbilityScores = Record<AbilityName, number>;

export type AncestryId =
  | "human"
  | "stonekin"
  | "eldryn"
  | "emberborn"
  | "moonvale";

export type ClassId =
  | "warrior"
  | "scout"
  | "arcanist"
  | "warden"
  | "devout";

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export type ItemCategory =
  | "weapon"
  | "armor"
  | "shield"
  | "consumable"
  | "material"
  | "trinket"
  | "questItem"
  | "gold"
  | "scroll"
  | "gem"
  | "key";

export type RoomType =
  | "entrance"
  | "combat"
  | "eliteCombat"
  | "treasure"
  | "trap"
  | "shrine"
  | "npcEvent"
  | "questObjective"
  | "lockedChest"
  | "extraction"
  | "boss"
  | "empty";

export type DungeonBiome =
  | "crypt"
  | "goblinWarrens"
  | "fungalCaverns"
  | "ruinedKeep"
  | "oldMine"
  | "sunkenTemple";

export type ServiceLevel = 1 | 2 | 3 | 4 | 5;

export type ServiceUpgradeStatus =
  | "locked"
  | "available"
  | "purchased";

export type ServiceUnlockType =
  | "serviceAction"
  | "recipe"
  | "runPreparation"
  | "scoutingBonus"
  | "vendorInventoryTier"
  | "biomeChoice"
  | "stashUpgrade"
  | "itemProtection"
  | "unlockFlag";

export type ServiceActionId =
  | "repairGear"
  | "craftWeapon"
  | "craftArmor"
  | "reinforceItem"
  | "brewPotion"
  | "brewAntidote"
  | "brewResistanceTonic"
  | "identifyItem"
  | "minorEnchant"
  | "rerollMinorAffix"
  | "healWounds"
  | "buyBasicSupplies"
  | "sellLoot"
  | "revealDungeonHint"
  | "chooseDungeonBiome"
  | "prepareExtractionMap";

export type MaterialRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic";

export type MaterialCategory =
  | "ore"
  | "herb"
  | "reagent"
  | "relic"
  | "cloth"
  | "bone"
  | "crystal"
  | "monsterPart"
  | "salvage";

export type MaterialId =
  | "graveDust"
  | "boneShards"
  | "paleWax"
  | "scrapIron"
  | "snareCord"
  | "tunnelCharcoal"
  | "glowcapSpores"
  | "fungalHeart"
  | "livingMycelium"
  | "oathIron"
  | "bannerThread"
  | "crackedScale"
  | "ironOre"
  | "saltstone"
  | "blackQuartz"
  | "brinePearl"
  | "coralShard"
  | "drownedSilk"
  | "commonHerbs"
  | "rawhide"
  | "emberglassShard"
  | "moonlitThread";

export type MaterialVault = Partial<Record<MaterialId, number>>;

export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  description: string;
  category: MaterialCategory;
  rarity: MaterialRarity;
  sourceBiomes: DungeonBiome[];
  baseValue: number;
  tags: string[];
}

export interface MaterialBundle {
  materials: MaterialVault;
}

export interface ResourceCost {
  gold?: number;
  materials?: MaterialVault;
  itemTemplateIds?: string[];
}

export interface ResourceReward {
  gold?: number;
  xp?: number;
  materials?: MaterialVault;
  itemTemplateIds?: string[];
}

export type RunStatus =
  | "notStarted"
  | "active"
  | "extracted"
  | "dead"
  | "abandoned";

export interface StatModifierBlock {
  might?: number;
  agility?: number;
  endurance?: number;
  intellect?: number;
  will?: number;
  presence?: number;
  maxHp?: number;
  armor?: number;
  accuracy?: number;
  evasion?: number;
  critChance?: number;
  carryCapacity?: number;
  magicPower?: number;
  trapSense?: number;
}

export interface AncestryDefinition {
  id: AncestryId;
  name: string;
  description: string;
  bonuses: StatModifierBlock;
  traitName: string;
  traitDescription: string;
}

export interface StarterKit {
  id: string;
  name: string;
  description: string;
  itemTemplateIds: string[];
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  description: string;
  baseHp: number;
  baseAccuracy: number;
  baseArmor: number;
  magicBonus: number;
  preferredAbilities: AbilityName[];
  starterKits: StarterKit[];
}

export interface DerivedStats {
  maxHp: number;
  armor: number;
  accuracy: number;
  evasion: number;
  critChance: number;
  carryCapacity: number;
  magicPower: number;
  trapSense: number;
}

export type CharacterLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface CharacterProgressionState {
  level: CharacterLevel;
  xp: number;
  totalXpEarned: number;
  unspentTalentPoints: number;
  spentTalentPoints: number;
  learnedTalentIds: string[];
  activeCombatActionIds: string[];
  unlockedPassiveIds: string[];
  unlockedBuildFlags: Record<string, boolean>;
}

export type TalentNodeType =
  | "passive"
  | "combatAction"
  | "exploration"
  | "defensive"
  | "utility"
  | "capstone";

export type TalentUnlockStatus = "locked" | "available" | "learned";

export type TalentEffectType =
  | "derivedStatBonus"
  | "abilityScoreBonus"
  | "unlockCombatAction"
  | "unlockPassiveFlag"
  | "improveScouting"
  | "improveTrapHandling"
  | "improveFleeChance"
  | "reduceThreatGain"
  | "increaseCarryCapacity"
  | "increaseHealingReceived"
  | "increaseDamageWithTag"
  | "reduceDamageFromTag"
  | "improveEventCheck"
  | "improveExtraction"
  | "modifyCritChance"
  | "modifyDeathPenalty"
  | "grantStartingItem"
  | "classSpecific";

export interface TalentEffect {
  type: TalentEffectType;
  statKey?: keyof DerivedStats | AbilityName;
  amount?: number;
  combatActionId?: string;
  passiveFlag?: string;
  itemTag?: string;
  enemyTag?: string;
  roomType?: RoomType;
  biome?: DungeonBiome;
  description: string;
}

export interface TalentRequirement {
  talentId?: string;
  minCharacterLevel?: number;
  minServiceRole?: NpcRole;
  minServiceLevel?: ServiceLevel;
  villageFlag?: string;
}

export interface TalentNodeDefinition {
  id: string;
  classId: ClassId;
  name: string;
  description: string;
  type: TalentNodeType;
  tier: number;
  cost: number;
  requirements?: TalentRequirement[];
  effects: TalentEffect[];
  tags: string[];
}

export interface TalentTreeDefinition {
  classId: ClassId;
  name: string;
  description: string;
  nodes: TalentNodeDefinition[];
}

export type CombatActionType =
  | "basic"
  | "weapon"
  | "class"
  | "defensive"
  | "utility"
  | "magic"
  | "escape";

export type CombatActionTarget =
  | "self"
  | "singleEnemy"
  | "allEnemies"
  | "room"
  | "none";

export interface CombatActionDefinition {
  id: string;
  name: string;
  description: string;
  classId?: ClassId;
  type: CombatActionType;
  target: CombatActionTarget;
  requiredTalentId?: string;
  accuracyModifier?: number;
  damageModifier?: number;
  damageMultiplier?: number;
  healingAmount?: number;
  threatChange?: number;
  fleeChanceModifier?: number;
  appliesPassiveFlag?: string;
  oncePerCombat?: boolean;
  cooldownTurns?: number;
  logMessage: string;
}

export interface CombatActionRuntimeState {
  actionId: string;
  remainingCooldown: number;
  usedThisCombat: boolean;
}

export type BuildTag =
  | "melee"
  | "ranged"
  | "magic"
  | "defensive"
  | "evasive"
  | "scouting"
  | "trapHandling"
  | "extraction"
  | "carryCapacity"
  | "healing"
  | "highRisk"
  | "lootFocused";

export type BuildWarningType =
  | "overweight"
  | "lowHealing"
  | "fragileGear"
  | "cursedGear"
  | "contraband"
  | "lowDefense"
  | "lowDamage"
  | "noEscapeTools";

export interface BuildWarning {
  type: BuildWarningType;
  message: string;
  severity: "info" | "warning" | "danger";
}

export interface BuildSummary {
  characterId: string;
  primaryTags: BuildTag[];
  totalStats: DerivedStats;
  equippedItemScore: number;
  riskScore: number;
  extractionSafetyScore: number;
  combatPowerScore: number;
  explorationScore: number;
  warnings: BuildWarning[];
}

export type AffixType = "prefix" | "suffix" | "implicit" | "special";

export type AffixRollType = "flat" | "percent" | "flag";

export type AffixAllowedItemCategory =
  | ItemCategory
  | "anyEquipment"
  | "anyWeapon"
  | "anyArmor"
  | "anyTrinket";

export interface AffixDefinition {
  id: string;
  name: string;
  type: AffixType;
  descriptionTemplate: string;
  minRarity: Rarity;
  maxRarity?: Rarity;
  allowedCategories: AffixAllowedItemCategory[];
  weight: number;
  minTier: number;
  maxTier: number;
  statKey?: keyof DerivedStats | AbilityName;
  rollType: AffixRollType;
  minValue?: number;
  maxValue?: number;
  tags: string[];
  biomeTags?: DungeonBiome[];
  classTags?: ClassId[];
  exclusiveGroup?: string;
}

export interface ItemAffix {
  id: string;
  definitionId?: string;
  name: string;
  type?: AffixType;
  description: string;
  statKey?: keyof DerivedStats | AbilityName;
  rollType?: AffixRollType;
  value?: number;
  tags?: string[];
  stats?: StatModifierBlock;
}

export type ItemStateId =
  | "normal"
  | "protected"
  | "fragile"
  | "cursed"
  | "bound"
  | "contraband"
  | "damaged"
  | "reinforced";

export type ItemStateSource =
  | "lootGeneration"
  | "serviceAction"
  | "questReward"
  | "eventOutcome"
  | "runPreparation"
  | "deathPenalty"
  | "debug";

export interface ItemStateDefinition {
  id: ItemStateId;
  label: string;
  description: string;
  riskDescription: string;
  visible: boolean;
  tags: string[];
}

export interface ItemState {
  id: ItemStateId;
  source: ItemStateSource;
  appliedAt: number;
  expiresAfterRunId?: string;
  expiresAtTimestamp?: number;
  valueModifier?: number;
  statModifier?: StatModifierBlock;
  metadata?: Record<string, string | number | boolean>;
}

export interface ItemGenerationContext {
  seed: string;
  biome: DungeonBiome;
  tier: number;
  roomType?: RoomType;
  source:
    | "combat"
    | "treasure"
    | "boss"
    | "event"
    | "quest"
    | "crafting"
    | "vendor"
    | "debug";
  threatLevel?: ThreatLevel;
  playerClassId?: ClassId;
}

export interface GeneratedItemResult {
  item: ItemInstance;
  affixesRolled: ItemAffix[];
  statesRolled: ItemState[];
}

export interface ItemTemplate {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  description: string;
  value: number;
  weight: number;
  stackable: boolean;
  stats?: StatModifierBlock;
  tags?: string[];
}

export interface ItemInstance {
  instanceId: string;
  templateId: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  description: string;
  value: number;
  weight: number;
  stackable: boolean;
  quantity: number;
  stats?: StatModifierBlock;
  affixes?: ItemAffix[];
  states?: ItemState[];
  tags?: string[];
  protected?: boolean;
  upgradeLevel?: number;
}

export type EquipmentSlotName =
  | "weapon"
  | "offhand"
  | "armor"
  | "trinket1"
  | "trinket2";

export interface EquipmentSlots {
  weapon?: ItemInstance;
  offhand?: ItemInstance;
  armor?: ItemInstance;
  trinket1?: ItemInstance;
  trinket2?: ItemInstance;
}

export interface EquipmentChangePreview {
  slot: EquipmentSlotName;
  currentItem?: ItemInstance;
  newItem?: ItemInstance;
  currentStats: DerivedStats;
  previewStats: DerivedStats;
  statDiff: Partial<Record<keyof DerivedStats, number>>;
  warnings: BuildWarning[];
}

export interface Character {
  id: string;
  name: string;
  ancestryId: AncestryId;
  classId: ClassId;
  level: number;
  xp: number;
  abilityScores: AbilityScores;
  derivedStats: DerivedStats;
  hp: number;
  maxHp: number;
  equipped: EquipmentSlots;
  wounded?: boolean;
  progression: CharacterProgressionState;
}

export interface Inventory {
  items: ItemInstance[];
  gold: number;
  materials?: MaterialVault;
}

export interface DiceFormula {
  count: number;
  sides: number;
  modifier?: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  biome: DungeonBiome;
  tier: number;
  hp: number;
  armor: number;
  accuracy: number;
  evasion: number;
  damageDice: DiceFormula;
  xpReward: number;
  lootTags: string[];
  description: string;
}

export interface EnemyInstance {
  instanceId: string;
  enemyId: string;
  name: string;
  hp: number;
  maxHp: number;
  armor: number;
  accuracy: number;
  evasion: number;
  damageDice: DiceFormula;
}

export interface EncounterDefinition {
  id: string;
  name: string;
  biome: DungeonBiome;
  minTier: number;
  maxTier: number;
  enemyIds: string[];
  weight: number;
  tags: string[];
  dangerRating: number;
}

export interface DungeonRoom {
  id: string;
  type: RoomType;
  biome: DungeonBiome;
  title: string;
  description: string;
  dangerRating: number;
  mapX?: number;
  mapY?: number;
  connectedRoomIds: string[];
  visited: boolean;
  completed: boolean;
  encounterId?: string;
  lootTableId?: string;
  trapId?: string;
  questId?: string;
  extractionPoint?: boolean;
  extraction?: ExtractionPoint;
  scoutingProfile?: RoomScoutingProfile;
  activeEvent?: ActiveRoomEvent;
  activeTrap?: ActiveTrap;
  searchState?: RoomSearchState;
}

export interface DungeonRun {
  runId: string;
  seed: string;
  generatorVersion: number;
  biome: DungeonBiome;
  tier: number;
  status: RunStatus;
  startedAt: number;
  currentRoomId: string;
  roomGraph: DungeonRoom[];
  visitedRoomIds: string[];
  raidInventory: Inventory;
  loadoutSnapshot: ItemInstance[];
  activeQuestIds: string[];
  questProgressAtStart: Record<string, number>;
  xpGained: number;
  roomsVisitedBeforeDepth: number;
  roomsCompletedBeforeDepth: number;
  dangerLevel: number;
  threat: ThreatState;
  knownRoomIntel: Record<string, ScoutedRoomInfo>;
  dungeonLog: DungeonLogEntry[];
  currentExtractionInteraction?: {
    roomId: string;
    extractionId: string;
    turnsRemaining: number;
  };
  appliedRunPreparations?: PreparedRunModifier[];
}

export type NpcRole =
  | "blacksmith"
  | "alchemist"
  | "enchanter"
  | "quartermaster"
  | "cartographer"
  | "elder"
  | "healer"
  | "trader";

export interface ServiceUnlock {
  id: string;
  type: ServiceUnlockType;
  label: string;
  description: string;
  actionId?: ServiceActionId;
  recipeId?: string;
  runPreparationId?: string;
  unlockFlag?: string;
  value?: number | string | boolean;
}

export type UpgradeRequirementType =
  | "npcRelationship"
  | "completedQuest"
  | "completedQuestChain"
  | "completedQuestChainStep"
  | "playerLevel"
  | "serviceLevel"
  | "villageFlag"
  | "itemInStash"
  | "materialCount";

export interface UpgradeRequirement {
  type: UpgradeRequirementType;
  key: string;
  value?: string | number | boolean;
  description: string;
}

export interface ServiceLevelDefinition {
  level: ServiceLevel;
  title: string;
  description: string;
  upgradeCost?: ResourceCost;
  requirements?: UpgradeRequirement[];
  unlocks: ServiceUnlock[];
}

export interface ServiceDefinition {
  role: NpcRole;
  displayName: string;
  description: string;
  levelDefinitions: ServiceLevelDefinition[];
}

export interface NpcServiceState {
  role: NpcRole;
  level: ServiceLevel;
  xp: number;
  unlockedActionIds: ServiceActionId[];
  unlockedRecipeIds: string[];
  unlockedRunPreparationIds: string[];
  unlockedFlags: Record<string, boolean>;
  lastUpgradedAt?: number;
}

export interface VillageNpc {
  id: string;
  name: string;
  role: NpcRole;
  personality: string;
  description: string;
  serviceLevel: ServiceLevel;
  relationship: number;
  questIds: string[];
  service: NpcServiceState;
  activeQuestChainIds?: string[];
  completedQuestChainIds?: string[];
}

export type QuestType =
  | "retrieveItem"
  | "slayEnemy"
  | "scoutRoom"
  | "extractMaterial"
  | "findSign"
  | "defeatMiniBoss"
  | "surviveDepth"
  | "openChest";

export type QuestStatus =
  | "available"
  | "active"
  | "completed"
  | "claimed"
  | "failed";

export interface QuestReward {
  gold?: number;
  xp?: number;
  itemTemplateIds?: string[];
  materials?: MaterialVault;
  relationshipGain?: number;
  serviceXp?: number;
  villageRenown?: number;
  discoveredRecipeIds?: string[];
}

export interface UnlockEffect {
  npcId?: string;
  role?: NpcRole;
  serviceLevelIncrease?: number;
  serviceXpGain?: number;
  unlockFlag?: string;
  unlockRecipeIds?: string[];
  unlockActionIds?: ServiceActionId[];
  unlockRunPreparationIds?: string[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  npcId: string;
  type: QuestType;
  target: string;
  requiredCount: number;
  currentCount: number;
  biome?: DungeonBiome;
  reward: QuestReward;
  unlockEffect?: UnlockEffect;
  status: QuestStatus;
  chainId?: string;
  chainStepId?: string;
  chainStepIndex?: number;
  claimOnlyAfterExtraction?: boolean;
}

export type QuestChainStatus =
  | "locked"
  | "available"
  | "active"
  | "completed";

export type QuestChainStepStatus =
  | "locked"
  | "available"
  | "active"
  | "completed"
  | "claimed";

export interface QuestChainDefinition {
  id: string;
  title: string;
  description: string;
  npcRole: NpcRole;
  minServiceLevel?: ServiceLevel;
  steps: QuestChainStepDefinition[];
  completionReward?: QuestReward;
  completionUnlocks?: ServiceUnlock[];
}

export interface QuestChainStepDefinition {
  id: string;
  chainId: string;
  stepIndex: number;
  title: string;
  description: string;
  questType: QuestType;
  target: string;
  requiredCount: number;
  biome?: DungeonBiome;
  reward: QuestReward;
  unlockEffect?: UnlockEffect;
  claimOnlyAfterExtraction: boolean;
}

export interface QuestChainState {
  chainId: string;
  npcId: string;
  status: QuestChainStatus;
  currentStepIndex: number;
  stepStatuses: Record<string, QuestChainStepStatus>;
  activeQuestId?: string;
  completedAt?: number;
}

export interface VillageState {
  name: string;
  npcs: VillageNpc[];
  quests: Quest[];
  questChains: QuestChainState[];
  unlockFlags: Record<string, boolean>;
  renown: number;
  completedUpgradeIds: string[];
  discoveredRecipeIds: string[];
  completedRunPreparationIds?: string[];
}

export type RecipeCategory =
  | "weapon"
  | "armor"
  | "shield"
  | "potion"
  | "trinket"
  | "tool"
  | "enchantment"
  | "upgradeMaterial";

export interface RecipeIngredient {
  materialId?: MaterialId;
  itemTemplateId?: string;
  quantity: number;
}

export interface RecipeOutput {
  itemTemplateId?: string;
  materialId?: MaterialId;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  stationRole: NpcRole;
  requiredServiceLevel: ServiceLevel;
  ingredients: RecipeIngredient[];
  goldCost?: number;
  outputs: RecipeOutput[];
  unlockFlag?: string;
  repeatable: boolean;
}

export interface ServiceActionDefinition {
  id: ServiceActionId;
  role: NpcRole;
  name: string;
  description: string;
  requiredServiceLevel: ServiceLevel;
  cost?: ResourceCost;
  effect: ServiceActionEffect;
  repeatable: boolean;
}

export type ServiceActionEffectType =
  | "repairItem"
  | "craftRecipe"
  | "healWounded"
  | "identifyItem"
  | "addRunPreparation"
  | "revealDungeonHint"
  | "unlockRecipe"
  | "rerollAffix"
  | "reinforceItem"
  | "sellItems";

export interface ServiceActionEffect {
  type: ServiceActionEffectType;
  recipeId?: string;
  runPreparationId?: string;
  itemInstanceId?: string;
  amount?: number;
  message: string;
}

export interface ServiceActionResult {
  success: boolean;
  message: string;
  gameState?: GameState;
  createdItems?: ItemInstance[];
  spentResources?: ResourceCost;
}

export type RunPreparationEffectType =
  | "startWithItem"
  | "revealExtraRooms"
  | "increaseCarryCapacity"
  | "temporaryStatBonus"
  | "protectOneItem"
  | "reduceStartingThreat"
  | "trapWard"
  | "extractionHint"
  | "improveScouting";

export interface RunPreparationEffect {
  type: RunPreparationEffectType;
  amount?: number;
  quantity?: number;
  itemTemplateId?: string;
  statKey?: keyof DerivedStats | AbilityName;
  targetItemInstanceId?: string;
  durationRuns: number;
}

export interface RunPreparationOption {
  id: string;
  name: string;
  description: string;
  sourceRole: NpcRole;
  requiredServiceLevel: ServiceLevel;
  cost: ResourceCost;
  effect: RunPreparationEffect;
  oncePerRun: boolean;
}

export interface PreparedRunModifier {
  id: string;
  optionId: string;
  sourceNpcId: string;
  effect: RunPreparationEffect;
  createdAt: number;
  consumed: boolean;
}

export interface GameSettings {
  onboardingComplete: boolean;
  textSpeed: "slow" | "normal" | "fast";
}

export interface GameState {
  version: number;
  player?: Character;
  village?: VillageState;
  stash: Inventory;
  preparedInventory: Inventory;
  activeRun?: DungeonRun;
  activeCombat?: CombatState;
  completedRuns: DungeonRun[];
  runSummaries: RunSummary[];
  lastRunSummary?: RunSummary;
  settings: GameSettings;
  pendingRunPreparations?: PreparedRunModifier[];
}

export type RunEndReason =
  | "extracted"
  | "dead"
  | "abandoned"
  | "debugExtracted";

export interface QuestProgressSummary {
  questId: string;
  title: string;
  beforeCount: number;
  afterCount: number;
  requiredCount: number;
  status: QuestStatus;
}

export interface RunSummary {
  id: string;
  runId: string;
  seed: string;
  biome: DungeonBiome;
  tier: number;
  startedAt: number;
  endedAt: number;
  reason: RunEndReason;
  reasonText: string;
  roomsVisited: number;
  roomsCompleted: number;
  lootExtracted: ItemInstance[];
  lootLost: ItemInstance[];
  gearLost: ItemInstance[];
  goldGained: number;
  goldLost: number;
  xpGained: number;
  itemValueExtracted: number;
  itemValueLost: number;
  raidValueLost: number;
  deathExtractionDistance?: number;
  deathExtractionKnown?: boolean;
  questProgress: QuestProgressSummary[];
  questsCompleted: Quest[];
  questRewards: ItemInstance[];
  unlocksApplied: string[];
}

export type ScreenId =
  | "mainMenu"
  | "onboarding"
  | "characterCreation"
  | "village"
  | "dungeon"
  | "combat"
  | "runSummary"
  | "stash"
  | "character"
  | "quests"
  | "merchant";

export interface CombatState {
  encounterId: string;
  enemies: EnemyInstance[];
  playerDefending: boolean;
  turn: number;
  log: string[];
  over: boolean;
  outcome?: "victory" | "defeat" | "fled";
  fromRoomId: string;
  actionRuntimeState?: CombatActionRuntimeState[];
  actionThreatDeltas?: {
    actionId: string;
    amount: number;
    reason: ThreatChangeReason;
    message: string;
  }[];
}

export type QuestEvent =
  | { kind: "enemySlain"; enemyId: string; biome: DungeonBiome }
  | { kind: "roomScouted"; roomType: RoomType; biome: DungeonBiome }
  | { kind: "chestOpened"; biome: DungeonBiome }
  | { kind: "materialCollected"; tag: string; biome: DungeonBiome }
  | { kind: "depthReached"; roomCount: number; biome: DungeonBiome }
  | { kind: "miniBossDefeated"; biome: DungeonBiome }
  | { kind: "itemRetrieved"; templateId: string; biome: DungeonBiome }
  | { kind: "signFound"; biome: DungeonBiome };

// ---------------------------------------------------------------------------
// v0.2: Threat
// ---------------------------------------------------------------------------

export type ThreatLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ThreatChangeReason =
  | "enteredRoom"
  | "searchedRoom"
  | "failedTrap"
  | "openedNoisyChest"
  | "eventChoice"
  | "extendedCombat"
  | "fledCombat"
  | "usedLoudMagic"
  | "carriedCursedLoot"
  | "extractionComplication"
  | "debug";

export interface ThreatChange {
  id: string;
  timestamp: number;
  reason: ThreatChangeReason;
  amount: number;
  previousPoints: number;
  newPoints: number;
  previousLevel: ThreatLevel;
  newLevel: ThreatLevel;
  message: string;
}

export interface ThreatState {
  points: number;
  level: ThreatLevel;
  maxLevel: ThreatLevel;
  lastChangedAt: number;
  changes: ThreatChange[];
}

export interface ThreatLevelModifier {
  level: ThreatLevel;
  label: string;
  description: string;
  encounterDangerBonus: number;
  eliteEncounterChanceBonus: number;
  trapDifficultyBonus: number;
  trapDamageBonus: number;
  fleeChancePenalty: number;
  ambushChance: number;
  extractionComplicationChance: number;
}

// ---------------------------------------------------------------------------
// v0.2: Room scouting
// ---------------------------------------------------------------------------

export type RoomKnowledgeLevel =
  | "unknown"
  | "signsOnly"
  | "dangerKnown"
  | "likelyType"
  | "exactType";

export type DangerBand =
  | "safe"
  | "low"
  | "moderate"
  | "high"
  | "severe"
  | "unknown";

export type RoomSignTag =
  | "blood"
  | "bones"
  | "footprints"
  | "scraping"
  | "whispers"
  | "coldAir"
  | "warmAir"
  | "rot"
  | "smoke"
  | "metal"
  | "water"
  | "fungus"
  | "arcaneResidue"
  | "tripwire"
  | "treasureGlint"
  | "chanting"
  | "silence"
  | "freshAir"
  | "collapsedStone"
  | "distantMovement";

export interface RoomScoutingProfile {
  signs: RoomSignTag[];
  hiddenDanger: boolean;
  hasTrapSignature: boolean;
  hasMagicSignature: boolean;
  hasCreatureSigns: boolean;
  hasTreasureSigns: boolean;
  hasExtractionSigns: boolean;
  falseSignalChance: number;
}

export interface ScoutedRoomInfo {
  roomId: string;
  knowledgeLevel: RoomKnowledgeLevel;
  dangerBand: DangerBand;
  shownType?: RoomType;
  likelyTypes: RoomType[];
  signs: RoomSignTag[];
  warning?: string;
  confidence: number;
  scoutedAtThreatLevel: ThreatLevel;
  scoutedAt: number;
}

// ---------------------------------------------------------------------------
// v0.2: Extraction
// ---------------------------------------------------------------------------

export type ExtractionVariant =
  | "stable"
  | "delayed"
  | "guarded"
  | "unstable"
  | "burdened";

export type ExtractionState =
  | "available"
  | "charging"
  | "blocked"
  | "completed"
  | "failed";

export interface ExtractionPoint {
  id: string;
  variant: ExtractionVariant;
  state: ExtractionState;
  title: string;
  description: string;
  activationText: string;
  successText: string;
  failureText?: string;

  requiredTurns?: number;
  turnsRemaining?: number;

  guardEncounterId?: string;
  guardDefeated?: boolean;

  baseComplicationChance?: number;
  threatSensitive?: boolean;

  burdenedWeightLimitRatio?: number;

  requiredItemTemplateId?: string;
  requiredGold?: number;

  activatedAt?: number;
}

// ---------------------------------------------------------------------------
// v0.2: Stat checks (shared by events/traps/search)
// ---------------------------------------------------------------------------

export type StatCheckAbility =
  | "might"
  | "agility"
  | "endurance"
  | "intellect"
  | "will"
  | "presence"
  | "trapSense"
  | "magicPower";

export interface StatCheckDefinition {
  ability: StatCheckAbility;
  difficulty: number;
  successMessage: string;
  failureMessage: string;
}

export interface StatCheckResult {
  passed: boolean;
  roll: number;
  modifier: number;
  total: number;
  difficulty: number;
}

// ---------------------------------------------------------------------------
// v0.2: Room events
// ---------------------------------------------------------------------------

export type RoomEventType =
  | "shrine"
  | "obstacle"
  | "stranger"
  | "strangeChest"
  | "oldCamp"
  | "obelisk"
  | "merchantShade"
  | "ominousSilence"
  | "sealedDoor"
  | "lostSupplies";

export type EventChoiceRequirementType =
  | "hasItem"
  | "hasGold"
  | "class"
  | "ancestry"
  | "minAbility"
  | "minThreat"
  | "maxThreat"
  | "serviceUnlocked";

export interface EventChoiceRequirement {
  type: EventChoiceRequirementType;
  key: string;
  value?: string | number | boolean;
}

export type EventOutcomeType =
  | "gainGold"
  | "loseGold"
  | "gainItem"
  | "gainLootFromTable"
  | "loseRandomItem"
  | "heal"
  | "damage"
  | "increaseThreat"
  | "decreaseThreat"
  | "startCombat"
  | "applyStatus"
  | "questProgress"
  | "revealAdjacentRoom"
  | "improveRoomScouting"
  | "triggerTrap"
  | "markRoomCompleted"
  | "addDungeonLog";

export interface EventOutcome {
  type: EventOutcomeType;
  amount?: number;
  itemTemplateId?: string;
  lootTableId?: string;
  encounterId?: string;
  statusId?: string;
  questTarget?: string;
  roomId?: string;
  message?: string;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  requirements?: EventChoiceRequirement[];
  statCheck?: StatCheckDefinition;
  successOutcomes: EventOutcome[];
  failureOutcomes?: EventOutcome[];
  alwaysAvailable?: boolean;
}

export interface RoomEventDefinition {
  id: string;
  type: RoomEventType;
  title: string;
  description: string;
  biomeTags?: DungeonBiome[];
  minTier: number;
  maxTier: number;
  weight: number;
  choices: EventChoice[];
}

export interface ActiveRoomEvent {
  eventId: string;
  roomId: string;
  resolved: boolean;
  selectedChoiceId?: string;
  resultMessage?: string;
}

// ---------------------------------------------------------------------------
// v0.2: Traps
// ---------------------------------------------------------------------------

export type TrapType =
  | "mechanical"
  | "magical"
  | "poison"
  | "collapse"
  | "alarm"
  | "curse";

export type TrapOutcomeType =
  | "damage"
  | "increaseThreat"
  | "destroyRandomLoot"
  | "applyStatus"
  | "startCombat"
  | "lockRoom"
  | "addDungeonLog";

export interface TrapOutcome {
  type: TrapOutcomeType;
  amount?: number;
  statusId?: string;
  encounterId?: string;
  message: string;
}

export interface TrapDefinition {
  id: string;
  name: string;
  type: TrapType;
  description: string;
  biomeTags?: DungeonBiome[];
  minTier: number;
  maxTier: number;
  weight: number;
  detectionDifficulty: number;
  disarmDifficulty: number;
  triggerDifficulty: number;
  damageDice?: DiceFormula;
  threatIncreaseOnTrigger?: number;
  threatIncreaseOnDetectionFailure?: number;
  outcomesOnTrigger: TrapOutcome[];
  outcomesOnDisarm?: TrapOutcome[];
}

export interface ActiveTrap {
  trapId: string;
  roomId: string;
  detected: boolean;
  disarmed: boolean;
  triggered: boolean;
}

// ---------------------------------------------------------------------------
// v0.2: Search
// ---------------------------------------------------------------------------

export type SearchResultType =
  | "nothing"
  | "hiddenLoot"
  | "trapDetected"
  | "trapTriggered"
  | "eventRevealed"
  | "questClue"
  | "ambush";

export interface RoomSearchState {
  searched: boolean;
  searchCount: number;
  hiddenLootClaimed: boolean;
  trapChecked: boolean;
  eventRevealed: boolean;
}

export interface TrapResolutionResult {
  trapId: string;
  detected: boolean;
  disarmed?: boolean;
  triggered: boolean;
  checkResult?: StatCheckResult;
  message: string;
}

export interface SearchResult {
  type: SearchResultType;
  message: string;
  loot?: ItemInstance[];
  trapResult?: TrapResolutionResult;
  threatChange?: ThreatChange;
  revealedEventId?: string;
}

// ---------------------------------------------------------------------------
// v0.2: Dungeon log
// ---------------------------------------------------------------------------

export type DungeonLogEntryType =
  | "info"
  | "warning"
  | "danger"
  | "loot"
  | "combat"
  | "threat"
  | "extraction"
  | "event"
  | "trap"
  | "quest";

export interface DungeonLogEntry {
  id: string;
  timestamp: number;
  type: DungeonLogEntryType;
  message: string;
  roomId?: string;
}
