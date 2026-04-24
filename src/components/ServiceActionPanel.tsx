import { Button } from "./Button";
import { formatResourceCost } from "../game/materials";
import type { ServiceActionDefinition, ServiceActionId } from "../game/types";

export function ServiceActionPanel({ actions, onPerform }: {
  actions: ServiceActionDefinition[];
  onPerform: (actionId: ServiceActionId) => void;
}) {
  if (actions.length === 0) return <div className="inv-empty">No service actions unlocked.</div>;
  return (
    <div className="service-action-panel">
      {actions.map(action => (
        <div className="service-action-card" key={action.id}>
          <div>
            <strong>{action.name}</strong>
            <p>{action.description}</p>
            <div className="muted small">{action.cost ? formatResourceCost(action.cost) : "Free"}</div>
          </div>
          <Button variant="ghost" onClick={() => onPerform(action.id)}>Use</Button>
        </div>
      ))}
    </div>
  );
}
