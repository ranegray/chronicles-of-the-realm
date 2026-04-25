import type { ItemInstance, StatModifierBlock } from "../game/types";
import { formatConsumableHealFormula } from "../game/itemEffects";
import { AffixBadge } from "./AffixBadge";
import { GearRiskBadge } from "./GearRiskBadge";
import { ItemStateWarning } from "./ItemStateWarning";
import type { ItemAffixView, ItemWithV4Fields } from "./v04UiTypes";

export interface ItemTooltipProps {
  item: ItemInstance;
  comparisonItem?: ItemInstance;
}

export function ItemTooltip({ item, comparisonItem }: ItemTooltipProps) {
  const v4Item = item as ItemWithV4Fields;
  const affixes = v4Item.affixes ?? [];
  const states = v4Item.states ?? [];
  const statEntries = Object.entries(item.stats ?? {}).filter(([, value]) => typeof value === "number" && value !== 0);
  const comparisonDiff = comparisonItem ? diffStats(item.stats, comparisonItem.stats) : undefined;
  const healFormula = formatConsumableHealFormula(item);

  return (
    <article className={`item-tooltip item-rarity-${item.rarity}`}>
      <header className="item-tooltip-header">
        <div>
          <strong>{item.name}{item.stackable && item.quantity > 1 ? ` x${item.quantity}` : ""}</strong>
          <span>{formatLabel(item.rarity)} {formatLabel(item.category)}</span>
        </div>
        <div className="item-tooltip-value">
          <span>{item.value}g</span>
          <span>w {item.weight}</span>
        </div>
      </header>

      <p className="item-tooltip-desc">{item.description}</p>

      {statEntries.length > 0 && (
        <div className="item-tooltip-section">
          <h4>Stats</h4>
          <dl className="item-tooltip-stats">
            {statEntries.map(([key, value]) => (
              <div key={key}>
                <dt>{formatStatLabel(key)}</dt>
                <dd>{formatSigned(value as number)}{comparisonDiff?.[key as keyof StatModifierBlock] ? <Diff value={comparisonDiff[key as keyof StatModifierBlock] ?? 0} /> : null}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {healFormula && (
        <div className="item-tooltip-section">
          <h4>Use</h4>
          <p>Heal {healFormula}.</p>
        </div>
      )}

      {affixes.length > 0 && (
        <div className="item-tooltip-section">
          <h4>Affixes</h4>
          <div className="affix-row">
            {affixes.map(affix => <AffixBadge key={affix.id} affix={affix} />)}
          </div>
          <ul className="item-tooltip-list">
            {affixes.map(affix => <li key={`${affix.id}-desc`}>{describeAffix(affix)}</li>)}
          </ul>
        </div>
      )}

      {states.length > 0 && (
        <div className="item-tooltip-section">
          <h4>Risk States</h4>
          <GearRiskBadge states={states} />
          <ItemStateWarning item={item} />
        </div>
      )}

      {(item.tags?.length ?? 0) > 0 && (
        <div className="item-tooltip-tags">
          {item.tags!.map(tag => <span key={tag}>{tag}</span>)}
        </div>
      )}
    </article>
  );
}

function describeAffix(affix: ItemAffixView): string {
  if (affix.description) return `${affix.name}: ${affix.description}`;
  if (affix.statKey && typeof affix.value === "number") {
    return `${affix.name}: ${formatSigned(affix.value)} ${formatStatLabel(affix.statKey)}.`;
  }
  return `${affix.name}: special property.`;
}

function diffStats(itemStats?: StatModifierBlock, comparisonStats?: StatModifierBlock) {
  const diff: Partial<Record<keyof StatModifierBlock, number>> = {};
  const keys = new Set<keyof StatModifierBlock>([
    ...Object.keys(itemStats ?? {}) as Array<keyof StatModifierBlock>,
    ...Object.keys(comparisonStats ?? {}) as Array<keyof StatModifierBlock>
  ]);
  for (const key of keys) {
    diff[key] = (itemStats?.[key] ?? 0) - (comparisonStats?.[key] ?? 0);
  }
  return diff;
}

function Diff({ value }: { value: number }) {
  if (value === 0) return null;
  return <span className={value > 0 ? "good" : "danger"}> ({formatSigned(value)})</span>;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatLabel(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

function formatStatLabel(key: string): string {
  const labels: Record<string, string> = {
    maxHp: "Max HP",
    critChance: "Crit Chance",
    carryCapacity: "Carry",
    magicPower: "Magic",
    trapSense: "Trap Sense"
  };
  return labels[key] ?? formatLabel(key);
}
