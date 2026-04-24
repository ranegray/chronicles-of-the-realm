import type { Quest, QuestChainDefinition, QuestChainState } from "../game/types";

export interface QuestChainPanelProps {
  chains: QuestChainState[];
  definitions: QuestChainDefinition[];
  quests: Quest[];
}

export function QuestChainPanel({ chains, definitions, quests }: QuestChainPanelProps) {
  if (chains.length === 0) return <div className="inv-empty">No quest chains discovered.</div>;
  return (
    <div className="quest-chain-panel">
      {chains.map(chain => {
        const def = definitions.find(entry => entry.id === chain.chainId);
        const step = def?.steps[chain.currentStepIndex];
        const quest = quests.find(entry => entry.id === chain.activeQuestId);
        return (
          <div className="quest-chain-card" key={chain.chainId}>
            <strong>{def?.title ?? chain.chainId}</strong>
            <div className="muted small">{chain.status}{step ? ` · ${step.title}` : ""}</div>
            {quest && <div className="muted small">Progress {quest.currentCount}/{quest.requiredCount} · {quest.status}</div>}
            <div className="chain-steps">
              {def?.steps.map(s => <span key={s.id} className={`chain-step ${chain.stepStatuses[s.id]}`}>{s.stepIndex + 1}</span>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
