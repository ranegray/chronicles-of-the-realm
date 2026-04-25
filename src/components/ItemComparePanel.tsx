import { ItemTooltip } from "./ItemTooltip";
import { ItemStateWarning } from "./ItemStateWarning";
import type { EquipmentChangePreview } from "./v04UiTypes";

export interface ItemComparePanelProps {
  preview?: EquipmentChangePreview;
}

export function ItemComparePanel({ preview }: ItemComparePanelProps) {
  if (!preview) {
    return (
      <aside className="item-compare-panel item-compare-empty">
        <span className="muted">Select equipment to preview changes.</span>
      </aside>
    );
  }

  const diffs = Object.entries(preview.statDiff).filter(([, value]) => typeof value === "number" && value !== 0);

  return (
    <aside className="item-compare-panel">
      <header>
        <span className="muted small">Preview</span>
        <h3>Equip {preview.newItem?.name ?? "Item"}?</h3>
      </header>
      <div className="item-compare-items">
        <div>
          <span className="muted small">Current</span>
          {preview.currentItem ? <ItemTooltip item={preview.currentItem} /> : <em>Empty slot</em>}
        </div>
        <div>
          <span className="muted small">New</span>
          {preview.newItem ? <ItemTooltip item={preview.newItem} comparisonItem={preview.currentItem} /> : <em>No item selected</em>}
        </div>
      </div>
      {diffs.length > 0 ? (
        <dl className="item-compare-diff">
          {diffs.map(([key, value]) => (
            <div key={key}>
              <dt>{formatStatLabel(key)}</dt>
              <dd className={(value as number) > 0 ? "good" : "danger"}>{formatSigned(value as number)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="muted">No stat changes.</p>
      )}
      <ItemStateWarning warnings={preview.warnings} />
    </aside>
  );
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatStatLabel(key: string): string {
  const labels: Record<string, string> = {
    maxHp: "Max HP",
    critChance: "Crit Chance",
    carryCapacity: "Carry",
    magicPower: "Magic",
    trapSense: "Trap Sense"
  };
  return labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}
