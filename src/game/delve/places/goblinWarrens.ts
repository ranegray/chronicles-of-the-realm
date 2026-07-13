// The Goblin Warrens — first authored Place for the Delve rebuild.
// Hand-dug tunnels braced with stolen lumber, tallow smoke, cheap glass.
// See docs/design/the-delve.md (Pillar 1) for the extract/topology contract.

import type { Direction, Place, PlaceExit, PlaceFloor, PlaceRoom, SenseTag } from "../types";

// ---------------------------------------------------------------------------
// Small internal builder so reciprocal exits can't drift out of sync by hand.
// (Local to this file — not part of the shared engine contract.)
// ---------------------------------------------------------------------------

interface RoomInit {
  id: string;
  name: string;
  prose: string[];
  landmark?: boolean;
  /** Crossroads room: allowed up to 4 exits. Max 2 per floor; see place.ts. */
  junction?: true;
  lootTableId?: string;
  hunterSpawn?: boolean;
  supplySpawn?: boolean;
}

interface EdgeSpec {
  from: string;
  dir: Direction;
  to: string;
  /** Reverse direction back from `to`. Omit for oneWay edges. */
  revDir?: Direction;
  oneWay?: boolean;
  doorStates?: PlaceExit["doorStates"];
  senses?: SenseTag[];
  /** Senses on the reverse exit (from `to` back toward `from`). */
  revSenses?: SenseTag[];
}

function buildRooms(inits: RoomInit[], edges: EdgeSpec[]): PlaceRoom[] {
  const exitsByRoom = new Map<string, PlaceExit[]>(inits.map(r => [r.id, []]));

  for (const edge of edges) {
    const forward = exitsByRoom.get(edge.from);
    const backward = exitsByRoom.get(edge.to);
    if (!forward || !backward) {
      throw new Error(`goblinWarrens: edge references unknown room (${edge.from} -> ${edge.to})`);
    }
    forward.push({
      direction: edge.dir,
      to: edge.to,
      oneWay: edge.oneWay,
      doorStates: edge.doorStates,
      senses: edge.senses
    });
    if (!edge.oneWay) {
      if (!edge.revDir) {
        throw new Error(`goblinWarrens: edge ${edge.from} -> ${edge.to} needs revDir unless oneWay`);
      }
      backward.push({
        direction: edge.revDir,
        to: edge.from,
        senses: edge.revSenses
      });
    }
  }

  return inits.map(init => ({
    id: init.id,
    name: init.name,
    prose: init.prose,
    landmark: init.landmark,
    junction: init.junction,
    lootTableId: init.lootTableId,
    hunterSpawn: init.hunterSpawn,
    supplySpawn: init.supplySpawn,
    exits: exitsByRoom.get(init.id)!
  }));
}

const LOOT = "loot_goblin_t1";

// ---------------------------------------------------------------------------
// Floor 1 — The Upper Warrens
// ---------------------------------------------------------------------------

