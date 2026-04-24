import type { QuestChainDefinition } from "../game/types";

export const QUEST_CHAIN_DEFINITIONS: QuestChainDefinition[] = [
  {
    id: "chain-cold-forge",
    title: "The Cold Forge",
    description: "The village forge is underpowered. The blacksmith needs ore, a mark, and proof the thief is gone.",
    npcRole: "blacksmith",
    steps: [
      {
        id: "cold-forge-iron",
        chainId: "chain-cold-forge",
        stepIndex: 0,
        title: "Bring Back Iron",
        description: "Extract with 4 Iron Ore from the old mine.",
        questType: "extractMaterial",
        target: "ironOre",
        requiredCount: 4,
        biome: "oldMine",
        reward: { gold: 12, relationshipGain: 8, serviceXp: 25, villageRenown: 5 },
        unlockEffect: { role: "blacksmith", unlockFlag: "blacksmith-l2-available" },
        claimOnlyAfterExtraction: true
      },
      {
        id: "cold-forge-mark",
        chainId: "chain-cold-forge",
        stepIndex: 1,
        title: "The Anvil Mark",
        description: "Recover the old forge mark from a quest chamber.",
        questType: "retrieveItem",
        target: "quest_lost_sign",
        requiredCount: 1,
        biome: "ruinedKeep",
        reward: { gold: 18, relationshipGain: 10, serviceXp: 35, discoveredRecipeIds: ["recipe-keen-scout-dagger", "recipe-stout-iron-mace"] },
        unlockEffect: { role: "blacksmith", unlockRecipeIds: ["recipe-keen-scout-dagger", "recipe-stout-iron-mace"] },
        claimOnlyAfterExtraction: true
      },
      {
        id: "cold-forge-brute",
        chainId: "chain-cold-forge",
        stepIndex: 2,
        title: "Forge-Thief Brute",
        description: "Defeat an elite threat tied to the forge theft.",
        questType: "defeatMiniBoss",
        target: "any",
        requiredCount: 1,
        reward: { gold: 25, relationshipGain: 15, serviceXp: 50, villageRenown: 10 },
        unlockEffect: { role: "blacksmith", unlockRunPreparationIds: ["prep-reinforced-weapon"] },
        claimOnlyAfterExtraction: true
      }
    ],
    completionUnlocks: [
      {
        id: "cold-forge-complete-reinforcement",
        type: "runPreparation",
        label: "Weapon Reinforcement",
        description: "The forge can reinforce a weapon before a run.",
        runPreparationId: "prep-reinforced-weapon"
      }
    ]
  },
  {
    id: "chain-bitter-medicine",
    title: "Bitter Medicine",
    description: "The alchemist wants safer reagents for dungeon-worthy potions.",
    npcRole: "alchemist",
    steps: [
      {
        id: "bitter-medicine-glowcap",
        chainId: "chain-bitter-medicine",
        stepIndex: 0,
        title: "Glowcap Harvest",
        description: "Extract with 5 Glowcap Spores.",
        questType: "extractMaterial",
        target: "glowcapSpores",
        requiredCount: 5,
        biome: "fungalCaverns",
        reward: { gold: 10, relationshipGain: 8, serviceXp: 25, discoveredRecipeIds: ["recipe-weak-healing-draught"] },
        unlockEffect: { role: "alchemist", unlockRecipeIds: ["recipe-weak-healing-draught"] },
        claimOnlyAfterExtraction: true
      },
      {
        id: "bitter-medicine-clean-burn",
        chainId: "chain-bitter-medicine",
        stepIndex: 1,
        title: "The Clean Burn",
        description: "Bring back Pale Wax for cleaner potion heat.",
        questType: "extractMaterial",
        target: "paleWax",
        requiredCount: 3,
        biome: "crypt",
        reward: { gold: 14, relationshipGain: 10, serviceXp: 35, discoveredRecipeIds: ["recipe-basic-antidote"] },
        unlockEffect: { role: "alchemist", unlockRecipeIds: ["recipe-basic-antidote"] },
        claimOnlyAfterExtraction: true
      },
      {
        id: "bitter-medicine-living-sample",
        chainId: "chain-bitter-medicine",
        stepIndex: 2,
        title: "A Living Sample",
        description: "Extract with a Fungal Heart.",
        questType: "extractMaterial",
        target: "fungalHeart",
        requiredCount: 1,
        biome: "fungalCaverns",
        reward: { gold: 22, relationshipGain: 15, serviceXp: 50, villageRenown: 10, discoveredRecipeIds: ["recipe-resistance-tonic"] },
        unlockEffect: { role: "alchemist", unlockRecipeIds: ["recipe-resistance-tonic"], unlockFlag: "alchemist-l3-available" },
        claimOnlyAfterExtraction: true
      }
    ]
  },
  {
    id: "chain-lines-beneath",
    title: "Lines Beneath the Earth",
    description: "The cartographer is mapping unstable dungeon routes from returned evidence.",
    npcRole: "cartographer",
    steps: [
      {
        id: "lines-first-route",
        chainId: "chain-lines-beneath",
        stepIndex: 0,
        title: "Mark the First Route",
        description: "Scout or visit 4 rooms in one dungeon run.",
        questType: "scoutRoom",
        target: "any",
        requiredCount: 4,
        reward: { gold: 10, relationshipGain: 8, serviceXp: 25 },
        unlockEffect: { role: "cartographer", unlockRunPreparationIds: ["prep-extra-room-hint"] },
        claimOnlyAfterExtraction: true
      },
      {
        id: "lines-map-case",
        chainId: "chain-lines-beneath",
        stepIndex: 1,
        title: "Find the Lost Map Case",
        description: "Recover a marked case from a quest chamber.",
        questType: "retrieveItem",
        target: "quest_lost_sign",
        requiredCount: 1,
        biome: "goblinWarrens",
        reward: { gold: 14, relationshipGain: 10, serviceXp: 35 },
        unlockEffect: { role: "cartographer", unlockFlag: "cartographer-scouting-plus" },
        claimOnlyAfterExtraction: true
      },
      {
        id: "lines-pressure",
        chainId: "chain-lines-beneath",
        stepIndex: 2,
        title: "Escape Under Pressure",
        description: "Reach a dangerous depth of pressure and return alive.",
        questType: "surviveDepth",
        target: "any",
        requiredCount: 8,
        reward: { gold: 24, relationshipGain: 15, serviceXp: 50, villageRenown: 10 },
        unlockEffect: { role: "cartographer", unlockRunPreparationIds: ["prep-extraction-hint"] },
        claimOnlyAfterExtraction: true
      }
    ]
  },
  {
    id: "chain-threads-veil",
    title: "Threads of the Veil",
    description: "The enchanter wants materials that hold memory and danger.",
    npcRole: "enchanter",
    steps: [
      {
        id: "threads-moonlit",
        chainId: "chain-threads-veil",
        stepIndex: 0,
        title: "Moonlit Thread",
        description: "Extract with 2 Moonlit Thread.",
        questType: "extractMaterial",
        target: "moonlitThread",
        requiredCount: 2,
        reward: { gold: 12, relationshipGain: 8, serviceXp: 25 },
        unlockEffect: { role: "enchanter", unlockActionIds: ["identifyItem"] },
        claimOnlyAfterExtraction: true
      },
      {
        id: "threads-quartz",
        chainId: "chain-threads-veil",
        stepIndex: 1,
        title: "Black Quartz Reading",
        description: "Extract with 2 Black Quartz from mine or keep routes.",
        questType: "extractMaterial",
        target: "blackQuartz",
        requiredCount: 2,
        biome: "oldMine",
        reward: { gold: 16, relationshipGain: 10, serviceXp: 35 },
        unlockEffect: { role: "enchanter", unlockRunPreparationIds: ["prep-trap-ward"] },
        claimOnlyAfterExtraction: true
      },
      {
        id: "threads-name",
        chainId: "chain-threads-veil",
        stepIndex: 2,
        title: "The Name That Clings",
        description: "Survive a shrine or strange sign and return with the memory intact.",
        questType: "findSign",
        target: "any",
        requiredCount: 1,
        reward: { gold: 24, relationshipGain: 15, serviceXp: 50, villageRenown: 10, discoveredRecipeIds: ["recipe-minor-ward-charm"] },
        unlockEffect: { role: "enchanter", unlockActionIds: ["minorEnchant"], unlockRecipeIds: ["recipe-minor-ward-charm"] },
        claimOnlyAfterExtraction: true
      }
    ]
  }
];

export function getQuestChainDefinitionById(id: string): QuestChainDefinition | undefined {
  return QUEST_CHAIN_DEFINITIONS.find(chain => chain.id === id);
}
