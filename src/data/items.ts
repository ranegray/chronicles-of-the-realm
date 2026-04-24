import type { ItemTemplate } from "../game/types";

export const ITEM_TEMPLATES: ItemTemplate[] = [
  // -- Weapons (starter) --
  {
    id: "weapon_short_sword",
    name: "Short Sword",
    category: "weapon",
    rarity: "common",
    description: "A serviceable garrison sword. Balanced for thrust.",
    value: 12, weight: 3, stackable: false,
    stats: { accuracy: 1 },
    tags: ["melee", "blade", "starter"]
  },
  {
    id: "weapon_longblade",
    name: "Two-Handed Longblade",
    category: "weapon",
    rarity: "common",
    description: "A heavy blade meant for both hands. Slow, but it cuts.",
    value: 18, weight: 5, stackable: false,
    stats: { might: 1 },
    tags: ["melee", "blade", "two-handed", "starter"]
  },
  {
    id: "weapon_belt_dagger",
    name: "Belt Dagger",
    category: "weapon",
    rarity: "common",
    description: "Plain knife with a bone grip. Sharp enough.",
    value: 6, weight: 1, stackable: false,
    stats: { accuracy: 2 },
    tags: ["melee", "blade", "light", "starter"]
  },
  {
    id: "weapon_paired_daggers",
    name: "Paired Daggers",
    category: "weapon",
    rarity: "common",
    description: "Twin knives for quick, slipping work.",
    value: 14, weight: 2, stackable: false,
    stats: { accuracy: 2, critChance: 5 },
    tags: ["melee", "blade", "starter"]
  },
  {
    id: "weapon_shortbow",
    name: "Shortbow",
    category: "weapon",
    rarity: "common",
    description: "A traveler's shortbow with a worn grip.",
    value: 14, weight: 2, stackable: false,
    stats: { accuracy: 1, agility: 1 },
    tags: ["ranged", "bow", "starter"]
  },
  {
    id: "weapon_hunting_bow",
    name: "Hunting Bow",
    category: "weapon",
    rarity: "common",
    description: "Stiffer than a shortbow. Bites through hide.",
    value: 16, weight: 3, stackable: false,
    stats: { accuracy: 2 },
    tags: ["ranged", "bow", "starter"]
  },
  {
    id: "weapon_hand_axe",
    name: "Hand Axe",
    category: "weapon",
    rarity: "common",
    description: "Bites wood and bone with equal disinterest.",
    value: 10, weight: 3, stackable: false,
    stats: { might: 1 },
    tags: ["melee", "axe", "starter"]
  },
  {
    id: "weapon_iron_mace",
    name: "Iron Mace",
    category: "weapon",
    rarity: "common",
    description: "A pilgrim's mace, blunt and honest.",
    value: 11, weight: 3, stackable: false,
    stats: { might: 1 },
    tags: ["melee", "blunt", "starter"]
  },
  {
    id: "weapon_heavy_mace",
    name: "Heavy Mace",
    category: "weapon",
    rarity: "common",
    description: "Iron-shod and meant for restless dead.",
    value: 16, weight: 4, stackable: false,
    stats: { might: 2 },
    tags: ["melee", "blunt", "starter"]
  },
  {
    id: "weapon_ember_wand",
    name: "Ember-Touched Wand",
    category: "weapon",
    rarity: "common",
    description: "A wand of charred yew. Warm at the tip.",
    value: 18, weight: 1, stackable: false,
    stats: { magicPower: 2 },
    tags: ["magic", "focus", "starter"]
  },
  {
    id: "weapon_ward_rod",
    name: "Warding Rod",
    category: "weapon",
    rarity: "common",
    description: "A lacquered rod cut with old protective marks.",
    value: 18, weight: 1, stackable: false,
    stats: { magicPower: 1, armor: 1 },
    tags: ["magic", "focus", "starter"]
  },
  // -- Shields and armor --
  {
    id: "shield_oak_buckler",
    name: "Oak Buckler",
    category: "shield",
    rarity: "common",
    description: "A round buckler banded with iron.",
    value: 8, weight: 3, stackable: false,
    stats: { armor: 2, evasion: 1 },
    tags: ["shield", "starter"]
  },
  {
    id: "armor_padded_coat",
    name: "Padded Coat",
    category: "armor",
    rarity: "common",
    description: "Quilted layers, comfortable and quiet.",
    value: 10, weight: 4, stackable: false,
    stats: { armor: 2, endurance: 1 },
    tags: ["armor", "light", "starter"]
  },
  {
    id: "armor_heavy_gambeson",
    name: "Heavy Gambeson",
    category: "armor",
    rarity: "common",
    description: "Layered cotton, stiff and warm.",
    value: 14, weight: 6, stackable: false,
    stats: { armor: 3 },
    tags: ["armor", "starter"]
  },
  {
    id: "armor_traveler_leathers",
    name: "Traveler's Leathers",
    category: "armor",
    rarity: "common",
    description: "Soft leather worn by long-road folk.",
    value: 12, weight: 3, stackable: false,
    stats: { armor: 1, evasion: 1, agility: 1 },
    tags: ["armor", "light", "starter"]
  },
  {
    id: "armor_hide_jerkin",
    name: "Hide Jerkin",
    category: "armor",
    rarity: "common",
    description: "Tanned hide stitched with sinew.",
    value: 12, weight: 4, stackable: false,
    stats: { armor: 2, endurance: 1 },
    tags: ["armor", "starter"]
  },
  {
    id: "armor_scholar_robe",
    name: "Scholar's Robe",
    category: "armor",
    rarity: "common",
    description: "A worn robe with chalk in every pocket.",
    value: 8, weight: 2, stackable: false,
    stats: { intellect: 1, magicPower: 1 },
    tags: ["armor", "robe", "starter"]
  },
  {
    id: "armor_sigil_cloak",
    name: "Sigil Cloak",
    category: "armor",
    rarity: "common",
    description: "Ink-warded cloak, faintly humming.",
    value: 10, weight: 2, stackable: false,
    stats: { armor: 1, will: 1 },
    tags: ["armor", "robe", "starter"]
  },
  {
    id: "armor_pilgrim_vest",
    name: "Pilgrim's Vest",
    category: "armor",
    rarity: "common",
    description: "A travel-stained vest with prayer beads sewn in.",
    value: 10, weight: 3, stackable: false,
    stats: { armor: 2, will: 1 },
    tags: ["armor", "starter"]
  },
  // -- Trinkets --
  {
    id: "trinket_silk_picks",
    name: "Silk-Cord Picks",
    category: "trinket",
    rarity: "common",
    description: "Slim picks bound with silk for quiet work.",
    value: 6, weight: 0, stackable: false,
    stats: { trapSense: 1 },
    tags: ["picks", "starter"]
  },
  {
    id: "trinket_minor_ward",
    name: "Minor Ward Charm",
    category: "trinket",
    rarity: "common",
    description: "A clay disk pricked with old marks.",
    value: 8, weight: 0, stackable: false,
    stats: { armor: 1 },
    tags: ["charm", "starter"]
  },
  {
    id: "trinket_pilgrim_charm",
    name: "Pilgrim Charm",
    category: "trinket",
    rarity: "common",
    description: "A wooden charm cut into the shape of a road.",
    value: 6, weight: 0, stackable: false,
    stats: { will: 1 },
    tags: ["charm", "starter"]
  },
  {
    id: "trinket_binding_charm",
    name: "Binding Charm",
    category: "trinket",
    rarity: "common",
    description: "A black iron ring strung on hide cord.",
    value: 8, weight: 0, stackable: false,
    stats: { magicPower: 1 },
    tags: ["charm", "starter"]
  },
  {
    id: "trinket_snare_wire",
    name: "Snare Wire",
    category: "trinket",
    rarity: "common",
    description: "A coil of fine wire for setting traps.",
    value: 4, weight: 0, stackable: false,
    stats: { trapSense: 1 },
    tags: ["tool", "starter"]
  },
  // -- Consumables --
  {
    id: "consumable_small_draught",
    name: "Weak Healing Draught",
    category: "consumable",
    rarity: "common",
    description: "Bitter herbs in cloudy water. Restores a little vigor.",
    value: 6, weight: 1, stackable: true,
    tags: ["potion", "heal", "small"]
  },
  {
    id: "consumable_strong_draught",
    name: "Strong Healing Draught",
    category: "consumable",
    rarity: "uncommon",
    description: "A red, woody brew. Restores meaningful vigor.",
    value: 18, weight: 1, stackable: true,
    tags: ["potion", "heal", "strong"]
  },
  {
    id: "consumable_herbal_poultice",
    name: "Herbal Poultice",
    category: "consumable",
    rarity: "common",
    description: "Boiled greens packed in muslin. Heals minor wounds.",
    value: 5, weight: 1, stackable: true,
    tags: ["heal", "small"]
  },
  {
    id: "consumable_trail_ration",
    name: "Trail Ration",
    category: "consumable",
    rarity: "common",
    description: "Hard bread, dried meat, a little salt.",
    value: 2, weight: 1, stackable: true,
    tags: ["food"]
  },
  // -- Scrolls --
  {
    id: "scroll_spark",
    name: "Scroll of Spark",
    category: "scroll",
    rarity: "common",
    description: "A single-use scroll that throws a spark of fire.",
    value: 8, weight: 0, stackable: true,
    tags: ["scroll", "fire"]
  },
  // -- Materials / loot --
  {
    id: "material_bone_dust",
    name: "Bone Dust",
    category: "material",
    rarity: "common",
    description: "Powdered bone from old crypt-things.",
    value: 3, weight: 0, stackable: true,
    tags: ["material", "crypt"]
  },
  {
    id: "material_goblin_tooth",
    name: "Goblin Tooth",
    category: "material",
    rarity: "common",
    description: "A yellowed tooth, still slick with marrow.",
    value: 3, weight: 0, stackable: true,
    tags: ["material", "goblin"]
  },
  {
    id: "material_spore_pod",
    name: "Spore Pod",
    category: "material",
    rarity: "common",
    description: "A glassy fungal pod. Faintly luminous.",
    value: 4, weight: 0, stackable: true,
    tags: ["material", "fungal"]
  },
  {
    id: "material_keep_seal",
    name: "Cracked Keep Seal",
    category: "material",
    rarity: "common",
    description: "The shattered wax seal of an old garrison house.",
    value: 4, weight: 0, stackable: true,
    tags: ["material", "ruin"]
  },
  {
    id: "material_ore_chunk",
    name: "Ore Chunk",
    category: "material",
    rarity: "common",
    description: "A rough lump of streaked iron ore.",
    value: 5, weight: 1, stackable: true,
    tags: ["material", "mine"]
  },
  {
    id: "material_brine_pearl",
    name: "Brine Pearl",
    category: "material",
    rarity: "uncommon",
    description: "A grey pearl tasting of salt and time.",
    value: 12, weight: 0, stackable: true,
    tags: ["material", "temple"]
  },
  // -- Gems --
  {
    id: "gem_dim_quartz",
    name: "Dim Quartz",
    category: "gem",
    rarity: "common",
    description: "A clouded crystal that catches lamplight.",
    value: 8, weight: 0, stackable: true,
    tags: ["gem"]
  },
  {
    id: "gem_river_stone",
    name: "Polished River Stone",
    category: "gem",
    rarity: "common",
    description: "Smoothed by years of cold water.",
    value: 4, weight: 0, stackable: true,
    tags: ["gem"]
  },
  // -- Uncommon weapons --
  {
    id: "weapon_keen_dagger",
    name: "Keen Scout's Dagger",
    category: "weapon",
    rarity: "uncommon",
    description: "Slender and bright. The grip is wrapped in fine cord.",
    value: 32, weight: 1, stackable: false,
    stats: { accuracy: 3, critChance: 5, agility: 1 },
    tags: ["melee", "blade"]
  },
  {
    id: "weapon_stout_iron_mace",
    name: "Stout Iron Mace",
    category: "weapon",
    rarity: "uncommon",
    description: "Heavy and balanced. Marked with a craftsman's brand.",
    value: 32, weight: 4, stackable: false,
    stats: { might: 2, accuracy: 1 },
    tags: ["melee", "blunt"]
  },
  {
    id: "armor_reinforced_leather",
    name: "Reinforced Leather Vest",
    category: "armor",
    rarity: "uncommon",
    description: "Stitched with iron plates over the heart.",
    value: 36, weight: 4, stackable: false,
    stats: { armor: 3, endurance: 1 },
    tags: ["armor"]
  },
  {
    id: "trinket_cartographer_ink",
    name: "Cartographer's Ink",
    category: "trinket",
    rarity: "uncommon",
    description: "A small vial of pale, sharp-smelling ink.",
    value: 24, weight: 0, stackable: true,
    tags: ["tool"]
  },
  {
    id: "trinket_emberglass",
    name: "Emberglass Shard",
    category: "trinket",
    rarity: "uncommon",
    description: "A warm shard of fire-touched glass.",
    value: 26, weight: 0, stackable: false,
    stats: { magicPower: 2 },
    tags: ["focus"]
  },
  // -- Rare loot --
  {
    id: "trinket_gravegold",
    name: "Gravegold Amulet",
    category: "trinket",
    rarity: "rare",
    description: "Small chains of crypt-gold. Cold to the touch.",
    value: 80, weight: 0, stackable: false,
    stats: { will: 2, magicPower: 1 },
    tags: ["amulet"]
  },
  {
    id: "weapon_whispersteel_dirk",
    name: "Whispersteel Dirk",
    category: "weapon",
    rarity: "rare",
    description: "The blade hums softly when drawn.",
    value: 90, weight: 1, stackable: false,
    stats: { accuracy: 4, critChance: 8, agility: 2 },
    tags: ["melee", "blade"]
  },
  {
    id: "material_blooming_heart",
    name: "Blooming Fungal Heart",
    category: "material",
    rarity: "rare",
    description: "A pulsing fungal organ, faintly warm.",
    value: 60, weight: 0, stackable: true,
    tags: ["material", "fungal"]
  },
  {
    id: "key_sunken_reliquary",
    name: "Sunken Reliquary Key",
    category: "key",
    rarity: "rare",
    description: "A bronze key crusted with salt.",
    value: 50, weight: 0, stackable: false,
    tags: ["key", "temple"]
  },
  // -- Quest items --
  {
    id: "quest_lost_sign",
    name: "Pilgrim's Sign",
    category: "questItem",
    rarity: "uncommon",
    description: "A small wooden token bearing a road-mark.",
    value: 0, weight: 0, stackable: false,
    tags: ["quest", "sign"]
  }
];

export function getItemTemplate(id: string): ItemTemplate {
  const t = ITEM_TEMPLATES.find(t => t.id === id);
  if (!t) throw new Error(`Unknown item template: ${id}`);
  return t;
}

export function findItemTemplates(predicate: (t: ItemTemplate) => boolean): ItemTemplate[] {
  return ITEM_TEMPLATES.filter(predicate);
}
