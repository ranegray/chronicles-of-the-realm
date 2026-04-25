import type { ItemStateView } from "./v04UiTypes";

interface GearRiskBadgeProps {
  states?: ItemStateView[];
}

const LABELS: Record<string, string> = {
  protected: "Protected",
  fragile: "Fragile",
  cursed: "Cursed",
  bound: "Bound",
  contraband: "Contraband",
  damaged: "Damaged",
  reinforced: "Reinforced"
};

export function GearRiskBadge({ states = [] }: GearRiskBadgeProps) {
  const visible = states.filter(state => state.id !== "normal");
  if (visible.length === 0) return null;

  return (
    <div className="gear-risk-badges" aria-label="Gear risk states">
      {visible.map(state => (
        <span key={`${state.id}-${state.appliedAt ?? "state"}`} className={`gear-risk-badge gear-risk-${state.id}`}>
          {LABELS[state.id] ?? formatStateLabel(state.id)}
        </span>
      ))}
    </div>
  );
}

function formatStateLabel(id: string): string {
  return id.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}
