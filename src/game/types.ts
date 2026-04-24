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

export interface ItemAffix {
  id: string;
  name: string;
  description: string;
  stats: StatModifierBlock;
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
  tags?: string[];
  protected?: boolean;
  upgradeLevel?: number;
}

export interface EquipmentSlots {
  weapon?: ItemInstance;
  offhand?: ItemInstance;
  armor?: ItemInstance;
  trinket1?: ItemInstance;
  trinket2?: ItemInstance;
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
}

export interface Inventory {
  items: ItemInstance[];
  gold: number;
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

export interface VillageNpc {
  id: string;
  name: string;
  role: NpcRole;
  personality: string;
  description: string;
  serviceLevel: number;
  relationship: number;
  questIds: string[];
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
  materials?: Record<string, number>;
  relationshipGain?: number;
}

export interface UnlockEffect {
  npcId?: string;
  role?: NpcRole;
  serviceLevelIncrease?: number;
  unlockFlag?: string;
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
}

export interface VillageState {
  name: string;
  npcs: VillageNpc[];
  quests: Quest[];
  unlockFlags: Record<string, boolean>;
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
