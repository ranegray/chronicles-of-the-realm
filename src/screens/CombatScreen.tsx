import { useEffect, useRef, useState } from "react";
import { ActiveActionBar } from "../components/ActiveActionBar";
import { Button } from "../components/Button";
import { useGameStore } from "../store/gameStore";
import type { EnemyInstance } from "../game/types";
import { canUseCombatAction, getAvailableCombatActions } from "../game/combatActions";
import type { ActiveCombatActionView } from "../components/v04UiTypes";

type Fx =
  | { id: string; kind: "enemy-hit"; targetId: string; amount: number }
  | { id: string; kind: "player-hit"; amount: number }
  | { id: string; kind: "player-heal"; amount: number };

let fxCounter = 0;
const nextFxId = () => `fx_${++fxCounter}`;

export function CombatScreen() {
  const combat = useGameStore(s => s.state.activeCombat);
  const player = useGameStore(s => s.state.player);
  const run = useGameStore(s => s.state.activeRun);
  const performAction = useGameStore(s => s.performCombatAction);
  const useCombatAction = useGameStore(s => s.useCombatAction);
  const performAutoCombat = useGameStore(s => s.performAutoCombat);
  const closeVictory = useGameStore(s => s.closeCombatVictory);
  const closeFlee = useGameStore(s => s.closeCombatFlee);
  const [showItems, setShowItems] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const logRef = useRef<HTMLUListElement | null>(null);
  const logLength = combat?.log.length ?? 0;

  const [fx, setFx] = useState<Fx[]>([]);
  const lastHp = useRef<{ player: number | null; enemies: Record<string, number> }>({
    player: null,
    enemies: {}
  });

  // HP signature drives the diff effect. We rebuild it every render and only fire
  // the effect when something actually changed; the comparison itself happens
  // inside the effect (against `lastHp` ref), so animations are sourced from
  // state, not from log-string regex.
  const hpSig = combat && player
    ? `${player.hp}|${combat.enemies.map(e => `${e.instanceId}:${e.hp}`).join(",")}`
    : "";

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logLength]);

  useEffect(() => {
    if (!combat || !player) return;

    // First observation in a new fight: just record baselines, don't animate.
    if (lastHp.current.player === null) {
      lastHp.current = {
        player: player.hp,
        enemies: Object.fromEntries(combat.enemies.map(e => [e.instanceId, e.hp]))
      };
      return;
    }

    const nextFx: Fx[] = [];

    // Player HP delta
    if (player.hp < lastHp.current.player) {
      nextFx.push({
        id: nextFxId(),
        kind: "player-hit",
        amount: lastHp.current.player - player.hp
      });
    } else if (player.hp > lastHp.current.player) {
      nextFx.push({
        id: nextFxId(),
        kind: "player-heal",
        amount: player.hp - lastHp.current.player
      });
    }

    // Enemy HP deltas
    for (const enemy of combat.enemies) {
      const prev = lastHp.current.enemies[enemy.instanceId];
      if (prev !== undefined && enemy.hp < prev) {
        nextFx.push({
          id: nextFxId(),
          kind: "enemy-hit",
          targetId: enemy.instanceId,
          amount: prev - enemy.hp
        });
      }
    }

    if (nextFx.length > 0) {
      setFx(curr => [...curr, ...nextFx]);
      const ids = new Set(nextFx.map(f => f.id));
      window.setTimeout(() => {
        setFx(curr => curr.filter(f => !ids.has(f.id)));
      }, 1000);
    }

    lastHp.current = {
      player: player.hp,
      enemies: Object.fromEntries(combat.enemies.map(e => [e.instanceId, e.hp]))
    };
  }, [hpSig, combat, player]);

  // Reset baselines when there is no active fight, so the next encounter
  // re-initializes cleanly.
  useEffect(() => {
    if (!combat) {
      lastHp.current = { player: null, enemies: {} };
      setFx([]);
    }
  }, [combat]);

  if (!combat || !player) return <div className="screen">No active fight.</div>;

  const livingEnemies = combat.enemies.filter(e => e.hp > 0);
  const selectedTargetId = (targetId && livingEnemies.some(e => e.instanceId === targetId))
    ? targetId
    : livingEnemies[0]?.instanceId ?? null;
  const selectedTarget = livingEnemies.find(e => e.instanceId === selectedTargetId) ?? null;
  const carriedConsumables = run?.raidInventory.items.filter(i => i.category === "consumable") ?? [];
  const hpPct = Math.round((player.hp / player.maxHp) * 100);

  const playerImpact = fx.find(f => f.kind === "player-hit") as Extract<Fx, { kind: "player-hit" }> | undefined;
  const playerHeal = fx.find(f => f.kind === "player-heal") as Extract<Fx, { kind: "player-heal" }> | undefined;
  const enemyHitsBy = (id: string) =>
    fx.filter((f): f is Extract<Fx, { kind: "enemy-hit" }> => f.kind === "enemy-hit" && f.targetId === id);
  const lowHp = player.hp / player.maxHp <= 0.25;
  const classActions = getUnlockedClassActions(player, combat, Boolean(selectedTarget));

  return (
    <>
      {lowHp && <div className="low-hp-vignette" aria-hidden="true" />}
      {playerImpact && (
        <div key={`flash-${playerImpact.id}`} className="combat-screen-flash" aria-hidden="true" />
      )}
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
                hits={enemyHitsBy(enemy.instanceId)}
              />
            ))}
          </div>

          <div className={`combat-player ${playerImpact ? "combat-player-impact" : ""}`}>
            <div className="combat-player-head">
              <strong>{player.name}</strong>
              {combat.playerDefending && <span className="combat-chip combat-chip-warn">Defending</span>}
            </div>
            <HpBar
              current={player.hp}
              max={player.maxHp}
              labelOverride={`${player.hp} / ${player.maxHp}`}
              shaking={Boolean(playerImpact)}
            />
            <div className="combat-player-stats muted small" title="Accuracy · Evasion · Armor">
              Acc +{player.derivedStats.accuracy} · Eva {player.derivedStats.evasion} · Armor {player.derivedStats.armor}
              {hpPct <= 25 && <span className="danger"> · Bloodied</span>}
            </div>
            {playerImpact && (
              <span key={playerImpact.id} className="damage-float damage-float-player damage-float-damage">
                −{playerImpact.amount}
              </span>
            )}
            {playerHeal && (
              <span key={playerHeal.id} className="damage-float damage-float-player damage-float-heal">
                +{playerHeal.amount}
              </span>
            )}
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
              <ActiveActionBar
                actions={classActions}
                combatState={combat}
                onUseAction={actionId => useCombatAction(actionId, selectedTarget?.instanceId)}
              />
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
    </>
  );
}

