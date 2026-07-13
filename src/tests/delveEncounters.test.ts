import { describe, it, expect } from "vitest";
import {
  openEncounter,
  resolveOption,
  resolveFightBeat,
  slipChance,
  type DelveEncounterBeatResult
} from "../game/delve/encounters";
import type { ActiveEncounter, Hunter, LightState } from "../game/delve/types";
import { ENEMIES } from "../data/enemies";
import { CharacterCreationService, createEmptyDraft } from "../game/characterCreation";
import { createRng } from "../game/rng";
import type { Character, ItemInstance } from "../game/types";

const ROOM_ID = "warrens_hall";
const PREV_ROOM_ID = "warrens_entry";

function buildCharacter(seed: string): Character {
  let draft = createEmptyDraft(seed);
  draft = CharacterCreationService.setName(draft, "Delver");
  draft = CharacterCreationService.selectAncestry(draft, "human");
  draft = CharacterCreationService.selectClass(draft, "warrior");
  draft = CharacterCreationService.rollAllAbilityScores(draft);
  draft = CharacterCreationService.autoAssignScoresForClass(draft);
  draft = CharacterCreationService.chooseStarterKit(draft, "warrior_sword_shield");
  return CharacterCreationService.finalizeCharacter(draft).character;
}

function buildHunter(enemyId: string, overrides: Partial<Hunter> = {}): Hunter {
  return { id: "hunter_1", enemyId, roomId: ROOM_ID, state: "hunting", ...overrides };
}

function rationItem(): ItemInstance {
  return {
    instanceId: "item_ration",
    templateId: "ration_stub",
    name: "Dried Rations",
    category: "consumable",
    rarity: "common",
    description: "Hard bread and jerky.",
    value: 2,
    weight: 1,
    stackable: true,
    quantity: 1,
    tags: ["ration"]
  };
}

describe("delve encounters: option availability matrix", () => {
  const character = buildCharacter("avail-1");

  it("offers fight and slipPast/fallBack/parley in a well-lit, unencumbered, followed-from room", () => {
    const encounter = openEncounter({
      hunter: buildHunter("goblin_snare"),
      character,
      carriedItems: [],
      lightState: "bright",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: ["warrens_side"],
      rng: createRng("avail-1")
    });

    const byKind = Object.fromEntries(encounter.options.map(o => [o.kind, o]));
    expect(byKind.fight?.available).toBe(true);
    expect(byKind.slipPast?.available).toBe(true);
    expect(byKind.fallBack?.available).toBe(true);
    expect(byKind.parley?.available).toBe(true); // goblin_snare is lootTag "goblin"
    expect(byKind.lure?.available).toBe(true); // bright + adjacent room
    expect(byKind.throwRations?.available).toBe(false);
    expect(byKind.throwRations?.unavailableReason).toBe("No rations to spare");
  });

  it("disables slipPast in the dark with the diegetic reason", () => {
    const encounter = openEncounter({
      hunter: buildHunter("goblin_snare"),
      character,
      carriedItems: [],
      lightState: "dark",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: [],
      rng: createRng("avail-2")
    });
    const slip = encounter.options.find(o => o.kind === "slipPast")!;
    expect(slip.available).toBe(false);
    expect(slip.unavailableReason).toBe("No light to slip by");
  });

  it("disables fallBack when there is nowhere behind you", () => {
    const encounter = openEncounter({
      hunter: buildHunter("goblin_snare"),
      character,
      carriedItems: [],
      lightState: "bright",
      packRatio: 0.2,
      cameFromRoomId: undefined,
      alertnessLevel: 1,
      adjacentRoomIds: [],
      rng: createRng("avail-3")
    });
    const fallBack = encounter.options.find(o => o.kind === "fallBack")!;
    expect(fallBack.available).toBe(false);
    expect(fallBack.unavailableReason).toBe("Nowhere behind you");
  });

  it("disables parley against non-goblin (vermin/beast/undead) enemies", () => {
    const encounter = openEncounter({
      hunter: buildHunter("crypt_bone_rat"),
      character,
      carriedItems: [],
      lightState: "bright",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: [],
      rng: createRng("avail-4")
    });
    const parley = encounter.options.find(o => o.kind === "parley")!;
    expect(parley.available).toBe(false);
    expect(parley.unavailableReason).toBe("It won't understand you");
  });

  it("enables throwRations only when carrying a ration-tagged item", () => {
    const encounter = openEncounter({
      hunter: buildHunter("goblin_snare"),
      character,
      carriedItems: [rationItem()],
      lightState: "bright",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: [],
      rng: createRng("avail-5")
    });
    const throwRations = encounter.options.find(o => o.kind === "throwRations")!;
    expect(throwRations.available).toBe(true);
  });

  it("disables lure outside bright light or without an adjacent room", () => {
    const dim = openEncounter({
      hunter: buildHunter("goblin_snare"),
      character,
      carriedItems: [],
      lightState: "dim",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: ["warrens_side"],
      rng: createRng("avail-6")
    });
    expect(dim.options.find(o => o.kind === "lure")!.available).toBe(false);

    const noAdjacent = openEncounter({
      hunter: buildHunter("goblin_snare"),
      character,
      carriedItems: [],
      lightState: "bright",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: [],
      rng: createRng("avail-7")
    });
    expect(noAdjacent.options.find(o => o.kind === "lure")!.available).toBe(false);
  });

  it("slipChance worsens with a heavier pack and with dimmer light", () => {
    const bright = slipChance({ packRatio: 0, lightState: "bright", agilityModifier: 0 });
    const heavy = slipChance({ packRatio: 0.9, lightState: "bright", agilityModifier: 0 });
    const dim = slipChance({ packRatio: 0, lightState: "dim", agilityModifier: 0 });
    expect(heavy).toBeLessThan(bright);
    expect(dim).toBeLessThan(bright);
  });
});

