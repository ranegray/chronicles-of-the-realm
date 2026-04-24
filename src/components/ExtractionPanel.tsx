import type {
  Character,
  DungeonRoom,
  DungeonRun,
  ExtractionPoint
} from "../game/types";
import { Button } from "./Button";
import { canAttemptExtraction, getExtractionWeightLimit } from "../game/extraction";
import { calculateInventoryWeight } from "../game/inventory";
import { EXTRACTION_RULES } from "../game/constants";
import { getThreatModifiers } from "../game/threat";

export interface ExtractionPanelProps {
  run: DungeonRun;
  character: Character;
  room: DungeonRoom;
  onActivate: () => void;
  onContinue: () => void;
}

const VARIANT_LABEL: Record<string, string> = {
  stable: "Stable",
  delayed: "Delayed",
  guarded: "Guarded",
  unstable: "Unstable",
  burdened: "Burdened"
};

export function ExtractionPanel({
  run,
  character,
  room,
  onActivate,
  onContinue
}: ExtractionPanelProps) {
  const extraction = room.extraction;
  if (!extraction) return null;

  if (extraction.state === "completed") {
    return (
      <section className="extraction-panel extraction-resolved">
        <header><h3>{extraction.title}</h3></header>
        <p className="msg">{extraction.successText}</p>
      </section>
    );
  }

  const gate = canAttemptExtraction({ run, character, room });
  const charging = extraction.state === "charging" || (extraction.turnsRemaining ?? 0) > 0;

  return (
    <section className={`extraction-panel extraction-${extraction.variant}`}>
      <header className="extraction-panel-header">
        <h3>{extraction.title}</h3>
        <span className="muted small">{VARIANT_LABEL[extraction.variant] ?? extraction.variant}</span>
      </header>
      <p className="extraction-panel-description">{extraction.description}</p>

      <VariantDetail
        extraction={extraction}
        run={run}
        character={character}
      />

      {!gate.canAttempt && gate.reason && (
        <p className="warn small">{gate.reason}</p>
      )}

      <div className="extraction-panel-actions">
        {charging ? (
          <Button onClick={onContinue}>
            Continue Extraction
            {extraction.turnsRemaining !== undefined &&
              <span className="muted small"> ({extraction.turnsRemaining} left)</span>}
          </Button>
        ) : (
          <Button onClick={onActivate} disabled={!gate.canAttempt}>
            {activationLabel(extraction)}
          </Button>
        )}
      </div>
    </section>
  );
}

function VariantDetail({
  extraction,
  run,
  character
}: {
  extraction: ExtractionPoint;
  run: DungeonRun;
  character: Character;
}) {
  switch (extraction.variant) {
    case "stable":
      return <p className="muted small">Step through when ready. No complications expected.</p>;
    case "delayed": {
      const turns = extraction.turnsRemaining ?? extraction.requiredTurns ?? EXTRACTION_RULES.delayed.minTurns;
      const ambush = Math.min(100, Math.round(
        (EXTRACTION_RULES.delayed.ambushChancePerTurn + getThreatModifiers(run.threat.level).ambushChance) * 100
      ));
      return (
        <ul className="extraction-stats">
          <li>Turns needed: <strong>{turns}</strong></li>
          <li>Ambush chance per turn: <strong>{ambush}%</strong></li>
        </ul>
      );
    }
    case "guarded":
      return (
        <p className="warn small">
          {extraction.guardDefeated
            ? "The guard is down. The way is clear."
            : "A guard stands between you and freedom — engaging the extraction will start combat."}
        </p>
      );
    case "unstable": {
      const base = extraction.baseComplicationChance ?? EXTRACTION_RULES.unstable.baseComplicationChance;
      const threatBonus = getThreatModifiers(run.threat.level).extractionComplicationChance;
      const raw = base + threatBonus;
      const capped = Math.min(EXTRACTION_RULES.unstable.maxComplicationChance, raw);
      return (
        <ul className="extraction-stats">
          <li>Complication chance: <strong>{Math.round(capped * 100)}%</strong></li>
          <li className="muted small">Scales with current threat ({run.threat.level}).</li>
        </ul>
      );
    }
    case "burdened": {
      const limit = getExtractionWeightLimit({ character, extraction });
      const weight = calculateInventoryWeight(run.raidInventory);
      return (
        <ul className="extraction-stats">
          <li>
            Pack weight: <strong>{weight}</strong> / {limit} allowed
            {weight > limit && <span className="warn"> — over the limit</span>}
          </li>
        </ul>
      );
    }
  }
}

function activationLabel(extraction: ExtractionPoint): string {
  if (extraction.variant === "guarded" && !extraction.guardDefeated) return "Engage the Guard";
  if (extraction.variant === "delayed") return "Start Extraction";
  if (extraction.variant === "unstable") return "Attempt Extraction";
  return "Extract";
}
