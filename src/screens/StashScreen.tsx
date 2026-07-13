import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "../components/Button";
import { ItemComparePanel } from "../components/ItemComparePanel";
import { ItemTooltip } from "../components/ItemTooltip";
import { LoadoutBuilder } from "../components/LoadoutBuilder";
import { MaterialInventory } from "../components/MaterialInventory";
import { InsurancePanel, KeepsakePanel, RunPreparationPanel } from "../components/RunPreparationPanel";
import { Tooltip } from "../components/Tooltip";
import { calculateInventoryWeight } from "../game/inventory";
import { getConsumableHealFormula } from "../game/itemEffects";
import { getAvailableRunPreparationOptions, getInsuranceCost, getKeepsakeCandidates } from "../game/runPreparation";
import type { EquipmentSlots, Inventory, ItemInstance } from "../game/types";
import { useGameStore } from "../store/gameStore";
import type { EquipmentChangePreview, EquipmentSlotName } from "../components/v04UiTypes";
import "./StashScreen.css";

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
  const setKeepsake = useGameStore(s => s.setKeepsake);
  const clearKeepsake = useGameStore(s => s.clearKeepsake);
  const purchaseInsurance = useGameStore(s => s.purchaseInsurance);
  const cancelInsurance = useGameStore(s => s.cancelInsurance);
  const genericEquip = useGameStore(s => s.equipItem);
  const genericUnequip = useGameStore(s => s.unequipItem);
  const previewEquipmentChange = useGameStore(s => s.previewEquipmentChange);
  const state = useGameStore(s => s.state);
  const [preview, setPreview] = useState<EquipmentChangePreview | undefined>();

  const mode = activeCombat ? "combat" : activeRun ? "dungeon" : "village";
  const message = mode === "village" ? villageMessage : dungeonMessage;

  const eyebrow = mode === "combat" ? "In Combat" : mode === "dungeon" ? "On Delve" : "Village";
  const scene = mode === "combat"
    ? "No time to sort gear now. Only to use what's already in hand."
    : mode === "dungeon"
      ? "The dark keeps its own ledger. This is what's left of what you brought."
      : "The pack lies open on the table. The delve does not wait.";

  const carryCapacity = player?.derivedStats.carryCapacity ?? 0;
  const packedWeight = mode === "village"
    ? calculateInventoryWeight(preparedInventory)
    : activeRun ? calculateInventoryWeight(activeRun.raidInventory) : 0;
  const displayedGold = mode === "village" ? stash.gold : activeRun?.raidInventory.gold ?? 0;

  return (
    <div className="screen pack-screen">
      <span className="pack-hero-eyebrow">{eyebrow}</span>
      <p className="pack-hero-scene">{scene}</p>

      {player && (
        <div className="pack-status-line">
          <span><em>{mode === "village" ? "Packed" : "Pack"}</em> {packedWeight} / {carryCapacity}</span>
          <span><em>{mode === "village" ? "Stash" : "Gold"}</em> {displayedGold}g</span>
        </div>
      )}

      {message && <p className="msg">{message}</p>}

      {player && (
        <section className="pack-section" aria-label="What you wear">
          <h2 className="pack-section-heading">What You Wear</h2>
          <p className="pack-section-intro">
            {mode === "combat"
              ? "The fight is on. What's equipped stays equipped."
              : "Every piece you carry on your body, weighed and ready."}
          </p>
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
        </section>
      )}

      <section className="pack-section" aria-label="What you carry down">
        <h2 className="pack-section-heading">What You Carry Down</h2>
        <p className="pack-section-intro">
          {mode === "village"
            ? "Everything staked on the next delve. Weight is the only honest limit."
            : mode === "dungeon"
              ? "What you're hauling out of the dark, if you make it."
              : "Whatever's in the pack is whatever you've got."}
        </p>
        {player && (
          <WeightBar current={packedWeight} capacity={carryCapacity} />
        )}

        {mode === "village" ? (
          inventoryIsEmpty(preparedInventory) ? (
            <div className="pack-empty">Nothing packed.</div>
          ) : (
            <>
              <ul className="pack-row-list">
                {preparedInventory.items.map(item => (
                  <PackRow
                    key={item.instanceId}
                    item={item}
                    actions={<Button variant="ghost" onClick={() => unpackPreparedItem(item.instanceId)}>Unpack</Button>}
                  />
                ))}
              </ul>
              <VaultLine inventory={preparedInventory} />
            </>
          )
        ) : activeRun ? (
          inventoryIsEmpty(activeRun.raidInventory) ? (
            <div className="pack-empty">Empty for now.</div>
          ) : (
            <>
              <ul className="pack-row-list">
                {activeRun.raidInventory.items.map(item => (
                  <PackRow
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
              </ul>
              <VaultLine inventory={activeRun.raidInventory} />
            </>
          )
        ) : null}
      </section>

      {mode === "village" && (
        <>
          <section className="pack-section" aria-label="What stays home">
            <h2 className="pack-section-heading">What Stays Home</h2>
            <p className="pack-section-intro">The stash. Safe, and no use to you below.</p>
            {inventoryIsEmpty(stash) ? (
              <div className="pack-empty">Stash is bare.</div>
            ) : (
              <>
                <ul className="pack-row-list">
                  {stash.items.map(item => (
                    <PackRow
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
                </ul>
                <VaultLine inventory={stash} />
              </>
            )}
          </section>

          <section className="pack-section" aria-label="Before you go">
            <h2 className="pack-section-heading">Before You Go</h2>

            <div className="pack-vow-block">
              <h3 className="pack-vow-heading">Run Preparations</h3>
              <p className="pack-vow-fiction">A few coins spent in the village linger like luck once the dark closes in.</p>
              <RunPreparationPanel
                options={getAvailableRunPreparationOptions({ gameState: state })}
                selectedPreparations={state.pendingRunPreparations ?? []}
                npcs={state.village?.npcs ?? []}
                onPurchase={(optionId, npcId) => purchasePreparation(npcId, optionId)}
              />
            </div>

            <div className="pack-vow-block">
              <h3 className="pack-vow-heading">Keepsake</h3>
              <p className="pack-vow-fiction">One weightless thing, set aside. It survives even if you don't.</p>
              <KeepsakePanel
                candidates={getKeepsakeCandidates(state)}
                selectedInstanceId={state.pendingKeepsakeInstanceId}
                onSelect={setKeepsake}
                onClear={clearKeepsake}
              />
            </div>

            <div className="pack-vow-block">
              <h3 className="pack-vow-heading">Insurance</h3>
              <p className="pack-vow-fiction">Pay now, and grief costs less if the delve turns on you.</p>
              <InsurancePanel
                candidates={player ? (Object.values(player.equipped).filter(Boolean) as ItemInstance[]) : []}
                selectedInstanceId={state.pendingInsuredInstanceId}
                getCost={getInsuranceCost}
                gold={stash.gold}
                onInsure={purchaseInsurance}
                onCancel={cancelInsurance}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function WeightBar({ current, capacity }: { current: number; capacity: number }) {
  if (capacity <= 0) return null;
  const pct = Math.min(100, Math.round((current / capacity) * 100));
  const over = current > capacity;
  const amber = !over && pct >= 85;
  return (
    <div className="pack-weight-bar" aria-label={`Weight ${current} of ${capacity}`}>
      <span
        className={`pack-weight-bar-fill ${over ? "pack-weight-over" : amber ? "pack-weight-amber" : ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function VaultLine({ inventory }: { inventory: Inventory }) {
  if (!hasMaterials(inventory)) return null;
  return (
    <div className="pack-vault-line">
      <span className="pack-vault-label">Vault</span>
      <MaterialInventory materials={inventory.materials ?? {}} compact />
    </div>
  );
}

function inventoryIsEmpty(inventory: Inventory): boolean {
  return inventory.items.length === 0 &&
    Object.values(inventory.materials ?? {}).every(amount => !amount || amount <= 0);
}

function hasMaterials(inventory: Inventory): boolean {
  return Object.values(inventory.materials ?? {}).some(amount => amount && amount > 0);
}

function PackRow({ item, actions }: { item: ItemInstance; actions: ReactNode }) {
  return (
    <li className="pack-row">
      <Tooltip content={<ItemTooltip item={item} />} as="span">
        <span className="pack-row-name">
          {item.name}
          {item.quantity > 1 && <span className="muted small"> x{item.quantity}</span>}
        </span>
      </Tooltip>
      <span className="pack-row-weight muted small">{item.weight * item.quantity}w</span>
      <span className="pack-row-value muted small">{item.value * item.quantity}g</span>
      <span className="pack-row-actions">{actions}</span>
    </li>
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
