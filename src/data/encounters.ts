import type { EncounterDefinition, DungeonBiome } from "../game/types";

export const ENCOUNTERS: EncounterDefinition[] = [
  // Crypt
  { id: "enc_crypt_rats", name: "Skittering Rats", biome: "crypt", minTier: 1, maxTier: 1, enemyIds: ["crypt_bone_rat", "crypt_bone_rat"], weight: 4, tags: ["small"], dangerRating: 1 },
  { id: "enc_crypt_wisp", name: "Lone Grave Wisp", biome: "crypt", minTier: 1, maxTier: 1, enemyIds: ["crypt_grave_wisp"], weight: 3, tags: ["spirit"], dangerRating: 1 },
  { id: "enc_crypt_skeleton", name: "Rusted Sentinel", biome: "crypt", minTier: 1, maxTier: 1, enemyIds: ["crypt_rusted_skeleton"], weight: 3, tags: ["armor"], dangerRating: 2 },
  { id: "enc_crypt_acolyte_pair", name: "Whispering Pair", biome: "crypt", minTier: 1, maxTier: 1, enemyIds: ["crypt_hollow_acolyte", "crypt_bone_rat"], weight: 2, tags: ["spirit"], dangerRating: 2 },

  // Goblin Warrens
  { id: "enc_gob_pair", name: "Candle Pair", biome: "goblinWarrens", minTier: 1, maxTier: 1, enemyIds: ["goblin_candle", "goblin_candle"], weight: 4, tags: ["small"], dangerRating: 1 },
  { id: "enc_gob_snare", name: "Trapper", biome: "goblinWarrens", minTier: 1, maxTier: 1, enemyIds: ["goblin_snare"], weight: 3, tags: [], dangerRating: 1 },
  { id: "enc_gob_sneak_pair", name: "Sneak and Snare", biome: "goblinWarrens", minTier: 1, maxTier: 1, enemyIds: ["goblin_tunnel_sneak", "goblin_snare"], weight: 2, tags: [], dangerRating: 2 },
  { id: "enc_gob_brute", name: "Warrens Brute", biome: "goblinWarrens", minTier: 1, maxTier: 1, enemyIds: ["goblin_warrens_brute"], weight: 2, tags: ["brute"], dangerRating: 3 },

  // Fungal Caverns
  { id: "enc_fungal_sporelings", name: "Sporeling Cluster", biome: "fungalCaverns", minTier: 1, maxTier: 1, enemyIds: ["fungal_sporeling", "fungal_sporeling", "fungal_sporeling"], weight: 3, tags: ["small"], dangerRating: 1 },
  { id: "enc_fungal_crawler", name: "Lone Crawler", biome: "fungalCaverns", minTier: 1, maxTier: 1, enemyIds: ["fungal_myconid_crawler"], weight: 3, tags: [], dangerRating: 1 },
  { id: "enc_fungal_lasher", name: "Glowcap Watch", biome: "fungalCaverns", minTier: 1, maxTier: 1, enemyIds: ["fungal_glowcap_lasher"], weight: 3, tags: [], dangerRating: 2 },
  { id: "enc_fungal_beetle", name: "Sickly Beetle", biome: "fungalCaverns", minTier: 1, maxTier: 1, enemyIds: ["fungal_cave_beetle"], weight: 2, tags: ["beetle"], dangerRating: 2 },

  // Ruined Keep
  { id: "enc_keep_guard", name: "Lone Oathless", biome: "ruinedKeep", minTier: 1, maxTier: 1, enemyIds: ["keep_oathless_guard"], weight: 3, tags: ["armor"], dangerRating: 2 },
  { id: "enc_keep_hound", name: "Dust Hound", biome: "ruinedKeep", minTier: 1, maxTier: 1, enemyIds: ["keep_dust_hound"], weight: 3, tags: ["beast"], dangerRating: 1 },
  { id: "enc_keep_squire_pair", name: "Squire and Hound", biome: "ruinedKeep", minTier: 1, maxTier: 1, enemyIds: ["keep_fallen_squire", "keep_dust_hound"], weight: 2, tags: [], dangerRating: 2 },
  { id: "enc_keep_gargoyle", name: "Cracked Watcher", biome: "ruinedKeep", minTier: 1, maxTier: 1, enemyIds: ["keep_cracked_gargoyle"], weight: 2, tags: ["stone"], dangerRating: 3 },

  // Old Mine
  { id: "enc_mine_gnoll", name: "Pick Gnoll", biome: "oldMine", minTier: 1, maxTier: 1, enemyIds: ["mine_pick_gnoll"], weight: 3, tags: [], dangerRating: 2 },
  { id: "enc_mine_leeches", name: "Leech Swarm", biome: "oldMine", minTier: 1, maxTier: 1, enemyIds: ["mine_cave_leech", "mine_cave_leech"], weight: 3, tags: ["beast"], dangerRating: 1 },
  { id: "enc_mine_oreback", name: "Oreback", biome: "oldMine", minTier: 1, maxTier: 1, enemyIds: ["mine_oreback_beetle"], weight: 2, tags: ["beetle"], dangerRating: 2 },
  { id: "enc_mine_shade", name: "Prospector Shade", biome: "oldMine", minTier: 1, maxTier: 1, enemyIds: ["mine_blind_prospector"], weight: 2, tags: ["spirit"], dangerRating: 2 },

  // Sunken Temple
  { id: "enc_temple_slime", name: "Brine Slime", biome: "sunkenTemple", minTier: 1, maxTier: 1, enemyIds: ["temple_brine_slime"], weight: 3, tags: [], dangerRating: 1 },
  { id: "enc_temple_initiate", name: "Drowned Initiate", biome: "sunkenTemple", minTier: 1, maxTier: 1, enemyIds: ["temple_drowned_initiate"], weight: 3, tags: ["spirit"], dangerRating: 2 },
  { id: "enc_temple_imp_pair", name: "Coral Imps", biome: "sunkenTemple", minTier: 1, maxTier: 1, enemyIds: ["temple_coral_imp", "temple_coral_imp"], weight: 2, tags: ["small"], dangerRating: 2 },
  { id: "enc_temple_husk", name: "Tidebound Husk", biome: "sunkenTemple", minTier: 1, maxTier: 1, enemyIds: ["temple_tidebound_husk"], weight: 2, tags: ["brute"], dangerRating: 3 }
];

export function getEncountersForBiome(biome: DungeonBiome, tier: number) {
  const exact = ENCOUNTERS.filter(e => e.biome === biome && tier >= e.minTier && tier <= e.maxTier);
  if (exact.length > 0) return exact;

  const fallbackTier = Math.max(
    ...ENCOUNTERS
      .filter(e => e.biome === biome && e.maxTier <= tier)
      .map(e => e.maxTier)
  );
  return ENCOUNTERS.filter(e => e.biome === biome && e.maxTier === fallbackTier);
}

export function getEncounter(id: string) {
  const e = ENCOUNTERS.find(x => x.id === id);
  if (!e) throw new Error(`Unknown encounter: ${id}`);
  return e;
}
