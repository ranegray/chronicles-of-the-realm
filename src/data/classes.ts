import type { ClassDefinition, ClassId } from "../game/types";

export const CLASSES: ClassDefinition[] = [
  {
    id: "warrior",
    name: "Warrior",
    description:
      "A disciplined melee combatant. Heavy of arm, slow to anger, quick to interpose a shield.",
    baseHp: 32,
    baseAccuracy: 3,
    baseArmor: 2,
    magicBonus: 0,
    preferredAbilities: ["might", "endurance"],
    starterKits: [
      {
        id: "warrior_sword_shield",
        name: "Sword and Shield Kit",
        description: "Short sword, oak shield, padded coat.",
        itemTemplateIds: ["weapon_short_sword", "shield_oak_buckler", "armor_padded_coat", "consumable_small_draught"]
      },
      {
        id: "warrior_heavy_blade",
        name: "Heavy Blade Kit",
        description: "Two-handed longblade and a heavy gambeson.",
        itemTemplateIds: ["weapon_longblade", "armor_heavy_gambeson", "consumable_small_draught", "consumable_trail_ration"]
      }
    ]
  },
  {
    id: "scout",
    name: "Scout",
    description:
      "Light-footed treasure hunter. Reads traps from the smell of oiled hinges.",
    baseHp: 24,
    baseAccuracy: 4,
    baseArmor: 1,
    magicBonus: 0,
    preferredAbilities: ["agility", "presence"],
    starterKits: [
      {
        id: "scout_bow_dagger",
        name: "Bow and Dagger Kit",
        description: "Shortbow, belt dagger, traveler's leathers.",
        itemTemplateIds: ["weapon_shortbow", "weapon_belt_dagger", "armor_traveler_leathers", "consumable_small_draught"]
      },
      {
        id: "scout_lockpick",
        name: "Lockpick Delver Kit",
        description: "Paired daggers, silk-cord picks, and a quick tonic.",
        itemTemplateIds: ["weapon_paired_daggers", "trinket_silk_picks", "armor_traveler_leathers", "consumable_small_draught"]
      }
    ]
  },
  {
    id: "arcanist",
    name: "Arcanist",
    description:
      "Fragile scholar of the old patterns. Spell-chalked sleeves, ink-stained fingers.",
    baseHp: 20,
    baseAccuracy: 2,
    baseArmor: 0,
    magicBonus: 2,
    preferredAbilities: ["intellect", "will"],
    starterKits: [
      {
        id: "arcanist_fire_focus",
        name: "Fire Focus Kit",
        description: "Ember-touched wand and scholar's robe.",
        itemTemplateIds: ["weapon_ember_wand", "armor_scholar_robe", "consumable_small_draught", "scroll_spark"]
      },
      {
        id: "arcanist_ward_focus",
        name: "Ward Focus Kit",
        description: "Warding rod, ward-sigil cloak, and a resist tonic.",
        itemTemplateIds: ["weapon_ward_rod", "armor_sigil_cloak", "consumable_small_draught", "trinket_minor_ward"]
      }
    ]
  },
  {
    id: "warden",
    name: "Warden",
    description:
      "Hedgerow ranger who knows which mushrooms boil clean and which ones do not.",
    baseHp: 26,
    baseAccuracy: 3,
    baseArmor: 1,
    magicBonus: 1,
    preferredAbilities: ["agility", "will"],
    starterKits: [
      {
        id: "warden_hunter",
        name: "Hunter Kit",
        description: "Hand axe, hunting bow, and a boiled poultice.",
        itemTemplateIds: ["weapon_hand_axe", "weapon_hunting_bow", "armor_hide_jerkin", "consumable_herbal_poultice"]
      },
      {
        id: "warden_survival",
        name: "Survival Kit",
        description: "Axe, snare wire, and a strong draught.",
        itemTemplateIds: ["weapon_hand_axe", "trinket_snare_wire", "armor_hide_jerkin", "consumable_strong_draught"]
      }
    ]
  },
  {
    id: "devout",
    name: "Devout",
    description:
      "Pilgrim of quiet gods. Speaks little but their bandages hold.",
    baseHp: 28,
    baseAccuracy: 3,
    baseArmor: 2,
    magicBonus: 1,
    preferredAbilities: ["will", "presence"],
    starterKits: [
      {
        id: "devout_healer",
        name: "Healer Kit",
        description: "Iron mace, pilgrim charm, and healing prayer beads.",
        itemTemplateIds: ["weapon_iron_mace", "trinket_pilgrim_charm", "armor_pilgrim_vest", "consumable_herbal_poultice"]
      },
      {
        id: "devout_smiter",
        name: "Smiter Kit",
        description: "Heavy mace and a binding charm for restless dead.",
        itemTemplateIds: ["weapon_heavy_mace", "trinket_binding_charm", "armor_pilgrim_vest", "consumable_small_draught"]
      }
    ]
  }
];

export function getClass(id: ClassId): ClassDefinition {
  const found = CLASSES.find(c => c.id === id);
  if (!found) throw new Error(`Unknown class: ${id}`);
  return found;
}

export function getStarterKit(classId: ClassId, kitId: string) {
  const cls = getClass(classId);
  const kit = cls.starterKits.find(k => k.id === kitId);
  if (!kit) throw new Error(`Unknown kit ${kitId} for ${classId}`);
  return kit;
}
