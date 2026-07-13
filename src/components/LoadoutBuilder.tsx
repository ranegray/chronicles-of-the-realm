import { Button } from "./Button";
import { ItemTooltip } from "./ItemTooltip";
import { Tooltip } from "./Tooltip";
import type { Character, EquipmentSlots, ItemInstance, StatModifierBlock } from "../game/types";
import type { EquipmentChangePreview, EquipmentSlotName } from "./v04UiTypes";
import "./LoadoutBuilder.css";

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
      <ul className="loadout-slot-list">
        {(Object.keys(EQUIPMENT_LABELS) as EquipmentSlotName[]).map(slot => {
          const item = character.equipped[slot];
          return (
            <li
              className={`loadout-slot-row ${preview?.slot === slot ? "loadout-slot-row-previewing" : ""}`}
              key={slot}
            >
              <span className="loadout-slot-label">{EQUIPMENT_LABELS[slot]}</span>
              {item ? (
                <Tooltip content={<ItemTooltip item={item} />} as="span">
                  <span className="loadout-slot-item">{item.name}</span>
                </Tooltip>
              ) : (
                <em className="loadout-slot-empty">Empty</em>
              )}
              <span className="loadout-slot-stat muted small">
                {item ? keyStatFor(item) : ""}
              </span>
              {item && !readOnly && onUnequip ? (
                <Button variant="ghost" onClick={() => onUnequip(slot)}>
                  {activeRun ? "Pack" : "Unequip"}
                </Button>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>

      {equippable.length > 0 && !readOnly && (
        <div className="loadout-pool">
          <h4 className="loadout-pool-heading">Gear on hand</h4>
          <ul className="loadout-pool-list">
            {equippable.map(item => {
              const slot = defaultSlotForItem(item, character.equipped);
              return (
                <li key={item.instanceId} className="loadout-pool-row">
                  <Tooltip content={<ItemTooltip item={item} comparisonItem={slot ? character.equipped[slot] : undefined} />} as="span">
                    <span className="loadout-pool-name">{item.name}</span>
                  </Tooltip>
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
                </li>
              );
            })}
          </ul>
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

const KEY_STAT_LABELS: Record<string, string> = {
  might: "Might",
  agility: "Agility",
  endurance: "Endurance",
  intellect: "Intellect",
  will: "Will",
  presence: "Presence",
  maxHp: "Max HP",
  armor: "Armor",
  accuracy: "Accuracy",
  evasion: "Evasion",
  critChance: "Crit %",
  carryCapacity: "Carry",
  magicPower: "Magic",
  trapSense: "Trap Sense"
};

function keyStatFor(item: ItemInstance): string {
  const stats = item.stats;
  if (!stats) return "";
  const entries = Object.entries(stats).filter(
    ([, value]) => typeof value === "number" && value !== 0
  ) as Array<[keyof StatModifierBlock, number]>;
  if (entries.length === 0) return "";
  const [key, value] = entries[0];
  const label = KEY_STAT_LABELS[key] ?? key;
  const signed = value > 0 ? `+${value}` : String(value);
  return `${signed} ${label}`;
}
