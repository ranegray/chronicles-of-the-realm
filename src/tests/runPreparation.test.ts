import { describe, expect, it } from "vitest";
import { defaultGameState } from "../game/save";
import { generateVillage } from "../game/npcGenerator";
import { createRng } from "../game/rng";
import { initializeVillageProgression } from "../game/villageProgression";
import { generateDungeonRun } from "../game/dungeonGenerator";
import {
  getAvailableRunPreparationOptions,
  purchaseRunPreparation,
  applyRunPreparationsToRun,
  getInsuranceCost,
  canPurchaseInsurance,
  purchaseInsurance,
  getKeepsakeCandidates,
  canDesignateKeepsake,
  setKeepsake
} from "../game/runPreparation";
import { addItem } from "../game/inventory";
import { instanceFromTemplateId } from "../game/inventory";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import type { Character } from "../game/types";

function buildPlayer() {
  let d = createEmptyDraft("prep-test");
  d = CharacterCreationService.setName(d, "Tester");
  d = CharacterCreationService.selectAncestry(d, "human");
  d = CharacterCreationService.selectClass(d, "scout");
  d = CharacterCreationService.rollAllAbilityScores(d);
  d = CharacterCreationService.autoAssignScoresForClass(d);
  d = CharacterCreationService.chooseStarterKit(d, "scout_bow_dagger");
  return CharacterCreationService.finalizeCharacter(d).character;
}

describe("run preparation", () => {
  it("lists unlocked preparations and purchases one", () => {
    const village = initializeVillageProgression({ village: generateVillage(createRng("prep-village")) });
    const alchemist = village.npcs.find(npc => npc.role === "alchemist")!;
    const gameState = { ...defaultGameState(), village, stash: { items: [], gold: 20, materials: { commonHerbs: 1 } } };
    expect(getAvailableRunPreparationOptions({ gameState }).map(option => option.id)).toContain("prep-starter-healing-draught");
    const result = purchaseRunPreparation({ gameState, optionId: "prep-starter-healing-draught", npcId: alchemist.id, now: 1 });
    expect(result.success).toBe(true);
    expect(result.gameState.pendingRunPreparations).toHaveLength(1);
    expect(result.gameState.stash.gold).toBe(15);
  });

  it("applies start-with-item and carry-capacity preparations", () => {
    const run = generateDungeonRun({ seed: "prep-run" });
    const character = {
      derivedStats: { carryCapacity: 20, maxHp: 10, armor: 0, accuracy: 0, evasion: 0, critChance: 0, magicPower: 0, trapSense: 0 }
    } as Character;
    const result = applyRunPreparationsToRun({
      run,
      character,
      rng: createRng("prep-apply"),
      preparations: [
        {
          id: "p1",
          optionId: "prep-starter-healing-draught",
          sourceNpcId: "npc",
          effect: { type: "startWithItem", itemTemplateId: "consumable_small_draught", quantity: 1, durationRuns: 1 },
          createdAt: 1,
          consumed: false
        },
        {
          id: "p2",
          optionId: "prep-expanded-pack",
          sourceNpcId: "npc",
          effect: { type: "increaseCarryCapacity", amount: 5, durationRuns: 1 },
          createdAt: 1,
          consumed: false
        }
      ]
    });
    expect(result.run.raidInventory.items[0]?.templateId).toBe("consumable_small_draught");
    expect(result.character.derivedStats.carryCapacity).toBe(25);
    expect(result.appliedPreparations.every(prep => prep.consumed)).toBe(true);
  });

  it("prices insurance at a fraction of item value and charges gold on purchase", () => {
    const player = buildPlayer();
    const weapon = player.equipped.weapon!;
    const cost = getInsuranceCost(weapon);
    expect(cost).toBe(Math.ceil(weapon.value * 0.3));

    const gameState = { ...defaultGameState(), player, stash: { items: [], gold: cost + 10, materials: {} } };
    const gate = canPurchaseInsurance({ gameState, itemInstanceId: weapon.instanceId });
    expect(gate.canPurchase).toBe(true);

    const result = purchaseInsurance({ gameState, itemInstanceId: weapon.instanceId });
    expect(result.success).toBe(true);
    expect(result.gameState.pendingInsuredInstanceId).toBe(weapon.instanceId);
    expect(result.gameState.stash.gold).toBe(10);
  });

  it("refuses to insure a second item once one is already insured", () => {
    const player = buildPlayer();
    const weapon = player.equipped.weapon!;
    const gameState = {
      ...defaultGameState(),
      player,
      stash: { items: [], gold: 1000, materials: {} },
      pendingInsuredInstanceId: weapon.instanceId
    };
    const otherSlotItem = Object.values(player.equipped).find(item => item && item.instanceId !== weapon.instanceId);
    const gate = canPurchaseInsurance({ gameState, itemInstanceId: otherSlotItem?.instanceId ?? weapon.instanceId });
    expect(gate.canPurchase).toBe(false);
  });

  it("only allows a weightless packed item to be designated as a keepsake", () => {
    const rng = createRng("keepsake-test");
    const weightless = instanceFromTemplateId("trinket_minor_ward", rng);
    const heavy = instanceFromTemplateId("weapon_short_sword", rng);
    let gameState = defaultGameState();
    gameState = { ...gameState, preparedInventory: addItem(addItem(gameState.preparedInventory, weightless), heavy) };

    expect(getKeepsakeCandidates(gameState).map(i => i.instanceId)).toEqual([weightless.instanceId]);
    expect(canDesignateKeepsake({ gameState, itemInstanceId: heavy.instanceId }).canDesignate).toBe(false);

    const result = setKeepsake({ gameState, itemInstanceId: weightless.instanceId });
    expect(result.success).toBe(true);
    expect(result.gameState.pendingKeepsakeInstanceId).toBe(weightless.instanceId);
  });
});
