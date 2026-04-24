import { describe, it, expect } from "vitest";
import { resolvePlayerAction, startCombat } from "../game/combat";
import { getEncounter } from "../data/encounters";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";

function buildPlayer() {
  let d = createEmptyDraft("p");
  d = CharacterCreationService.setName(d, "Tester");
  d = CharacterCreationService.selectAncestry(d, "stonekin");
  d = CharacterCreationService.selectClass(d, "warrior");
  d = CharacterCreationService.rollAllAbilityScores(d);
  d = CharacterCreationService.autoAssignScoresForClass(d);
  d = CharacterCreationService.chooseStarterKit(d, "warrior_sword_shield");
  return CharacterCreationService.finalizeCharacter(d).character;
}

describe("combat", () => {
  it("starts combat with enemies present", () => {
    const enc = getEncounter("enc_crypt_rats");
    const state = startCombat(enc, createRng("c"), "room1");
    expect(state.enemies.length).toBeGreaterThan(0);
    expect(state.over).toBe(false);
  });

  it("attack action either hits or misses but logs an entry", () => {
    const enc = getEncounter("enc_crypt_rats");
    const player = buildPlayer();
    const initial = startCombat(enc, createRng("a1"), "room1");
    const target = initial.enemies[0]!;
    const result = resolvePlayerAction(initial, player, { kind: "attack", targetId: target.instanceId }, createRng("act1"));
    expect(result.combat.log.length).toBeGreaterThan(initial.log.length);
  });

  it("eventually concludes a fight", () => {
    const enc = getEncounter("enc_crypt_rats");
    const player = buildPlayer();
    let combat = startCombat(enc, createRng("c2"), "room1");
    let p = player;
    for (let i = 0; i < 50 && !combat.over; i++) {
      const target = combat.enemies.find(e => e.hp > 0);
      if (!target) break;
      const res = resolvePlayerAction(combat, p, { kind: "attack", targetId: target.instanceId }, createRng("turn-" + i));
      combat = res.combat;
      p = res.player;
    }
    expect(combat.over).toBe(true);
  });

  it("uses consumables carried in the raid pack", () => {
    const enc = getEncounter("enc_crypt_rats");
    const player = { ...buildPlayer(), hp: 1 };
    const potion = instanceFromTemplateId("consumable_small_draught", createRng("potion"));
    const initial = startCombat(enc, createRng("use"), "room1");
    const result = resolvePlayerAction(
      initial,
      player,
      { kind: "useItem", itemInstanceId: potion.instanceId },
      createRng("use-action"),
      [potion]
    );
    expect(result.consumedItems).toContain(potion.instanceId);
    expect(result.combat.log.some(line => line.includes("drink"))).toBe(true);
  });
});
