// The lamp is the clock (Pillar 2). Pure oil-track math: no React, no rng.
// See docs/design/the-delve.md.

import type { LampState, LightState, OilAction } from "./types";

/** Oil cost per action, per the design doc. */
export const OIL_COSTS: Record<OilAction, number> = {
  move: 1,
  search: 2,
  listen: 1,
  encounterBeat: 1,
  disarm: 2,
  crank: 1,
  consultMap: 1
};

/** Light state is dim at <= 25% of capacity (and > 0), dark at 0, else bright. */
export function getLightState(lamp: LampState): LightState {
  if (lamp.oil <= 0) return "dark";
  if (lamp.oil <= lamp.capacity * 0.25) return "dim";
  return "bright";
}

/**
 * Spend oil for an action. Oil floors at 0 rather than going negative —
 * the sim never blocks an action for lack of oil; darkness is the penalty.
 */
export function spendOil(lamp: LampState, action: OilAction): LampState {
  const cost = OIL_COSTS[action];
  return {
    ...lamp,
    oil: Math.max(0, lamp.oil - cost)
  };
}

/**
 * Refill the lamp from a packed flask, consuming one flask and topping the
 * oil track up to capacity. No-op (returns the same lamp) if no flasks
 * remain.
 */
export function refillFromFlask(lamp: LampState): LampState {
  if (lamp.flasksPacked <= 0) return lamp;
  return {
    ...lamp,
    oil: lamp.capacity,
    flasksPacked: lamp.flasksPacked - 1
  };
}
