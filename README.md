# Chronicles of the Realm

A text-based fantasy dungeon crawler with extraction mechanics. Delve in, get greedy, get out — or don't.

Every run is a bet. Loot lies where it falls and your pack is small; every search, fight, and descent feeds a threat meter that turns the dungeon against you. Extraction is a decision, not a victory screen. Death takes your pack and the gear off your back — quest items, one keepsake, and anything you insured are all that come home.

## The loop

1. **Prepare** in the village — pack light, designate a keepsake, insure one piece of gear, buy one-run advantages from villagers whose trust you've earned.
2. **Delve** — explore room by room through prose and choices. Scout passages, search for hidden caches, disarm traps, weigh every fight.
3. **Decide** — the threat meter climbs from *Quiet* to *Awakened* as you linger. Take what fits, leave the rest, and pick your moment.
4. **Extract or die** — extraction points have variants (guarded, delayed, unstable). Make it out and the village grows; die and the dungeon keeps your gear.

## Running it

```bash
npm install
npm run dev        # local dev server
npm test           # vitest suite
npm run typecheck  # tsc
npm run build      # production build
```

Built with React, TypeScript, Vite, and Zustand. Game logic lives in `src/game/` as pure, tested modules; screens and components are thin layers over a single store.

## Status

In active development (v0.4 → v0.5). Core systems — dungeon generation, combat, loot/affixes, threat, extraction, death cost, talents, crafting, quests, village progression — are in and covered by 200+ tests. Balance and UI are being reworked toward a narrative-first presentation. See the [issues](https://github.com/ranegray/chronicles-of-the-realm/issues) for the roadmap.
