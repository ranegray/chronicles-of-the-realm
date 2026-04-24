import type { DungeonBiome, RoomSignTag, RoomType } from "../game/types";

export const ROOM_SIGNS_BY_TYPE: Record<RoomType, RoomSignTag[]> = {
  entrance: ["freshAir"],
  combat: ["blood", "footprints", "distantMovement", "scraping"],
  eliteCombat: ["blood", "bones", "silence", "scraping"],
  treasure: ["treasureGlint", "metal"],
  trap: ["tripwire", "silence", "collapsedStone"],
  shrine: ["whispers", "arcaneResidue", "coldAir"],
  npcEvent: ["footprints", "warmAir"],
  questObjective: ["footprints", "arcaneResidue", "metal"],
  lockedChest: ["treasureGlint", "metal", "tripwire"],
  extraction: ["freshAir", "coldAir"],
  boss: ["blood", "bones", "chanting", "silence"],
  empty: ["coldAir", "collapsedStone"]
};

export const BIOME_SIGN_FLAVOR: Record<DungeonBiome, RoomSignTag[]> = {
  crypt: ["bones", "coldAir", "whispers"],
  goblinWarrens: ["smoke", "footprints", "scraping"],
  fungalCaverns: ["fungus", "rot", "warmAir"],
  ruinedKeep: ["collapsedStone", "metal", "distantMovement"],
  oldMine: ["collapsedStone", "water", "metal"],
  sunkenTemple: ["water", "arcaneResidue", "whispers"]
};

const SIGN_TEXT: Record<RoomSignTag, string> = {
  blood: "spattered blood",
  bones: "old bones",
  footprints: "fresh footprints",
  scraping: "scraping metal",
  whispers: "low whispers",
  coldAir: "cold air",
  warmAir: "warm air",
  rot: "a smell of rot",
  smoke: "smoke haze",
  metal: "dulled metal",
  water: "dripping water",
  fungus: "glowing fungus",
  arcaneResidue: "arcane residue",
  tripwire: "a thin wire",
  treasureGlint: "a glint of gold",
  chanting: "distant chanting",
  silence: "unnatural silence",
  freshAir: "fresh air",
  collapsedStone: "collapsed stone",
  distantMovement: "movement in the dark"
};

export function describeSign(tag: RoomSignTag): string {
  return SIGN_TEXT[tag] ?? tag;
}
