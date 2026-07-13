import type { Character } from "../game/types";
import { ABILITY_NAMES } from "../game/constants";
import type { AbilityName } from "../game/types";
import "./StatBlock.css";

interface Props {
  character: Character;
}

export function StatBlock({ character }: Props) {
  const ds = character.derivedStats;
  return (
    <div className="stat-ledger">
      <div className="stat-ledger-prominent">
        <StatEntry label="HP" tip="Current health. At zero, the run ends and carried gear is lost." value={`${character.hp} / ${character.maxHp}`} prominent />
        <StatEntry label="Armor" tip="Reduces incoming hit damage after an enemy connects." value={ds.armor} prominent />
        <StatEntry label="Accuracy" tip="Added to attack rolls against enemy evasion." value={`+${ds.accuracy}`} prominent />
        <StatEntry label="Evasion" tip="Enemy attacks must meet or beat this value to hit." value={ds.evasion} prominent />
        <StatEntry label="Carry" tip="Maximum raid-pack weight before you must leave loot behind." value={ds.carryCapacity} prominent />
      </div>

      <div className="stat-ledger-grid">
        <StatEntry label="Crit %" tip="Critical-hit bonus from gear and traits." value={`${ds.critChance}%`} />
        <StatEntry label="Magic" tip="Power for magical gear and future spell effects." value={ds.magicPower} />
        <StatEntry label="Trap Sense" tip="Added to trap checks when entering trapped rooms." value={ds.trapSense} />
        {ABILITY_NAMES.map(a => (
          <StatEntry key={a} label={a} tip={ABILITY_TIPS[a]} value={character.abilityScores[a]} capitalize />
        ))}
      </div>
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

function StatEntry({ label, tip, value, capitalize, prominent }: {
  label: string;
  tip: string;
  value: string | number;
  capitalize?: boolean;
  prominent?: boolean;
}) {
  return (
    <div className={`stat-entry${prominent ? " stat-entry-prominent" : ""}`}>
      <span
        className="stat-entry-label"
        style={capitalize ? { textTransform: "capitalize" } : undefined}
        title={tip}
      >
        {label}
      </span>
      <strong className="stat-entry-value">{value}</strong>
    </div>
  );
}
