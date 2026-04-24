import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ItemCard } from "../components/ItemCard";
import { StatBlock } from "../components/StatBlock";
import { calculateInventoryWeight } from "../game/inventory";
import type { EquipmentSlots, ItemInstance } from "../game/types";
import { useGameStore } from "../store/gameStore";

const EQUIPMENT_LABELS: Record<keyof EquipmentSlots, string> = {
  weapon: "Weapon",
  offhand: "Offhand",
  armor: "Armor",
  trinket1: "Trinket I",
  trinket2: "Trinket II"
};

export function StashScreen() {
  const stash = useGameStore(s => s.state.stash);
  const preparedInventory = useGameStore(s => s.state.preparedInventory);
  const player = useGameStore(s => s.state.player);
  const message = useGameStore(s => s.lastVillageMessage);
  const goToScreen = useGameStore(s => s.goToScreen);
  const useItem = useGameStore(s => s.useStashConsumable);
  const equipItem = useGameStore(s => s.equipItemFromStash);
  const unequipItem = useGameStore(s => s.unequipItemToStash);
  const packItem = useGameStore(s => s.packItemForRun);
  const unpackItem = useGameStore(s => s.unpackPreparedItem);

  return (
    <div className="screen stash-screen">
      <header className="stash-header">
        <div>
          <h2>Inventory & Loadout</h2>
          <p className="muted">Manage safe storage, equipped gear, and the pack that goes into your next delve.</p>
        </div>
        <Button variant="ghost" onClick={() => goToScreen("village")}>Back to Village</Button>
      </header>
      {message && <p className="msg">{message}</p>}
      <div className="stash-grid">
        {player && (
          <Card title={player.name} subtitle={`Level ${player.level}`}>
            <StatBlock character={player} />
            <h4 className="muted">Equipped</h4>
            <div className="equipment-grid">
              {(Object.keys(EQUIPMENT_LABELS) as Array<keyof EquipmentSlots>).map(slot => {
                const item = player.equipped[slot];
                return (
                  <div className="equipment-slot" key={slot}>
                    <div className="equipment-slot-header">
                      <strong>{EQUIPMENT_LABELS[slot]}</strong>
                      {item && <Button variant="ghost" onClick={() => unequipItem(slot)}>Unequip</Button>}
                    </div>
                    {item ? <ItemCard item={item} compact /> : <em>Empty</em>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card title={`Next Raid Pack (${preparedInventory.gold} g)`} subtitle={player ? `${calculateInventoryWeight(preparedInventory)} / ${player.derivedStats.carryCapacity} weight` : undefined}>
          {preparedInventory.items.length === 0 ? <div className="inv-empty">Nothing packed.</div> : (
            <div className="inv-items">
              {preparedInventory.items.map(item => (
                <ItemActionCard
                  key={item.instanceId}
                  item={item}
                  actions={<Button variant="ghost" onClick={() => unpackItem(item.instanceId)}>Unpack</Button>}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title={`Stash (${stash.gold} g)`}>
          {stash.items.length === 0 ? <div className="inv-empty">Stash is bare.</div> : (
            <div className="inv-items">
              {stash.items.map(item => (
                <ItemActionCard
                  key={item.instanceId}
                  item={item}
                  actions={
                    <>
                      {item.category === "consumable" && (
                        <Button variant="ghost" onClick={() => useItem(item.instanceId)}>Use</Button>
                      )}
                      {canEquip(item) && (
                        <Button variant="ghost" onClick={() => equipItem(item.instanceId)}>Equip</Button>
                      )}
                      <Button variant="ghost" onClick={() => packItem(item.instanceId)}>Pack</Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ItemActionCard({ item, actions }: { item: ItemInstance; actions: ReactNode }) {
  return (
    <div className="item-action-card">
      <ItemCard item={item} compact />
      <div className="item-actions">{actions}</div>
    </div>
  );
}

function canEquip(item: ItemInstance): boolean {
  return item.category === "weapon" ||
    item.category === "armor" ||
    item.category === "shield" ||
    item.category === "trinket";
}
