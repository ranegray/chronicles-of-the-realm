import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ItemComparePanel } from "../components/ItemComparePanel";
import { ItemTooltip } from "../components/ItemTooltip";
import { LoadoutBuilder } from "../components/LoadoutBuilder";
import { RunPreparationPanel } from "../components/RunPreparationPanel";
import { calculateInventoryWeight } from "../game/inventory";
import { getConsumableHealFormula } from "../game/itemEffects";
import { getAvailableRunPreparationOptions } from "../game/runPreparation";
import type { EquipmentSlots, ItemInstance } from "../game/types";
import { useGameStore } from "../store/gameStore";
import type { EquipmentChangePreview, EquipmentSlotName } from "../components/v04UiTypes";

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
  const packPreparedItem = useGameStore(s => s.packItemForRun);
  const unpackPreparedItem = useGameStore(s => s.unpackPreparedItem);
  const useRaidItem = useGameStore(s => s.useRaidConsumable);
  const equipRaidItem = useGameStore(s => s.equipItemFromRaid);
  const dropRaidItem = useGameStore(s => s.dropRaidItem);
  const useCombatItem = useGameStore(s => s.useCombatInventoryItem);
  const purchasePreparation = useGameStore(s => s.purchaseRunPreparation);
  const genericEquip = useGameStore(s => s.equipItem);
  const genericUnequip = useGameStore(s => s.unequipItem);
  const previewEquipmentChange = useGameStore(s => s.previewEquipmentChange);
  const state = useGameStore(s => s.state);
  const [preview, setPreview] = useState<EquipmentChangePreview | undefined>();

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
      <header className="stash-hero">
        <div className="stash-hero-main">
          <span className="stash-hero-eyebrow">{mode === "combat" ? "In Combat" : mode === "dungeon" ? "On Delve" : "Village"}</span>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        {player && mode === "village" && (
          <div className="stash-hero-meta">
            <span><em>Stash</em> {stash.gold}g</span>
            <span><em>Packed</em> {calculateInventoryWeight(preparedInventory)} / {player.derivedStats.carryCapacity}</span>
          </div>
        )}
        {player && activeRun && mode !== "village" && (
          <div className="stash-hero-meta">
            <span><em>Carried</em> {activeRun.raidInventory.gold}g</span>
            <span><em>Pack</em> {calculateInventoryWeight(activeRun.raidInventory)} / {player.derivedStats.carryCapacity}</span>
          </div>
        )}
      </header>
      {message && <p className="msg">{message}</p>}
      <div className="stash-grid">
        {player && (
          <Card title="Loadout" subtitle={mode === "combat" ? "View only" : `HP ${player.hp} / ${player.maxHp}`}>
            <h4 className="muted">Equipped</h4>
            <LoadoutBuilder
              character={player}
              inventoryItems={mode === "village" ? stash.items : activeRun?.raidInventory.items}
              activeRun={mode === "dungeon"}
              readOnly={mode === "combat"}
              preview={preview}
              onPreview={(item, slot) => setPreview(previewEquipmentChange(item.instanceId, slot))}
              onEquip={(item, slot) => {
                genericEquip(item.instanceId, slot);
                setPreview(undefined);
              }}
              onUnequip={slot => {
                genericUnequip(slot);
                setPreview(undefined);
              }}
            />
            {mode !== "combat" && <ItemComparePanel preview={preview} />}
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
                            <>
                              <Button variant="ghost" onClick={() => setPreview(previewEquipmentChange(item.instanceId, preferredSlotFor(item, player?.equipped)))}>Preview</Button>
                              <Button variant="ghost" onClick={() => equipStashItem(item.instanceId)}>Equip</Button>
                            </>
                          )}
                          <Button variant="ghost" onClick={() => packPreparedItem(item.instanceId)}>Pack</Button>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card title="Run Preparations" subtitle="One-run advantages from village services">
              <RunPreparationPanel
                options={getAvailableRunPreparationOptions({ gameState: state })}
                selectedPreparations={state.pendingRunPreparations ?? []}
                npcs={state.village?.npcs ?? []}
                onPurchase={(optionId, npcId) => purchasePreparation(npcId, optionId)}
              />
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
                              <>
                                <Button variant="ghost" onClick={() => setPreview(previewEquipmentChange(item.instanceId, preferredSlotFor(item, player?.equipped)))}>Preview</Button>
                                <Button variant="ghost" onClick={() => equipRaidItem(item.instanceId)}>Equip</Button>
                              </>
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
      <ItemTooltip item={item} />
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

function preferredSlotFor(item: ItemInstance, equipped?: EquipmentSlots): EquipmentSlotName {
  if (item.category === "weapon") return "weapon";
  if (item.category === "shield") return "offhand";
  if (item.category === "armor") return "armor";
  if (item.category === "trinket") {
    if (!equipped?.trinket1) return "trinket1";
    return "trinket2";
  }
  return "weapon";
}
