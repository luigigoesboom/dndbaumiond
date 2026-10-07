import { zeroAbilities } from '../../shared/character.ts';
import { ABILITIES, type Ability } from '../../shared/rules.ts';
import { LINEAGE_TERM, RULESETS, RULESET_LABEL, type Ruleset } from '../../shared/srd.ts';
import { applyBackground, applyClass, applyLineage, clearLineage, syncSlots } from '../../shared/srdApply.ts';
import { Field, NumberInput, TextInput } from './fields.tsx';
import { fieldSetter, type SheetProps } from './types.ts';

const CUSTOM = '__custom';

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

/** The "Manage" drawer: ruleset, SRD / custom pickers, level, alignment, XP and ability bonuses. */
export function ManageDrawer({ c, update, catalog, id, hidden }: SheetProps & { id: string; hidden: boolean }) {
  const set = fieldSetter(update);
  const term = LINEAGE_TERM[c.ruleset];

  // A link to something no longer in the catalog (e.g. a deleted custom class) counts as custom.
  const cls = catalog?.classes.find((x) => x.index === c.srd.class);
  const lineage = catalog?.lineages.find((x) => x.index === c.srd.lineage);
  const background = catalog?.backgrounds.find((x) => x.index === c.srd.background);

  function pickClass(index: string) {
    const picked = catalog?.classes.find((x) => x.index === index);
    update((prev) => (picked ? applyClass(prev, picked) : { ...prev, srd: { ...prev.srd, class: null } }));
  }
  function pickLineage(index: string) {
    const picked = catalog?.lineages.find((x) => x.index === index);
    update((prev) => (picked ? applyLineage(prev, picked, null, lineage) : clearLineage(prev, lineage)));
  }
  function pickSub(index: string) {
    if (lineage) update((prev) => applyLineage(prev, lineage, index || null, lineage));
  }
  function pickBackground(index: string) {
    const picked = catalog?.backgrounds.find((x) => x.index === index) ?? null;
    update((prev) => applyBackground(prev, picked, background));
  }
  function setLevel(level: number) {
    update((prev) => syncSlots({ ...prev, level }, catalog?.classes.find((x) => x.index === prev.srd.class)));
  }
  function setRuleset(ruleset: Ruleset) {
    // SRD indices differ between rulesets: keep the names, drop the links and the race bonuses they set.
    update((prev) => ({
      ...prev,
      ruleset,
      srd: { class: null, lineage: null, subLineage: null, background: null },
      raceBonuses: zeroAbilities(),
    }));
  }
  const setBonus = (field: 'raceBonuses' | 'abilityBonuses', a: Ability) => (v: number) =>
    update((prev) => ({ ...prev, [field]: { ...prev[field], [a]: v } }));


  return (
    <div id={id} className="drawer" hidden={hidden}>
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
          <select value={cls?.index ?? CUSTOM} onChange={(e) => pickClass(e.target.value)} disabled={!catalog}>
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
          <NumberInput min={1} max={20} value={c.level} onChange={setLevel} commit="blur" />
        </Field>
        <Field label={term}>
          <select value={lineage?.index ?? CUSTOM} onChange={(e) => pickLineage(e.target.value)} disabled={!catalog}>
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
          <select value={background?.index ?? CUSTOM} onChange={(e) => pickBackground(e.target.value)} disabled={!catalog}>
            {catalog?.backgrounds.map((x) => (
              <option key={x.index} value={x.index}>
                {x.name}
              </option>
            ))}
            <option value={CUSTOM}>Custom…</option>
          </select>
        </Field>
        {!background && (
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
        <legend>
          {c.ruleset === '2014' ? `From your ${term.toLowerCase()} (set by the picker)` : 'From your species (2024 species give no ability bonuses)'}
        </legend>
        {ABILITIES.map((a) => (
          <Field key={a} label={a.toUpperCase()} className="narrow">
            <NumberInput min={-10} max={10} value={c.raceBonuses[a]} onChange={setBonus('raceBonuses', a)} />
          </Field>
        ))}
      </fieldset>
      <fieldset className="bonus-row">
        <legend>Other bonuses: background (2024), feats, ability score improvements, items. The pickers never change these.</legend>
        {ABILITIES.map((a) => (
          <Field key={a} label={a.toUpperCase()} className="narrow">
            <NumberInput min={-10} max={20} value={c.abilityBonuses[a]} onChange={setBonus('abilityBonuses', a)} />
          </Field>
        ))}
      </fieldset>
      <p className="hint">
        Picking a class fills in saves, hit die, spell slots, resources, speed and skills. Everything stays editable.
        Homebrew or book classes: add them under <a href="#/classes">Custom classes</a>.
      </p>
    </div>
  );
}
