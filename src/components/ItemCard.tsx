import type { ItemInstance } from "../game/types";
import { formatConsumableHealFormula } from "../game/itemEffects";

interface Props {
  item: ItemInstance;
  onTake?: () => void;
  takeLabel?: string;
  compact?: boolean;
}

export function ItemCard({ item, onTake, takeLabel = "Take", compact }: Props) {
  const effectLines = getItemEffectLines(item);
  return (
    <div className={`item-card item-rarity-${item.rarity}${compact ? " item-card-compact" : ""}`}>
      <div className="item-row">
        <span className="item-name">{item.name}{item.stackable && item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
        <span className="item-rarity-tag">{item.rarity}</span>
      </div>
      <div className="item-desc">{item.description}</div>
      {effectLines.length > 0 && (
        <div className="item-effects">
          {effectLines.map(line => <span key={line}>{line}</span>)}
        </div>
      )}
      <div className="item-meta">
        <span>{item.category}</span>
        <span>w {item.weight}</span>
        <span>v {item.value}</span>
      </div>
      {onTake && <button className="btn btn-ghost" onClick={onTake}>{takeLabel}</button>}
    </div>
  );
}

function getItemEffectLines(item: ItemInstance): string[] {
  const lines: string[] = [];
  const healFormula = formatConsumableHealFormula(item);
  if (healFormula) {
    lines.push(`Use: heal ${healFormula}`);
  }
  const statLine = formatStats(item);
  if (statLine) {
    lines.push(statLine);
  }
  if (item.category === "material") {
    lines.push("Material: extract to sell or turn in");
  } else if (item.category === "questItem") {
    lines.push("Quest: bring back alive");
  } else if (item.category === "gem") {
    lines.push("Treasure: high sell value");
  } else if (item.category === "key") {
    lines.push("Key: keep for matching locks");
  } else if (item.category === "scroll") {
    lines.push("Scroll: single-use magic");
  } else if (item.category === "consumable" && !healFormula) {
    lines.push("Supply: no active use yet");
  } else if (item.category === "trinket") {
    lines.push("Equip: passive bonus");
  }
  return lines;
}

function formatStats(item: ItemInstance): string | undefined {
  const stats = item.stats;
  if (!stats) return undefined;
  const entries = Object.entries(stats).filter(([, value]) => typeof value === "number" && value !== 0);
  if (entries.length === 0) return undefined;
  return `Stats: ${entries.map(([key, value]) => `${formatSigned(value as number)} ${formatStatLabel(key)}`).join(", ")}`;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatStatLabel(key: string): string {
  const labels: Record<string, string> = {
    maxHp: "Max HP",
    critChance: "Crit %",
    carryCapacity: "Carry",
    magicPower: "Magic",
    trapSense: "Trap Sense"
  };
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
