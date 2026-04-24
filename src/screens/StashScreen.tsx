import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ItemCard } from "../components/ItemCard";
import { calculateInventoryWeight } from "../game/inventory";
import { getConsumableHealFormula } from "../game/itemEffects";
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
  const activeRun = useGameStore(s => s.state.activeRun);
  const activeCombat = useGameStore(s => s.state.activeCombat);
  const player = useGameStore(s => s.state.player);
  const villageMessage = useGameStore(s => s.lastVillageMessage);
  const dungeonMessage = useGameStore(s => s.lastRoomMessage);
  const useStashItem = useGameStore(s => s.useStashConsumable);
  const equipStashItem = useGameStore(s => s.equipItemFromStash);
  const unequipToStash = useGameStore(s => s.unequipItemToStash);
  const packPreparedItem = useGameStore(s => s.packItemForRun);
  const unpackPreparedItem = useGameStore(s => s.unpackPreparedItem);
  const useRaidItem = useGameStore(s => s.useRaidConsumable);
  const equipRaidItem = useGameStore(s => s.equipItemFromRaid);
  const unequipToRaid = useGameStore(s => s.unequipItemToRaid);
  const dropRaidItem = useGameStore(s => s.dropRaidItem);
  const useCombatItem = useGameStore(s => s.useCombatInventoryItem);

  const mode = activeCombat ? "combat" : activeRun ? "dungeon" : "village";
  const message = mode === "village" ? villageMessage : dungeonMessage;
  const title = mode === "combat"
    ? "Combat Inventory"
    : mode === "dungeon"
      ? "Dungeon Inventory"
      : "Inventory";
  const subtitle = mode === "combat"
    ? "Equipment changes are locked until the fight ends."
    : mode === "dungeon"
      ? "Manage only what you carried into this delve."
      : "Prepare gear and supplies for the next delve.";

  return (
    <div className="screen stash-screen">
      <header className="screen-header">
        <div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
      </header>
      {message && <p className="msg">{message}</p>}
      <div className="stash-grid">
        {player && (
          <Card title="Loadout" subtitle={mode === "combat" ? "View only" : `HP ${player.hp} / ${player.maxHp}`}>
            <h4 className="muted">Equipped</h4>
            <div className="equipment-grid">
              {(Object.keys(EQUIPMENT_LABELS) as Array<keyof EquipmentSlots>).map(slot => {
                const item = player.equipped[slot];
                return (
                  <div className="equipment-slot" key={slot}>
                    <div className="equipment-slot-header">
                      <strong>{EQUIPMENT_LABELS[slot]}</strong>
                      {item && mode === "village" && <Button variant="ghost" onClick={() => unequipToStash(slot)}>Unequip</Button>}
                      {item && mode === "dungeon" && <Button variant="ghost" onClick={() => unequipToRaid(slot)}>Pack</Button>}
                      {item && mode === "combat" && <span className="muted small">Locked</span>}
                    </div>
                    {item ? <ItemCard item={item} compact /> : <em>Empty</em>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {mode === "village" && (
          <>
            <Card title={`Next Raid Pack (${preparedInventory.gold} g)`} subtitle={player ? `${calculateInventoryWeight(preparedInventory)} / ${player.derivedStats.carryCapacity} weight` : undefined}>
              {preparedInventory.items.length === 0 ? <div className="inv-empty">Nothing packed.</div> : (
                <div className="inv-items">
                  {preparedInventory.items.map(item => (
                    <ItemActionCard
                      key={item.instanceId}
                      item={item}
                      actions={<Button variant="ghost" onClick={() => unpackPreparedItem(item.instanceId)}>Unpack</Button>}
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
                          {getConsumableHealFormula(item) && (
                            <Button variant="ghost" onClick={() => useStashItem(item.instanceId)}>Use</Button>
                          )}
                          {canEquip(item) && (
                            <Button variant="ghost" onClick={() => equipStashItem(item.instanceId)}>Equip</Button>
                          )}
                          <Button variant="ghost" onClick={() => packPreparedItem(item.instanceId)}>Pack</Button>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {(mode === "dungeon" || mode === "combat") && activeRun && (
          <Card
            title={`Raid Pack (${activeRun.raidInventory.gold} g)`}
            subtitle={player ? `${calculateInventoryWeight(activeRun.raidInventory)} / ${player.derivedStats.carryCapacity} weight` : undefined}
          >
            {activeRun.raidInventory.items.length === 0 ? <div className="inv-empty">Empty for now.</div> : (
              <div className="inv-items">
                {activeRun.raidInventory.items.map(item => (
                  <ItemActionCard
                    key={item.instanceId}
                    item={item}
                    actions={
                      mode === "combat"
                        ? <CombatItemActions item={item} onUse={() => useCombatItem(item.instanceId)} />
                        : (
                          <>
                            {getConsumableHealFormula(item) && (
                              <Button variant="ghost" onClick={() => useRaidItem(item.instanceId)}>Use</Button>
                            )}
                            {canEquip(item) && (
                              <Button variant="ghost" onClick={() => equipRaidItem(item.instanceId)}>Equip</Button>
                            )}
                            <Button variant="ghost" onClick={() => dropRaidItem(item.instanceId)}>Drop</Button>
                          </>
                        )
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        )}
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

function CombatItemActions({ item, onUse }: { item: ItemInstance; onUse: () => void }) {
  if (getConsumableHealFormula(item)) {
    return <Button variant="ghost" onClick={onUse}>Use</Button>;
  }
  return <span className="muted small">Not usable in combat</span>;
}
