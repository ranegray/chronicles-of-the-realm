import { describe, expect, it } from "vitest";
import { getEncounter } from "../data/encounters";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { startCombat, resolvePlayerAction } from "../game/combat";
import { recalculateCharacterStats } from "../game/characterMath";
import { pickRandomEncounterForBiome } from "../game/encounterGenerator";
import { createRng } from "../game/rng";
import type { Character, DungeonBiome } from "../game/types";

/**
 * #4: depth-1 must have teeth. A fresh, lightly-geared Warrior's FIRST
 * depth-1 combat should cost a meaningful slice of max HP on average —
 * never free, but not a guaranteed near-death either. Target ~25-35%;
 * the assertion allows a 15-45% band so data tweaks don't flake the suite.
 */

const BIOMES: DungeonBiome[] = [
  "crypt",
  "goblinWarrens",
  "fungalCaverns",
  "ruinedKeep",
  "oldMine",
  "sunkenTemple"
];

const RUNS_PER_BIOME = 100;

describe("first-fight lethality (#4)", () => {
  it("costs a baseline warrior 15-45% of max HP on average at depth 1", () => {
    const losses: number[] = [];
    let deaths = 0;

    for (let i = 0; i < BIOMES.length * RUNS_PER_BIOME; i++) {
      const seed = `first-fight-${i}`;
      const biome = BIOMES[i % BIOMES.length]!;
      const encounter = pickRandomEncounterForBiome(biome, 1, createRng(`pick:${seed}`));

      let player = buildBaselineWarrior(seed);
      const maxHp = player.maxHp;
      let combat = startCombat(getEncounter(encounter.id), createRng(`start:${seed}`), "room", 1);

      for (let turn = 0; turn < 30 && !combat.over; turn++) {
        const target = combat.enemies.find(enemy => enemy.hp > 0);
        if (!target) break;
        const result = resolvePlayerAction(
          combat,
          player,
          { kind: "attack", targetId: target.instanceId },
          createRng(`combat:${seed}:${turn}`),
          []
        );
        combat = result.combat;
        player = result.player;
      }

      losses.push((maxHp - player.hp) / maxHp);
      if (player.hp <= 0) deaths += 1;
    }

    const avgLossPct = (losses.reduce((sum, loss) => sum + loss, 0) / losses.length) * 100;
    const freeFights = losses.filter(loss => loss === 0).length;

    console.info("first-fight lethality", {
      runs: losses.length,
      avgLossPct: Number(avgLossPct.toFixed(1)),
      deathPct: Number(((deaths / losses.length) * 100).toFixed(1)),
      freeFightPct: Number(((freeFights / losses.length) * 100).toFixed(1))
    });

    // The first fight should bite (never free on average)...
    expect(avgLossPct).toBeGreaterThanOrEqual(15);
    // ...but must not be a coin-flip with death for a fresh character.
    expect(avgLossPct).toBeLessThanOrEqual(45);
    expect(deaths / losses.length).toBeLessThan(0.15);
  });
});

/**
 * The #4 benchmark character: Warrior (32 base HP class) with a weapon but
 * no armor pieces equipped, so armor sits at the class base of ~2. A kitted
 * warrior (armor ~6) takes correspondingly less.
 */
function buildBaselineWarrior(seed: string): Character {
  let draft = createEmptyDraft(seed);
  draft = CharacterCreationService.setName(draft, "Benchmark");
  draft = CharacterCreationService.selectAncestry(draft, "human");
  draft = CharacterCreationService.selectClass(draft, "warrior");
  draft = CharacterCreationService.rollAllAbilityScores(draft);
  draft = CharacterCreationService.autoAssignScoresForClass(draft);
  draft = CharacterCreationService.chooseStarterKit(draft, "warrior_sword_shield");
  const character = CharacterCreationService.finalizeCharacter(draft).character;
  const stripped: Character = {
    ...character,
    equipped: { ...character.equipped, armor: undefined, offhand: undefined }
  };
  return recalculateCharacterStats(stripped, getAncestry("human"), getClass("warrior"));
}
