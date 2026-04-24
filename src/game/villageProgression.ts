import type {
  GameState,
  NpcRole,
  NpcServiceState,
  ServiceDefinition,
  ServiceLevel,
  ServiceLevelDefinition,
  ServiceUnlock,
  UpgradeRequirement,
  VillageNpc,
  VillageState
} from "./types";
import { VILLAGE_PROGRESSION_RULES } from "./constants";
import { SERVICE_DEFINITIONS, getServiceDefinition } from "../data/serviceDefinitions";
import { canAffordResourceCost, spendResourceCost } from "./materials";

export function initializeVillageProgression(params: {
  village: VillageState;
  now?: number;
}): VillageState {
  const now = params.now ?? Date.now();
  const npcs = params.village.npcs.map(npc => initializeNpcService(npc, now));
  return {
    ...params.village,
    npcs,
    questChains: params.village.questChains ?? [],
    unlockFlags: params.village.unlockFlags ?? {},
    renown: params.village.renown ?? VILLAGE_PROGRESSION_RULES.startingRenown,
    completedUpgradeIds: params.village.completedUpgradeIds ?? [],
    discoveredRecipeIds: params.village.discoveredRecipeIds ?? []
  };
}

export function initializeNpcService(npc: VillageNpc, now = Date.now()): VillageNpc {
  const level = normalizeServiceLevel(npc.service?.level ?? npc.serviceLevel ?? VILLAGE_PROGRESSION_RULES.startingServiceLevel);
  const service: NpcServiceState = {
    role: npc.role,
    level,
    xp: npc.service?.xp ?? 0,
    unlockedActionIds: [...(npc.service?.unlockedActionIds ?? [])],
    unlockedRecipeIds: [...(npc.service?.unlockedRecipeIds ?? [])],
    unlockedRunPreparationIds: [...(npc.service?.unlockedRunPreparationIds ?? [])],
    unlockedFlags: { ...(npc.service?.unlockedFlags ?? {}) },
    lastUpgradedAt: npc.service?.lastUpgradedAt
  };
  let initialized: VillageNpc = {
    ...npc,
    serviceLevel: level,
    service,
    activeQuestChainIds: npc.activeQuestChainIds ?? [],
    completedQuestChainIds: npc.completedQuestChainIds ?? []
  };
  for (const def of getUnlockedLevelDefinitions(initialized)) {
    initialized = applyServiceUnlocks({ npc: initialized, unlocks: def.unlocks });
  }
  if (!initialized.service.lastUpgradedAt) {
    initialized = { ...initialized, service: { ...initialized.service, lastUpgradedAt: now } };
  }
  return initialized;
}

export function getServiceDefinitionForNpc(npc: VillageNpc): ServiceDefinition | undefined {
  return getServiceDefinition(npc.role);
}

export function getCurrentServiceLevelDefinition(params: {
  npc: VillageNpc;
}): ServiceLevelDefinition | undefined {
  const def = getServiceDefinitionForNpc(params.npc);
  const level = params.npc.service?.level ?? params.npc.serviceLevel;
  return def?.levelDefinitions.find(levelDef => levelDef.level === level);
}

export function getNextServiceLevelDefinition(params: {
  npc: VillageNpc;
}): ServiceLevelDefinition | undefined {
  const def = getServiceDefinitionForNpc(params.npc);
  const level = params.npc.service?.level ?? params.npc.serviceLevel;
  return def?.levelDefinitions.find(levelDef => levelDef.level === level + 1);
}

export function canUpgradeNpcService(params: {
  gameState: GameState;
  npcId: string;
}): {
  canUpgrade: boolean;
  reason?: string;
  cost?: ServiceLevelDefinition["upgradeCost"];
} {
  const village = params.gameState.village;
  const npc = village?.npcs.find(entry => entry.id === params.npcId);
  if (!village || !npc) return { canUpgrade: false, reason: "NPC not found." };
  if ((npc.service?.level ?? npc.serviceLevel) >= VILLAGE_PROGRESSION_RULES.maxServiceLevel) {
    return { canUpgrade: false, reason: "Already at max service level." };
  }
  if (params.gameState.activeRun) {
    return { canUpgrade: false, reason: "Finish the current run before upgrading village services." };
  }
  const next = getNextServiceLevelDefinition({ npc });
  if (!next) return { canUpgrade: false, reason: "No next service level." };
  const requirementFailure = firstFailedRequirement(params.gameState, npc, next.requirements ?? []);
  if (requirementFailure) return { canUpgrade: false, reason: requirementFailure, cost: next.upgradeCost };
  if (next.upgradeCost && !canAffordResourceCost({ inventory: params.gameState.stash, cost: next.upgradeCost })) {
    return { canUpgrade: false, reason: "Missing required resources.", cost: next.upgradeCost };
  }
  return { canUpgrade: true, cost: next.upgradeCost };
}

