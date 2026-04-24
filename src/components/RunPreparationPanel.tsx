import { Button } from "./Button";
import { formatResourceCost } from "../game/materials";
import type { PreparedRunModifier, RunPreparationOption, VillageNpc } from "../game/types";
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
