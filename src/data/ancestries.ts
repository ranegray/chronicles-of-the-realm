import type { AncestryDefinition, AncestryId } from "../game/types";

export const ANCESTRIES: AncestryDefinition[] = [
  {
    id: "human",
    name: "Human",
    description:
      "Frontier-folk from the river holds. Flexible, stubborn, and uncommonly reliable when the lantern gutters out.",
    bonuses: { might: 1, endurance: 1, presence: 1 },
    traitName: "Grit",
    traitDescription: "A small bonus to overall survivability and morale."
  },
  {
    id: "stonekin",
    name: "Stonekin",
    description:
      "Short, broad, and mountain-born. Their bones are dense as old slate and they rarely break what they shield.",
    bonuses: { endurance: 2, might: 1, armor: 1 },
    traitName: "Slatebone",
    traitDescription: "Increased endurance and slightly tougher armor."
  },
  {
    id: "eldryn",
    name: "Eldryn",
    description:
      "Forest-touched. Their eyes gather dim light, their steps do not crack dry leaves.",
    bonuses: { agility: 2, intellect: 1, evasion: 1 },
    traitName: "Keen Sight",
    traitDescription: "Better perception and agility when moving through dungeons."
  },
  {
    id: "emberborn",
    name: "Emberborn",
    description:
      "Marked in infancy by old flame spirits. Their hair carries a dry warmth and their moods smolder.",
    bonuses: { intellect: 1, will: 2, magicPower: 1 },
    traitName: "Ashblood",
    traitDescription: "Improved magic power and resistance to burning effects."
  },
  {
    id: "moonvale",
    name: "Moonvale",
    description:
      "Quiet wanderers born under twin moons. Their luck is unnerving and no lockbox quite holds against them.",
    bonuses: { agility: 1, presence: 1, critChance: 5, trapSense: 1 },
    traitName: "Night-Lucky",
    traitDescription: "Better stealth, slightly better crit, and avoidance of bad surprises."
  }
];

export function getAncestry(id: AncestryId): AncestryDefinition {
  const found = ANCESTRIES.find(a => a.id === id);
  if (!found) throw new Error(`Unknown ancestry: ${id}`);
  return found;
}