const FLOOR1_ROOMS: RoomInit[] = [
  {
    id: "gullet",
    name: "The Gullet",
    landmark: true,
    prose: [
      "The tunnel mouth you came in through, ribs of stolen timber holding back the dark.",
      "Cold surface air still clings here, thinning fast the deeper you look."
    ]
  },
  {
    id: "antechamber",
    name: "Antechamber",
    prose: [
      "A low crawl-space, walls slick where hands have braced against them for years.",
      "Someone has scratched tally marks into the timber, over and over, never finishing a set."
    ]
  },
  {
    id: "midden_hollow",
    name: "Midden Hollow",
    prose: [
      "A refuse pit gone half solid, bones and rind pressed into a black crust.",
      "Flies that should be dead in this cold still circle over something soft."
    ]
  },
  {
    id: "bramble_lock",
    name: "Bramble Lock",
    prose: [
      "A door of lashed thornwood, meant to bloody hands that don't know the trick of it.",
      "Dried bramble laced through an iron ring, more warning than wall."
    ],
    lootTableId: LOOT
  },
  {
    id: "tallow_gallery",
    name: "The Tallow Gallery",
    landmark: true,
    junction: true,
    prose: [
      "A wide gallery lit by a hundred guttering tallow stubs pressed into the walls.",
      "The grease-smoke here is thick enough to taste, and every surface is filmed with it."
    ]
  },
  {
    id: "candle_row",
    name: "Candle Row",
    prose: [
      "A ledge lined with stolen candlesticks, most of them melted down to stubs.",
      "Wax has pooled and hardened into a second floor beneath your boots."
    ]
  },
  {
    id: "grease_cellar",
    name: "Grease Cellar",
    prose: [
      "Barrels of rendered fat, some split and gone rancid, sweat in the warm dark.",
      "The floor here is treacherous, a skin of old grease over old grease."
    ]
  },
  {
    id: "trade_room",
    name: "Trade Room",
    prose: [
      "A slumping floor and a low table piled with things traded, stolen, or both.",
      "Someone keeps a ledger here in charcoal, tally marks for debts no one will pay."
    ],
    lootTableId: LOOT,
    supplySpawn: true
  },
  {
    id: "weavers_nook",
    name: "Weaver's Nook",
    prose: [
      "A nesting tunnel piled with stolen blankets, still holding someone's shape.",
      "Bundles of coarse thread hang from pegs driven straight into the rock."
    ],
    supplySpawn: true
  },
  {
    id: "kennel_row",
    name: "Kennel Row",
    prose: [
      "A row of low pens, chains still fixed to the wall, whatever they held now loose.",
      "The straw here is fresh. Something is still using this room."
    ],
    hunterSpawn: true
  },
  {
    id: "bone_pile_den",
    name: "Bone Pile Den",
    prose: [
      "A den built around a pile of picked bones, arranged with something like pride.",
      "Trophies, mostly small. A few are not."
    ],
    hunterSpawn: true
  },
  {
    id: "snare_hall",
    name: "Snare Hall",
    prose: [
      "A narrow hall strung with tripwire at ankle height, more nuisance than danger.",
      "Bells of scrap tin hang from the wire, silent only because nothing has passed through lately."
    ],
    hunterSpawn: true
  },
  {
    id: "toll_bridge",
    name: "The Toll Bridge",
    landmark: true,
    hunterSpawn: true,
    prose: [
      "A plank bridge over a black drop, wide enough for one, guarded by habit if not always by goblins.",
      "The planks bow underfoot. Whatever's below the bridge, you'd rather not meet it on the way down."
    ]
  },
  {
    id: "sleepers_court",
    name: "Sleeper's Court",
    landmark: true,
    junction: true,
    hunterSpawn: true,
    prose: [
      "A wide, low court packed with sleeping-nests, a dozen at least, most of them still warm.",
      "The air here is thick with breath and tallow smoke. Nothing is sleeping when you're loud."
    ],
    lootTableId: LOOT
  },
  {
    id: "gnaw_pit",
    name: "Gnaw Pit",
    prose: [
      "A sunken pit ringed with gnaw-marks in the stone itself, patient and old.",
      "Something has been working at the rock here for longer than makes sense."
    ],
    hunterSpawn: true
  },
  {
    id: "glass_gallery",
    name: "The Glass Gallery",
    landmark: true,
    prose: [
      "A chiseled gallery glittering with cheap glass, hammered into the walls like a hoard of stars.",
      "Every color of bottle glass, worthless and beautiful, catching what little light you carry."
    ],
    lootTableId: LOOT
  },
  {
    id: "side_larder",
    name: "Side Larder",
    prose: [
      "A larder hung with smoked things you cannot quite name.",
      "Strips of dried meat sway on hooks, and something in the corner is still curing."
    ],
    supplySpawn: true
  },
  {
    id: "chute_mouth",
    name: "Chute Mouth",
    prose: [
      "A worn hole in the floor, smoothed by generations of goblins taking the fast way down.",
      "The drop below is short enough to survive and loud enough to regret."
    ]
  },
  {
    id: "under_chute",
    name: "Under the Chute",
    hunterSpawn: true,
    prose: [
      "Where the chute lets out, a heap of old bedding softening the landing.",
      "The floor here is worn concave from things landing exactly where you just did."
    ]
  },
  {
    id: "collapsing_squeeze",
    name: "Collapsing Squeeze",
    prose: [
      "A crack in the rock, widened by tools and time, groaning faintly as you consider it.",
      "Loose stone rattles somewhere above. This passage will not be here forever."
    ]
  },
  {
    id: "squeeze_exit",
    name: "Squeeze's End",
    prose: [
      "Where the squeeze spits you out, dust still sifting down behind you.",
      "You can't see the way back. The passage behind has already half-closed."
    ]
  },
  {
    id: "deep_gallery",
    name: "Deep Gallery",
    hunterSpawn: true,
    prose: [
      "A long gallery where the ceiling drops low and the air turns cold and wet.",
      "Water sound carries from somewhere close, though nothing here is flooded yet."
    ]
  },
  {
    id: "flooded_approach",
    name: "Flooded Approach",
    supplySpawn: true,
    prose: [
      "The floor slopes down toward standing water, black and perfectly still.",
      "Old waterlines stain the walls well above your head."
    ]
  },
  {
    id: "flooded_stair",
    name: "The Flooded Stair",
    landmark: true,
    prose: [
      "A stairwell half-drowned, current only when the water is moving toward the surface.",
      "The water here rises and falls on its own clock, not yours."
    ]
  },
  {
    id: "winch_approach",
    name: "Winch Approach",
    prose: [
      "A short hall of straining rope, all leading toward one groaning mechanism.",
      "The smell of old rope oil is stronger here than anything goblin-made."
    ]
  },
  {
    id: "rope_winch",
    name: "The Rope Winch",
    landmark: true,
    prose: [
      "A crude winch bolted into the rock, hauling a cage up toward a surface shaft.",
      "Someone built this to move plunder out quietly. It has never once been quiet."
    ]
  },
  {
    id: "damp_cutback",
    name: "Damp Cutback",
    hunterSpawn: true,
    prose: [
      "A low cut doubling back on itself, damp enough that moss has taken the walls.",
      "The passage bends hard here, easy to lose your bearings in the dark."
    ]
  }
];

