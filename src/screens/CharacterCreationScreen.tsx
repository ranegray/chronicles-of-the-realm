import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { useGameStore } from "../store/gameStore";
import { ANCESTRIES } from "../data/ancestries";
import { CLASSES } from "../data/classes";
import { ABILITY_NAMES, CHARACTER_CREATION } from "../game/constants";
import { CharacterCreationService } from "../game/characterCreation";
import { calculateDerivedStats } from "../game/characterMath";
import { getAncestry } from "../data/ancestries";
import { getClass } from "../data/classes";
import { instanceFromTemplateId } from "../game/inventory";
import { createRng } from "../game/rng";
import type { AbilityName, EquipmentSlots, ItemInstance } from "../game/types";
import "./CharacterCreationScreen.css";

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_TAGS = [
  "The Elder Asks",
  "Your Calling",
  "Taking Your Measure",
  "Provisioning",
  "The First Entry"
];

export function CharacterCreationScreen() {
  const draft = useGameStore(s => s.draft);
  const selectAncestry = useGameStore(s => s.draftSelectAncestry);
  const selectClass = useGameStore(s => s.draftSelectClass);
  const setName = useGameStore(s => s.draftSetName);
  const rollScores = useGameStore(s => s.draftRollScores);
  const reroll = useGameStore(s => s.draftRerollScores);
  const autoAssign = useGameStore(s => s.draftAutoAssign);
  const selectKit = useGameStore(s => s.draftSelectKit);
  const finalize = useGameStore(s => s.finalizeCharacter);

  const [step, setStep] = useState<Step>(0);
  const [ancestryIdx, setAncestryIdx] = useState(0);
  const [classIdx, setClassIdx] = useState(0);

  // Initialize first roll automatically when entering ability step
  useEffect(() => {
    if (step === 2 && draft && draft.rolledScores.length === 0) {
      rollScores();
    }
  }, [step, draft, rollScores]);

  if (!draft) return null;

  return (
    <div className="screen creation-screen creation-screen-prose">
      <div className="narrative-scroll">
        <div className="narrative-column">
          <span className="arrival-step-tag">{step + 1} of {STEP_TAGS.length} · {STEP_TAGS[step]}</span>

          {step === 0 && (
            <div className="creation-step">
              <h1 className="arrival-title">The Elder Asks</h1>
              <p className="arrival-prose">
                An old woman looks up from her ledger as you cross the threshold. She has seen
                enough strangers arrive at this gate to know better than to ask twice. "Well," she
                says. "Who are you, and what blood carries you?"
              </p>

              <label className="answer-field">
                <span className="answer-field-label">Your Name</span>
                <input
                  className="answer-input"
                  value={draft.name}
                  onChange={e => setName(e.target.value)}
                  placeholder="A name worth remembering"
                  maxLength={40}
                />
              </label>

              <NarrativeCarousel
                label="Bloodline"
                index={ancestryIdx}
                count={ANCESTRIES.length}
                onPrev={() => setAncestryIdx((ancestryIdx - 1 + ANCESTRIES.length) % ANCESTRIES.length)}
                onNext={() => setAncestryIdx((ancestryIdx + 1) % ANCESTRIES.length)}
              >
                {(() => {
                  const a = ANCESTRIES[ancestryIdx]!;
                  const isSelected = draft.ancestryId === a.id;
                  return (
                    <div
                      className={`narrative-choice-body${isSelected ? " narrative-choice-body-selected" : ""}`}
                      onClick={() => selectAncestry(a.id)}
                    >
                      <div className="narrative-choice-controls">
                        <h2 className="narrative-choice-name">{a.name}</h2>
                        {isSelected && <span className="choice-row-selected-tag">Chosen</span>}
                      </div>
                      <p>{a.description}</p>
                      <p className="narrative-choice-trait"><strong>{a.traitName}.</strong> {a.traitDescription}</p>
                      <BonusList bonuses={a.bonuses} />
                      <div className="narrative-choice-footer">
                        <Button
                          variant={isSelected ? "secondary" : "primary"}
                          onClick={() => selectAncestry(a.id)}
                        >
                          {isSelected ? "Chosen" : "Claim this bloodline"}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </NarrativeCarousel>

              <div className="arrival-actions">
                <Button onClick={() => setStep(1)} disabled={!draft.name.trim() || !draft.ancestryId}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="creation-step">
              <h1 className="arrival-title">Your Calling</h1>
              <p className="arrival-prose">
                "And what calling did you take up, before this?" the elder asks. "The village
                cares less for what you were than what you can still do."
              </p>

              <NarrativeCarousel
                label="Calling"
                index={classIdx}
                count={CLASSES.length}
                onPrev={() => setClassIdx((classIdx - 1 + CLASSES.length) % CLASSES.length)}
                onNext={() => setClassIdx((classIdx + 1) % CLASSES.length)}
              >
                {(() => {
                  const c = CLASSES[classIdx]!;
                  const isSelected = draft.classId === c.id;
                  return (
                    <div
                      className={`narrative-choice-body${isSelected ? " narrative-choice-body-selected" : ""}`}
                      onClick={() => selectClass(c.id)}
                    >
                      <div className="narrative-choice-controls">
                        <h2 className="narrative-choice-name">{c.name}</h2>
                        {isSelected && <span className="choice-row-selected-tag">Chosen</span>}
                      </div>
                      <p>{c.description}</p>
                      <ul className="narrative-choice-stats">
                        <li>Base HP: {c.baseHp}</li>
                        <li>Accuracy: +{c.baseAccuracy}</li>
                        <li>Armor: +{c.baseArmor}</li>
                        <li>Magic Bonus: +{c.magicBonus}</li>
                        <li>Preferred: {c.preferredAbilities.join(", ")}</li>
                      </ul>
                      <div className="narrative-choice-footer">
                        <Button
                          variant={isSelected ? "secondary" : "primary"}
                          onClick={() => selectClass(c.id)}
                        >
                          {isSelected ? "Chosen" : "Take up this calling"}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </NarrativeCarousel>

              <div className="arrival-actions">
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={() => setStep(2)} disabled={!draft.classId}>Continue</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="creation-step">
              <h1 className="arrival-title">Taking Your Measure</h1>
              <p className="arrival-prose">
                The elder walks a slow circle around you, the way a buyer walks a circle around a
                horse. 4d6, drop the lowest. You may reroll up to {CHARACTER_CREATION.abilityRolls.rerollLimit} times
                before she stops humoring you.
              </p>

              <div className="measure-block">
                <div className="measure-scores">
                  {draft.rolledScores.length === 0
                    ? <em>Taking your measure…</em>
                    : draft.rolledScores.map((v, i) => (<span key={i} className="score-chip">{v}</span>))}
                </div>
                <div className="measure-actions">
                  <Button variant="ghost" onClick={reroll}
                    disabled={draft.rerollsUsed >= CHARACTER_CREATION.abilityRolls.rerollLimit}>
                    Reroll All ({CHARACTER_CREATION.abilityRolls.rerollLimit - draft.rerollsUsed} left)
                  </Button>
                  <Button variant="secondary" onClick={autoAssign} disabled={!draft.classId || draft.rolledScores.length === 0}>
                    Auto-Assign for Class
                  </Button>
                </div>

                <ManualAssignTable />
              </div>

              <div className="arrival-actions">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={!draft.abilityScores}>Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && draft.classId && (
            <div className="creation-step">
              <h1 className="arrival-title">Provisioning</h1>
              <p className="arrival-prose">
                The quartermaster lays a few kits across the counter, worn but serviceable.
                "Pick what suits you," she says. "It won't be all you carry, but it's what you
                start with."
              </p>

              <ul className="choice-list">
                {getClass(draft.classId).starterKits.map(kit => {
                  const selected = draft.starterKitId === kit.id;
                  return (
                    <li key={kit.id}>
                      <button
                        type="button"
                        className={`choice-row${selected ? " choice-row-selected" : ""}`}
                        onClick={() => selectKit(kit.id)}
                      >
                        <div className="choice-row-head">
                          <span className="choice-row-name">{kit.name}</span>
                          {selected && <span className="choice-row-selected-tag">Chosen</span>}
                        </div>
                        <p className="choice-row-desc">{kit.description}</p>
                        <ul className="choice-row-items">
                          {kit.itemTemplateIds.map(id => <li key={id}>{id.replace(/_/g, " ")}</li>)}
                        </ul>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="arrival-actions">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => setStep(4)} disabled={!draft.starterKitId}>Continue</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="creation-step">
              <h1 className="arrival-title">The First Entry</h1>
              <p className="arrival-prose">
                The elder closes her ledger on a fresh page and slides it across to you. This is
                where your chronicle begins.
              </p>
              <ConfirmSummary />
              <div className="arrival-actions">
                <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={() => finalize()} disabled={!CharacterCreationService.isReadyToFinalize(draft)}>
                  Begin
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NarrativeCarousel({
  label, index, count, onPrev, onNext, children
}: {
  label: string; index: number; count: number;
  onPrev: () => void; onNext: () => void; children: React.ReactNode;
}) {
  return (
    <div className="narrative-choice">
      <div className="narrative-choice-controls">
        <Button variant="ghost" onClick={onPrev}>‹ Prev</Button>
        <span className="narrative-choice-label">{label} {index + 1} / {count}</span>
        <Button variant="ghost" onClick={onNext}>Next ›</Button>
      </div>
      <div>{children}</div>
    </div>
  );
}

function BonusList({ bonuses }: { bonuses: Record<string, number | undefined> | object }) {
  const entries = Object.entries(bonuses as Record<string, number | undefined>).filter(([, v]) => v !== undefined && v !== 0);
  if (entries.length === 0) return null;
  return (
    <ul className="narrative-choice-bonuses">
      {entries.map(([k, v]) => (<li key={k}>{k}: {(v as number) > 0 ? `+${v}` : v}</li>))}
    </ul>
  );
}

function ManualAssignTable() {
  const draft = useGameStore(s => s.draft)!;
  const setManual = (ability: AbilityName, value: number) => {
    const current = draft.abilityScores ?? buildBlankScores();
    const next = { ...current, [ability]: value };
    useGameStore.setState({ draft: { ...draft, abilityScores: next } });
  };
  const used = useMemo(() => {
    if (!draft.abilityScores) return [];
    const counts: Record<number, number> = {};
    for (const a of ABILITY_NAMES) {
      const v = draft.abilityScores![a];
      if (typeof v === "number") counts[v] = (counts[v] ?? 0) + 1;
    }
    return counts;
  }, [draft.abilityScores]);

  if (draft.rolledScores.length === 0) return null;
  return (
    <table className="assign-table">
      <thead>
        <tr><th>Ability</th><th>Score</th></tr>
      </thead>
      <tbody>
        {ABILITY_NAMES.map(a => (
          <tr key={a}>
            <td style={{ textTransform: "capitalize" }}>{a}</td>
            <td>
              <select
                value={draft.abilityScores?.[a] ?? ""}
                onChange={e => setManual(a, Number(e.target.value))}
              >
                <option value="">—</option>
                {draft.rolledScores.map((v, i) => {
                  const usedCount = used[v] ?? 0;
                  const occurrences = draft.rolledScores.filter(x => x === v).length;
                  const disabled = usedCount >= occurrences && draft.abilityScores?.[a] !== v;
                  return (
                    <option key={i} value={v} disabled={disabled}>{v}</option>
                  );
                })}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildBlankScores() {
  return ABILITY_NAMES.reduce((acc, a) => { acc[a] = 10; return acc; }, {} as Record<AbilityName, number>);
}

function ConfirmSummary() {
  const draft = useGameStore(s => s.draft)!;
  if (!draft.ancestryId || !draft.classId || !draft.abilityScores || !draft.starterKitId) return null;
  const ancestry = getAncestry(draft.ancestryId);
  const cls = getClass(draft.classId);
  const kit = cls.starterKits.find(k => k.id === draft.starterKitId)!;
  const rng = createRng("preview:" + draft.name);
  const items: ItemInstance[] = kit.itemTemplateIds.map(id => instanceFromTemplateId(id, rng, 1));
  const equipped: EquipmentSlots = {};
  for (const item of items) {
    if (item.category === "weapon" && !equipped.weapon) equipped.weapon = item;
    else if (item.category === "shield" && !equipped.offhand) equipped.offhand = item;
    else if (item.category === "armor" && !equipped.armor) equipped.armor = item;
    else if (item.category === "trinket") {
      if (!equipped.trinket1) equipped.trinket1 = item;
      else if (!equipped.trinket2) equipped.trinket2 = item;
    }
  }
  const ds = calculateDerivedStats(draft.abilityScores, ancestry, cls, equipped);
  return (
    <div className="chronicle-entry">
      <h2 className="chronicle-entry-name">{draft.name || "Unnamed"}</h2>
      <p className="chronicle-entry-sub">{ancestry.name} {cls.name} · {kit.name}</p>
      <p className="chronicle-entry-stats">
        <strong>HP:</strong> {ds.maxHp} · <strong>Armor:</strong> {ds.armor} · <strong>Acc:</strong> +{ds.accuracy} · <strong>Eva:</strong> {ds.evasion}
      </p>
      <p className="chronicle-entry-stats">
        <strong>Carry:</strong> {ds.carryCapacity} · <strong>Magic:</strong> {ds.magicPower} · <strong>Crit:</strong> {ds.critChance}%
      </p>
      <ul className="chronicle-entry-items">
        {items.map(i => <li key={i.instanceId}>{i.name}</li>)}
      </ul>
    </div>
  );
}