describe("delve encounters: slip/fallback failure degrades to a free exchange", () => {
  it("a failed slipPast keeps the encounter open and lets the enemy land a free hit", () => {
    const character = buildCharacter("degrade-1");
    const hunter = buildHunter("goblin_warrens_brute");
    const encounter: ActiveEncounter = openEncounter({
      hunter,
      character,
      carriedItems: [],
      lightState: "bright",
      packRatio: 0.95, // heavy pack tanks slip chance toward the floor
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 5,
      adjacentRoomIds: [],
      rng: createRng("degrade-1")
    });

    // Sweep seeds until we observe a failed slip (chance is low but nonzero
    // outcomes both ways are required, so a small sweep is deterministic and
    // fast rather than flaky).
    let sawFailure = false;
    for (let i = 0; i < 30; i++) {
      const rng = createRng(`degrade-slip-${i}`);
      const result: DelveEncounterBeatResult = resolveOption({
        encounter,
        kind: "slipPast",
        character,
        lightState: "bright",
        packRatio: 0.95,
        alertnessLevel: 5,
        rng,
        roomId: ROOM_ID
      });
      if (result.outcome !== "escaped") {
        sawFailure = true;
        expect(result.over === false || result.outcome === "dead").toBe(true);
        expect(result.noise).toEqual({ roomId: ROOM_ID, loudness: 3, cause: "fightBeat" });
        expect(result.enemyHpDelta).toBe(0); // the enemy gets a free exchange; player doesn't hit back
        expect(result.oilAction).toBe("encounterBeat");
        if (result.over === false) {
          expect(result.playerHpDelta).toBeLessThanOrEqual(0);
        }
      }
    }
    expect(sawFailure).toBe(true);
  });

  it("a successful slipPast ends the encounter with move noise", () => {
    const character = buildCharacter("degrade-2");
    const hunter = buildHunter("goblin_candle");
    const encounter = openEncounter({
      hunter,
      character,
      carriedItems: [],
      lightState: "bright",
      packRatio: 0,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 0,
      adjacentRoomIds: [],
      rng: createRng("degrade-2")
    });

    let sawSuccess = false;
    for (let i = 0; i < 20; i++) {
      const result = resolveOption({
        encounter,
        kind: "slipPast",
        character,
        lightState: "bright",
        packRatio: 0,
        alertnessLevel: 0,
        rng: createRng(`degrade-slip-success-${i}`),
        roomId: ROOM_ID
      });
      if (result.outcome === "escaped") {
        sawSuccess = true;
        expect(result.over).toBe(true);
        expect(result.noise.cause).toBe("move");
        expect(result.oilAction).toBe("encounterBeat");
      }
    }
    expect(sawSuccess).toBe(true);
  });
});

