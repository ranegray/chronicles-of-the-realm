import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { useGameStore } from "../store/gameStore";
import type { EnemyInstance } from "../game/types";

export function CombatScreen() {
  const combat = useGameStore(s => s.state.activeCombat);
  const player = useGameStore(s => s.state.player);
  const run = useGameStore(s => s.state.activeRun);
  const performAction = useGameStore(s => s.performCombatAction);
  const performAutoCombat = useGameStore(s => s.performAutoCombat);
  const closeVictory = useGameStore(s => s.closeCombatVictory);
  const closeFlee = useGameStore(s => s.closeCombatFlee);
  const [showItems, setShowItems] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const logRef = useRef<HTMLUListElement | null>(null);
  const logLength = combat?.log.length ?? 0;

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logLength]);

  if (!combat || !player) return <div className="screen">No active fight.</div>;

  const livingEnemies = combat.enemies.filter(e => e.hp > 0);
  const selectedTargetId = (targetId && livingEnemies.some(e => e.instanceId === targetId))
    ? targetId
    : livingEnemies[0]?.instanceId ?? null;
  const selectedTarget = livingEnemies.find(e => e.instanceId === selectedTargetId) ?? null;
  const carriedConsumables = run?.raidInventory.items.filter(i => i.category === "consumable") ?? [];
  const hpPct = Math.round((player.hp / player.maxHp) * 100);

  return (
    <div className="screen combat-screen">
      <header className="combat-header">
        <div className="combat-header-title">
          <span className="combat-header-eyebrow">Combat</span>
          <h2>Turn {combat.turn}</h2>
        </div>
        <div className="combat-header-state">
          {combat.over && combat.outcome === "victory" && <span className="good">Victory</span>}
          {combat.over && combat.outcome === "fled" && <span className="warn">Withdrew</span>}
          {combat.over && combat.outcome === "defeat" && <span className="danger">Defeated</span>}
        </div>
      </header>

      <section className="combat-stage">
        <div className="combat-enemy-row">
          {combat.enemies.map(enemy => (
            <EnemyPortrait
              key={enemy.instanceId}
              enemy={enemy}
              selected={enemy.instanceId === selectedTargetId}
              interactive={!combat.over && enemy.hp > 0}
              onSelect={() => setTargetId(enemy.instanceId)}
            />
          ))}
        </div>

        <div className="combat-player">
          <div className="combat-player-head">
            <strong>{player.name}</strong>
            {combat.playerDefending && <span className="combat-chip combat-chip-warn">Defending</span>}
          </div>
          <HpBar current={player.hp} max={player.maxHp} labelOverride={`${player.hp} / ${player.maxHp}`} />
          <div className="combat-player-stats muted small" title="Accuracy · Evasion · Armor">
            Acc +{player.derivedStats.accuracy} · Eva {player.derivedStats.evasion} · Armor {player.derivedStats.armor}
            {hpPct <= 25 && <span className="danger"> · Bloodied</span>}
          </div>
        </div>
      </section>

      <section className="combat-log-panel" aria-live="polite">
        <ul className="combat-log" ref={logRef}>
          {combat.log.slice(-50).map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      </section>

      <footer className="combat-actions-bar">
        {!combat.over && (
          <>
            <Button
              className="btn-hero combat-action-primary"
              disabled={!selectedTarget}
              onClick={() => selectedTarget && performAction({ kind: "attack", targetId: selectedTarget.instanceId })}
            >
              Attack{selectedTarget ? ` · ${selectedTarget.name}` : ""}
            </Button>
            <Button
              variant="secondary"
              disabled={!selectedTarget}
              onClick={() => selectedTarget && performAction({ kind: "powerAttack", targetId: selectedTarget.instanceId })}
            >Power Strike</Button>
            <Button variant="secondary" onClick={() => performAction({ kind: "defend" })}>Defend</Button>
            <Button variant="ghost" onClick={performAutoCombat}>Auto</Button>
            <Button variant="ghost" onClick={() => setShowItems(s => !s)}>{showItems ? "Hide Items" : "Items"}</Button>
            <Button variant="danger" onClick={() => performAction({ kind: "flee" })}>Flee</Button>
          </>
        )}
        {combat.over && combat.outcome === "victory" && (
          <Button className="btn-hero" onClick={closeVictory}>Continue</Button>
        )}
        {combat.over && combat.outcome === "fled" && (
          <Button onClick={closeFlee}>Withdraw</Button>
        )}
        {combat.over && combat.outcome === "defeat" && (
          <p className="muted">The dungeon takes its dues.</p>
        )}
      </footer>

      {showItems && !combat.over && (
        <aside className="combat-items-tray">
          <div className="combat-items-head">
            <strong>Use Item</strong>
            <button type="button" className="delve-hero-reset" onClick={() => setShowItems(false)}>Close</button>
          </div>
          {carriedConsumables.length === 0 ? (
            <em className="muted">No consumables in your raid pack.</em>
          ) : (
            <ul className="combat-items-list">
              {carriedConsumables.map(it => (
                <li key={it.instanceId}>
                  <Button variant="secondary" onClick={() => {
                    performAction({ kind: "useItem", itemInstanceId: it.instanceId });
                    setShowItems(false);
                  }}>{it.name}{it.quantity > 1 ? ` ×${it.quantity}` : ""}</Button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}

function EnemyPortrait({
  enemy,
  selected,
  interactive,
  onSelect
}: {
  enemy: EnemyInstance;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
}) {
  const dead = enemy.hp <= 0;
  const className = [
    "combat-enemy",
    selected && !dead ? "combat-enemy-selected" : "",
    dead ? "combat-enemy-dead" : ""
  ].filter(Boolean).join(" ");
  const tip = `${enemy.name} · HP ${enemy.hp}/${enemy.maxHp} · Evasion ${enemy.evasion} · Armor ${enemy.armor}`;
  const Tag = interactive ? "button" : "div";
  return (
    <Tag
      type={interactive ? "button" : undefined}
      className={className}
      onClick={interactive ? onSelect : undefined}
      title={tip}
    >
      <div className="combat-enemy-name">{enemy.name}</div>
      <HpBar current={enemy.hp} max={enemy.maxHp} compact />
      <div className="combat-enemy-foot muted small">Eva {enemy.evasion} · Arm {enemy.armor}</div>
    </Tag>
  );
}

function HpBar({
  current,
  max,
  compact,
  labelOverride
}: {
  current: number;
  max: number;
  compact?: boolean;
  labelOverride?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
  const className = ["hp-bar", compact ? "hp-bar-compact" : "", pct <= 25 ? "hp-bar-low" : pct <= 50 ? "hp-bar-mid" : ""].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
      <span className="hp-bar-label">{labelOverride ?? `${current} / ${max}`}</span>
    </div>
  );
}
