import type { DungeonRoom, ItemInstance } from "../game/types";
import { Button } from "./Button";
import { getPendingLoot, hasPendingLoot } from "../game/pendingLoot";
import { calculateInventoryWeight } from "../game/inventory";
import { formatMaterialVault } from "../game/materials";

export interface RoomLootPanelProps {
  room: DungeonRoom;
  raidInventory: { items: ItemInstance[]; gold: number };
  carryCapacity: number;
  onTakeItem: (item: ItemInstance) => void;
  onTakeAll: () => void;
  onLeaveRest: () => void;
}

export function RoomLootPanel({
  room,
  raidInventory,
  carryCapacity,
  onTakeItem,
  onTakeAll,
  onLeaveRest
}: RoomLootPanelProps) {
  if (!hasPendingLoot(room)) return null;

  const pending = getPendingLoot(room);
  const currentWeight = calculateInventoryWeight(raidInventory);
  const remainingCapacity = carryCapacity - currentWeight;
  const materialEntries = Object.entries(pending.materials).filter(([, amount]) => (amount ?? 0) > 0);
  const hasGoldOrMaterials = pending.gold > 0 || materialEntries.length > 0;

  return (
    <section className="loot-panel" aria-label="Room loot">
      <header className="loot-panel-header">
        <h3>What Remains</h3>
        <span className="muted small">Pack {currentWeight}/{carryCapacity}</span>
      </header>

      <ul className="loot-panel-list">
        {pending.items.map(item => {
          const itemWeight = item.weight * item.quantity;
          const beyondYou = itemWeight > carryCapacity;
          const tooHeavy = !beyondYou && itemWeight > remainingCapacity;
          const disabled = beyondYou || tooHeavy;
          return (
            <li key={item.instanceId} className="loot-panel-row">
              <span className="loot-panel-name">
                {item.name}
                {item.quantity > 1 && <span className="muted small"> x{item.quantity}</span>}
              </span>
              <span className="loot-panel-weight muted small">w {itemWeight}</span>
              <span className="loot-panel-value muted small">{item.value * item.quantity}g</span>
              <Button
                variant="secondary"
                onClick={() => onTakeItem(item)}
                disabled={disabled}
                title={beyondYou ? "Beyond you" : tooHeavy ? "Too heavy" : undefined}
              >
                {beyondYou ? "Beyond you" : tooHeavy ? "Too heavy" : "Take"}
              </Button>
            </li>
          );
        })}
      </ul>

      {hasGoldOrMaterials && (
        <p className="loot-panel-extras muted small">
          {pending.gold > 0 && <span>{pending.gold} gold</span>}
          {pending.gold > 0 && materialEntries.length > 0 && <span> · </span>}
          {materialEntries.length > 0 && (
            <span>{formatMaterialVault(pending.materials)}</span>
          )}
          <span> — weightless, taken with Take All</span>
        </p>
      )}

      <footer className="loot-panel-footer">
        <Button onClick={onTakeAll}>Take All</Button>
        <Button variant="ghost" onClick={onLeaveRest}>Leave the Rest</Button>
      </footer>
    </section>
  );
}
