import type { BuildSummary } from "./v04UiTypes";

export interface BuildSummaryPanelProps {
  summary: BuildSummary;
}

export function BuildSummaryPanel({ summary }: BuildSummaryPanelProps) {
  return (
    <section className="build-summary-panel">
      <header>
        <span className="muted small">Build Identity</span>
        <div className="build-tag-row">
          {summary.primaryTags.length === 0
            ? <span className="build-tag">Unfocused</span>
            : summary.primaryTags.map(tag => <span className="build-tag" key={tag}>{formatTag(tag)}</span>)}
        </div>
      </header>
      <div className="build-score-grid">
        <Score label="Combat" value={summary.combatPowerScore} />
        <Score label="Explore" value={summary.explorationScore} />
        <Score label="Extract" value={summary.extractionSafetyScore} />
        <Score label="Risk" value={summary.riskScore} risk />
      </div>
      {summary.warnings.length > 0 && (
        <ul className="build-warning-list">
          {summary.warnings.map((warning, index) => (
            <li key={`${warning.type}-${index}`} className={`build-warning build-warning-${warning.severity}`}>
              {warning.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Score({ label, value, risk }: { label: string; value: number; risk?: boolean }) {
  const clamped = Math.max(0, Math.min(12, value));
  return (
    <div className="build-score">
      <span>{label}</span>
      <strong className={risk && value >= 4 ? "danger" : undefined}>{value}</strong>
      <div className="build-score-track"><span style={{ width: `${Math.round((clamped / 12) * 100)}%` }} /></div>
    </div>
  );
}

function formatTag(tag: string): string {
  return tag.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}
