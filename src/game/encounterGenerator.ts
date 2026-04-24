import type { EnemyInstance, EncounterDefinition } from "./types";
import { getEnemy } from "../data/enemies";
import { getEncounter, getEncountersForBiome } from "../data/encounters";
import type { Rng } from "./rng";
import { makeId } from "./rng";

export function buildEnemyInstance(enemyId: string, rng: Rng): EnemyInstance {
  const def = getEnemy(enemyId);
  return {
    instanceId: makeId(rng, "enemy"),
    enemyId,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    armor: def.armor,
    accuracy: def.accuracy,
    evasion: def.evasion,
    damageDice: { ...def.damageDice }
  };
}

export function buildEncounterEnemies(
  encounter: EncounterDefinition,
  rng: Rng
): EnemyInstance[] {
  return encounter.enemyIds.map(id => buildEnemyInstance(id, rng));
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
