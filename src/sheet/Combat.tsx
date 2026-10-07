import { useState } from 'react';
import type { Character, HitPoints } from '../../shared/character.ts';
import { applyDamage, applyHealing, formatMod, initiative, proficiencyBonus } from '../../shared/rules.ts';
import { CloseIcon } from '../icons.tsx';
import { NumberInput, RollButton, Tally, TextArea } from './fields.tsx';
import { fieldSetter, type SheetProps } from './types.ts';

/** Proficiency, speed and heroic inspiration: the small boxes between abilities and HP. */
export function StatBoxes({ c, update }: Omit<SheetProps, 'catalog'>) {
  const set = fieldSetter(update);
  return (
    <>
      <div className="stat-box">
        <span className="stat-top">Proficiency</span>
        <span className="stat-figure">{formatMod(proficiencyBonus(c.level))}</span>
        <span className="stat-bottom">Bonus</span>
      </div>
      <label className="stat-box">
        <span className="stat-top">Walking</span>
        <span className="stat-figure">
          <NumberInput min={0} step={5} value={c.speed} onChange={set('speed')} aria-label="Speed in feet" />
          <small>ft.</small>
        </span>
        <span className="stat-bottom">Speed</span>
      </label>
      <label className={`stat-box inspiration${c.inspiration ? ' on' : ''}`}>
        <input type="checkbox" checked={c.inspiration} onChange={(e) => set('inspiration')(e.target.checked)} />
        <span className="stat-bottom">Heroic inspiration</span>
      </label>
    </>
  );
}

export function HitPointsBox({ c, update }: Omit<SheetProps, 'catalog'>) {
  const [amount, setAmount] = useState<number | ''>('');
  const setHp = (fn: (hp: HitPoints) => HitPoints) => update((prev) => ({ ...prev, hp: fn(prev.hp) }));
  const setDeathSave = (key: keyof Character['deathSaves'], value: number) =>
    update((prev) => ({ ...prev, deathSaves: { ...prev.deathSaves, [key]: value } }));
  const n = amount === '' ? 0 : amount;
  const apply = (fn: (hp: HitPoints, n: number) => HitPoints) => {
    if (n > 0) setHp((hp) => fn(hp, n));
    setAmount('');
  };
  const down = c.hp.current === 0;
  const low = !down && c.hp.current <= c.hp.max / 4;

  return (
    <section className={`hp-box${down ? ' down' : ''}${low ? ' low' : ''}`} aria-label="Hit points">
      <div className="hp-adjust">
        <button type="button" className="hp-heal" onClick={() => apply(applyHealing)}>
          Heal
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number.isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
          onKeyDown={(e) => e.key === 'Enter' && apply(applyDamage)}
          aria-label="Amount to heal or damage"
        />
        <button type="button" className="hp-damage" onClick={() => apply(applyDamage)}>
          Damage
        </button>
      </div>

      {down ? (
        <div className="death-saves">
          <span className="stat-top">Death saves</span>
          <div className="death-row">
            <span>Successes</span>
            <Tally total={3} spent={c.deathSaves.successes} onChange={(v) => setDeathSave('successes', v)} label="Success" tone="good" />
          </div>
          <div className="death-row">
            <span>Failures</span>
            <Tally total={3} spent={c.deathSaves.failures} onChange={(v) => setDeathSave('failures', v)} label="Failure" tone="bad" />
          </div>
          <RollButton label="Death save" bonus={0} className="death-roll" />
        </div>
      ) : (
        <div className="hp-figures">
          <label className="hp-col">
            <span className="stat-top">Current</span>
            <NumberInput min={0} value={c.hp.current} onChange={(v) => setHp((hp) => ({ ...hp, current: v }))} className="hp-current" />
          </label>
          <span className="hp-slash" aria-hidden="true">
            /
          </span>
          <label className="hp-col">
            <span className="stat-top">Max</span>
            <NumberInput min={1} value={c.hp.max} onChange={(v) => setHp((hp) => ({ ...hp, max: v }))} className="hp-max" />
          </label>
          <label className="hp-col temp">
            <span className="stat-top">Temp</span>
            <NumberInput min={0} value={c.hp.temp} onChange={(v) => setHp((hp) => ({ ...hp, temp: v }))} placeholder="--" />
          </label>
        </div>
      )}
      <span className="stat-bottom">Hit points</span>
    </section>
  );
}

export function InitiativeBox({ c }: Pick<SheetProps, 'c'>) {
  return (
    <div className="init-box">
      <span className="stat-top">Initiative</span>
      <RollButton label="Initiative" bonus={initiative(c)} className="init-roll" />
    </div>
  );
}

export function ArmorClassShield({ c, update }: Omit<SheetProps, 'catalog'>) {
  const set = fieldSetter(update);
  return (
    <label className="ac-shield">
      <svg className="ac-shape" viewBox="0 0 100 116" aria-hidden="true" focusable="false">
        <path d="M50 4 L94 18 V58 C94 84 74 102 50 112 C26 102 6 84 6 58 V18 Z" />
        <path className="inner" d="M50 11 L87 23 V58 C87 80 70 96 50 105 C30 96 13 80 13 58 V23 Z" />
      </svg>
      <span className="ac-top">Armor</span>
      <NumberInput min={0} value={c.armorClass} onChange={set('armorClass')} aria-label="Armor class" />
      <span className="ac-bottom">Class</span>
    </label>
  );
}

export function DefensesConditions({ c, update, catalog }: SheetProps) {
  const set = fieldSetter(update);
  const [picking, setPicking] = useState(false);
  const active = catalog?.conditions.filter((x) => c.conditions.includes(x.name)) ?? [];
  const toggle = (name: string) =>
    update((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(name) ? prev.conditions.filter((x) => x !== name) : [...prev.conditions, name],
    }));

  return (
    <section className="box defenses-box" aria-label="Defenses and conditions">
      <div className="defenses">
        <h2 className="mini-head">Defenses</h2>
        <TextArea rows={2} value={c.defenses} onChange={set('defenses')} placeholder="Resistances, immunities…" aria-label="Defenses" />
      </div>
      <div className="conditions">
        <h2 className="mini-head">Conditions</h2>
        {active.length > 0 && (
          <ul className="active-conditions">
            {active.map((x) => (
              <li key={x.index}>
                <button type="button" className="condition-tag" onClick={() => toggle(x.name)} title={x.description}>
                  {x.name} <CloseIcon />
                  <span className="sr-only">, remove</span>
                </button>
              </li>
            ))}
            {c.exhaustion > 0 && <li className="condition-tag static">Exhaustion {c.exhaustion}</li>}
          </ul>
        )}
        <button type="button" className="link-button" aria-expanded={picking} onClick={() => setPicking((p) => !p)}>
          {picking ? 'Done' : active.length ? 'Edit conditions' : 'Add active conditions'}
        </button>
        {picking && (
          <div className="condition-picker">
            <div className="chips">
              {(catalog?.conditions ?? []).map((x) => (
                <button key={x.index} type="button" className="chip" aria-pressed={c.conditions.includes(x.name)} onClick={() => toggle(x.name)} title={x.description}>
                  {x.name}
                </button>
              ))}
            </div>
            <div className="exhaustion-row">
              <span className="mini-head">Exhaustion</span>
              <Tally total={6} spent={c.exhaustion} onChange={set('exhaustion')} label="Exhaustion level" tone="bad" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
