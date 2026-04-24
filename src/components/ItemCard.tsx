import type { ItemInstance } from "../game/types";

interface Props {
  item: ItemInstance;
  onTake?: () => void;
  takeLabel?: string;
  compact?: boolean;
}

export function ItemCard({ item, onTake, takeLabel = "Take", compact }: Props) {
  return (
    <div className={`item-card item-rarity-${item.rarity}${compact ? " item-card-compact" : ""}`}>
      <div className="item-row">
        <span className="item-name">{item.name}{item.stackable && item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
        <span className="item-rarity-tag">{item.rarity}</span>
      </div>
      {!compact && <div className="item-desc">{item.description}</div>}
      <div className="item-meta">
        <span>{item.category}</span>
        <span>w {item.weight}</span>
        <span>v {item.value}</span>
      </div>
      {onTake && <button className="btn btn-ghost" onClick={onTake}>{takeLabel}</button>}
    </div>
  );
}
