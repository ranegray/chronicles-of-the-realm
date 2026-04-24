import type { RunPreparationOption } from "../game/types";

export const RUN_PREPARATION_OPTIONS: RunPreparationOption[] = [
  {
    id: "prep-reinforced-weapon",
    name: "Reinforced Weapon",
    description: "The blacksmith reinforces one equipped weapon for the next run.",
    sourceRole: "blacksmith",
    requiredServiceLevel: 2,
    cost: { gold: 10, materials: { scrapIron: 2 } },
    effect: { type: "temporaryStatBonus", statKey: "accuracy", amount: 1, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-reinforced-armor",
    name: "Reinforced Armor",
    description: "The blacksmith reinforces your armor plates and straps for one run.",
    sourceRole: "blacksmith",
    requiredServiceLevel: 4,
    cost: { gold: 14, materials: { oathIron: 2 } },
    effect: { type: "temporaryStatBonus", statKey: "armor", amount: 1, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-starter-healing-draught",
    name: "Packed Healing Draught",
    description: "The alchemist packs one weak healing draught into your loadout.",
    sourceRole: "alchemist",
    requiredServiceLevel: 1,
    cost: { gold: 5, materials: { commonHerbs: 1 } },
    effect: { type: "startWithItem", itemTemplateId: "consumable_small_draught", quantity: 1, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-smoke-cover",
    name: "Extraction Smoke",
    description: "A pouch of smoke powder keeps the dungeon slower to notice you.",
    sourceRole: "alchemist",
    requiredServiceLevel: 5,
    cost: { gold: 20, materials: { emberglassShard: 1 } },
    effect: { type: "reduceStartingThreat", amount: 10, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-extra-room-hint",
    name: "Marked First Passage",
    description: "The cartographer helps reveal extra information near the dungeon entrance.",
    sourceRole: "cartographer",
    requiredServiceLevel: 1,
    cost: { gold: 8 },
    effect: { type: "revealExtraRooms", amount: 1, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-extraction-hint",
    name: "Vague Extraction Hint",
    description: "Begin the run with a rough sense of where an extraction path may lie.",
    sourceRole: "cartographer",
    requiredServiceLevel: 3,
    cost: { gold: 15, materials: { moonlitThread: 1 } },
    effect: { type: "extractionHint", amount: 1, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-quiet-route",
    name: "Quiet Route",
    description: "A route note helps you avoid the loudest approach.",
    sourceRole: "cartographer",
    requiredServiceLevel: 4,
    cost: { gold: 18, materials: { drownedSilk: 1 } },
    effect: { type: "reduceStartingThreat", amount: 8, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-trap-ward",
    name: "Minor Trap Ward",
    description: "The first trap that damages you next run deals reduced damage.",
    sourceRole: "enchanter",
    requiredServiceLevel: 2,
    cost: { gold: 12, materials: { blackQuartz: 1 } },
    effect: { type: "trapWard", amount: 50, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-protect-one-item",
    name: "Bound Keepsake",
    description: "Protect one carried item from death loss for one run.",
    sourceRole: "enchanter",
    requiredServiceLevel: 4,
    cost: { gold: 20, materials: { moonlitThread: 1, blackQuartz: 1 } },
    effect: { type: "protectOneItem", amount: 1, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-road-blessing",
    name: "Road Blessing",
    description: "A healer's blessing adds a little armor for the next run.",
    sourceRole: "healer",
    requiredServiceLevel: 2,
    cost: { gold: 8, materials: { commonHerbs: 1 } },
    effect: { type: "temporaryStatBonus", statKey: "armor", amount: 1, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-spirit-ward",
    name: "Spirit Ward",
    description: "A stronger charm steadies the mind against sudden harm.",
    sourceRole: "healer",
    requiredServiceLevel: 4,
    cost: { gold: 16, materials: { graveDust: 2, paleWax: 2 } },
    effect: { type: "temporaryStatBonus", statKey: "evasion", amount: 1, durationRuns: 1 },
    oncePerRun: true
  },
  {
    id: "prep-expanded-pack",
    name: "Expanded Pack",
    description: "The quartermaster adjusts your pack for a small carry capacity increase.",
    sourceRole: "quartermaster",
    requiredServiceLevel: 2,
    cost: { gold: 10, materials: { rawhide: 2, snareCord: 1 } },
    effect: { type: "increaseCarryCapacity", amount: 5, durationRuns: 1 },
    oncePerRun: true
  }
];

export function getRunPreparationOption(id: string): RunPreparationOption | undefined {
  return RUN_PREPARATION_OPTIONS.find(option => option.id === id);
}
