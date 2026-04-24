import type { ThreatState } from "../game/types";
import { getThreatLabel, getThreatModifiers } from "../game/threat";
import { THREAT_RULES } from "../game/constants";

export interface ThreatMeterProps {
  threat: ThreatState;
}

export function ThreatMeter({ threat }: ThreatMeterProps) {
  const modifier = getThreatModifiers(threat.level);
  const label = getThreatLabel(threat.level);
  const maxPoints = THREAT_RULES.thresholds[THREAT_RULES.thresholds.length - 1]?.minPoints ?? 120;
  const fillPct = Math.min(100, Math.round((threat.points / maxPoints) * 100));

  return (
    <div
      className={`threat-meter threat-level-${threat.level}`}
      role="status"
      aria-live="polite"
      title={`${modifier.description} · ${threat.points} pts · Level ${threat.level} of ${threat.maxLevel}`}
    >
      <span className="threat-meter-label">{label}</span>
      <div className="threat-meter-bar" aria-label="Threat points">
        <div className="threat-meter-bar-fill" style={{ width: `${fillPct}%` }} />
        {THREAT_RULES.thresholds.slice(1).map(threshold => (
          <div
            key={threshold.level}
            className="threat-meter-tick"
            style={{ left: `${Math.min(100, (threshold.minPoints / maxPoints) * 100)}%` }}
          />
        ))}
      </div>
      <span className="threat-meter-level">L{threat.level}/{threat.maxLevel}</span>
    </div>
  );
}
