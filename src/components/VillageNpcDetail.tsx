import { ServiceLevelBadge } from "./ServiceLevelBadge";
import { ServiceUpgradeCard } from "./ServiceUpgradeCard";
import type { ServiceLevelDefinition, VillageNpc } from "../game/types";
import { getRelationshipLabel } from "../game/villageProgression";

export function VillageNpcDetail({ npc, currentLevel, nextLevel, canUpgrade, reason, onUpgrade }: {
  npc: VillageNpc;
  currentLevel?: ServiceLevelDefinition;
  nextLevel?: ServiceLevelDefinition;
  canUpgrade: boolean;
  reason?: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="village-npc-detail">
      <ServiceLevelBadge level={npc.service.level} label={currentLevel?.title} />
      <p>{npc.description}</p>
      <div className="muted small">Relationship: {getRelationshipLabel(npc.relationship)} ({npc.relationship}) · service XP {npc.service.xp}</div>
      <ServiceUpgradeCard npc={npc} nextLevel={nextLevel} canUpgrade={canUpgrade} reason={reason} onUpgrade={onUpgrade} />
    </div>
  );
}
