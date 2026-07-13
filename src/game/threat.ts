import type { ThreatLevel, ThreatLevelModifier } from "./types";
import { THREAT_RULES } from "./constants";

/**
 * The old v0.4 run-threat engine (ThreatState changes, delve strain,
 * ambush rolls) was deleted with the old run layer in the v0.5 demolition
 * (issue #38). These two pure mappings survive because kept code still
 * reads THREAT_RULES by level: the delve engine's alertness track
 * (src/game/delve/delveRun.ts) reports itself through the same 0-5 level/
 * label scale — see docs/design/the-delve.md Pillar 3 ("The old threat
 * meter survives as alertness") — and combat.ts's flee-chance math
 * (still directly unit tested in src/tests/combat.test.ts) reads the
 * per-level flee penalty.
 */
export function getThreatLevelFromPoints(points: number): ThreatLevel {
  const clamped = Math.max(0, points);
  let level: ThreatLevel = 0;
  for (const threshold of THREAT_RULES.thresholds) {
    if (clamped >= threshold.minPoints) {
      level = threshold.level as ThreatLevel;
    } else {
      break;
    }
  }
  return level;
}

export function getThreatModifiers(level: ThreatLevel): ThreatLevelModifier {
  const modifiers = THREAT_RULES.modifiersByLevel[level];
  return modifiers as ThreatLevelModifier;
}
