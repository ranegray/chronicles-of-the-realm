import { useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useGameStore } from "../store/gameStore";

export function CombatScreen() {
  const combat = useGameStore(s => s.state.activeCombat);
  const player = useGameStore(s => s.state.player);
  const run = useGameStore(s => s.state.activeRun);
  const performAction = useGameStore(s => s.performCombatAction);
  const performAutoCombat = useGameStore(s => s.performAutoCombat);
  const closeVictory = useGameStore(s => s.closeCombatVictory);
  const closeFlee = useGameStore(s => s.closeCombatFlee);
  const [showItems, setShowItems] = useState(false);

  if (!combat || !player) return <div className="screen">No active fight.</div>;

  const livingEnemies = combat.enemies.filter(e => e.hp > 0);
  const carriedConsumables = run?.raidInventory.items.filter(i => i.category === "consumable") ?? [];

  return (
    <div className="screen combat-screen">
      <header className="combat-header">
        <h2>Combat — Turn {combat.turn}</h2>
      </header>
      <div className="combat-body">
        <Card title={`${player.name}`} subtitle={`HP ${player.hp} / ${player.maxHp}`}>
          <p className="muted">Acc +{player.derivedStats.accuracy} · Eva {player.derivedStats.evasion} · Armor {player.derivedStats.armor}</p>
          {combat.playerDefending && <p className="warn">Defending: incoming damage reduced.</p>}
        </Card>

        <Card title="Foes">
          <ul className="enemy-list">
            {combat.enemies.map(e => (
              <li key={e.instanceId} className={e.hp <= 0 ? "enemy-dead" : ""}>
                <strong>{e.name}</strong> — HP {e.hp} / {e.maxHp} · Eva {e.evasion} · Armor {e.armor}
                {e.hp > 0 && !combat.over && (
                  <Button variant="ghost" onClick={() => performAction({ kind: "attack", targetId: e.instanceId })}>Attack</Button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Combat Log">
          <ul className="combat-log" aria-live="polite">
            {combat.log.slice(-12).map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </Card>

        <div className="combat-actions">
          {!combat.over && (
            <>
              {livingEnemies[0] && (
                <Button onClick={() => performAction({ kind: "attack", targetId: livingEnemies[0]!.instanceId })}>
                  Attack {livingEnemies[0]!.name}
                </Button>
              )}
              {livingEnemies[0] && (
                <Button variant="secondary" onClick={() => performAction({ kind: "powerAttack", targetId: livingEnemies[0]!.instanceId })}>
                  Power Strike
                </Button>
              )}
              <Button variant="secondary" onClick={() => performAction({ kind: "defend" })}>Defend</Button>
              <Button variant="secondary" onClick={performAutoCombat}>Auto</Button>
              <Button variant="ghost" onClick={() => setShowItems(s => !s)}>Use Item</Button>
              <Button variant="danger" onClick={() => performAction({ kind: "flee" })}>Flee</Button>
            </>
          )}
          {combat.over && combat.outcome === "victory" && (
            <Button onClick={closeVictory}>Continue</Button>
          )}
          {combat.over && combat.outcome === "fled" && (
            <Button onClick={closeFlee}>Withdraw</Button>
          )}
          {combat.over && combat.outcome === "defeat" && (
            <p>The dungeon takes its dues.</p>
          )}
        </div>

        {showItems && (
          <Card title="Items">
            {carriedConsumables.length === 0 && <em>No consumables in your raid pack.</em>}
            <ul className="item-use-list">
              {carriedConsumables.map(it => (
                <li key={it.instanceId}>
                  <Button variant="ghost" onClick={() => {
                    performAction({ kind: "useItem", itemInstanceId: it.instanceId });
                    setShowItems(false);
                  }}>{it.name}{it.quantity > 1 ? ` ×${it.quantity}` : ""}</Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
