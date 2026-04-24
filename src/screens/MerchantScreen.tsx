import type { ReactNode } from "react";
import { useState } from "react";
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
import { canUpgradeNpcService, getCurrentServiceLevelDefinition, getNextServiceLevelDefinition, getRelationshipLabel } from "../game/villageProgression";
import { getAvailableServiceActions } from "../game/services";

const SLOT_LABELS: Record<EquipmentSlotId, string> = {
  weapon: "Weapon",
  offhand: "Offhand",
  armor: "Armor",
  trinket1: "Trinket I",
  trinket2: "Trinket II"
};

type Tab = "wares" | "services" | "quests";

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
  const [tab, setTab] = useState<Tab>("wares");

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
      <header className="merchant-hero">
        <div className="merchant-hero-main">
          <span className="merchant-hero-eyebrow">{capitalize(merchant.role)} · {currentLevel?.title ?? `Service ${merchant.serviceLevel}`}</span>
          <h1>{merchant.name}</h1>
          <p className="muted merchant-hero-flavor">{merchant.description}</p>
        </div>
        <div className="merchant-hero-meta">
          <span><em>Trust</em> {getRelationshipLabel(merchant.relationship)}</span>
          <span><em>Gold</em> {stash.gold}</span>
          <Button variant="ghost" onClick={() => goToScreen("village")}>Back to Village</Button>
        </div>
      </header>

      {message && <p className="msg">{message}</p>}

      <nav className="merchant-tabs" aria-label="Merchant sections">
        <TabButton active={tab === "wares"} onClick={() => setTab("wares")}>
          Wares <span className="merchant-tab-count">{stock.length + stash.items.length + upgradeSlots.length}</span>
        </TabButton>
        <TabButton active={tab === "services"} onClick={() => setTab("services")}>
          Services <span className="merchant-tab-count">{actions.length + recipes.length}</span>
        </TabButton>
        <TabButton active={tab === "quests"} onClick={() => setTab("quests")}>
          Quests <span className="merchant-tab-count">{quests.length}</span>
        </TabButton>
      </nav>

      {tab === "wares" && (
        <div className="merchant-pane merchant-pane-wares">
          <Card title="Stock" subtitle={`${stock.length} item${stock.length === 1 ? "" : "s"} for sale`}>
            {stock.length === 0 ? <div className="inv-empty">Nothing on offer.</div> : (
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
            )}
          </Card>

          <Card title="Your Stash" subtitle="Sell or upgrade equipped gear">
            {stash.items.length === 0 && upgradeSlots.length === 0 ? (
              <div className="inv-empty">Nothing to sell or upgrade here.</div>
            ) : (
              <div className="inv-items">
                {upgradeSlots.map(({ slot, item }) => item && (
                  <ItemActionCard
                    key={`up-${slot}`}
                    item={item}
                    actions={<Button variant="ghost" onClick={() => upgrade(slot)}>Upgrade {getUpgradeCost(item)}g</Button>}
                  />
                ))}
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
        </div>
      )}

      {tab === "services" && (
        <div className="merchant-pane merchant-pane-services">
          <Card title="Service Track" subtitle={nextLevel ? `Next: ${nextLevel.title}` : "Maxed"}>
            <VillageNpcDetail
              npc={merchant}
              currentLevel={currentLevel}
              nextLevel={nextLevel}
              canUpgrade={upgradeGate.canUpgrade}
              reason={upgradeGate.reason}
              onUpgrade={() => upgradeService(merchant.id)}
            />
          </Card>

          <Card title="Service Actions" subtitle={`${actions.length} offered`}>
            {actions.length === 0 ? (
              <div className="inv-empty">Nothing on offer yet.</div>
            ) : (
              <ServiceActionPanel actions={actions} onPerform={actionId => performAction(merchant.id, actionId)} />
            )}
          </Card>

          <Card title="Crafting" subtitle={`${recipes.length} unlocked recipe${recipes.length === 1 ? "" : "s"}`}>
            {recipes.length === 0 ? (
              <div className="inv-empty">No recipes unlocked here.</div>
            ) : (
              <CraftingPanel recipes={recipes} inventory={stash} onCraft={craft} />
            )}
          </Card>

          <Card title="Materials" subtitle="Secured in the village stash">
            <MaterialInventory materials={stash.materials ?? {}} compact />
          </Card>
        </div>
      )}

      {tab === "quests" && (
        <div className="merchant-pane merchant-pane-quests">
          <Card title="Quests" subtitle={`${quests.length} posted`}>
            {quests.length === 0 ? <div className="inv-empty">No work posted here.</div> : (
              <ul className="quest-list">
                {quests.map(quest => (
                  <li key={quest.id}>
                    <div className="quest-list-head">
                      <strong>{quest.title}</strong>
                      <span className="muted small">{quest.currentCount} / {quest.requiredCount} · {quest.status}</span>
                    </div>
                    <p className="muted">{quest.description}</p>
                    <div className="quest-list-actions">
                      {quest.status === "available" && (
                        <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Accept</Button>
                      )}
                      {quest.status === "active" && (
                        <Button variant="ghost" onClick={() => toggleQuest(quest.id)}>Drop</Button>
                      )}
                      {quest.status === "completed" && (
                        <Button onClick={() => claimQuest(quest.id)}>Turn In</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`merchant-tab ${active ? "merchant-tab-active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
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
