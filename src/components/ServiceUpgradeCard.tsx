import { Button } from "./Button";
import { formatResourceCost } from "../game/materials";
import type { ServiceLevelDefinition, VillageNpc } from "../game/types";

export interface ServiceUpgradeCardProps {
  npc: VillageNpc;
  nextLevel?: ServiceLevelDefinition;
  canUpgrade: boolean;
  reason?: string;
  onUpgrade: () => void;
}

export function ServiceUpgradeCard({ npc, nextLevel, canUpgrade, reason, onUpgrade }: ServiceUpgradeCardProps) {
  if (!nextLevel) {
    return <div className="service-upgrade-card"><strong>{npc.name}</strong><p className="muted">Service track complete.</p></div>;
  }
  return (
    <div className="service-upgrade-card">
      <div>
        <strong>Next: {nextLevel.title}</strong>
        <p>{nextLevel.description}</p>
        <div className="muted small">Cost: {formatResourceCost(nextLevel.upgradeCost ?? {})}</div>
        {nextLevel.requirements?.length ? (
          <div className="muted small">Needs: {nextLevel.requirements.map(req => req.description).join(", ")}</div>
        ) : null}
        <div className="muted small">Unlocks: {nextLevel.unlocks.map(unlock => unlock.label).join(", ")}</div>
      </div>
      <Button onClick={onUpgrade} disabled={!canUpgrade}>{canUpgrade ? "Upgrade" : reason ?? "Locked"}</Button>
    </div>
  );
}