describe("delve encounters: fight beats end in 1-3 beats against tier-1 bestiary", () => {
  const TIER_ONE_ENEMY_IDS = ENEMIES.filter(e => e.tier === 1).map(e => e.id);

  it("simulates every tier-1 enemy across many seeds and reports the beat-count distribution", () => {
    const beatCounts: number[] = [];
    let wins = 0;
    let deaths = 0;

    for (const enemyId of TIER_ONE_ENEMY_IDS) {
      for (let seedIdx = 0; seedIdx < 8; seedIdx++) {
        const seed = `beatsim-${enemyId}-${seedIdx}`;
        const character = buildCharacter(seed);
        const hunter = buildHunter(enemyId);
        const encounter = openEncounter({
          hunter,
          character,
          carriedItems: [],
          lightState: "bright",
          packRatio: 0.3,
          cameFromRoomId: PREV_ROOM_ID,
          alertnessLevel: 1,
          adjacentRoomIds: [],
          rng: createRng(`${seed}:open`)
        });

        let enemyHp = encounter.enemyHp;
        let playerHp = character.hp;
        let beats = 0;
        let outcome: "won" | "dead" | undefined;

        for (let beat = 1; beat <= 10; beat++) {
          beats = beat;
          const liveEncounter: ActiveEncounter = { ...encounter, enemyHp, beat };
          const liveCharacter: Character = { ...character, hp: playerHp };
          const result = resolveFightBeat({
            encounter: liveEncounter,
            stance: "press",
            character: liveCharacter,
            rng: createRng(`${seed}:beat-${beat}`),
            lightState: "bright",
            roomId: ROOM_ID
          });
          enemyHp = Math.max(0, enemyHp + result.enemyHpDelta);
          playerHp = playerHp + result.playerHpDelta;
          expect(result.noise).toEqual({ roomId: ROOM_ID, loudness: 3, cause: "fightBeat" });
          expect(result.oilAction).toBe("encounterBeat");
          if (result.over) {
            outcome = result.outcome === "dead" ? "dead" : "won";
            break;
          }
        }

        beatCounts.push(beats);
        if (outcome === "won") wins += 1;
        if (outcome === "dead") deaths += 1;
      }
    }

    const max = Math.max(...beatCounts);
    const avg = beatCounts.reduce((s, v) => s + v, 0) / beatCounts.length;
    const within3 = beatCounts.filter(b => b <= 3).length;

    // eslint-disable-next-line no-console
    console.info("delve fight beat-count distribution", {
      runs: beatCounts.length,
      wins,
      deaths,
      avgBeats: Number(avg.toFixed(2)),
      maxBeats: max,
      within3Beats: within3,
      within3Pct: Number(((within3 / beatCounts.length) * 100).toFixed(1))
    });

    expect(wins).toBeGreaterThan(deaths);
    expect(avg).toBeLessThanOrEqual(3);
    expect(within3 / beatCounts.length).toBeGreaterThanOrEqual(0.85);
    expect(max).toBeLessThanOrEqual(5);
  });
});

describe("delve encounters: determinism", () => {
  it("resolveFightBeat is deterministic for the same seed and inputs", () => {
    const character = buildCharacter("det-1");
    const hunter = buildHunter("goblin_snare");
    const encounter = openEncounter({
      hunter,
      character,
      carriedItems: [],
      lightState: "bright",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: [],
      rng: createRng("det-1:open")
    });

    const run = () =>
      resolveFightBeat({
        encounter,
        stance: "press",
        character,
        rng: createRng("det-1:beat-1"),
        lightState: "bright",
        roomId: ROOM_ID
      });

    const a = run();
    const b = run();
    expect(a).toEqual(b);
  });

  it("openEncounter is deterministic for the same seed", () => {
    const character = buildCharacter("det-2");
    const hunter = buildHunter("goblin_snare");
    const build = () =>
      openEncounter({
        hunter,
        character,
        carriedItems: [],
        lightState: "bright",
        packRatio: 0.2,
        cameFromRoomId: PREV_ROOM_ID,
        alertnessLevel: 1,
        adjacentRoomIds: [],
        rng: createRng("det-2:open")
      });
    expect(build()).toEqual(build());
  });
});

describe("delve encounters: noise and oil emissions", () => {
  const character = buildCharacter("noise-1");

  it("breakAway always emits flee noise (loudness 4), win/press/guard emit fightBeat (loudness 3)", () => {
    const hunter = buildHunter("goblin_snare");
    const encounter = openEncounter({
      hunter,
      character,
      carriedItems: [],
      lightState: "bright",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: [],
      rng: createRng("noise-1:open")
    });

    const breakAwayResult = resolveFightBeat({
      encounter,
      stance: "breakAway",
      character,
      rng: createRng("noise-1:break"),
      lightState: "bright",
      roomId: ROOM_ID
    });
    expect(breakAwayResult.noise).toEqual({ roomId: ROOM_ID, loudness: 4, cause: "flee" });

    const pressResult = resolveFightBeat({
      encounter,
      stance: "press",
      character,
      rng: createRng("noise-1:press"),
      lightState: "bright",
      roomId: ROOM_ID
    });
    expect(pressResult.noise).toEqual({ roomId: ROOM_ID, loudness: 3, cause: "fightBeat" });

    const guardResult = resolveFightBeat({
      encounter,
      stance: "guard",
      character,
      rng: createRng("noise-1:guard"),
      lightState: "bright",
      roomId: ROOM_ID
    });
    expect(guardResult.noise).toEqual({ roomId: ROOM_ID, loudness: 3, cause: "fightBeat" });
  });

  it("every option resolution and fight beat costs the encounterBeat oil action", () => {
    const hunter = buildHunter("goblin_snare");
    const encounter = openEncounter({
      hunter,
      character,
      carriedItems: [rationItem()],
      lightState: "bright",
      packRatio: 0.2,
      cameFromRoomId: PREV_ROOM_ID,
      alertnessLevel: 1,
      adjacentRoomIds: ["warrens_side"],
      rng: createRng("noise-2:open")
    });

    const kinds = ["slipPast", "fallBack", "parley", "throwRations", "lure"] as const;
    for (const kind of kinds) {
      const result = resolveOption({
        encounter,
        kind,
        character,
        lightState: "bright",
        packRatio: 0.2,
        alertnessLevel: 1,
        rng: createRng(`noise-2:${kind}`),
        roomId: ROOM_ID
      });
      expect(result.oilAction).toBe("encounterBeat");
    }
  });
});
