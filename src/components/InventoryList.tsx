import type { Inventory } from "../game/types";
import { ItemCard } from "./ItemCard";

interface Props {
  inventory: Inventory;
  title?: string;
  capacity?: number;
  emptyText?: string;
}

export function InventoryList({ inventory, title, capacity, emptyText }: Props) {
  const weight = inventory.items.reduce((s, i) => s + i.weight * i.quantity, 0);
  return (
    <div className="inventory-list">
      {title && (
        <div className="inv-header">
          <strong>{title}</strong>
          <span>
            {weight}{capacity != null ? ` / ${capacity}` : ""} weight · {inventory.gold} g
          </span>
        </div>
      )}
      {inventory.items.length === 0 ? (
        <div className="inv-empty">{emptyText ?? "Empty."}</div>
      ) : (
        <div className="inv-items">
          {inventory.items.map(item => (
            <ItemCard key={item.instanceId} item={item} compact />
          ))}
        </div>
      )}
    </div>
  );
}
