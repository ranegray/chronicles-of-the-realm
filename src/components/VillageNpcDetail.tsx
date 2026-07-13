import { ServiceUpgradeCard } from "./ServiceUpgradeCard";
import type { ServiceLevelDefinition, VillageNpc } from "../game/types";
import { getRelationshipLabel } from "../game/villageProgression";
import "./VillageNpcDetail.css";

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
      <p className="village-npc-detail-prose">{npc.description}</p>
      <p className="village-npc-detail-standing muted small">
        {getRelationshipLabel(npc.relationship)}{currentLevel ? ` · ${currentLevel.title}` : ""} · service standing {npc.service.xp}
      </p>
      <ServiceUpgradeCard npc={npc} nextLevel={nextLevel} canUpgrade={canUpgrade} reason={reason} onUpgrade={onUpgrade} />
    </div>
  );
}
