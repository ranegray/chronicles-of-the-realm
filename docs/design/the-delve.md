# The Delve — v0.5 structural rebuild

**The fantasy:** you are somewhere you shouldn't be, carrying things you can't
afford to lose, and everything you do makes noise.

Tarkov runs on three currencies — time, noise, space. The current game has
noise (threat score) and space (pack weight) but no time, its threat is a
number when dread needs a *where*, and its procgen mazes mean no run ever
teaches you anything. v0.5 rebuilds the run layer around five pillars.
Everything outside the run layer (items, affixes, loot tables, talents,
crafting, village, quests, character math, saves) survives as-is.

## Pillar 1 — Place, not maze

Dungeons are hand-authored, fixed, learnable. A *place* has a name, ~25–30
rooms with stable layout and landmark rooms, one-way shortcuts, and multiple
extraction points with conditions. Procedural per run: loot spawns, inhabitant
count and placement, which doors are locked/jammed, event placement, supply
caches. Runs accumulate into player knowledge; the cartographer finally
matters (see Pillar 4 UI: the map is an item).

First authored place: **the Goblin Warrens**, reworked from the existing biome
(keep its prose voice: stolen lumber, tallow, cheap glass). Two floors for
v0.5. Extracts on floor 1: (a) *the way you came* — bars shut when the place
reaches Hunting alertness; (b) *the flooded stair* — usable only while the
water-clock holds (a run-scoped countdown); (c) *the rope winch* — slow and
loud: three actions of cranking, each a noise event.

## Pillar 2 — The lamp is the clock

The player carries a lamp with an oil track (default capacity 20). Actions
burn oil: move 1, search 2, listen 1, encounter beat 1, disarm 2, winch crank
1. Oil flasks (weight 2, refill 20) compete with loot for pack space and are
bought at the village / packed in the ritual.

Light states: **bright** (normal) → **dim** (last 25% of current fill:
search yields worse, hunters bolder) → **dark** (no oil: cannot search or
read the map, move noise doubles, encounter decisions lose the sneak option).
Darkness never hard-fails the run — it multiplies everything bad.

## Pillar 3 — Threat has an address

Each run seeds 4–6 **hunters** (from the existing bestiary) at authored spawn
rooms. After every player action the simulation ticks: hunters move 0–1 rooms.
States: `dormant` (fixed) → `roaming` (drifts randomly) → `drawn` (moves
toward the last noise it heard) → `hunting` (knows your room, converges).

**Noise** events have loudness; they propagate along the room graph and a
hunter hears one if `loudness ≥ graph distance`. Move = 1 (+1 if pack over
60% capacity, +1 more in the dark), search = 2, fight beat = 3, chest/lock
work = 3, flee = 4, winch crank = 4. The player hears hunters within 2 rooms
as directional prose: "Something drags itself along the west gallery."

The old threat meter survives as **alertness** — how awake the place is. It
rises from noise, drives reinforcement spawns at thresholds, hunter boldness,
and extract conditions (the barred door). Encounter triggers when a hunter
enters your room or you enter its room.

## Pillar 4 — One column, one loop

No combat screen, no clickable map. A single narrative column: room prose,
sensory lines (exits with sensory tags, hunter audio), a slim status strip
(HP, lamp, pack, alertness), choices inline.

**Navigation** is prose exits: "North, a low arch — warm air, tallow smell."
Direction words, not tiles. **The map is an item**: bought from the
cartographer or found, weight 1; "Consult the map" (costs 1 oil, needs light)
shows a non-interactive sketch of the place with your visited rooms marked.
No map item, no sketch — you navigate on prose and memory.

**Encounters** resolve inline in 1–3 **beats**. On contact: appraisal prose +
decision set assembled from context — Fight / Slip past (vs. pack weight and
light) / Fall back the way you came / context extras (parley, throw rations,
lure). Each fight beat is a stance choice (Press / Guard / Break away) that
resolves an aggregated exchange using the existing combat math (accuracy,
evasion, armor, damage scaled ~2.5× per beat so fights end in 1–3 beats),
burns oil, and emits noise. Talents and gear modify the decision set, not a
swing-level action bar.

## Pillar 5 — The run inverts

Getting out is a different game from getting in. Extracts have conditions
(above); at Hunting alertness a reinforcement pack spawns near the entrance;
the water-clock keeps ticking. Death cost, insurance, and the pack ritual all
stay exactly as shipped in v0.4.

## Engine shape

New pure modules under `src/game/delve/` (seeded rng, no React, heavily
tested — same standards as the rest of `src/game/`):

- `types.ts` — shared contracts (committed first; workers build against it)
- `lamp.ts` — oil track, light states, costs
- `noise.ts` — loudness propagation over the room graph
- `hunters.ts` — spawn, state machine, tick, player-audible signals
- `places/goblinWarrens.ts` + `place.ts` — authored-place format, loader,
  validation, per-run population (loot, locks, hunter spawns)
- `encounters.ts` — decision-set assembly + beat resolution over existing
  combat math
- `delveRun.ts` — the run state machine tying it together
- UI: one new `DelveScreen` replacing DungeonScreen+CombatScreen when a
  delve run is active; old screens stay until parity, then retire.

Cutover: new-game runs use the delve engine behind a flag; old saves keep the
old engine until we remove it. Balance targets: a competent first run should
extract with ~60% pack and dim light; greed past that should feel the floor
tilt.
