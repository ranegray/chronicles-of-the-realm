import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useGameStore } from "../store/gameStore";
import { getLightState } from "../game/delve/lamp";
import { getThreatLevelFromPoints } from "../game/threat";
import { THREAT_RULES } from "../game/constants";
import { calculateInventoryWeight } from "../game/inventory";
import { useStaggeredReveal } from "../components/useStaggeredReveal";
import { buildChoiceList, type DelveChoice } from "./delveChoices";
import type { DelveAction } from "../game/delve/types";
import "./pacing.css";

const NARRATIVE_REVEAL_INTERVAL_MS = 90;
const DIM_TAIL_COUNT = 6;
const TERMINAL_PAUSE_MS = 1400;

export function DelveScreen() {
  const run = useGameStore(s => s.state.delveRun);
  const player = useGameStore(s => s.state.player);
  const pack = useGameStore(s => s.state.delveRaidPack);
  const performAction = useGameStore(s => s.performDelveAction);
  const resolveDelveRunEnd = useGameStore(s => s.resolveDelveRunEnd);
  const abandon = useGameStore(s => s.abandonDelveRun);

  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const totalEntries = run?.narrative.length ?? 0;
  const { revealed, isRevealing, skip } = useStaggeredReveal(totalEntries, NARRATIVE_REVEAL_INTERVAL_MS);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [revealed]);

  // Terminal statuses (extracted/died) stay on screen just long enough to
  // read the closing line, then hand off to the v0.4 run-summary flow.
  useEffect(() => {
    if (!run || run.status === "active") return;
    const t = window.setTimeout(() => resolveDelveRunEnd(), TERMINAL_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [run?.status, run?.actionCount, resolveDelveRunEnd]);

  const choices = useMemo(() => (run ? buildChoiceList(run) : []), [run]);

  if (!run || !player) return <div className="screen">No active delve.</div>;

  const lightState = getLightState(run.lamp);
  const alertnessLevel = getThreatLevelFromPoints(run.alertness);
  const alertnessLabel = THREAT_RULES.thresholds.find(t => t.level === alertnessLevel)?.label ?? "Quiet";
  const carriedWeight = pack ? calculateInventoryWeight(pack) : 0;
  const carryCapacity = player.derivedStats.carryCapacity;
  const hpPct = player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0;
  const oilPct = run.lamp.capacity > 0 ? Math.round((run.lamp.oil / run.lamp.capacity) * 100) : 0;
  const isOver = run.status !== "active";

  const visibleNarrative = run.narrative.slice(0, revealed);
  const dimBefore = Math.max(0, visibleNarrative.length - DIM_TAIL_COUNT);

  function dispatch(action: DelveAction) {
    if (isRevealing || isOver) return;
    performAction(action);
  }

  return (
    <div
      className={`screen delve-screen delve-screen-${lightState}`}
      onClick={() => isRevealing && skip()}
    >
      {player.hp / player.maxHp <= 0.25 && <div className="low-hp-vignette" aria-hidden="true" />}

      <header className="delve-status-strip">
        <div className="delve-status-hp">
          <span className="delve-status-label">HP</span>
          <div className="hp-bar hp-bar-compact" style={{ width: 140 }}>
            <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
            <span className="hp-bar-label">{player.hp} / {player.maxHp}</span>
          </div>
        </div>
        <div className={`delve-lamp delve-lamp-${lightState}`} title={`Lamp: ${lightState}`}>
          <span className="delve-lamp-glyph" aria-hidden="true" />
          <span className="delve-lamp-value">{run.lamp.oil}/{run.lamp.capacity}</span>
          {run.lamp.flasksPacked > 0 && (
            <span className="muted small">· {run.lamp.flasksPacked} flask{run.lamp.flasksPacked > 1 ? "s" : ""}</span>
          )}
        </div>
        <span className="delve-status-chip"><em>Pack</em> {carriedWeight}/{carryCapacity}</span>
        <span className={`delve-status-chip delve-alertness delve-alertness-${alertnessLevel}`}>
          <em>Alertness</em> {alertnessLabel}
        </span>
        <Button variant="danger" className="delve-abandon-btn" onClick={() => setShowAbandonConfirm(true)}>
          Abandon
        </Button>
      </header>

      {showAbandonConfirm && (
        <ConfirmDialog
          title="Abandon the delve"
          body="What you carry stays behind. The Warrens keep what they are given."
          confirmLabel="Leave it all"
          cancelLabel="Stay"
          danger
          onConfirm={() => { setShowAbandonConfirm(false); abandon(); }}
          onCancel={() => setShowAbandonConfirm(false)}
        />
      )}

      <div className="narrative-scroll" ref={scrollRef}>
        <div className="narrative-column delve-column">
          {visibleNarrative.map((entry, i) => (
            <p
              key={entry.id}
              className={[
                "delve-entry",
                `delve-entry-${entry.kind}`,
                "delve-entry-in",
                i < dimBefore ? "delve-entry-dim" : ""
              ].filter(Boolean).join(" ")}
            >
              {entry.text}
            </p>
          ))}

          {!isOver && !isRevealing && (
            <div className="delve-choices" onClick={event => event.stopPropagation()}>
              {choices.map(choice => (
                <ChoiceButton key={choiceKey(choice)} choice={choice} dispatch={dispatch} />
              ))}
              {choices.length === 0 && (
                <p className="muted small">Nothing to do here but wait, and waiting is its own kind of noise.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function choiceKey(choice: DelveChoice): string {
  switch (choice.kind) {
    case "encounterOption": return `enc:${choice.optionKind}`;
    case "fightStance": return `stance:${choice.stance}`;
    case "move": return `move:${choice.direction}`;
    case "crank": return `crank:${choice.extractId}`;
    case "extract": return `extract:${choice.extractId}`;
    case "descend": return `descend:${choice.stairRoomId}`;
    default: return choice.kind;
  }
}

function ChoiceButton({ choice, dispatch }: { choice: DelveChoice; dispatch: (action: DelveAction) => void }) {
  switch (choice.kind) {
    case "encounterOption":
      return (
        <Button
          variant={choice.available ? "secondary" : "ghost"}
          disabled={!choice.available}
          title={choice.unavailableReason}
          onClick={() => dispatch({ type: "encounterOption", kind: choice.optionKind })}
        >
          {choice.label}
        </Button>
      );
    case "fightStance":
      return (
        <Button
          className="btn-hero"
          onClick={() => dispatch({ type: "fightBeat", stance: choice.stance })}
        >
          {choice.label}
        </Button>
      );
    case "takeAllLoot":
      return <Button onClick={() => dispatch({ type: "takeAllLoot" })}>{choice.label}</Button>;
    case "leaveLoot":
      return <Button variant="ghost" onClick={() => dispatch({ type: "leaveLoot" })}>{choice.label}</Button>;
    case "move":
      return (
        <button
          type="button"
          className="passage-choice delve-passage-choice"
          onClick={() => dispatch({ type: "move", direction: choice.direction })}
        >
          {choice.label}
        </button>
      );
    case "search":
      return <Button variant="secondary" onClick={() => dispatch({ type: "search" })}>{choice.label}</Button>;
    case "listen":
      return <Button variant="ghost" onClick={() => dispatch({ type: "listen" })}>{choice.label}</Button>;
    case "refillLamp":
      return <Button variant="secondary" onClick={() => dispatch({ type: "refillLamp" })}>{choice.label}</Button>;
    case "consultMap":
      return <Button variant="ghost" onClick={() => dispatch({ type: "consultMap" })}>{choice.label}</Button>;
    case "crank":
      return <Button variant="secondary" onClick={() => dispatch({ type: "crank", extractId: choice.extractId })}>{choice.label}</Button>;
    case "extract":
      return <Button className="btn-hero" onClick={() => dispatch({ type: "extract", extractId: choice.extractId })}>{choice.label}</Button>;
    case "descend":
      return <Button variant="secondary" onClick={() => dispatch({ type: "descend", stairRoomId: choice.stairRoomId })}>{choice.label}</Button>;
    default:
      return null;
  }
}
