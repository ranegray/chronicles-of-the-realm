import { Button } from "./Button";
import { formatResourceCost } from "../game/materials";
import type { ItemInstance, PreparedRunModifier, RunPreparationOption, VillageNpc } from "../game/types";
import { RUN_PREPARATION_RULES } from "../game/constants";

export interface RunPreparationPanelProps {
  options: RunPreparationOption[];
  selectedPreparations: PreparedRunModifier[];
  npcs?: VillageNpc[];
  onPurchase: (optionId: string, npcId: string) => void;
}

export function RunPreparationPanel({ options, selectedPreparations, npcs = [], onPurchase }: RunPreparationPanelProps) {
  const selectedIds = new Set(selectedPreparations.map(prep => prep.optionId));
  return (
    <div className="run-preparation-panel">
      <div className="muted small">{selectedPreparations.length}/{RUN_PREPARATION_RULES.maxPreparedModifiers} preparations selected</div>
      {options.length === 0 ? <div className="inv-empty">No run preparations unlocked.</div> : options.map(option => {
        const npc = npcs.find(entry => entry.role === option.sourceRole);
        const selected = selectedIds.has(option.id);
        return (
          <div className="prep-card" key={option.id}>
            <div>
              <strong>{option.name}</strong>
              <p>{option.description}</p>
              <div className="muted small">{option.sourceRole} level {option.requiredServiceLevel} · {formatResourceCost(option.cost)}</div>
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
    <div className="run-preparation-panel">
      <p className="muted small">One weightless packed item can be designated a keepsake. It survives even if you die below.</p>
      {candidates.length === 0 ? (
        <div className="inv-empty">Nothing weightless is packed.</div>
      ) : candidates.map(item => {
        const selected = selectedInstanceId === item.instanceId;
        return (
          <div className="prep-card" key={item.instanceId}>
            <div>
              <strong>{item.name}</strong>
              <p>{item.description}</p>
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
    <div className="run-preparation-panel">
      <p className="muted small">Insure one equipped piece of gear. If you die, it returns to the stash instead of being lost.</p>
      {candidates.length === 0 ? (
        <div className="inv-empty">Nothing is equipped.</div>
      ) : candidates.map(item => {
        const selected = selectedInstanceId === item.instanceId;
        const cost = getCost(item);
        const affordable = gold >= cost;
        return (
          <div className="prep-card" key={item.instanceId}>
            <div>
              <strong>{item.name}</strong>
              <div className="muted small">{cost}g to insure</div>
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
