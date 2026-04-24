import type {
  Character,
  ClassId,
  DangerBand,
  DungeonRoom,
  DungeonRun,
  RoomKnowledgeLevel,
  RoomSignTag,
  RoomType,
  ScoutedRoomInfo,
  VillageState
} from "./types";
import { SCOUTING_RULES } from "./constants";
import { getModifier } from "./characterMath";
import type { Rng } from "./rng";
import { createRng } from "./rng";

const KNOWLEDGE_TIERS: RoomKnowledgeLevel[] = [
  "unknown",
  "signsOnly",
  "dangerKnown",
  "likelyType",
  "exactType"
];

const PLAUSIBLE_DISTRACTORS: Record<RoomType, RoomType[]> = {
  entrance: ["empty"],
  combat: ["eliteCombat", "trap", "empty"],
  eliteCombat: ["combat", "boss", "trap"],
  treasure: ["lockedChest", "shrine", "empty"],
  trap: ["combat", "lockedChest", "empty"],
  shrine: ["treasure", "npcEvent", "empty"],
  npcEvent: ["shrine", "empty", "questObjective"],
  questObjective: ["treasure", "shrine", "empty"],
  lockedChest: ["treasure", "trap", "empty"],
  extraction: ["empty", "shrine"],
  boss: ["eliteCombat", "combat"],
  empty: ["shrine", "npcEvent", "combat"]
};

export function scoutAdjacentRooms(params: {
  run: DungeonRun;
  character: Character;
  village?: VillageState;
  now?: number;
}): Record<string, ScoutedRoomInfo> {
  const { run, character, village } = params;
  const now = params.now ?? Date.now();
  const current = run.roomGraph.find(r => r.id === run.currentRoomId);
  if (!current) return run.knownRoomIntel;

  const merged: Record<string, ScoutedRoomInfo> = { ...run.knownRoomIntel };
  for (const neighborId of current.connectedRoomIds) {
    if (merged[neighborId]) continue; // deterministic: don't re-scout
    if (run.visitedRoomIds.includes(neighborId)) continue; // UI prefers visited truth
    const neighbor = run.roomGraph.find(r => r.id === neighborId);
    if (!neighbor) continue;
    const rng = createRng(`${run.seed}:scout:${neighborId}`);
    merged[neighborId] = scoutRoom({ room: neighbor, character, run, village, rng, now });
  }
  return merged;
}

export function scoutRoom(params: {
  room: DungeonRoom;
  character: Character;
  run: DungeonRun;
  village?: VillageState;
  rng: Rng;
  now?: number;
}): ScoutedRoomInfo {
  const { room, character, run, village, rng } = params;
  const now = params.now ?? Date.now();
  const score = calculateScoutingScore({ character, run, village, rng });
  const knowledgeLevel = knowledgeLevelForScore(score);
  const dangerBand = knowledgeLevel === "unknown" || knowledgeLevel === "signsOnly"
    ? "unknown"
    : getDangerBand(room.dangerRating);
  const signs = getRoomSigns({ room, knowledgeLevel, rng });

  let shownType: RoomType | undefined;
  let likelyTypes: RoomType[];
  switch (knowledgeLevel) {
    case "exactType":
      shownType = room.type;
      likelyTypes = [room.type];
      break;
    case "likelyType":
      likelyTypes = pickLikelyTypes(room.type, rng);
      break;
    case "dangerKnown":
    case "signsOnly":
    case "unknown":
      likelyTypes = [];
      break;
  }

  const warning = deriveWarning(room, knowledgeLevel);

  return {
    roomId: room.id,
    knowledgeLevel,
    dangerBand,
    shownType,
    likelyTypes,
    signs,
    warning,
    confidence: SCOUTING_RULES.confidenceByKnowledgeLevel[knowledgeLevel],
    scoutedAtThreatLevel: run.threat.level,
    scoutedAt: now
  };
}

export function calculateScoutingScore(params: {
  character: Character;
  run: DungeonRun;
  village?: VillageState;
  rng: Rng;
}): number {
  const { character, run, village, rng } = params;
  const d20 = rng.nextInt(1, 20);
  const agMod = getModifier(character.abilityScores.agility);
  const intMod = getModifier(character.abilityScores.intellect);
  const classBonus = SCOUTING_RULES.classBonuses[character.classId as ClassId] ?? 0;
  const cartographerLevel = getCartographerServiceLevel(village);
  const cartographerBonus = lookupCartographerBonus(cartographerLevel);
  const threatPenalty = run.threat.level;
  return d20 + agMod + intMod + classBonus + cartographerBonus - threatPenalty;
}

export function getDangerBand(dangerRating: number): DangerBand {
  const bands = SCOUTING_RULES.dangerBands;
  if (dangerRating <= bands.safe.max) return "safe";
  if (dangerRating <= bands.low.max) return "low";
  if (dangerRating <= bands.moderate.max) return "moderate";
  if (dangerRating <= bands.high.max) return "high";
  return "severe";
}

export function getRoomSigns(params: {
  room: DungeonRoom;
  knowledgeLevel: RoomKnowledgeLevel;
  rng: Rng;
}): RoomSignTag[] {
  const { room, knowledgeLevel, rng } = params;
  if (knowledgeLevel === "unknown") return [];
  const pool = room.scoutingProfile?.signs ?? [];
  if (pool.length === 0) return [];
  const count = knowledgeLevel === "signsOnly"
    ? Math.min(2, pool.length)
    : Math.min(3, pool.length);
  return rng.shuffle(pool).slice(0, count);
}

export function knowledgeLevelForScore(score: number): RoomKnowledgeLevel {
  const thresholds = SCOUTING_RULES.knowledgeThresholds;
  if (score >= thresholds.exactType) return "exactType";
  if (score >= thresholds.likelyType) return "likelyType";
  if (score >= thresholds.dangerKnown) return "dangerKnown";
  if (score >= thresholds.signsOnly) return "signsOnly";
  return "unknown";
}

export function describeKnowledgeLevel(level: RoomKnowledgeLevel): string {
  return KNOWLEDGE_TIERS.includes(level) ? level : "unknown";
}

function getCartographerServiceLevel(village?: VillageState): number {
  if (!village) return 0;
  const cartographer = village.npcs.find(npc => npc.role === "cartographer");
  return cartographer?.serviceLevel ?? 0;
}

function lookupCartographerBonus(level: number): number {
  const table = SCOUTING_RULES.cartographerServiceBonusByLevel as Record<number, number>;
  if (level in table) return table[level]!;
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  const max = keys[keys.length - 1] ?? 0;
  return table[max] ?? 0;
}

function pickLikelyTypes(actual: RoomType, rng: Rng): RoomType[] {
  const pool = PLAUSIBLE_DISTRACTORS[actual] ?? [];
  if (pool.length === 0) return [actual];
  const distractorCount = Math.min(2, pool.length);
  const distractors = rng.shuffle(pool).slice(0, distractorCount);
  return rng.shuffle([actual, ...distractors]);
}

function deriveWarning(room: DungeonRoom, knowledgeLevel: RoomKnowledgeLevel): string | undefined {
  if (knowledgeLevel !== "exactType") return undefined;
  if (room.type === "trap") return "A trap waits ahead.";
  if (room.type === "boss") return "Something large draws breath.";
  if (room.type === "eliteCombat") return "More than one predator moves inside.";
  return undefined;
}
