import { Button } from "./Button";
import { ItemTooltip } from "./ItemTooltip";
import { GearRiskBadge } from "./GearRiskBadge";
import type { Character, EquipmentSlots, ItemInstance } from "../game/types";
import type { EquipmentChangePreview, EquipmentSlotName, ItemWithV4Fields } from "./v04UiTypes";

export interface LoadoutBuilderProps {
  character: Character;
  inventoryItems?: ItemInstance[];
  activeRun?: boolean;
  readOnly?: boolean;
  preview?: EquipmentChangePreview;
  onPreview?: (item: ItemInstance, slot: EquipmentSlotName) => void;
  onEquip?: (item: ItemInstance, slot: EquipmentSlotName) => void;
  onUnequip?: (slot: EquipmentSlotName) => void;
}

const EQUIPMENT_LABELS: Record<EquipmentSlotName, string> = {
  weapon: "Weapon",
  offhand: "Offhand",
  armor: "Armor",
  trinket1: "Trinket I",
  trinket2: "Trinket II"
};

export function LoadoutBuilder({
  character,
  inventoryItems = [],
  activeRun,
  readOnly,
  preview,
  onPreview,
  onEquip,
  onUnequip
}: LoadoutBuilderProps) {
  const equippable = inventoryItems.filter(canEquip);
  return (
    <section className="loadout-builder">
      <div className="equipment-grid">
        {(Object.keys(EQUIPMENT_LABELS) as EquipmentSlotName[]).map(slot => {
          const item = character.equipped[slot];
          return (
            <div className={`equipment-slot ${preview?.slot === slot ? "equipment-slot-previewing" : ""}`} key={slot}>
              <div className="equipment-slot-header">
                <strong>{EQUIPMENT_LABELS[slot]}</strong>
                {item && !readOnly && onUnequip && (
                  <Button variant="ghost" onClick={() => onUnequip(slot)}>
                    {activeRun ? "Pack" : "Unequip"}
                  </Button>
                )}
                {!item && readOnly && <span className="muted small">Empty</span>}
              </div>
              {item ? (
                <>
                  <ItemTooltip item={item} />
                  <GearRiskBadge states={(item as ItemWithV4Fields).states} />
                </>
              ) : (
                <em className="muted">Empty</em>
              )}
            </div>
          );
        })}
      </div>

      {equippable.length > 0 && !readOnly && (
        <div className="loadout-pool">
          <h4>Available Gear</h4>
          <div className="loadout-pool-grid">
            {equippable.map(item => {
              const slot = defaultSlotForItem(item, character.equipped);
              return (
                <article key={item.instanceId} className="loadout-pool-item">
                  <ItemTooltip item={item} comparisonItem={slot ? character.equipped[slot] : undefined} />
                  <div className="loadout-pool-actions">
                    {slot ? (
                      <>
                        {onPreview && <Button variant="ghost" onClick={() => onPreview(item, slot)}>Preview</Button>}
                        {onEquip && <Button variant="secondary" onClick={() => onEquip(item, slot)}>Equip</Button>}
                      </>
                    ) : (
                      <span className="muted small">No valid slot</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function canEquip(item: ItemInstance): boolean {
  return item.category === "weapon" ||
    item.category === "armor" ||
    item.category === "shield" ||
    item.category === "trinket";
}

export function validSlotsForItem(item: ItemInstance): EquipmentSlotName[] {
  if (item.category === "weapon") return ["weapon"];
  if (item.category === "shield") return ["offhand"];
  if (item.category === "armor") return ["armor"];
  if (item.category === "trinket") return ["trinket1", "trinket2"];
  return [];
}

function defaultSlotForItem(item: ItemInstance, equipped: EquipmentSlots): EquipmentSlotName | undefined {
  const valid = validSlotsForItem(item);
  if (item.category === "trinket") {
    if (!equipped.trinket1) return "trinket1";
    if (!equipped.trinket2) return "trinket2";
  }
  return valid[0];
}
