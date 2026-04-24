import type { NpcRole, VillageNpc, VillageState } from "./types";
import {
  NPC_FIRST_NAMES,
  NPC_PERSONALITIES,
  NPC_SURNAMES,
  ROLE_DESCRIPTIONS,
  ROLES_FOR_NEW_VILLAGE,
  VILLAGE_NAME_PARTS_A,
  VILLAGE_NAME_PARTS_B
} from "../data/npcTables";
import type { Rng } from "./rng";
import { makeId } from "./rng";

const STARTING_SERVICE_LEVEL = 1 as const;

export function generateNpcName(rng: Rng): string {
  const first = rng.pickOne(NPC_FIRST_NAMES);
  const last = rng.pickOne(NPC_SURNAMES);
  return `${first} ${last}`;
}

export function generateVillageName(rng: Rng): string {
  return `${rng.pickOne(VILLAGE_NAME_PARTS_A)}${rng.pickOne(VILLAGE_NAME_PARTS_B)}`;
}

export function generateVillageNpc(rng: Rng, role: NpcRole): VillageNpc {
  return {
    id: makeId(rng, "npc"),
    name: generateNpcName(rng),
    role,
    personality: rng.pickOne(NPC_PERSONALITIES),
    description: ROLE_DESCRIPTIONS[role],
    serviceLevel: STARTING_SERVICE_LEVEL,
    relationship: 0,
    questIds: [],
    service: {
      role,
      level: STARTING_SERVICE_LEVEL,
      xp: 0,
      unlockedActionIds: [],
      unlockedRecipeIds: [],
      unlockedRunPreparationIds: [],
      unlockedFlags: {}
    },
    activeQuestChainIds: [],
    completedQuestChainIds: []
  };
}

export function generateVillage(rng: Rng): VillageState {
  const villageName = generateVillageName(rng);
  const roles: NpcRole[] = ["elder", "blacksmith", "alchemist", "cartographer", "enchanter", "healer", "quartermaster"];
  const remaining = ROLES_FOR_NEW_VILLAGE.filter(r => !roles.includes(r));
  const shuffled = rng.shuffle(remaining);
  for (let i = 0; i < 1 && i < shuffled.length; i++) {
    roles.push(shuffled[i]!);
  }
  const npcs = roles.map(r => generateVillageNpc(rng, r));
  return {
    name: villageName,
    npcs,
    quests: [],
    questChains: [],
    unlockFlags: {},
    renown: 0,
    completedUpgradeIds: [],
    discoveredRecipeIds: [],
    completedRunPreparationIds: []
  };
}
