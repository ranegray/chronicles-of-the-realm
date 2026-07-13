import { Button } from "./Button";
import { formatResourceCost } from "../game/materials";
import type { ItemInstance, PreparedRunModifier, RunPreparationOption, VillageNpc } from "../game/types";
import { RUN_PREPARATION_RULES } from "../game/constants";
import "./RunPreparationPanel.css";

export interface RunPreparationPanelProps {
  options: RunPreparationOption[];
  selectedPreparations: PreparedRunModifier[];
  npcs?: VillageNpc[];
  onPurchase: (optionId: string, npcId: string) => void;
}

export function RunPreparationPanel({ options, selectedPreparations, npcs = [], onPurchase }: RunPreparationPanelProps) {
  const selectedIds = new Set(selectedPreparations.map(prep => prep.optionId));
  return (
    <div className="vow-list">
      <p className="muted small">
        {selectedPreparations.length}/{RUN_PREPARATION_RULES.maxPreparedModifiers} preparations selected
      </p>
      {options.length === 0 ? <div className="pack-empty">No run preparations unlocked.</div> : options.map(option => {
        const npc = npcs.find(entry => entry.role === option.sourceRole);
        const selected = selectedIds.has(option.id);
        return (
          <div className="vow-row" key={option.id}>
            <div className="vow-row-main">
              <strong className="vow-row-name">{option.name}</strong>
              <span className="vow-row-detail">{option.description}</span>
              <span className="vow-row-detail">{option.sourceRole} level {option.requiredServiceLevel} · {formatResourceCost(option.cost)}</span>
            </div>
            <Button variant="ghost" disabled={selected || !npc} onClick={() => npc && onPurchase(option.id, npc.id)}>
              {selected ? "Prepared" : "Prepare"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export interface KeepsakePanelProps {
  candidates: ItemInstance[];
  selectedInstanceId?: string;
  onSelect: (itemInstanceId: string) => void;
  onClear: () => void;
}

export function KeepsakePanel({ candidates, selectedInstanceId, onSelect, onClear }: KeepsakePanelProps) {
  return (
    <div className="vow-list">
      {candidates.length === 0 ? (
        <div className="pack-empty">Nothing weightless is packed.</div>
      ) : candidates.map(item => {
        const selected = selectedInstanceId === item.instanceId;
        return (
          <div className="vow-row" key={item.instanceId}>
            <div className="vow-row-main">
              <strong className="vow-row-name">{item.name}</strong>
              <span className="vow-row-detail">{item.description}</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => (selected ? onClear() : onSelect(item.instanceId))}
            >
              {selected ? "Keepsake" : "Set as Keepsake"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export interface InsurancePanelProps {
  candidates: ItemInstance[];
  selectedInstanceId?: string;
  getCost: (item: ItemInstance) => number;
  gold: number;
  onInsure: (itemInstanceId: string) => void;
  onCancel: () => void;
}

export function InsurancePanel({ candidates, selectedInstanceId, getCost, gold, onInsure, onCancel }: InsurancePanelProps) {
  return (
    <div className="vow-list">
      {candidates.length === 0 ? (
        <div className="pack-empty">Nothing is equipped.</div>
      ) : candidates.map(item => {
        const selected = selectedInstanceId === item.instanceId;
        const cost = getCost(item);
        const affordable = gold >= cost;
        return (
          <div className="vow-row" key={item.instanceId}>
            <div className="vow-row-main">
              <strong className="vow-row-name">{item.name}</strong>
              <span className="vow-row-detail">{cost}g to insure</span>
            </div>
            <Button
              variant="ghost"
              disabled={!selected && (!!selectedInstanceId || !affordable)}
              onClick={() => (selected ? onCancel() : onInsure(item.instanceId))}
            >
              {selected ? "Insured" : "Insure"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
