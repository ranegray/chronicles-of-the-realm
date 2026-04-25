import { TalentNodeCard } from "./TalentNodeCard";
import { canLearnTalent, getTalentStatus } from "../game/talents";
import type {
  TalentTreePanelProps,
} from "./v04UiTypes";

export function TalentTreePanel({ character, tree, village, onLearnTalent }: TalentTreePanelProps) {
  const tiers = [...new Set(tree.nodes.map(node => node.tier))].sort((a, b) => a - b);

  return (
    <section className="talent-tree-panel">
      <header className="talent-tree-head">
        <div>
          <h2>{tree.name}</h2>
          <p className="muted">{tree.description}</p>
        </div>
      </header>
      <div className="talent-tier-stack">
        {tiers.map(tier => (
          <section key={tier} className="talent-tier">
            <h3>Tier {tier}</h3>
            <div className="talent-tier-grid">
              {tree.nodes.filter(node => node.tier === tier).map(node => {
                const status = getTalentStatus({ character, talent: node, village });
                const learn = canLearnTalent({ character, talentId: node.id, village });
                return (
                  <TalentNodeCard
                    key={node.id}
                    talent={node}
                    status={status}
                    canLearn={learn.canLearn}
                    reason={learn.reason}
                    onLearn={() => onLearnTalent(node.id)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
