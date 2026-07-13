import { Button } from "./Button";
import type { TalentNodeDefinition, TalentUnlockStatus } from "./v04UiTypes";
import "./TalentNodeCard.css";

const STATUS_LABELS: Record<TalentUnlockStatus, string> = {
  learned: "Learned",
  available: "Available",
  locked: "Locked"
};

export interface TalentNodeCardProps {
  talent: TalentNodeDefinition;
  status: TalentUnlockStatus;
  canLearn: boolean;
  reason?: string;
  onLearn: () => void;
}

export function TalentNodeCard({ talent, status, canLearn, reason, onLearn }: TalentNodeCardProps) {
  return (
    <article className={`deed-entry deed-entry-${status}`}>
      <header className="deed-entry-header">
        <div>
          <span className="deed-entry-kicker">Tier {talent.tier} · {talent.type}</span>
          <h3 className="deed-entry-name">{talent.name}</h3>
        </div>
        <span className="deed-entry-status" data-status={status}>{STATUS_LABELS[status]}</span>
      </header>
      <p className="deed-entry-desc">{talent.description}</p>
      <ul className="deed-entry-effects">
        {talent.effects.map((effect, index) => (
          <li key={`${talent.id}-effect-${index}`}>{effect.description}</li>
        ))}
      </ul>
      {(talent.requirements?.length ?? 0) > 0 && (
        <div className="deed-entry-reqs">
          <span>Requires</span>
          {talent.requirements!.map((requirement, index) => (
            <code key={`${talent.id}-req-${index}`}>
              {requirement.talentId ?? `Level ${requirement.minCharacterLevel ?? "?"}`}
            </code>
          ))}
        </div>
      )}
      <footer className="deed-entry-footer">
        <span className="deed-entry-cost">{talent.cost} TP</span>
        {status === "learned" ? (
          <span className="muted small">Known</span>
        ) : (
          <Button variant={canLearn ? "primary" : "ghost"} disabled={!canLearn} onClick={onLearn} title={reason}>
            Learn
          </Button>
        )}
      </footer>
      {!canLearn && status !== "learned" && reason && <p className="muted small deed-entry-reason">{reason}</p>}
    </article>
  );
}
