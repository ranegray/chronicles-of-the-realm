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
    <div className={`threat-meter threat-level-${threat.level}`} role="status" aria-live="polite">
      <div className="threat-meter-header">
        <span className="threat-meter-label">{label}</span>
        <span className="threat-meter-level">Level {threat.level} / {threat.maxLevel}</span>
      </div>
      <div className="threat-meter-bar" aria-label="Threat points">
        <div className="threat-meter-bar-fill" style={{ width: `${fillPct}%` }} />
        {THREAT_RULES.thresholds.slice(1).map(threshold => (
          <div
            key={threshold.level}
            className="threat-meter-tick"
            style={{ left: `${Math.min(100, (threshold.minPoints / maxPoints) * 100)}%` }}
            title={`${threshold.label} at ${threshold.minPoints}`}
          />
        ))}
      </div>
      <div className="threat-meter-footer">
        <span className="threat-meter-desc">{modifier.description}</span>
        <span className="threat-meter-points">{threat.points} pts</span>
      </div>
    </div>
  );
}
