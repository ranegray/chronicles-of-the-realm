import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
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

type Step = 0 | 1 | 2 | 3 | 4;

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

  const stepLabels = ["Name & Ancestry", "Class", "Abilities", "Kit", "Confirm"];

  return (
    <div className="screen creation-screen">
      <div className="creation-header">
        <h2>New Adventurer</h2>
        <div className="step-indicator">
          {stepLabels.map((s, i) => (
            <span key={s} className={`step ${i === step ? "step-active" : i < step ? "step-done" : ""}`}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="creation-step">
          <label className="field">
            <span>Name</span>
            <input
              className="text-input"
              value={draft.name}
              onChange={e => setName(e.target.value)}
              placeholder="A name worth remembering"
              maxLength={40}
            />
          </label>

          <Carousel
            label="Ancestry"
            index={ancestryIdx}
            count={ANCESTRIES.length}
            onPrev={() => setAncestryIdx((ancestryIdx - 1 + ANCESTRIES.length) % ANCESTRIES.length)}
            onNext={() => setAncestryIdx((ancestryIdx + 1) % ANCESTRIES.length)}
          >
            {(() => {
              const a = ANCESTRIES[ancestryIdx]!;
              const isSelected = draft.ancestryId === a.id;
              return (
                <Card
                  title={a.name}
                  subtitle={isSelected ? "Selected" : ""}
                  variant="warm"
                  selectable
                  selected={isSelected}
                  onClick={() => selectAncestry(a.id)}
                  footer={
                    <Button
                      variant={isSelected ? "secondary" : "primary"}
                      onClick={() => selectAncestry(a.id)}
                    >
                      {isSelected ? "Selected" : "Choose"}
                    </Button>
                  }
                >
                  <p>{a.description}</p>
                  <p><strong>{a.traitName}.</strong> {a.traitDescription}</p>
                  <BonusList bonuses={a.bonuses} />
                </Card>
              );
            })()}
          </Carousel>

          <div className="creation-actions">
            <Button onClick={() => setStep(1)} disabled={!draft.name.trim() || !draft.ancestryId}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="creation-step">
          <Carousel
            label="Class"
            index={classIdx}
            count={CLASSES.length}
            onPrev={() => setClassIdx((classIdx - 1 + CLASSES.length) % CLASSES.length)}
            onNext={() => setClassIdx((classIdx + 1) % CLASSES.length)}
          >
            {(() => {
              const c = CLASSES[classIdx]!;
              const isSelected = draft.classId === c.id;
              return (
                <Card
                  title={c.name}
                  subtitle={isSelected ? "Selected" : ""}
                  variant="warm"
                  selectable
                  selected={isSelected}
                  onClick={() => selectClass(c.id)}
                  footer={
                    <Button
                      variant={isSelected ? "secondary" : "primary"}
                      onClick={() => selectClass(c.id)}
                    >
                      {isSelected ? "Selected" : "Choose"}
                    </Button>
                  }
                >
                  <p>{c.description}</p>
                  <ul className="class-stats">
                    <li>Base HP: {c.baseHp}</li>
                    <li>Accuracy: +{c.baseAccuracy}</li>
                    <li>Armor: +{c.baseArmor}</li>
                    <li>Magic Bonus: +{c.magicBonus}</li>
                    <li>Preferred: {c.preferredAbilities.join(", ")}</li>
                  </ul>
                </Card>
              );
            })()}
          </Carousel>
          <div className="creation-actions">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)} disabled={!draft.classId}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="creation-step">
          <h3>Roll Abilities</h3>
          <p>4d6, drop the lowest. You may reroll up to {CHARACTER_CREATION.abilityRolls.rerollLimit} times.</p>
          <div className="rolled-scores">
            {draft.rolledScores.length === 0
              ? <em>Rolling…</em>
              : draft.rolledScores.map((v, i) => (<span key={i} className="score-chip">{v}</span>))}
          </div>
          <div className="creation-actions">
            <Button variant="ghost" onClick={reroll}
              disabled={draft.rerollsUsed >= CHARACTER_CREATION.abilityRolls.rerollLimit}>
              Reroll All ({CHARACTER_CREATION.abilityRolls.rerollLimit - draft.rerollsUsed} left)
            </Button>
            <Button variant="secondary" onClick={autoAssign} disabled={!draft.classId || draft.rolledScores.length === 0}>
              Auto-Assign for Class
            </Button>
          </div>

          <ManualAssignTable />

          <div className="creation-actions">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!draft.abilityScores}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && draft.classId && (
        <div className="creation-step">
          <h3>Choose a Starting Kit</h3>
          <div className="kit-grid">
            {getClass(draft.classId).starterKits.map(kit => {
              const selected = draft.starterKitId === kit.id;
              return (
                <Card
                  key={kit.id}
                  title={kit.name}
                  subtitle={selected ? "Selected" : ""}
                  variant="warm"
                  selectable
                  selected={selected}
                  onClick={() => selectKit(kit.id)}
                  footer={
                    <Button variant={selected ? "secondary" : "primary"} onClick={() => selectKit(kit.id)}>
                      {selected ? "Selected" : "Choose"}
                    </Button>
                  }
                >
                  <p>{kit.description}</p>
                  <ul className="kit-list">
                    {kit.itemTemplateIds.map(id => <li key={id}>{id.replace(/_/g, " ")}</li>)}
                  </ul>
                </Card>
              );
            })}
          </div>
          <div className="creation-actions">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)} disabled={!draft.starterKitId}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="creation-step">
          <h3>Confirm</h3>
          <ConfirmSummary />
          <div className="creation-actions">
            <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={() => finalize()} disabled={!CharacterCreationService.isReadyToFinalize(draft)}>
              Begin
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Carousel({
  label, index, count, onPrev, onNext, children
}: {
  label: string; index: number; count: number;
  onPrev: () => void; onNext: () => void; children: React.ReactNode;
}) {
  return (
    <div className="carousel">
      <div className="carousel-controls">
        <Button variant="ghost" onClick={onPrev}>‹ Prev</Button>
        <span className="carousel-label">{label} {index + 1} / {count}</span>
        <Button variant="ghost" onClick={onNext}>Next ›</Button>
      </div>
      <div className="carousel-body">{children}</div>
    </div>
  );
}

function BonusList({ bonuses }: { bonuses: Record<string, number | undefined> | object }) {
  const entries = Object.entries(bonuses as Record<string, number | undefined>).filter(([, v]) => v !== undefined && v !== 0);
  if (entries.length === 0) return null;
  return (
    <ul className="bonus-list">
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
    <div className="confirm-summary">
      <Card title={draft.name || "Unnamed"} subtitle={`${ancestry.name} ${cls.name}`}>
        <p><strong>Kit:</strong> {kit.name}</p>
        <p><strong>HP:</strong> {ds.maxHp} · <strong>Armor:</strong> {ds.armor} · <strong>Acc:</strong> +{ds.accuracy} · <strong>Eva:</strong> {ds.evasion}</p>
        <p><strong>Carry:</strong> {ds.carryCapacity} · <strong>Magic:</strong> {ds.magicPower} · <strong>Crit:</strong> {ds.critChance}%</p>
        <ul className="equipment-list">
          {items.map(i => <li key={i.instanceId}>{i.name}</li>)}
        </ul>
      </Card>
    </div>
  );
}