const FLOOR1_EDGES: EdgeSpec[] = [
  { from: "gullet", dir: "south", to: "antechamber", revDir: "north" },
  { from: "antechamber", dir: "east", to: "midden_hollow", revDir: "west" },
  { from: "antechamber", dir: "south", to: "tallow_gallery", revDir: "north" },
  { from: "midden_hollow", dir: "south", to: "bramble_lock", revDir: "north",
    doorStates: ["open", "lockable", "jammable"] },
  { from: "tallow_gallery", dir: "east", to: "candle_row", revDir: "west" },
  { from: "tallow_gallery", dir: "south", to: "grease_cellar", revDir: "north" },
  { from: "tallow_gallery", dir: "down", to: "toll_bridge", revDir: "up",
    doorStates: ["open", "jammable"], senses: ["chittering"] },
  { from: "candle_row", dir: "north", to: "trade_room", revDir: "south" },
  { from: "candle_row", dir: "down", to: "weavers_nook", revDir: "up" },
  { from: "grease_cellar", dir: "down", to: "kennel_row", revDir: "up", senses: ["greaseSmell"] },
  { from: "kennel_row", dir: "east", to: "bone_pile_den", revDir: "west" },
  { from: "bone_pile_den", dir: "south", to: "snare_hall", revDir: "north" },
  { from: "bone_pile_den", dir: "down", to: "collapsing_squeeze", revDir: "up",
    senses: ["narrowSqueeze"] },
  { from: "snare_hall", dir: "south", to: "sleepers_court", revDir: "north",
    senses: ["tallow", "chittering"] },
  { from: "toll_bridge", dir: "east", to: "sleepers_court", revDir: "west",
    senses: ["tallow", "chittering"] },
  { from: "sleepers_court", dir: "south", to: "chute_mouth", revDir: "north" },
  { from: "chute_mouth", dir: "down", to: "under_chute", oneWay: true, senses: ["narrowSqueeze"] },
  { from: "collapsing_squeeze", dir: "down", to: "squeeze_exit", oneWay: true,
    senses: ["narrowSqueeze"] },
  { from: "under_chute", dir: "east", to: "deep_gallery", revDir: "west" },
  { from: "deep_gallery", dir: "east", to: "flooded_approach", revDir: "west",
    senses: ["waterSound", "coldDraft"] },
  { from: "flooded_approach", dir: "down", to: "flooded_stair", revDir: "up",
    doorStates: ["open", "jammable"], senses: ["waterSound", "coldDraft"] },
  { from: "deep_gallery", dir: "south", to: "winch_approach", revDir: "north" },
  { from: "winch_approach", dir: "down", to: "rope_winch", revDir: "up", senses: ["coldDraft"] },
  { from: "squeeze_exit", dir: "east", to: "winch_approach", revDir: "west" },
  { from: "weavers_nook", dir: "south", to: "side_larder", revDir: "north" },
  { from: "side_larder", dir: "east", to: "glass_gallery", revDir: "west" },
  { from: "glass_gallery", dir: "south", to: "damp_cutback", revDir: "north", senses: ["lightBeyond"] },
  { from: "sleepers_court", dir: "down", to: "gnaw_pit", revDir: "up" }
];