export function upgradeNpcService(params: {
  gameState: GameState;
  npcId: string;
  now?: number;
}): {
  gameState: GameState;
  success: boolean;
  message: string;
} {
  const gate = canUpgradeNpcService(params);
  if (!gate.canUpgrade) {
    return { gameState: params.gameState, success: false, message: gate.reason ?? "Cannot upgrade." };
  }
  const village = params.gameState.village!;
  const npc = village.npcs.find(entry => entry.id === params.npcId)!;
  const nextDef = getNextServiceLevelDefinition({ npc })!;
  const spend = gate.cost
    ? spendResourceCost({ inventory: params.gameState.stash, cost: gate.cost })
    : { inventory: params.gameState.stash, success: true };
  if (!spend.success) {
    return { gameState: params.gameState, success: false, message: "Missing required resources." };
  }
  const upgradedNpc = applyServiceUnlocks({
    npc: {
      ...npc,
      serviceLevel: nextDef.level,
      service: {
        ...npc.service,
        level: nextDef.level,
        lastUpgradedAt: params.now ?? Date.now()
      }
    },
    unlocks: nextDef.unlocks
  });
  const nextVillage: VillageState = {
    ...village,
    npcs: village.npcs.map(entry => entry.id === npc.id ? upgradedNpc : entry),
    completedUpgradeIds: [...(village.completedUpgradeIds ?? []), `${npc.id}:level-${nextDef.level}`],
    discoveredRecipeIds: mergeIds(
      village.discoveredRecipeIds ?? [],
      nextDef.unlocks.filter(unlock => unlock.recipeId).map(unlock => unlock.recipeId!)
    ),
    unlockFlags: {
      ...(village.unlockFlags ?? {}),
      ...Object.fromEntries(nextDef.unlocks.filter(unlock => unlock.unlockFlag).map(unlock => [unlock.unlockFlag!, true]))
    }
  };
  return {
    gameState: { ...params.gameState, stash: spend.inventory, village: nextVillage },
    success: true,
    message: `${npc.name} reached ${nextDef.title}.`
  };
}

export function applyServiceUnlocks(params: {
  npc: VillageNpc;
  unlocks: ServiceUnlock[];
}): VillageNpc {
  let service: NpcServiceState = {
    ...params.npc.service,
    unlockedActionIds: [...(params.npc.service?.unlockedActionIds ?? [])],
    unlockedRecipeIds: [...(params.npc.service?.unlockedRecipeIds ?? [])],
    unlockedRunPreparationIds: [...(params.npc.service?.unlockedRunPreparationIds ?? [])],
    unlockedFlags: { ...(params.npc.service?.unlockedFlags ?? {}) }
  };
  for (const unlock of params.unlocks) {
    if (unlock.actionId) service.unlockedActionIds = mergeIds(service.unlockedActionIds, [unlock.actionId]);
    if (unlock.recipeId) service.unlockedRecipeIds = mergeIds(service.unlockedRecipeIds, [unlock.recipeId]);
    if (unlock.runPreparationId) service.unlockedRunPreparationIds = mergeIds(service.unlockedRunPreparationIds, [unlock.runPreparationId]);
    if (unlock.unlockFlag) service.unlockedFlags = { ...service.unlockedFlags, [unlock.unlockFlag]: true };
  }
  return { ...params.npc, service };
}

export function addNpcRelationship(params: {
  village: VillageState;
  npcId: string;
  amount: number;
}): VillageState {
  return {
    ...params.village,
    npcs: params.village.npcs.map(npc =>
      npc.id === params.npcId ? { ...npc, relationship: Math.max(0, npc.relationship + params.amount) } : npc
    )
  };
}

export function addNpcServiceXp(params: {
  village: VillageState;
  npcId: string;
  amount: number;
}): VillageState {
  return {
    ...params.village,
    npcs: params.village.npcs.map(npc =>
      npc.id === params.npcId
        ? { ...npc, service: { ...npc.service, xp: (npc.service?.xp ?? 0) + params.amount } }
        : npc
    )
  };
}

export function getServiceLevelTitle(role: NpcRole, level: ServiceLevel): string {
  return SERVICE_DEFINITIONS
    .find(def => def.role === role)
    ?.levelDefinitions.find(def => def.level === level)
    ?.title ?? `Level ${level}`;
}

export function getRelationshipLabel(value: number): string {
  if (value >= VILLAGE_PROGRESSION_RULES.relationshipThresholds.devoted) return "Devoted";
  if (value >= VILLAGE_PROGRESSION_RULES.relationshipThresholds.ally) return "Ally";
  if (value >= VILLAGE_PROGRESSION_RULES.relationshipThresholds.trusted) return "Trusted";
  return "Stranger";
}

function getUnlockedLevelDefinitions(npc: VillageNpc): ServiceLevelDefinition[] {
  const def = getServiceDefinitionForNpc(npc);
  const level = npc.service?.level ?? npc.serviceLevel;
  return def?.levelDefinitions.filter(levelDef => levelDef.level <= level) ?? [];
}

function firstFailedRequirement(gameState: GameState, npc: VillageNpc, requirements: UpgradeRequirement[]): string | undefined {
  for (const requirement of requirements) {
    switch (requirement.type) {
      case "npcRelationship":
        if (npc.relationship < Number(requirement.value ?? 0)) return requirement.description;
        break;
      case "playerLevel":
        if ((gameState.player?.level ?? 0) < Number(requirement.value ?? 0)) return requirement.description;
        break;
      case "serviceLevel": {
        const role = requirement.key as NpcRole;
        const other = gameState.village?.npcs.find(entry => entry.role === role);
        if ((other?.service?.level ?? other?.serviceLevel ?? 0) < Number(requirement.value ?? 0)) return requirement.description;
        break;
      }
      case "villageFlag":
        if (!gameState.village?.unlockFlags?.[requirement.key]) return requirement.description;
        break;
      case "completedQuestChain":
        if (!npc.completedQuestChainIds?.includes(requirement.key)) return requirement.description;
        break;
      case "materialCount":
        if ((gameState.stash.materials?.[requirement.key as keyof typeof gameState.stash.materials] ?? 0) < Number(requirement.value ?? 0)) {
          return requirement.description;
        }
        break;
      default:
        break;
    }
  }
  return undefined;
}

function normalizeServiceLevel(value: number): ServiceLevel {
  return Math.min(5, Math.max(1, Math.floor(value))) as ServiceLevel;
}

function mergeIds<T extends string>(base: T[], next: T[]): T[] {
  return Array.from(new Set([...base, ...next]));
}
