import type { DungeonBiome } from "../game/types";

export interface BiomeInfo {
  id: DungeonBiome;
  name: string;
  description: string;
  roomDescriptions: string[];
  trapNames: string[];
}

export const BIOMES: BiomeInfo[] = [
  {
    id: "crypt",
    name: "Forgotten Crypt",
    description: "Cold halls where the dead were once arranged with care.",
    roomDescriptions: [
      "A low chamber lined with bone niches. Dust hangs in the lantern.",
      "A flagstone hall, its inscriptions worn to the touch.",
      "A circular vault with a cracked altar at its center.",
      "A narrow corridor where wax dribbles from old sconces.",
      "A side-chapel of white stone, the air sharp and dry."
    ],
    trapNames: ["Pit of Loose Slabs", "Snapping Bone Lattice", "Lure of Whispering Wisps"]
  },
  {
    id: "goblinWarrens",
    name: "Goblin Warrens",
    description: "Hand-dug tunnels braced with stolen lumber. The smell of grease.",
    roomDescriptions: [
      "A cramped den of furs and cracked pots.",
      "A larder hung with smoked things you cannot quite name.",
      "A trade-room with a slumping floor and a low table.",
      "A nesting tunnel piled with stolen blankets.",
      "A chiseled gallery glittering with cheap glass."
    ],
    trapNames: ["Snare Wire", "Pit Spike", "Falling Net"]
  },
  {
    id: "fungalCaverns",
    name: "Fungal Caverns",
    description: "Damp caves lit by faint glow. The air tastes earthy and warm.",
    roomDescriptions: [
      "A cave of pale mushrooms taller than a man.",
      "A spore-thick gallery, the floor spongy and yielding.",
      "A glowcap pool where the water is too still.",
      "A ribbed cavern hung with creeping mycelium.",
      "A round chamber where the walls breathe slowly."
    ],
    trapNames: ["Spore Bloom", "Slick Mycelial Floor", "Sudden Cap Burst"]
  },
  {
    id: "ruinedKeep",
    name: "Ruined Keep",
    description: "A garrison house long fallen. Its stones still remember orders.",
    roomDescriptions: [
      "A shattered guard hall, the banners long rotted.",
      "A broken stair winding up into open sky.",
      "A captain's room with a half-burned map.",
      "A barrack lined with collapsed cots.",
      "A small chapel with a cracked stone altar."
    ],
    trapNames: ["Collapsing Lintel", "Rusted Floor Spike", "Wire-Triggered Bolt"]
  },
  {
    id: "oldMine",
    name: "Old Mine",
    description: "A dwindling mine cut into a low hill. Damp wood, brittle iron.",
    roomDescriptions: [
      "A narrow shaft propped with cracked timbers.",
      "A flooded sump where the lantern doubles itself.",
      "An ore room with carts left mid-load.",
      "A pillar gallery with chalk-marks from long ago.",
      "A side-cut where pale roots have come through the wall."
    ],
    trapNames: ["Falling Beam", "Slick Sump Pool", "Flickering Damp"]
  },
  {
    id: "sunkenTemple",
    name: "Sunken Temple",
    description: "A salt-eaten temple half claimed by the sea. Quiet and very cold.",
    roomDescriptions: [
      "A hall of green stone where small fish circle a fallen idol.",
      "A flooded vestibule, doors swollen but still hinged.",
      "A coral-rimmed chamber with a low, even tide.",
      "A lantern-room with a brass bell at its center.",
      "An echoing nave where every word returns slightly changed."
    ],
    trapNames: ["Sliding Coral Slab", "Tide Surge", "Brass Bell Lure"]
  }
];

export function getBiome(id: DungeonBiome): BiomeInfo {
  const b = BIOMES.find(b => b.id === id);
  if (!b) throw new Error(`Unknown biome: ${id}`);
  return b;
}
