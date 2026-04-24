import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ItemCard } from "../components/ItemCard";
import { CraftingPanel } from "../components/CraftingPanel";
import { MaterialInventory } from "../components/MaterialInventory";
import { ServiceActionPanel } from "../components/ServiceActionPanel";
import { VillageNpcDetail } from "../components/VillageNpcDetail";
import {
  canMerchantUpgrade,
  getBuyPrice,
  getMerchantStock,
  getSellValue,
  getUpgradeCost,
  type EquipmentSlotId
} from "../game/merchants";
import type { ItemInstance } from "../game/types";
import { useGameStore } from "../store/gameStore";
import { getUnlockedRecipes } from "../game/crafting";
import { canUpgradeNpcService, getCurrentServiceLevelDefinition, getNextServiceLevelDefinition } from "../game/villageProgression";
import { getAvailableServiceActions } from "../game/services";

const SLOT_LABELS: Record<EquipmentSlotId, string> = {
  weapon: "Weapon",
  offhand: "Offhand",
  armor: "Armor",
  trinket1: "Trinket I",
  trinket2: "Trinket II"
};

export function MerchantScreen() {
  const player = useGameStore(s => s.state.player);
  const village = useGameStore(s => s.state.village);
  const stash = useGameStore(s => s.state.stash);
  const merchantId = useGameStore(s => s.activeMerchantId);
  const message = useGameStore(s => s.lastVillageMessage);
  const goToScreen = useGameStore(s => s.goToScreen);
  const buy = useGameStore(s => s.buyMerchantItem);
  const sell = useGameStore(s => s.sellStashItem);
  const upgrade = useGameStore(s => s.upgradeEquippedItem);
  const toggleQuest = useGameStore(s => s.toggleQuestActive);
  const claimQuest = useGameStore(s => s.claimQuestReward);
  const upgradeService = useGameStore(s => s.upgradeNpcService);
  const craft = useGameStore(s => s.craftRecipe);
  const performAction = useGameStore(s => s.performServiceAction);
  const state = useGameStore(s => s.state);

  const merchant = village?.npcs.find(npc => npc.id === merchantId);
  if (!player || !village || !merchant) {
    return (
      <div className="screen">
        <p>Merchant unavailable.</p>
        <Button onClick={() => goToScreen("village")}>Back to Village</Button>
      </div>
    );
  }

  const stock = getMerchantStock(merchant.role, merchant.serviceLevel);
  const quests = village.quests.filter(q => q.npcId === merchant.id);
  const currentLevel = getCurrentServiceLevelDefinition({ npc: merchant });
  const nextLevel = getNextServiceLevelDefinition({ npc: merchant });
  const upgradeGate = canUpgradeNpcService({ gameState: state, npcId: merchant.id });
  const recipes = getUnlockedRecipes({ gameState: state, npcId: merchant.id });
  const actions = getAvailableServiceActions({ gameState: state, npcId: merchant.id });
  const upgradeSlots = (Object.keys(SLOT_LABELS) as EquipmentSlotId[])
    .map(slot => ({ slot, item: player.equipped[slot] }))
    .filter(entry => entry.item && canMerchantUpgrade(merchant.role, entry.item));

  return (
    <div className="screen merchant-screen">
      <header className="merchant-header">
        <div>
          <h2>{merchant.name}</h2>
          <p className="muted">{capitalize(merchant.role)} · service {merchant.serviceLevel} · relation {merchant.relationship}</p>
          <p>{merchant.description}</p>
        </div>
        <Button variant="ghost" onClick={() => goToScreen("village")}>Back to Village</Button>
      </header>

      {message && <p className="msg">{message}</p>}

      <div className="merchant-grid">
        <Card title="Service Track" subtitle="Village progression">
          <VillageNpcDetail
            npc={merchant}
            currentLevel={currentLevel}
            nextLevel={nextLevel}
            canUpgrade={upgradeGate.canUpgrade}
            reason={upgradeGate.reason}
            onUpgrade={() => upgradeService(merchant.id)}
          />
        </Card>

        <Card title="Materials" subtitle="Available for crafting and upgrades">
          <MaterialInventory materials={stash.materials ?? {}} compact />
        </Card>

        <Card title="Service Actions">
          <ServiceActionPanel actions={actions} onPerform={actionId => performAction(merchant.id, actionId)} />
        </Card>

        <Card title="Crafting" subtitle={`${recipes.length} unlocked recipe${recipes.length === 1 ? "" : "s"}`}>
          <CraftingPanel recipes={recipes} inventory={stash} onCraft={craft} />
        </Card>

        <Card title="Stock" subtitle={`${stash.gold} gold available`}>
          <div className="inv-items">
            {stock.map(item => {
              const price = getBuyPrice(item, merchant.serviceLevel);
              return (
                <ItemActionCard
                  key={item.id}
                  item={{
                    ...item,
                    instanceId: item.id,
                    templateId: item.id,
                    quantity: 1
                  }}
                  actions={<Button variant="ghost" onClick={() => buy(item.id)}>Buy {price}g</Button>}
                />
              );
            })}
          </div>
        </Card>

        <Card title="Sell From Stash">
          {stash.items.length === 0 ? <div className="inv-empty">Nothing to sell.</div> : (
            <div className="inv-items">
              {stash.items.map(item => (
                <ItemActionCard
                  key={item.instanceId}
                  item={item}
                  actions={<Button variant="ghost" onClick={() => sell(item.instanceId)}>Sell {getSellValue(item)}g</Button>}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title="Upgrade Equipped Gear">
          {upgradeSlots.length === 0 ? <div className="inv-empty">No suitable equipped gear for this merchant.</div> : (
            <div className="inv-items">
              {upgradeSlots.map(({ slot, item }) => item && (
                <ItemActionCard
                  key={slot}
                  item={item}
                  actions={<Button variant="ghost" onClick={() => upgrade(slot)}>Upgrade {getUpgradeCost(item)}g</Button>}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title="Quests">
          {quests.length === 0 ? <div className="inv-empty">No work posted here.</div> : (
            <ul className="quest-list">
              {quests.map(quest => (
                <li key={quest.id}>
                  <strong>{quest.title}</strong>
                  <p>{quest.description}</p>
                  <div className="muted">Progress: {quest.currentCount} / {quest.requiredCount} · {quest.status}</div>
                  {quest.status === "available" && (
                    <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Accept</Button>
                  )}
                  {quest.status === "active" && (
                    <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Drop</Button>
                  )}
                  {quest.status === "completed" && (
                    <Button onClick={() => claimQuest(quest.id)}>Turn In</Button>
                  )}
                </li>
              ))}
            </ul>
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
