import { Button } from "../components/Button";
import { TalentPointSummary } from "../components/TalentPointSummary";
import { TalentTreePanel } from "../components/TalentTreePanel";
import type { Character, VillageState } from "../game/types";
import { getTalentTreeForClass } from "../game/talents";
import "./TalentScreen.css";

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
    <div className="learned-deeds">
      <header className="learned-deeds-header">
        <div>
          <span className="muted small">{formatLabel(character.classId)} · {tree.name}</span>
          <p className="learned-deeds-desc">{tree.description}</p>
        </div>
        <div className="learned-deeds-actions">
          <TalentPointSummary character={character} />
          <Button variant="ghost" onClick={onRefundTalents}>Unlearn All</Button>
          {onClose && <Button variant="secondary" onClick={onClose}>Back</Button>}
        </div>
      </header>
      <TalentTreePanel
        character={character}
        tree={tree}
        village={village}
        onLearnTalent={onLearnTalent}
      />
    </div>
  );
}

function formatLabel(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}
