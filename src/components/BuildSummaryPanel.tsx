import type { BuildSummary } from "./v04UiTypes";
import "./BuildSummaryPanel.css";

export interface BuildSummaryPanelProps {
  summary: BuildSummary;
}

export function BuildSummaryPanel({ summary }: BuildSummaryPanelProps) {
  return (
    <section className="build-in-sum">
      <p className="build-in-sum-line">
        <span className="build-in-sum-eyebrow">In sum</span>{" "}
        {summary.primaryTags.length === 0
          ? "unfocused"
          : summary.primaryTags.map(formatTag).join(", ")}
        <span className="build-in-sum-scores">
          {" — "}
          <Score label="Combat" value={summary.combatPowerScore} />
          {" · "}
          <Score label="Explore" value={summary.explorationScore} />
          {" · "}
          <Score label="Extract" value={summary.extractionSafetyScore} />
          {" · "}
          <Score label="Risk" value={summary.riskScore} risk />
        </span>
      </p>
      {summary.warnings.length > 0 && (
        <ul className="build-warnings">
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
  return (
    <span className="build-score-inline">
      {label} <strong className={risk && value >= 4 ? "danger" : undefined}>{value}</strong>
    </span>
  );
}

function formatTag(tag: string): string {
  return tag.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()).toLowerCase();
}
