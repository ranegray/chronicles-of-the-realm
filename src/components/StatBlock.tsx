import type { Character } from "../game/types";
import { ABILITY_NAMES } from "../game/constants";
import type { AbilityName } from "../game/types";

interface Props {
  character: Character;
}

export function StatBlock({ character }: Props) {
  const ds = character.derivedStats;
  return (
    <div className="stat-block">
      <div className="stat-row">
        <StatLabel label="HP" tip="Current health. At zero, the run ends and carried gear is lost." /><strong>{character.hp} / {character.maxHp}</strong>
      </div>
      <div className="stat-row"><StatLabel label="Armor" tip="Reduces incoming hit damage after an enemy connects." /><strong>{ds.armor}</strong></div>
      <div className="stat-row"><StatLabel label="Accuracy" tip="Added to attack rolls against enemy evasion." /><strong>+{ds.accuracy}</strong></div>
      <div className="stat-row"><StatLabel label="Evasion" tip="Enemy attacks must meet or beat this value to hit." /><strong>{ds.evasion}</strong></div>
      <div className="stat-row"><StatLabel label="Crit %" tip="Critical-hit bonus from gear and traits." /><strong>{ds.critChance}%</strong></div>
      <div className="stat-row"><StatLabel label="Carry" tip="Maximum raid-pack weight before you must leave loot behind." /><strong>{ds.carryCapacity}</strong></div>
      <div className="stat-row"><StatLabel label="Magic" tip="Power for magical gear and future spell effects." /><strong>{ds.magicPower}</strong></div>
      <div className="stat-row"><StatLabel label="Trap Sense" tip="Added to trap checks when entering trapped rooms." /><strong>{ds.trapSense}</strong></div>
      <div className="stat-divider" />
      {ABILITY_NAMES.map(a => (
        <div className="stat-row" key={a}>
          <StatLabel label={a} tip={ABILITY_TIPS[a]} capitalize />
          <strong>{character.abilityScores[a]}</strong>
        </div>
      ))}
    </div>
  );
}

const ABILITY_TIPS: Record<AbilityName, string> = {
  might: "Improves melee impact and carry capacity.",
  agility: "Improves evasion, trap sense, and some flee checks.",
  endurance: "Improves max HP and carry capacity.",
  intellect: "Improves magic power and trap sense.",
  will: "Feeds class and item effects tied to resolve.",
  presence: "Feeds social and future leadership effects."
};

function StatLabel({ label, tip, capitalize }: { label: string; tip: string; capitalize?: boolean }) {
  return (
    <span
      className="stat-label-help"
      style={capitalize ? { textTransform: "capitalize" } : undefined}
      title={tip}
    >
      {label}
    </span>
  );
}
