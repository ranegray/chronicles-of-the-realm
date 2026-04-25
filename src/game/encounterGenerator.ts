import type { EnemyInstance, EncounterDefinition } from "./types";
import { getEnemy } from "../data/enemies";
import { getEncounter, getEncountersForBiome } from "../data/encounters";
import { DEPTH_RULES } from "./constants";
import type { Rng } from "./rng";
import { makeId } from "./rng";

export function buildEnemyInstance(enemyId: string, rng: Rng, depthTier = 1): EnemyInstance {
  const def = getEnemy(enemyId);
  const depthBonus = Math.max(0, depthTier - 1);
  const hpBonus = depthBonus * DEPTH_RULES.enemyScaling.hpPerDepth;
  const damageBonus = Math.floor(depthBonus / DEPTH_RULES.enemyScaling.damageEveryDepth);
  const name = depthTier >= 7
    ? `Depth-worn ${def.name}`
    : depthTier >= 4
      ? `Hardened ${def.name}`
      : def.name;
  return {
    instanceId: makeId(rng, "enemy"),
    enemyId,
    name,
    hp: def.hp + hpBonus,
    maxHp: def.hp + hpBonus,
    armor: def.armor + Math.floor(depthBonus / DEPTH_RULES.enemyScaling.armorEveryDepth),
    accuracy: def.accuracy + Math.floor(depthBonus / DEPTH_RULES.enemyScaling.accuracyEveryDepth),
    evasion: def.evasion + Math.floor(depthBonus / DEPTH_RULES.enemyScaling.evasionEveryDepth),
    damageDice: {
      ...def.damageDice,
      modifier: (def.damageDice.modifier ?? 0) + damageBonus
    }
  };
}

export function buildEncounterEnemies(
  encounter: EncounterDefinition,
  rng: Rng,
  depthTier = 1
): EnemyInstance[] {
  return encounter.enemyIds.map(id => buildEnemyInstance(id, rng, depthTier));
}

export function getEncounterById(id: string) {
  return getEncounter(id);
}

export function pickRandomEncounterForBiome(
  biome: Parameters<typeof getEncountersForBiome>[0],
  tier: number,
  rng: Rng
): EncounterDefinition {
  const list = getEncountersForBiome(biome, tier);
  return rng.pickWeighted(list.map(e => ({ value: e, weight: e.weight })));
}
