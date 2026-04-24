import type { CraftingRecipe } from "../game/types";

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: "recipe-iron-shortblade",
    name: "Iron Shortblade",
    description: "A reliable blade made from recovered ore.",
    category: "weapon",
    stationRole: "blacksmith",
    requiredServiceLevel: 1,
    ingredients: [{ materialId: "ironOre", quantity: 3 }, { materialId: "scrapIron", quantity: 2 }],
    goldCost: 5,
    outputs: [{ itemTemplateId: "weapon_short_sword", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-keen-scout-dagger",
    name: "Keen Scout's Dagger",
    description: "A quick blade balanced with a careful smith's touch.",
    category: "weapon",
    stationRole: "blacksmith",
    requiredServiceLevel: 2,
    ingredients: [{ materialId: "ironOre", quantity: 4 }, { materialId: "snareCord", quantity: 2 }],
    goldCost: 10,
    outputs: [{ itemTemplateId: "weapon_keen_dagger", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-stout-iron-mace",
    name: "Stout Iron Mace",
    description: "A heavier mace for armored things and locked doors.",
    category: "weapon",
    stationRole: "blacksmith",
    requiredServiceLevel: 2,
    ingredients: [{ materialId: "oathIron", quantity: 3 }, { materialId: "tunnelCharcoal", quantity: 2 }],
    goldCost: 10,
    outputs: [{ itemTemplateId: "weapon_stout_iron_mace", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-reinforced-buckler",
    name: "Reinforced Buckler",
    description: "A small shield strengthened with dungeon scrap.",
    category: "shield",
    stationRole: "blacksmith",
    requiredServiceLevel: 3,
    ingredients: [{ materialId: "scrapIron", quantity: 4 }, { materialId: "rawhide", quantity: 2 }],
    goldCost: 8,
    outputs: [{ itemTemplateId: "shield_oak_buckler", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-reinforced-leather",
    name: "Reinforced Leather Vest",
    description: "Traveler's leathers fitted with salvaged plates.",
    category: "armor",
    stationRole: "blacksmith",
    requiredServiceLevel: 3,
    ingredients: [{ materialId: "rawhide", quantity: 3 }, { materialId: "crackedScale", quantity: 2 }],
    goldCost: 14,
    outputs: [{ itemTemplateId: "armor_reinforced_leather", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-weak-healing-draught",
    name: "Weak Healing Draught",
    description: "A bitter red draught that restores a small amount of HP.",
    category: "potion",
    stationRole: "alchemist",
    requiredServiceLevel: 1,
    ingredients: [{ materialId: "commonHerbs", quantity: 2 }, { materialId: "paleWax", quantity: 1 }],
    goldCost: 2,
    outputs: [{ itemTemplateId: "consumable_small_draught", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-basic-antidote",
    name: "Basic Antidote",
    description: "A simple mixture for resisting venom and spores.",
    category: "potion",
    stationRole: "alchemist",
    requiredServiceLevel: 2,
    ingredients: [{ materialId: "glowcapSpores", quantity: 2 }, { materialId: "saltstone", quantity: 1 }],
    goldCost: 4,
    outputs: [{ itemTemplateId: "consumable_basic_antidote", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-stamina-tonic",
    name: "Stamina Tonic",
    description: "A bracing tonic for longer routes and retreats.",
    category: "potion",
    stationRole: "alchemist",
    requiredServiceLevel: 2,
    ingredients: [{ materialId: "commonHerbs", quantity: 2 }, { materialId: "saltstone", quantity: 2 }],
    goldCost: 5,
    outputs: [{ itemTemplateId: "consumable_stamina_tonic", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-resistance-tonic",
    name: "Resistance Tonic",
    description: "A hazard-facing tonic mixed from living colony matter.",
    category: "potion",
    stationRole: "alchemist",
    requiredServiceLevel: 3,
    ingredients: [{ materialId: "fungalHeart", quantity: 1 }, { materialId: "brinePearl", quantity: 1 }],
    goldCost: 8,
    outputs: [{ itemTemplateId: "consumable_resistance_tonic", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-strong-healing-draught",
    name: "Strong Healing Draught",
    description: "A stronger healing drink for deeper delves.",
    category: "potion",
    stationRole: "alchemist",
    requiredServiceLevel: 4,
    ingredients: [{ materialId: "livingMycelium", quantity: 1 }, { materialId: "commonHerbs", quantity: 3 }],
    goldCost: 12,
    outputs: [{ itemTemplateId: "consumable_strong_draught", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-minor-ward-charm",
    name: "Minor Ward Charm",
    description: "A small charm that dulls the bite of hidden dangers.",
    category: "trinket",
    stationRole: "enchanter",
    requiredServiceLevel: 2,
    ingredients: [{ materialId: "blackQuartz", quantity: 1 }, { materialId: "moonlitThread", quantity: 2 }],
    goldCost: 12,
    outputs: [{ itemTemplateId: "trinket_minor_ward", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-emberglass-focus",
    name: "Emberglass Focus",
    description: "A warm shard set for practical village magic.",
    category: "enchantment",
    stationRole: "enchanter",
    requiredServiceLevel: 3,
    ingredients: [{ materialId: "emberglassShard", quantity: 1 }, { materialId: "blackQuartz", quantity: 1 }],
    goldCost: 18,
    outputs: [{ itemTemplateId: "trinket_emberglass", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-field-repair-kit",
    name: "Field Repair Kit",
    description: "A practical repair bundle for fast fixes.",
    category: "tool",
    stationRole: "quartermaster",
    requiredServiceLevel: 3,
    ingredients: [{ materialId: "snareCord", quantity: 2 }, { materialId: "scrapIron", quantity: 2 }],
    goldCost: 5,
    outputs: [{ itemTemplateId: "tool_field_repair_kit", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-delvers-kit",
    name: "Delver's Kit",
    description: "A more complete kit for prepared dungeon work.",
    category: "tool",
    stationRole: "quartermaster",
    requiredServiceLevel: 4,
    ingredients: [{ materialId: "rawhide", quantity: 2 }, { materialId: "snareCord", quantity: 2 }, { materialId: "saltstone", quantity: 1 }],
    goldCost: 10,
    outputs: [{ itemTemplateId: "tool_delvers_kit", quantity: 1 }],
    repeatable: true
  },
  {
    id: "recipe-pilgrim-charm",
    name: "Pilgrim Charm",
    description: "A small road charm cut and bound for safer returns.",
    category: "trinket",
    stationRole: "healer",
    requiredServiceLevel: 3,
    ingredients: [{ materialId: "boneShards", quantity: 2 }, { materialId: "paleWax", quantity: 2 }],
    goldCost: 6,
    outputs: [{ itemTemplateId: "trinket_pilgrim_charm", quantity: 1 }],
    repeatable: true
  }
];

export function getCraftingRecipe(id: string): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find(recipe => recipe.id === id);
}
