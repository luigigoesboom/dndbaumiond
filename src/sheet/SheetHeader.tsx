import { useId, useState } from 'react';
import { ABILITIES, longRest, shortRest, spendHitDie } from '../../shared/rules.ts';
import { LINEAGE_TERM, RULESETS, RULESET_LABEL, type Ruleset } from '../../shared/srd.ts';
import { applyBackground, applyClass, applyLineage, syncSlots } from '../../shared/srdApply.ts';
import { BackIcon, CampfireIcon, MoonIcon } from '../icons.tsx';
import { useRoll } from '../roll/RollContext.tsx';
import { Field, NumberInput, Tally, TextInput } from './fields.tsx';
import { fieldSetter, type SheetProps } from './types.ts';
import type { SaveStatus } from './useAutosave.ts';

const CUSTOM = '__custom';

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved: server unreachable',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)).toUpperCase();
}

export function SheetHeader({
  c,
  update,
  catalog,
  status,
  onBack,
}: SheetProps & { status: SaveStatus; onBack: () => void }) {
  const set = fieldSetter(update);
  const { rollDice } = useRoll();
  const [panel, setPanel] = useState<'none' | 'manage' | 'short-rest'>('none');
  const manageId = useId();
  const restId = useId();
  const term = LINEAGE_TERM[c.ruleset];

  const cls = catalog?.classes.find((x) => x.index === c.srd.class);
  const lineage = catalog?.lineages.find((x) => x.index === c.srd.lineage);
  const toggle = (p: typeof panel) => setPanel((cur) => (cur === p ? 'none' : p));

  function pickClass(index: string) {
    const picked = catalog?.classes.find((x) => x.index === index);
    update((prev) => (picked ? applyClass(prev, picked) : { ...prev, srd: { ...prev.srd, class: null } }));
  }
  function pickLineage(index: string) {
    const picked = catalog?.lineages.find((x) => x.index === index);
    update((prev) =>
      picked ? applyLineage(prev, picked, null) : { ...prev, srd: { ...prev.srd, lineage: null, subLineage: null } },
    );
  }
  function pickSub(index: string) {
    if (lineage) update((prev) => applyLineage(prev, lineage, index || null));
  }
  function pickBackground(index: string) {
    const picked = catalog?.backgrounds.find((x) => x.index === index);
    update((prev) => (picked ? applyBackground(prev, picked) : { ...prev, srd: { ...prev.srd, background: null } }));
  }
  function setLevel(level: number) {
    const clamped = Math.min(20, Math.max(1, level || 1));
    update((prev) => syncSlots({ ...prev, level: clamped }, catalog?.classes.find((x) => x.index === prev.srd.class)));
  }
  function setRuleset(ruleset: Ruleset) {
    // SRD indices differ between rulesets; keep the names, drop the links.
    update((prev) => ({ ...prev, ruleset, srd: { class: null, lineage: null, subLineage: null, background: null } }));
  }
  function rollHitDie() {
    const result = rollDice('Hit die', `1d${c.hitDice.die}`, 'heal');
    if (result) update((prev) => spendHitDie(prev, result.total));
  }
  function takeLongRest() {
    if (window.confirm('Take a long rest? HP, spell slots and half your hit dice come back.')) update(longRest);
  }

  const hitDiceLeft = c.level - Math.min(c.hitDice.spent, c.level);

  return (
    <header className="sheet-header">
      <div className="sheet-bar">
        <button type="button" className="icon-button back" onClick={onBack} aria-label="All characters" title="All characters">
          <BackIcon />
        </button>
        <div className="portrait" aria-hidden="true">
          {initials(c.name)}
        </div>
        <div className="identity">
          <div className="identity-row">
            <TextInput className="char-name" value={c.name} onChange={set('name')} aria-label="Character name" />
            <button
              type="button"
              className="chip-button"
              aria-expanded={panel === 'manage'}
              aria-controls={manageId}
              onClick={() => toggle('manage')}
            >
              Manage
            </button>
          </div>
          <p className="char-line">
            {[c.subrace || c.race, c.className, c.subclass && `(${c.subclass})`].filter(Boolean).join(' ') || 'No class yet'}
            <span className="ruleset-tag">{RULESET_LABEL[c.ruleset]}</span>
          </p>
          <p className="char-level">
            Level {c.level}
            <span className={`save-status ${status}`} role="status">
              {STATUS_TEXT[status]}
            </span>
          </p>
        </div>
        <div className="bar-actions">
          <button
            type="button"
            className="bar-button"
            aria-expanded={panel === 'short-rest'}
            aria-controls={restId}
            onClick={() => toggle('short-rest')}
          >
            <CampfireIcon /> Short rest
          </button>
          <button type="button" className="bar-button" onClick={takeLongRest}>
            <MoonIcon /> Long rest
          </button>
        </div>
      </div>

      <div id={restId} className="drawer rest-drawer" hidden={panel !== 'short-rest'}>
        <h2 className="drawer-title">Short rest</h2>
        <p className="hint">
          Spend hit dice to heal: each one rolls d{c.hitDice.die} + your Constitution modifier. Then finish the rest to
          recharge short-rest resources.
        </p>
        <div className="rest-row">
          <Tally
            total={c.level}
            spent={Math.min(c.hitDice.spent, c.level)}
            onChange={(spent) => update((prev) => ({ ...prev, hitDice: { ...prev.hitDice, spent } }))}
            label="Hit dice spent"
          />
          <span className="hint">
            {hitDiceLeft} of {c.level} left
          </span>
          <button type="button" className="solid-button heal" onClick={rollHitDie} disabled={hitDiceLeft === 0}>
            Roll a hit die
          </button>
        </div>
        {c.resources.some((r) => r.recharge === 'short') && (
          <div className="rest-row">
            <span className="hint">
              Recharges: {c.resources.filter((r) => r.recharge === 'short').map((r) => r.name).join(', ')}
            </span>
          </div>
        )}
        <div className="rest-row">
          <button
            type="button"
            className="solid-button"
            onClick={() => {
              update(shortRest);
              setPanel('none');
            }}
          >
            Finish short rest
          </button>
        </div>
      </div>

      <div id={manageId} className="drawer" hidden={panel !== 'manage'}>
        <h2 className="drawer-title">Manage character</h2>
        <div className="details-grid">
          <Field label="Rules">
            <select value={c.ruleset} onChange={(e) => setRuleset(e.target.value as Ruleset)}>
              {RULESETS.map((r) => (
                <option key={r} value={r}>
                  {RULESET_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select value={c.srd.class ?? CUSTOM} onChange={(e) => pickClass(e.target.value)} disabled={!catalog}>
              <optgroup label="SRD">
                {catalog?.classes
                  .filter((x) => !x.custom)
                  .map((x) => (
                    <option key={x.index} value={x.index}>
                      {x.name}
                    </option>
                  ))}
              </optgroup>
              {catalog?.classes.some((x) => x.custom) && (
                <optgroup label="Your classes">
                  {catalog.classes
                    .filter((x) => x.custom)
                    .map((x) => (
                      <option key={x.index} value={x.index}>
                        {x.name}
                      </option>
                    ))}
                </optgroup>
              )}
              <option value={CUSTOM}>Custom name only…</option>
            </select>
          </Field>
          {!cls && (
            <Field label="Class name">
              <TextInput value={c.className} onChange={set('className')} placeholder="e.g. Blood Hunter" />
            </Field>
          )}
          <Field label="Subclass">
            <TextInput value={c.subclass} onChange={set('subclass')} />
          </Field>
          <Field label="Level" className="narrow">
            <NumberInput min={1} max={20} value={c.level} onChange={setLevel} />
          </Field>
          <Field label={term}>
            <select value={c.srd.lineage ?? CUSTOM} onChange={(e) => pickLineage(e.target.value)} disabled={!catalog}>
              {catalog?.lineages.map((x) => (
                <option key={x.index} value={x.index}>
                  {x.name}
                </option>
              ))}
              <option value={CUSTOM}>Custom…</option>
            </select>
          </Field>
          {lineage ? (
            lineage.subs.length > 0 && (
              <Field label={c.ruleset === '2014' ? 'Subrace' : 'Lineage'}>
                <select value={c.srd.subLineage ?? ''} onChange={(e) => pickSub(e.target.value)}>
                  <option value="">None</option>
                  {lineage.subs.map((s) => (
                    <option key={s.index} value={s.index}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            )
          ) : (
            <Field label={`${term} name`}>
              <TextInput value={c.race} onChange={set('race')} />
            </Field>
          )}
          <Field label="Background">
            <select value={c.srd.background ?? CUSTOM} onChange={(e) => pickBackground(e.target.value)} disabled={!catalog}>
              {catalog?.backgrounds.map((x) => (
                <option key={x.index} value={x.index}>
                  {x.name}
                </option>
              ))}
              <option value={CUSTOM}>Custom…</option>
            </select>
          </Field>
          {!c.srd.background && (
            <Field label="Background name">
              <TextInput value={c.background} onChange={set('background')} />
            </Field>
          )}
          <Field label="Alignment">
            <select value={c.alignment} onChange={(e) => set('alignment')(e.target.value)}>
              <option value="">—</option>
              {ALIGNMENTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Experience" className="narrow">
            <NumberInput min={0} value={c.xp} onChange={set('xp')} />
          </Field>
        </div>
        <fieldset className="bonus-row">
          <legend>Ability bonuses on top of the base score ({term.toLowerCase()}, background, feats)</legend>
          {ABILITIES.map((a) => (
            <Field key={a} label={a.toUpperCase()} className="narrow">
              <NumberInput
                value={c.abilityBonuses[a]}
                onChange={(v) => update((prev) => ({ ...prev, abilityBonuses: { ...prev.abilityBonuses, [a]: v } }))}
              />
            </Field>
          ))}
        </fieldset>
        <p className="hint">
          Picking a class fills in saves, hit die, spell slots, resources, speed and skills. Everything stays editable.
          Homebrew or book classes: add them under <a href="#/classes">Custom classes</a>.
        </p>
      </div>
    </header>
  );
}
