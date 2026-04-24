import type { NpcRole } from "../game/types";

export const NPC_FIRST_NAMES = [
  "Branna", "Odrik", "Selwyn", "Maelis", "Torren", "Nyra", "Calder", "Veska",
  "Elowen", "Garric", "Isolde", "Fenric", "Marra", "Thorne", "Kael", "Ysold",
  "Halric", "Brisa", "Olenna", "Drest", "Sefin", "Wynne"
];

export const NPC_SURNAMES = [
  "Ashmantle", "Bronzewick", "Thornwell", "Duskwater", "Ironvale", "Greyfen",
  "Hearthbinder", "Mossvein", "Cinderbloom", "Ravencairn", "Stormhollow", "Deepwell",
  "Oakenshield", "Whitebriar", "Coldhammer", "Salthorn", "Marrowfield", "Brightlock",
  "Quietstep", "Lampwarden"
];

export const NPC_PERSONALITIES = [
  "Gruff but loyal",
  "Cheerful and suspiciously lucky",
  "Nervous but brilliant",
  "Secretive and generous",
  "Proud, exacting, and honorable",
  "Melancholy storyteller",
  "Opportunistic but useful",
  "Gentle until angered",
  "Superstitious and observant"
];

export const ROLE_DESCRIPTIONS: Record<NpcRole, string> = {
  blacksmith: "Hammers iron at the village forge. Repairs gear and shapes weapons.",
  alchemist: "Brews tinctures and tonics behind a curtain of bitter herbs.",
  enchanter: "Reads the marks on old metal. Identifies and enhances finds.",
  quartermaster: "Trades stash basics: rations, padding, candles, and rope.",
  cartographer: "Sketches the dungeon margins in pale ink. Sells fragments of map lore.",
  elder: "Speaks for the village. Hands out tasks the others won't.",
  healer: "Binds wounds and quiet curses with practiced patience.",
  trader: "Buys odd things at fair prices. Sells odder things at unfair ones."
};

export const ROLES_FOR_NEW_VILLAGE: NpcRole[] = [
  "blacksmith",
  "alchemist",
  "enchanter",
  "cartographer",
  "elder",
  "healer",
  "quartermaster",
  "trader"
];

export const VILLAGE_NAME_PARTS_A = [
  "Ash", "Hollow", "Iron", "Pale", "Bramble", "Hearth", "Briar", "Stone", "Bell", "Mire"
];
export const VILLAGE_NAME_PARTS_B = [
  "ford", "vale", "watch", "hold", "crook", "reach", "stead", "rest", "fen", "shadow"
];
