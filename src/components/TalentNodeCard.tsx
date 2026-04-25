import { Button } from "./Button";
import type { TalentNodeDefinition, TalentUnlockStatus } from "./v04UiTypes";

export interface TalentNodeCardProps {
  talent: TalentNodeDefinition;
  status: TalentUnlockStatus;
  canLearn: boolean;
  reason?: string;
  onLearn: () => void;
}

export function TalentNodeCard({ talent, status, canLearn, reason, onLearn }: TalentNodeCardProps) {
  return (
    <article className={`talent-node-card talent-node-${status}`}>
      <header className="talent-node-header">
        <div>
          <span className="talent-node-kicker">Tier {talent.tier} · {talent.type}</span>
          <h3>{talent.name}</h3>
        </div>
        <span className="talent-node-cost">{talent.cost} TP</span>
      </header>
      <p>{talent.description}</p>
      <ul className="talent-node-effects">
        {talent.effects.map((effect, index) => (
          <li key={`${talent.id}-effect-${index}`}>{effect.description}</li>
        ))}
      </ul>
      {(talent.requirements?.length ?? 0) > 0 && (
        <div className="talent-node-reqs">
          <span>Requires</span>
          {talent.requirements!.map((requirement, index) => (
            <code key={`${talent.id}-req-${index}`}>
              {requirement.talentId ?? `Level ${requirement.minCharacterLevel ?? "?"}`}
            </code>
          ))}
        </div>
      )}
      <footer className="talent-node-footer">
        <span className={`talent-status talent-status-${status}`}>{status}</span>
        {status === "learned" ? (
          <span className="muted small">Known</span>
        ) : (
          <Button variant={canLearn ? "primary" : "ghost"} disabled={!canLearn} onClick={onLearn} title={reason}>
            Learn
          </Button>
        )}
      </footer>
      {!canLearn && status !== "learned" && reason && <p className="muted small">{reason}</p>}
    </article>
  );
}
