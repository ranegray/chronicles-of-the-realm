import { BuildSummaryPanel } from "../components/BuildSummaryPanel";
import { LoadoutBuilder } from "../components/LoadoutBuilder";
import { StatBlock } from "../components/StatBlock";
import { useGameStore } from "../store/gameStore";
import { TalentScreen } from "./TalentScreen";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";
import { generateBuildSummary } from "../game/buildMath";
import { getXpRequiredForLevel } from "../game/characterProgression";
import { CHARACTER_PROGRESSION_RULES } from "../game/constants";
import type { Character, CharacterLevel, VillageState } from "../game/types";
import "./CharacterScreen.css";

const ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth",
  "Ninth", "Tenth", "Eleventh", "Twelfth"
];

export function CharacterScreen() {
  const player = useGameStore(s => s.state.player);
  const village = useGameStore(s => s.state.village);
  const runSummaries = useGameStore(s => s.state.runSummaries);
  const learnTalent = useGameStore(s => s.learnTalent);
  const refundTalents = useGameStore(s => s.refundTalents);

  if (!player) return <div className="screen">No character.</div>;

  const hpPct = Math.round((player.hp / player.maxHp) * 100);
  const summary = generateBuildSummary({
    character: player,
    ancestry: getAncestry(player.ancestryId),
    classDefinition: getClass(player.classId)
  });
  const entry = composeChronicleEntry(player, village, runSummaries.length,
    runSummaries.filter(r => r.reason === "dead").length);

  return (
    <div className="screen character-screen character-screen-prose">
      <div className="narrative-scroll">
        <div className="narrative-column">
          <span className="chronicle-eyebrow">{entry.eyebrow}</span>
          <h1 className="chronicle-name">{player.name}</h1>
          <p className="chronicle-lede">{entry.lede}</p>

          <div className="chronicle-hp-row">
            <div className={`hp-bar ${hpPct <= 25 ? "hp-bar-low" : hpPct <= 50 ? "hp-bar-mid" : ""}`} style={{ maxWidth: 320 }}>
              <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
              <span className="hp-bar-label">HP {player.hp} / {player.maxHp}</span>
            </div>
          </div>

          <section className="chronicle-section" aria-label="Your measure">
            <h2 className="chronicle-section-heading">Your Measure</h2>
            <StatBlock character={player} />
            <BuildSummaryPanel summary={summary} />
          </section>

          <section className="chronicle-section" aria-label="What you wear">
            <h2 className="chronicle-section-heading">What You Wear</h2>
            <p className="chronicle-section-note muted small">Safe in the village.</p>
            <LoadoutBuilder character={player} readOnly activeRun={false} />
          </section>

          <section className="chronicle-section" aria-label="What you have learned">
            <h2 className="chronicle-section-heading">What You Have Learned</h2>
            <TalentScreen
              character={player}
              village={village}
              onLearnTalent={learnTalent}
              onRefundTalents={refundTalents}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function ordinal(level: number): string {
  return ORDINALS[level - 1] ?? `${level}th`;
}

function composeChronicleEntry(
  player: Character,
  village: VillageState | undefined,
  delveCount: number,
  deathCount: number
): { eyebrow: string; lede: string } {
  const ancestryName = getAncestry(player.ancestryId).name;
  const className = getClass(player.classId).name;
  const atMaxLevel = player.level >= CHARACTER_PROGRESSION_RULES.maxLevel;
  const xpToNext = atMaxLevel
    ? undefined
    : getXpRequiredForLevel((player.level + 1) as CharacterLevel);

  const eyebrow = village
    ? `${ordinal(player.level)} season in ${village.name}`
    : `${ordinal(player.level)} season`;

  const sentences: string[] = [];
  sentences.push(`${ancestryName} ${className.toLowerCase()}.`);

  if (delveCount === 0) {
    sentences.push("The chronicle has yet to record a delve.");
  } else {
    const delveWord = delveCount === 1 ? "delve" : "delves";
    const deathClause = deathCount > 0
      ? `, ${deathCount} death${deathCount === 1 ? "" : "s"} weathered`
      : "";
    sentences.push(`The chronicle records ${delveCount} ${delveWord}${deathClause}.`);
  }

  if (xpToNext === undefined) {
    sentences.push("The measure is full; the chronicle has nothing further to ask of you.");
  } else {
    sentences.push(`${player.xp} of ${xpToNext} experience toward the next season.`);
  }

  if (village && village.renown > 0) {
    sentences.push(`Renown ${village.renown} among its people.`);
  }

  return { eyebrow, lede: sentences.join(" ") };
}