const FLOOR1: PlaceFloor = {
  floor: 1,
  entranceRoomId: "gullet",
  rooms: buildRooms(FLOOR1_ROOMS, FLOOR1_EDGES),
  extracts: [
    {
      id: "f1_barred_door",
      roomId: "gullet",
      label: "The Gullet — the way you came in",
      condition: "closesAtAlertness",
      alertnessLevel: 3
    },
    {
      id: "f1_flooded_stair",
      roomId: "flooded_stair",
      label: "The flooded stair",
      condition: "waterClock"
    },
    {
      id: "f1_rope_winch",
      roomId: "rope_winch",
      label: "The rope winch",
      condition: "cranked",
      cranksRequired: 3
    }
  ],
  hunterBudget: { min: 4, max: 6 }
};

// ---------------------------------------------------------------------------
// Floor 2 — The Deep Warrens
// ---------------------------------------------------------------------------

const FLOOR2_ROOMS: RoomInit[] = [
  {
    id: "bonefire_hall",
    name: "Bonefire Hall",
    landmark: true,
    prose: [
      "The stair down from the upper warrens opens onto a hall scorched black by old fires.",
      "Bone ash is banked in drifts against the walls, still faintly warm underfoot."
    ]
  },
  {
    id: "ash_passage",
    name: "Ash Passage",
    prose: [
      "A low passage floored in fine grey ash that rises with every step.",
      "Footprints in the ash go one direction only, and it isn't yours."
    ]
  },
  {
    id: "root_hollow",
    name: "Root Hollow",
    prose: [
      "Pale roots have broken through here, thick as arms, groping toward nothing.",
      "The hollow smells of wet earth beneath the ash and grease."
    ]
  },
  {
    id: "sunken_door",
    name: "Sunken Door",
    prose: [
      "A door set below the floor line, warped by years of standing damp.",
      "Whatever this once guarded, the goblins have long since carried it off."
    ],
    lootTableId: LOOT
  },
  {
    id: "longhouse",
    name: "The Longhouse",
    landmark: true,
    junction: true,
    prose: [
      "A long hall raised on stolen roof-beams, the closest thing this warren has to a throne room.",
      "Trophies and rags of banners hang from the beams, all of it slightly too large for goblins."
    ]
  },
  {
    id: "trophy_nook",
    name: "The Trophy Nook",
    landmark: true,
    prose: [
      "A shallow nook crowded with things too fine for a warren — armor, blades, a single boot.",
      "Everything here was taken from someone who is almost certainly dead."
    ],
    lootTableId: LOOT
  },
  {
    id: "grinding_room",
    name: "Grinding Room",
    prose: [
      "A crude whetstone turns slowly on a treadle, worn smooth by goblin hands.",
      "The floor is gritty with metal dust and a little dried blood."
    ]
  },
  {
    id: "stores_vault",
    name: "Stores Vault",
    supplySpawn: true,
    prose: [
      "Sacks and jars stacked with more order than anything else in this warren.",
      "Someone here understands that hunger is worse than any trap."
    ]
  },
  {
    id: "tanners_nook",
    name: "Tanner's Nook",
    supplySpawn: true,
    prose: [
      "Hides stretched on frames, the smell of curing leather sharp enough to sting.",
      "Racks of half-finished armor lean against a wall slick with old fat."
    ]
  },
  {
    id: "gnawed_stair",
    name: "Gnawed Stair",
    hunterSpawn: true,
    prose: [
      "A narrow stair, its wooden edges gnawed soft by things with better teeth than sense.",
      "Every step down is a little louder than the last."
    ]
  },
  {
    id: "skull_shrine",
    name: "Skull Shrine",
    hunterSpawn: true,
    prose: [
      "A shrine of stacked skulls, none of them goblin, arranged with reverence you didn't expect.",
      "Tallow candles gutter at the shrine's base, always freshly lit."
    ]
  },
  {
    id: "rat_run",
    name: "Rat Run",
    hunterSpawn: true,
    prose: [
      "A cramped tunnel shared, unwillingly, with a great many rats.",
      "The rats scatter ahead of you, which is its own kind of warning to whatever's further in."
    ]
  },
  {
    id: "longhouse_doors",
    name: "Longhouse Doors",
    landmark: true,
    hunterSpawn: true,
    prose: [
      "Two heavy doors banded in scavenged iron, the closest thing to a real chokepoint down here.",
      "Whoever stands watch here means to be the last thing you see."
    ]
  },
  {
    id: "chieftains_den",
    name: "The Chieftain's Den",
    landmark: true,
    junction: true,
    hunterSpawn: true,
    prose: [
      "A wide den heaped with furs and stolen finery, clearly the seat of something in charge.",
      "The air here is thick with tallow smoke, sweat, and old smoke."
    ],
    lootTableId: LOOT
  },
  {
    id: "midden_drop",
    name: "Midden Drop",
    hunterSpawn: true,
    prose: [
      "A refuse chute dropping from the den above, spilling into a pit of old bones and rot.",
      "Things get thrown away down here. Not all of it stays thrown away."
    ]
  },
  {
    id: "sump_cistern",
    name: "The Sump Cistern",
    landmark: true,
    prose: [
      "A cracked cistern, its water black and faintly moving, though nothing should be stirring it.",
      "The sound of dripping water is constant here, and slightly too rhythmic."
    ]
  },
  {
    id: "tallow_stores",
    name: "Tallow Stores",
    supplySpawn: true,
    prose: [
      "Shelves of rendered tallow blocks, waiting to become candles or worse.",
      "The smell here is thick enough to coat the back of your throat."
    ]
  },
  {
    id: "ash_chute_mouth",
    name: "Ash Chute Mouth",
    prose: [
      "A steep, ash-choked slide leading down from the den, used when the front door isn't an option.",
      "The chieftain's own bolt-hole, judging by the state of the handholds."
    ]
  },
  {
    id: "under_ash_chute",
    name: "Under the Ash Chute",
    hunterSpawn: true,
    prose: [
      "Where the chute empties out, ash banked deep enough to swallow the sound of landing.",
      "You come up coughing, grey to the knees, in a room that clearly expects visitors this way."
    ]
  },
  {
    id: "collapsed_squeeze",
    name: "Collapsed Squeeze",
    prose: [
      "A passage half caved in, the gap just wide enough if you don't think about it too hard.",
      "Stone shifts somewhere close by. This will not stay passable."
    ]
  },
  {
    id: "squeeze_end",
    name: "Squeeze's Far End",
    prose: [
      "You come through into open space, dust and grit sifting down behind you.",
      "The way back is gone, or close enough to it. There's only forward now."
    ]
  },
  {
    id: "lower_gallery",
    name: "Lower Gallery",
    hunterSpawn: true,
    prose: [
      "A broad, low gallery where the warren finally starts to feel older than the goblins in it.",
      "The walls here bear marks no goblin tool made."
    ]
  },
  {
    id: "postern_approach",
    name: "Postern Approach",
    supplySpawn: true,
    prose: [
      "A narrow hall leading to a door that was clearly meant for someone to leave quietly by.",
      "Cold air draws steadily from ahead, the first clean air in a long while."
    ]
  },
  {
    id: "postern_stair",
    name: "The Postern Stair",
    landmark: true,
    prose: [
      "A tight, iron-barred stair the chieftain keeps for a fast, quiet way out.",
      "The bar on this door is new. Someone expects to need it in a hurry."
    ]
  },
  {
    id: "flue_approach",
    name: "Flue Approach",
    prose: [
      "A crooked passage climbing gently toward a draft that smells of open sky.",
      "Old soot streaks the walls, though nothing has burned here in a long time."
    ]
  },
  {
    id: "old_flue",
    name: "The Old Flue",
    landmark: true,
    prose: [
      "A forgotten chimney flue, wide enough to climb, letting in a thread of grey daylight.",
      "Whoever dug this warren left themselves a way out no goblin remembers."
    ]
  },
  {
    id: "damp_hollow",
    name: "Damp Hollow",
    hunterSpawn: true,
    prose: [
      "A low, wet hollow where the cistern's overflow has carved a shallow basin.",
      "Moss softens every sound here, which cuts both ways."
    ]
  }
];

