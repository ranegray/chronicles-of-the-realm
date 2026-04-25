import type { ItemInstance } from "../game/types";
import type { BuildWarning, ItemStateView, ItemWithV4Fields } from "./v04UiTypes";

interface ItemStateWarningProps {
  item?: ItemInstance;
  warnings?: BuildWarning[];
}

const STATE_WARNINGS: Record<string, { message: string; severity: BuildWarning["severity"] }> = {
  protected: {
    message: "Protected: survives death and returns to your stash.",
    severity: "info"
  },
  fragile: {
    message: "Fragile: may break on death or extraction complications.",
    severity: "warning"
  },
  cursed: {
    message: "Cursed: cannot be dropped during a dungeon run.",
    severity: "danger"
  },
  bound: {
    message: "Bound: cannot be sold.",
    severity: "warning"
  },
  contraband: {
    message: "Contraband: higher value, higher dungeon risk.",
    severity: "danger"
  },
  damaged: {
    message: "Damaged: reduced value or weaker stats until repaired.",
    severity: "warning"
  },
  reinforced: {
    message: "Reinforced: temporary one-run protection or stat support.",
    severity: "info"
  }
};

export function ItemStateWarning({ item, warnings }: ItemStateWarningProps) {
  const derived = item ? warningsForStates(((item as ItemWithV4Fields).states ?? [])) : [];
  const allWarnings = warnings ?? derived;
  if (allWarnings.length === 0) return null;

  return (
    <ul className="item-state-warning-list">
      {allWarnings.map((warning, index) => (
        <li key={`${warning.type}-${index}`} className={`item-state-warning item-state-warning-${warning.severity}`}>
          {warning.message}
        </li>
      ))}
    </ul>
  );
}

function warningsForStates(states: ItemStateView[]): BuildWarning[] {
  return states
    .filter(state => state.id !== "normal")
    .map(state => {
      const mapped = STATE_WARNINGS[state.id] ?? {
        message: `${state.id}: special dungeon handling applies.`,
        severity: "info" as const
      };
      return {
        type: state.id === "fragile" ? "fragileGear" :
          state.id === "cursed" ? "cursedGear" :
          state.id === "contraband" ? "contraband" :
          "lowHealing",
        message: mapped.message,
        severity: mapped.severity
      };
    });
}
