import { Fragment, useState } from 'react';
import type { Attack } from '../../shared/character.ts';
import { newId } from '../../shared/id.ts';
import { ABILITIES, attackBonus, formatMod, mod, spellAttackBonus, type Ability } from '../../shared/rules.ts';
import { CloseIcon, PlusIcon, SwordsIcon } from '../icons.tsx';
import { useRoll } from '../roll/RollContext.tsx';
import { Field, NumberInput, RollButton, TextInput } from './fields.tsx';
import { type SheetProps, patchById, removeById } from './types.ts';

const newAttack = (): Attack => ({
  id: newId(),
  name: 'New attack',
  ability: 'str',
  proficient: true,
  damage: '1d6',
  damageType: '',
  range: '5 ft.',
  notes: '',
});

export function Actions({ c, update }: Omit<SheetProps, 'catalog'>) {
  const { rollDice } = useRoll();
  const [editing, setEditing] = useState<string | null>(null);
  const edit = (id: string, patch: Partial<Attack>) =>
    update((prev) => ({ ...prev, attacks: patchById(prev.attacks, id, patch) }));
  const remove = (id: string) => update((prev) => ({ ...prev, attacks: removeById(prev.attacks, id) }));
  function add() {
    const attack = newAttack();
    update((prev) => ({ ...prev, attacks: [...prev.attacks, attack] }));
    setEditing(attack.id);
  }

  const spellAttack = spellAttackBonus(c);
  // Only cantrips that call for a spell attack roll (Fire Bolt yes, Mage Hand no).
  const cantrips = c.spells.filter((s) => s.level === 0 && /spell attack/i.test(s.description));

  return (
    <div className="tab-body">
      <div className="tab-subhead">
        <h3>
          Actions
        </h3>
        <label className="per-action">
          Attacks per action
          <NumberInput min={1} max={10} value={c.attacksPerAction} onChange={(v) => update((prev) => ({ ...prev, attacksPerAction: v }))} />
        </label>
        <button type="button" className="link-button" onClick={add}>
          <PlusIcon /> Add attack
        </button>
      </div>

      {c.attacks.length === 0 ? (
        <p className="empty">No attacks yet. Add your weapons here to roll to hit and damage with one tap.</p>
      ) : (
        <table className="attack-table">
          <thead>
            <tr>
              <th scope="col" className="icon-col">
                <span className="sr-only">Type</span>
              </th>
              <th scope="col">Attack</th>
              <th scope="col">Range</th>
              <th scope="col">Hit / DC</th>
              <th scope="col">Damage</th>
              <th scope="col" className="notes-col">
                Notes
              </th>
              <th scope="col">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {c.attacks.map((a) => {
              const damageMod = mod(c, a.ability);
              const damageExpr = `${a.damage}${damageMod ? formatMod(damageMod) : ''}`;
              const isEditing = editing === a.id;
              return (
                <Fragment key={a.id}>
                  <tr className="attack-row">
                    <td className="icon-col">
                      <SwordsIcon />
                    </td>
                    <td>
                      <span className="attack-name">{a.name || 'Unnamed attack'}</span>
                      <span className="attack-sub">
                        {a.ability.toUpperCase()}
                        {a.proficient ? ' · proficient' : ''}
                      </span>
                    </td>
                    <td className="attack-range">{a.range || '—'}</td>
                    <td>
                      <RollButton label={`${a.name || 'Attack'} to hit`} bonus={attackBonus(c, a)} className="box-roll" />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="box-roll damage"
                        onClick={() => rollDice(`${a.name || 'Attack'} damage`, damageExpr)}
                        title={`Roll ${damageExpr}${a.damageType ? ` ${a.damageType}` : ''}`}
                      >
                        {damageExpr}
                      </button>
                      {a.damageType && <span className="attack-sub">{a.damageType}</span>}
                    </td>
                    <td className="notes-col attack-notes">{a.notes}</td>
                    <td>
                      <button type="button" className="link-button" aria-expanded={isEditing} onClick={() => setEditing(isEditing ? null : a.id)}>
                        {isEditing ? 'Done' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="attack-editor">
                      <td colSpan={7}>
                        <div className="editor-grid">
                          <Field label="Name">
                            <TextInput value={a.name} onChange={(name) => edit(a.id, { name })} />
                          </Field>
                          <Field label="Ability" className="narrow">
                            <select value={a.ability} onChange={(e) => edit(a.id, { ability: e.target.value as Ability })}>
                              {ABILITIES.map((ab) => (
                                <option key={ab} value={ab}>
                                  {ab.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Damage dice" className="narrow">
                            <TextInput value={a.damage} onChange={(damage) => edit(a.id, { damage })} />
                          </Field>
                          <Field label="Damage type">
                            <TextInput value={a.damageType} onChange={(damageType) => edit(a.id, { damageType })} placeholder="slashing" />
                          </Field>
                          <Field label="Range" className="narrow">
                            <TextInput value={a.range ?? ''} onChange={(range) => edit(a.id, { range })} />
                          </Field>
                          <Field label="Notes" className="wide">
                            <TextInput value={a.notes ?? ''} onChange={(notes) => edit(a.id, { notes })} placeholder="Finesse, Light, Thrown (20/60)" />
                          </Field>
                          <label className="check">
                            <input type="checkbox" checked={a.proficient} onChange={(e) => edit(a.id, { proficient: e.target.checked })} />
                            Proficient
                          </label>
                          <button type="button" className="link-button danger" onClick={() => remove(a.id)}>
                            <CloseIcon /> Remove attack
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {cantrips.length > 0 && spellAttack !== null && (
        <>
          <div className="tab-subhead">
            <h3>Cantrips</h3>
          </div>
          <ul className="cantrip-list">
            {cantrips.map((s) => (
              <li key={s.id}>
                <span className="attack-name">{s.name}</span>
                <span className="attack-range">{s.range}</span>
                <RollButton label={`${s.name} spell attack`} bonus={spellAttack} className="box-roll" />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