const FLOOR2_EDGES: EdgeSpec[] = [
  { from: "bonefire_hall", dir: "down", to: "ash_passage", revDir: "up" },
  { from: "ash_passage", dir: "east", to: "root_hollow", revDir: "west" },
  { from: "ash_passage", dir: "south", to: "longhouse", revDir: "north" },
  { from: "root_hollow", dir: "south", to: "sunken_door", revDir: "north" },
  { from: "sunken_door", dir: "east", to: "longhouse", revDir: "west" },
  { from: "longhouse", dir: "east", to: "trophy_nook", revDir: "west" },
  { from: "longhouse", dir: "south", to: "grinding_room", revDir: "north" },
  { from: "trophy_nook", dir: "north", to: "stores_vault", revDir: "south" },
  { from: "trophy_nook", dir: "south", to: "grinding_room", revDir: "west" },
  { from: "tanners_nook", dir: "south", to: "sump_cistern", revDir: "north", senses: ["waterSound"] },
  { from: "sump_cistern", dir: "west", to: "tallow_stores", revDir: "east", senses: ["tallow"] },
  { from: "tallow_stores", dir: "south", to: "damp_hollow", revDir: "north" },
  { from: "damp_hollow", dir: "south", to: "lower_gallery", revDir: "north" },
  { from: "grinding_room", dir: "down", to: "gnawed_stair", revDir: "up" },
  { from: "gnawed_stair", dir: "south", to: "skull_shrine", revDir: "north" },
  { from: "skull_shrine", dir: "east", to: "rat_run", revDir: "west" },
  { from: "skull_shrine", dir: "down", to: "collapsed_squeeze", revDir: "up",
    senses: ["narrowSqueeze"] },
  { from: "collapsed_squeeze", dir: "down", to: "squeeze_end", oneWay: true,
    senses: ["narrowSqueeze"] },
  { from: "squeeze_end", dir: "east", to: "postern_approach", revDir: "west", senses: ["coldDraft"] },
  { from: "rat_run", dir: "south", to: "chieftains_den", revDir: "north",
    senses: ["tallow", "chittering"] },
  { from: "longhouse_doors", dir: "down", to: "chieftains_den", revDir: "up",
    senses: ["tallow", "chittering"] },
  { from: "chieftains_den", dir: "down", to: "ash_chute_mouth", revDir: "up", senses: ["narrowSqueeze"] },
  { from: "ash_chute_mouth", dir: "down", to: "under_ash_chute", oneWay: true },
  { from: "under_ash_chute", dir: "east", to: "lower_gallery", revDir: "west" },
  { from: "postern_approach", dir: "down", to: "postern_stair", revDir: "up",
    doorStates: ["open", "lockable"], senses: ["coldDraft"] },
  { from: "lower_gallery", dir: "east", to: "flue_approach", revDir: "west" },
  { from: "flue_approach", dir: "up", to: "old_flue", revDir: "down", senses: ["coldDraft", "lightBeyond"] },
  { from: "chieftains_den", dir: "south", to: "midden_drop", revDir: "north" }
];

const FLOOR2: PlaceFloor = {
  floor: 2,
  entranceRoomId: "bonefire_hall",
  rooms: buildRooms(FLOOR2_ROOMS, FLOOR2_EDGES),
  extracts: [
    {
      id: "f2_postern_stair",
      roomId: "postern_stair",
      label: "The postern stair",
      condition: "closesAtAlertness",
      alertnessLevel: 2
    },
    {
      id: "f2_old_flue",
      roomId: "old_flue",
      label: "The old flue",
      condition: "alwaysOpen"
    }
  ],
  hunterBudget: { min: 4, max: 6 }
};

// ---------------------------------------------------------------------------

export const GOBLIN_WARRENS: Place = {
  id: "goblinWarrens",
  name: "The Goblin Warrens",
  biome: "goblinWarrens",
  floors: [FLOOR1, FLOOR2]
};
