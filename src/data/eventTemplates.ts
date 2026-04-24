import type { RoomEventDefinition, RoomEventType } from "../game/types";

export const EVENT_TEMPLATES: RoomEventDefinition[] = [
  {
    id: "sealed-shrine",
    type: "shrine",
    title: "Sealed Shrine",
    description:
      "A cracked shrine hums with pale light. Offerings lie scattered beneath a weathered symbol.",
    minTier: 1,
    maxTier: 5,
    weight: 10,
    choices: [
      {
        id: "pray",
        label: "Pray quietly",
        description: "Risk a quiet prayer and hope the shrine still listens.",
        statCheck: {
          ability: "will",
          difficulty: 12,
          successMessage: "The shrine answers with gentle warmth.",
          failureMessage: "The shrine remains cold, but something hears you."
        },
        successOutcomes: [
          { type: "heal", amount: 6, message: "You recover 6 HP." },
          { type: "decreaseThreat", amount: 3, message: "The dungeon quiets around you." }
        ],
        failureOutcomes: [
          { type: "increaseThreat", amount: 4, message: "A whisper slips into the walls." }
        ]
      },
      {
        id: "take-offerings",
        label: "Take the offerings",
        description: "Claim what others left behind.",
        successOutcomes: [
          { type: "gainLootFromTable", message: "You sweep the offerings into your pack." },
          { type: "increaseThreat", amount: 12, message: "The shrine cracks. The dungeon stirs." }
        ]
      },
      {
        id: "study",
        label: "Study the shrine",
        description: "Read the weathered symbol for a clue.",
        statCheck: {
          ability: "intellect",
          difficulty: 13,
          successMessage: "You read a line about a forgotten stair.",
          failureMessage: "The marks refuse to settle into meaning."
        },
        successOutcomes: [
          { type: "revealAdjacentRoom", message: "A passage ahead sharpens in your mind." }
        ],
        failureOutcomes: [
          { type: "addDungeonLog", message: "You leave the shrine as you found it." }
        ]
      },
      {
        id: "leave",
        label: "Leave it alone",
        description: "Some things are better untouched.",
        alwaysAvailable: true,
        successOutcomes: [
          { type: "addDungeonLog", message: "You leave the shrine undisturbed." },
          { type: "markRoomCompleted" }
        ]
      }
    ]
  },

  {
    id: "collapsed-passage",
    type: "obstacle",
    title: "Collapsed Passage",
    description:
      "Fallen stone blocks part of the chamber. Something glints beyond the rubble.",
    minTier: 1,
    maxTier: 5,
    weight: 8,
    choices: [
      {
        id: "force",
        label: "Clear by force",
        description: "Lever the stones aside with your shoulder.",
        statCheck: {
          ability: "might",
          difficulty: 13,
          successMessage: "The stone shifts and a gap opens.",
          failureMessage: "The stone bites back as it slides."
        },
        successOutcomes: [
          { type: "gainLootFromTable", message: "You pull something free of the rubble." }
        ],
        failureOutcomes: [
          { type: "damage", amount: 4, message: "A loose stone crushes your hand." },
          { type: "increaseThreat", amount: 4, message: "The noise carries farther than you'd like." }
        ]
      },
      {
        id: "search-gap",
        label: "Search for a gap",
        description: "Slip through an opening near the floor.",
        statCheck: {
          ability: "agility",
          difficulty: 11,
          successMessage: "You thread the gap without a sound.",
          failureMessage: "You wedge, and the rubble shifts."
        },
        successOutcomes: [
          { type: "gainLootFromTable", message: "Something glints as you come out the other side." }
        ],
        failureOutcomes: [
          { type: "damage", amount: 2, message: "Stone grinds against your ribs." }
        ]
      },
      {
        id: "leave",
        label: "Move on",
        description: "Let the rubble keep its secret.",
        alwaysAvailable: true,
        successOutcomes: [
          { type: "addDungeonLog", message: "You step around the collapse and continue." },
          { type: "markRoomCompleted" }
        ]
      }
    ]
  },

  {
    id: "wounded-delver",
    type: "stranger",
    title: "Wounded Delver",
    description:
      "A wounded delver leans against the wall, one hand pressed to a bleeding side.",
    minTier: 1,
    maxTier: 5,
    weight: 7,
    choices: [
      {
        id: "ask",
        label: "Ask what happened",
        description: "Trade a moment of breath for a warning.",
        successOutcomes: [
          { type: "revealAdjacentRoom", message: "The delver tells you what waits ahead." },
          { type: "addDungeonLog", message: "They point a shaking hand toward the next passage." }
        ]
      },
      {
        id: "rob",
        label: "Search their pack",
        description: "Their need is not yours.",
        successOutcomes: [
          { type: "gainLootFromTable", message: "You take what they can no longer carry." },
          { type: "increaseThreat", amount: 8, message: "The delver's curse rides with you now." }
        ]
      },
      {
        id: "leave",
        label: "Leave them",
        description: "You have your own road.",
        alwaysAvailable: true,
        successOutcomes: [
          { type: "addDungeonLog", message: "You leave the delver where they sit." },
          { type: "markRoomCompleted" }
        ]
      }
    ]
  },

  {
    id: "whispering-chest",
    type: "strangeChest",
    title: "Whispering Chest",
    description:
      "A black-lacquered chest whispers your name from the corner of the room.",
    minTier: 1,
    maxTier: 5,
    weight: 6,
    choices: [
      {
        id: "open",
        label: "Open it",
        description: "Lift the lid and listen to what waits inside.",
        successOutcomes: [
          { type: "gainLootFromTable", message: "The chest opens onto unexpected treasure." },
          { type: "increaseThreat", amount: 6, message: "Something in the halls heard the lid rise." }
        ]
      },
      {
        id: "break",
        label: "Break it open",
        description: "Smash the lock and take your chances.",
        statCheck: {
          ability: "might",
          difficulty: 12,
          successMessage: "The lock shatters under your hilt.",
          failureMessage: "You split the lid and something lashes out."
        },
        successOutcomes: [
          { type: "gainLootFromTable", message: "You pry the wreck apart and pocket the pieces." },
          { type: "increaseThreat", amount: 10, message: "The alarm carries deep into the dungeon." }
        ],
        failureOutcomes: [
          { type: "damage", amount: 5, message: "A wire snaps free of the lid." },
          { type: "increaseThreat", amount: 12, message: "The chest screams as it breaks." }
        ]
      },
      {
        id: "inspect",
        label: "Inspect the markings",
        description: "Read the soft sigils along the seams.",
        statCheck: {
          ability: "intellect",
          difficulty: 13,
          successMessage: "You find a seam the trap can't reach.",
          failureMessage: "The markings blur the closer you look."
        },
        successOutcomes: [
          { type: "gainLootFromTable", message: "The chest opens cleanly under your hand." }
        ],
        failureOutcomes: [
          { type: "addDungeonLog", message: "The whispering grows louder, then stops." }
        ]
      },
      {
        id: "leave",
        label: "Leave it",
        description: "Not every prize is yours to claim.",
        alwaysAvailable: true,
        successOutcomes: [
          { type: "addDungeonLog", message: "You leave the chest to its whispering." },
          { type: "markRoomCompleted" }
        ]
      }
    ]
  },

  {
    id: "abandoned-camp",
    type: "oldCamp",
    title: "Abandoned Camp",
    description:
      "A cold campfire sits beside a torn bedroll. Someone left in a hurry.",
    minTier: 1,
    maxTier: 5,
    weight: 7,
    choices: [
      {
        id: "rest",
        label: "Rest briefly",
        description: "Catch your breath beside the dead coals.",
        successOutcomes: [
          { type: "heal", amount: 5, message: "You steady your hands." },
          { type: "increaseThreat", amount: 4, message: "Something marks the pause." }
        ]
      },
      {
        id: "supplies",
        label: "Search the supplies",
        description: "Rifle through what the last delver left behind.",
        successOutcomes: [
          { type: "gainLootFromTable", message: "You find something useful tucked in the bedroll." }
        ]
      },
      {
        id: "marks",
        label: "Read their scratch-marks",
        description: "Delvers leave marks for the next to find.",
        statCheck: {
          ability: "intellect",
          difficulty: 11,
          successMessage: "The marks clarify into a shape.",
          failureMessage: "The marks stay a scribble."
        },
        successOutcomes: [
          { type: "improveRoomScouting", message: "You read their warnings for the next rooms." }
        ],
        failureOutcomes: [
          { type: "addDungeonLog", message: "The scratch-marks go quiet under your hand." }
        ]
      },
      {
        id: "leave",
        label: "Move on",
        description: "Let the camp stay quiet.",
        alwaysAvailable: true,
        successOutcomes: [
          { type: "addDungeonLog", message: "You step around the camp and continue." },
          { type: "markRoomCompleted" }
        ]
      }
    ]
  },

  {
    id: "cracked-obelisk",
    type: "obelisk",
    title: "Cracked Obelisk",
    description:
      "A cracked stone obelisk pulses with a rhythm like a slow heartbeat.",
    minTier: 1,
    maxTier: 5,
    weight: 5,
    choices: [
      {
        id: "touch",
        label: "Touch it",
        description: "Press your palm against the warm stone.",
        statCheck: {
          ability: "will",
          difficulty: 13,
          successMessage: "A clean heat travels up your arm.",
          failureMessage: "Cold lances back through your wrist."
        },
        successOutcomes: [
          { type: "heal", amount: 6, message: "The obelisk's light seals an old bruise." },
          { type: "decreaseThreat", amount: 3, message: "The dungeon's heartbeat slows a beat." }
        ],
        failureOutcomes: [
          { type: "damage", amount: 4, message: "The cold shocks through your fingers." }
        ]
      },
      {
        id: "study",
        label: "Study it",
        description: "Read the sigils etched into the stone.",
        statCheck: {
          ability: "intellect",
          difficulty: 13,
          successMessage: "The stone yields a name you can keep.",
          failureMessage: "The marks smear as you try to follow them."
        },
        successOutcomes: [
          { type: "decreaseThreat", amount: 4, message: "Naming it cuts its weight." }
        ],
        failureOutcomes: [
          { type: "addDungeonLog", message: "Nothing of the marks stays with you." }
        ]
      },
      {
        id: "deface",
        label: "Deface it",
        description: "Strike the stone and end its singing.",
        successOutcomes: [
          { type: "gainLootFromTable", message: "A shard breaks free — small, cold, heavy." },
          { type: "increaseThreat", amount: 15, message: "The dungeon wakes in one long breath." }
        ]
      },
      {
        id: "leave",
        label: "Leave it",
        description: "Let the obelisk keep its rhythm.",
        alwaysAvailable: true,
        successOutcomes: [
          { type: "addDungeonLog", message: "You step past the obelisk, leaving its pulse intact." },
          { type: "markRoomCompleted" }
        ]
      }
    ]
  },

  {
    id: "merchant-shade",
    type: "merchantShade",
    title: "Merchant Shade",
    description:
      "A translucent peddler arranges impossible wares on a blanket of shadow.",
    minTier: 1,
    maxTier: 5,
    weight: 5,
    choices: [
      {
        id: "trade-gold",
        label: "Trade gold for a curio",
        description: "Drop a handful of coins on the blanket.",
        requirements: [{ type: "hasGold", key: "gold", value: 15 }],
        successOutcomes: [
          { type: "loseGold", amount: 15, message: "The shade accepts your coin." },
          { type: "gainLootFromTable", message: "The shade slides a piece of its stock toward you." }
        ]
      },
      {
        id: "directions",
        label: "Ask for directions",
        description: "Buy a piece of the shade's map.",
        requirements: [{ type: "hasGold", key: "gold", value: 5 }],
        successOutcomes: [
          { type: "loseGold", amount: 5, message: "A coin disappears into the blanket." },
          { type: "revealAdjacentRoom", message: "The shade points toward the next passage." }
        ]
      },
      {
        id: "refuse",
        label: "Refuse",
        description: "Step away without trading.",
        alwaysAvailable: true,
        successOutcomes: [
          { type: "addDungeonLog", message: "The shade smiles without changing its face." },
          { type: "markRoomCompleted" }
        ]
      }
    ]
  },

  {
    id: "ominous-silence",
    type: "ominousSilence",
    title: "Ominous Silence",
    description:
      "The chamber is too quiet. Even your breathing seems unwelcome here.",
    minTier: 1,
    maxTier: 5,
    weight: 6,
    choices: [
      {
        id: "careful",
        label: "Proceed carefully",
        description: "Watch your footing and your breath.",
        statCheck: {
          ability: "agility",
          difficulty: 12,
          successMessage: "You make the crossing without a sound.",
          failureMessage: "Your foot finds a loose stone."
        },
        successOutcomes: [
          { type: "addDungeonLog", message: "You cross the silence intact." },
          { type: "markRoomCompleted" }
        ],
        failureOutcomes: [
          { type: "increaseThreat", amount: 8, message: "The silence breaks like a dropped plate." }
        ]
      },
      {
        id: "listen",
        label: "Listen",
        description: "Stand still and hear what the room will tell you.",
        statCheck: {
          ability: "will",
          difficulty: 12,
          successMessage: "You hear it — soft, far, moving.",
          failureMessage: "You hear nothing, and nothing answers."
        },
        successOutcomes: [
          { type: "improveRoomScouting", message: "You catch the edges of the next rooms." }
        ],
        failureOutcomes: [
          { type: "addDungeonLog", message: "The silence wins and gives nothing back." }
        ]
      },
      {
        id: "rush",
        label: "Rush through",
        description: "Cover the distance fast and leave the silence behind.",
        successOutcomes: [
          { type: "increaseThreat", amount: 8, message: "Your steps ring loud in the hush." },
          { type: "markRoomCompleted" }
        ]
      },
      {
        id: "call",
        label: "Call out",
        description: "Demand the room tell you what it hides.",
        successOutcomes: [
          { type: "increaseThreat", amount: 15, message: "The room answers — and the dungeon with it." },
          { type: "addDungeonLog", message: "Something in the next room starts to move." }
        ]
      }
    ]
  }
];

export function getEventTemplate(id: string): RoomEventDefinition {
  const t = EVENT_TEMPLATES.find(e => e.id === id);
  if (!t) throw new Error(`Unknown event template: ${id}`);
  return t;
}

export function getEventsByType(type: RoomEventType): RoomEventDefinition[] {
  return EVENT_TEMPLATES.filter(t => t.type === type);
}
