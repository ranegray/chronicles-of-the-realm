import type { DungeonBiome, TrapDefinition } from "../game/types";

export const TRAP_TEMPLATES: TrapDefinition[] = [
  {
    id: "trap_tripwire_snare",
    name: "Tripwire Snare",
    type: "mechanical",
    description: "A near-invisible wire strung across the walkway.",
    biomeTags: ["goblinWarrens", "ruinedKeep", "oldMine"],
    minTier: 1,
    maxTier: 5,
    weight: 10,
    detectionDifficulty: 11,
    disarmDifficulty: 12,
    triggerDifficulty: 10,
    damageDice: { count: 1, sides: 6, modifier: 1 },
    threatIncreaseOnTrigger: 12,
    threatIncreaseOnDetectionFailure: 6,
    outcomesOnTrigger: [
      { type: "damage", message: "The snare yanks you off-balance." },
      { type: "increaseThreat", amount: 12, message: "Wire-taut bells ring in the walls." }
    ],
    outcomesOnDisarm: [
      { type: "addDungeonLog", message: "You cut the wire cleanly and pocket the hook." }
    ]
  },
  {
    id: "trap_needle_glyph",
    name: "Needle Glyph",
    type: "poison",
    description: "A rune carved on the floor, oily and dark.",
    biomeTags: ["crypt", "fungalCaverns", "sunkenTemple"],
    minTier: 1,
    maxTier: 5,
    weight: 8,
    detectionDifficulty: 13,
    disarmDifficulty: 14,
    triggerDifficulty: 11,
    damageDice: { count: 1, sides: 4, modifier: 1 },
    threatIncreaseOnTrigger: 8,
    threatIncreaseOnDetectionFailure: 4,
    outcomesOnTrigger: [
      { type: "damage", message: "Needles lance up from the floor." },
      { type: "applyStatus", statusId: "poisoned", message: "A sour heat spreads from the wound." }
    ]
  },
  {
    id: "trap_loose_ceiling",
    name: "Loose Ceiling",
    type: "collapse",
    description: "Keystones above shift as you step beneath them.",
    biomeTags: ["oldMine", "ruinedKeep", "crypt"],
    minTier: 1,
    maxTier: 5,
    weight: 7,
    detectionDifficulty: 12,
    disarmDifficulty: 15,
    triggerDifficulty: 12,
    damageDice: { count: 2, sides: 6, modifier: 0 },
    threatIncreaseOnTrigger: 14,
    threatIncreaseOnDetectionFailure: 6,
    outcomesOnTrigger: [
      { type: "damage", message: "Stone sloughs from the ceiling in a hammering fall." },
      { type: "destroyRandomLoot", amount: 1, message: "The fall crushes something in your pack." },
      { type: "increaseThreat", amount: 14, message: "The dungeon shakes itself awake." }
    ]
  },
  {
    id: "trap_rune_flare",
    name: "Rune Flare",
    type: "magical",
    description: "A softly-glowing sigil pulsing with trapped light.",
    biomeTags: ["sunkenTemple", "crypt", "ruinedKeep"],
    minTier: 1,
    maxTier: 5,
    weight: 6,
    detectionDifficulty: 14,
    disarmDifficulty: 16,
    triggerDifficulty: 12,
    damageDice: { count: 2, sides: 4, modifier: 1 },
    threatIncreaseOnTrigger: 10,
    threatIncreaseOnDetectionFailure: 5,
    outcomesOnTrigger: [
      { type: "damage", message: "The sigil bursts with searing light." },
      { type: "increaseThreat", amount: 10, message: "Magic calls through the dungeon like a bell." }
    ]
  },
  {
    id: "trap_alarm_bones",
    name: "Alarm Bones",
    type: "alarm",
    description: "A nest of hollow bones hung on a spiderweb of sinew.",
    biomeTags: ["crypt", "goblinWarrens"],
    minTier: 1,
    maxTier: 5,
    weight: 5,
    detectionDifficulty: 10,
    disarmDifficulty: 13,
    triggerDifficulty: 10,
    threatIncreaseOnTrigger: 20,
    threatIncreaseOnDetectionFailure: 8,
    outcomesOnTrigger: [
      { type: "increaseThreat", amount: 20, message: "The bones rattle like a thousand voices warning the dungeon." },
      { type: "addDungeonLog", message: "Something in the halls answers the alarm." }
    ]
  }
];

export function getTrapTemplate(id: string): TrapDefinition {
  const t = TRAP_TEMPLATES.find(x => x.id === id);
  if (!t) throw new Error(`Unknown trap template: ${id}`);
  return t;
}

export function getTrapsForBiome(biome: DungeonBiome, tier: number): TrapDefinition[] {
  return TRAP_TEMPLATES.filter(t => {
    if (tier < t.minTier || tier > t.maxTier) return false;
    if (!t.biomeTags || t.biomeTags.length === 0) return true;
    return t.biomeTags.includes(biome);
  });
}
