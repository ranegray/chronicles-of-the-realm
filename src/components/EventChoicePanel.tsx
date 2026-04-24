import type {
  ActiveRoomEvent,
  Character,
  DungeonRun,
  EventChoice,
  RoomEventDefinition
} from "../game/types";
import { Button } from "./Button";
import { checkChoiceRequirements } from "../game/roomEvents";

export interface EventChoicePanelProps {
  event: ActiveRoomEvent;
  definition: RoomEventDefinition;
  character: Character;
  run: DungeonRun;
  onChoose: (choiceId: string) => void;
}

export function EventChoicePanel({
  event,
  definition,
  character,
  run,
  onChoose
}: EventChoicePanelProps) {
  if (event.resolved) {
    return (
      <section className="event-panel event-panel-resolved" aria-label="Event resolved">
        <header className="event-panel-header">
          <h3>{definition.title}</h3>
          <p className="muted small">Event resolved.</p>
        </header>
        {event.resultMessage && <p className="msg">{event.resultMessage}</p>}
      </section>
    );
  }

  return (
    <section className="event-panel" aria-label={`Event: ${definition.title}`}>
      <header className="event-panel-header">
        <h3>{definition.title}</h3>
      </header>
      <p className="event-panel-description">{definition.description}</p>
      <ul className="event-panel-choices">
        {definition.choices.map(choice => (
          <ChoiceButton
            key={choice.id}
            choice={choice}
            character={character}
            run={run}
            onChoose={onChoose}
          />
        ))}
      </ul>
    </section>
  );
}

function ChoiceButton({
  choice,
  character,
  run,
  onChoose
}: {
  choice: EventChoice;
  character: Character;
  run: DungeonRun;
  onChoose: (choiceId: string) => void;
}) {
  const gate = checkChoiceRequirements({ choice, character, run });
  const hint = formatChoiceHint(choice);
  return (
    <li className={gate.allowed ? "event-choice" : "event-choice event-choice-locked"}>
      <Button
        onClick={() => onChoose(choice.id)}
        variant={gate.allowed ? "secondary" : "ghost"}
      >
        <strong>{choice.label}</strong>
        <span className="event-choice-desc">{choice.description}</span>
        {hint && <span className="muted small">{hint}</span>}
        {!gate.allowed && gate.reason && (
          <span className="warn small">{gate.reason}</span>
        )}
      </Button>
    </li>
  );
}

function formatChoiceHint(choice: EventChoice): string | undefined {
  const parts: string[] = [];
  if (choice.statCheck) {
    parts.push(
      `${capitalize(choice.statCheck.ability)} ${choice.statCheck.difficulty}+`
    );
  }
  if (choice.requirements && choice.requirements.length > 0) {
    for (const req of choice.requirements) {
      if (req.type === "hasGold") parts.push(`Costs ${req.value} gold`);
      if (req.type === "hasItem") parts.push(`Needs ${String(req.value ?? req.key)}`);
      if (req.type === "class") parts.push(`${req.value}-only`);
      if (req.type === "ancestry") parts.push(`${req.value}-only`);
      if (req.type === "minAbility") parts.push(`${req.key} ${req.value}+`);
      if (req.type === "minThreat") parts.push(`Threat ≥ ${req.value}`);
      if (req.type === "maxThreat") parts.push(`Threat ≤ ${req.value}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