function getUnlockedClassActions(
  player: NonNullable<ReturnType<typeof useGameStore.getState>["state"]["player"]>,
  combat: NonNullable<ReturnType<typeof useGameStore.getState>["state"]["activeCombat"]>,
  hasTarget: boolean
): ActiveCombatActionView[] {
  return getAvailableCombatActions({ character: player, combatState: combat })
    .filter(action => Boolean(action.requiredTalentId))
    .map(action => {
      const needsTarget = action.target === "singleEnemy" || action.target === "allEnemies";
      const runtime = combat.actionRuntimeState?.find(state => state.actionId === action.id);
      const useCheck = canUseCombatAction({ character: player, combatState: combat, actionId: action.id });
      return {
        ...action,
        disabled: !useCheck.canUse || (needsTarget && !hasTarget),
        disabledReason: needsTarget && !hasTarget ? "Choose a living target." : useCheck.reason,
        remainingCooldown: runtime?.remainingCooldown,
        usedThisCombat: runtime?.usedThisCombat
      };
    });
}

function EnemyPortrait({
  enemy,
  selected,
  interactive,
  onSelect,
  hits
}: {
  enemy: EnemyInstance;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  hits: Array<{ id: string; amount: number }>;
}) {
  const dead = enemy.hp <= 0;
  const className = [
    "combat-enemy",
    selected && !dead ? "combat-enemy-selected" : "",
    dead ? "combat-enemy-dead" : "",
    hits.length > 0 ? "combat-enemy-hit" : ""
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
      {hits.map(h => (
        <span key={h.id} className="damage-float damage-float-damage">−{h.amount}</span>
      ))}
    </Tag>
  );
}

function HpBar({
  current,
  max,
  compact,
  labelOverride,
  shaking
}: {
  current: number;
  max: number;
  compact?: boolean;
  labelOverride?: string;
  shaking?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
  const className = [
    "hp-bar",
    compact ? "hp-bar-compact" : "",
    pct <= 25 ? "hp-bar-low" : pct <= 50 ? "hp-bar-mid" : "",
    shaking ? "hp-bar-recoil" : ""
  ].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
      <span className="hp-bar-label">{labelOverride ?? `${current} / ${max}`}</span>
    </div>
  );
}
