import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { TalentPointSummary } from "../components/TalentPointSummary";
import { TalentTreePanel } from "../components/TalentTreePanel";
import type { Character, VillageState } from "../game/types";
import { getTalentTreeForClass } from "../game/talents";

interface TalentScreenProps {
  character: Character;
  village?: VillageState;
  onLearnTalent: (talentId: string) => void;
  onRefundTalents: () => void;
  onClose?: () => void;
}

export function TalentScreen({ character, village, onLearnTalent, onRefundTalents, onClose }: TalentScreenProps) {
  const tree = getTalentTreeForClass(character.classId);
  return (
    <div className="talent-screen">
      <header className="talent-screen-header">
        <div>
          <span className="muted small">{formatLabel(character.classId)} progression</span>
          <h1>Talents</h1>
        </div>
        <div className="talent-screen-actions">
          <TalentPointSummary character={character} />
          <Button variant="ghost" onClick={onRefundTalents}>Refund</Button>
          {onClose && <Button variant="secondary" onClick={onClose}>Back</Button>}
        </div>
      </header>
      <Card title={tree.name} subtitle="Small class tree for v0.4 build identity">
        <TalentTreePanel
          character={character}
          tree={tree}
          village={village}
          onLearnTalent={onLearnTalent}
        />
      </Card>
    </div>
  );
}

function formatLabel(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}
