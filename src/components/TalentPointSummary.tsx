import type { Character } from "../game/types";
import type { CharacterWithProgression } from "./v04UiTypes";

interface TalentPointSummaryProps {
  character: Character;
}

export function TalentPointSummary({ character }: TalentPointSummaryProps) {
  const progression = (character as CharacterWithProgression).progression;
  const unspent = progression?.unspentTalentPoints ?? Math.max(0, character.level - 1);
  const spent = progression?.spentTalentPoints ?? progression?.learnedTalentIds.length ?? 0;
  const active = progression?.activeCombatActionIds.length ?? 0;

  return (
    <div className="talent-point-summary">
      <SummaryCell label="Unspent" value={unspent} tone={unspent > 0 ? "good" : "muted"} />
      <SummaryCell label="Spent" value={spent} />
      <SummaryCell label="Actions" value={`${active}/3`} />
    </div>
  );
}

function SummaryCell({ label, value, tone }: { label: string; value: number | string; tone?: "good" | "muted" }) {
  return (
    <div className="talent-point-cell">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}
