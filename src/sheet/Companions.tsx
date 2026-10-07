import { useState } from 'react';
import { newCompanion, type Companion, type CompanionAttack, type HitPoints } from '../../shared/character.ts';
import { newId } from '../../shared/id.ts';
import { ABILITIES, ABILITY_NAMES, abilityMod, formatMod } from '../../shared/rules.ts';
import { CloseIcon, PlusIcon } from '../icons.tsx';
import { useRoll } from '../roll/RollContext.tsx';
import { HpAdjust } from './Combat.tsx';
import { Field, NumberInput, RollButton, TextArea, TextInput } from './fields.tsx';
import { type SheetProps, patchById, removeById } from './types.ts';

const newAttack = (): CompanionAttack => ({ id: newId(), name: 'Bite', toHit: 4, damage: '1d6+2', damageType: 'piercing' });

function CompanionCard({
  pet,
  onChange,
  onRemove,
}: {
  pet: Companion;
  onChange: (fn: (p: Companion) => Companion) => void;
  onRemove: () => void;
}) {
  const { rollDice } = useRoll();
  const [editing, setEditing] = useState(false);
  const set = <K extends keyof Companion>(key: K) => (value: Companion[K]) => onChange((p) => ({ ...p, [key]: value }));
  const setHp = (fn: (hp: HitPoints) => HitPoints) => onChange((p) => ({ ...p, hp: fn(p.hp) }));
  const editAttack = (id: string, patch: Partial<CompanionAttack>) =>
    onChange((p) => ({ ...p, attacks: patchById(p.attacks, id, patch) }));
  const label = pet.name || 'Companion';

  return (
    <article className="companion">
      <header className="companion-head">
        <div className="companion-title">
          <TextInput className="companion-name" value={pet.name} onChange={set('name')} aria-label="Companion name" />
          <TextInput className="companion-kind" value={pet.kind} onChange={set('kind')} placeholder="Size, type (e.g. Medium beast)" aria-label="Size and type" />
        </div>
        <button type="button" className="link-button" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </header>

      <div className="companion-stats">
        <label className="mini-stat">
          <span className="stat-top">AC</span>
          <NumberInput min={0} value={pet.armorClass} onChange={set('armorClass')} />
        </label>
        <div className={`mini-stat hp${pet.hp.current === 0 ? ' down' : ''}`}>
          <span className="stat-top">HP</span>
          <span className="mini-hp">
            <NumberInput min={0} value={pet.hp.current} onChange={(v) => setHp((hp) => ({ ...hp, current: v }))} aria-label={`${label} current HP`} />
            <span className="muted">/</span>
            <NumberInput min={1} value={pet.hp.max} onChange={(v) => setHp((hp) => ({ ...hp, max: v }))} aria-label={`${label} max HP`} />
          </span>
        </div>
        <label className="mini-stat">
          <span className="stat-top">Temp</span>
          <NumberInput min={0} value={pet.hp.temp} onChange={(v) => setHp((hp) => ({ ...hp, temp: v }))} />
        </label>
        <label className="mini-stat wide">
          <span className="stat-top">Speed</span>
          <TextInput value={pet.speed} onChange={set('speed')} />
        </label>
      </div>

      <HpAdjust onApply={setHp} label={label} className="inline" />

      <div className="companion-abilities">
        {ABILITIES.map((a) => (
          <div key={a} className="mini-ability">
            <span className="stat-top">{a.toUpperCase()}</span>
            <RollButton label={`${label} ${ABILITY_NAMES[a]}`} bonus={abilityMod(pet.abilities[a])} />
            {editing ? (
              <NumberInput
                min={1}
                max={30}
                value={pet.abilities[a]}
                onChange={(v) => onChange((p) => ({ ...p, abilities: { ...p.abilities, [a]: v } }))}
                aria-label={`${label} ${ABILITY_NAMES[a]} score`}
              />
            ) : (
              <span className="muted">{pet.abilities[a]}</span>
            )}
          </div>
        ))}
      </div>

      <div className="companion-attacks">
        {pet.attacks.map((a) => (
          <div key={a.id} className="companion-attack">
            {editing ? (
              <div className="editor-grid">
                <Field label="Attack">
                  <TextInput value={a.name} onChange={(name) => editAttack(a.id, { name })} />
                </Field>
                <Field label="To hit" className="narrow">
                  <NumberInput value={a.toHit} onChange={(toHit) => editAttack(a.id, { toHit })} />
                </Field>
                <Field label="Damage" className="narrow">
                  <TextInput value={a.damage} onChange={(damage) => editAttack(a.id, { damage })} />
                </Field>
                <Field label="Type">
                  <TextInput value={a.damageType} onChange={(damageType) => editAttack(a.id, { damageType })} />
                </Field>
                <button
                  type="button"
                  className="link-button danger"
                  onClick={() => onChange((p) => ({ ...p, attacks: removeById(p.attacks, a.id) }))}
                >
                  <CloseIcon /> Remove
                </button>
              </div>
            ) : (
              <>
                <span className="attack-name">{a.name}</span>
                <RollButton label={`${label}: ${a.name} to hit`} bonus={a.toHit} className="box-roll" />
                <button type="button" className="box-roll damage" onClick={() => rollDice(`${label}: ${a.name} damage`, a.damage)}>
                  {a.damage}
                </button>
                <span className="attack-sub">{a.damageType}</span>
              </>
            )}
          </div>
        ))}
        {editing && (
          <button type="button" className="link-button" onClick={() => onChange((p) => ({ ...p, attacks: [...p.attacks, newAttack()] }))}>
            <PlusIcon /> Add attack
          </button>
        )}
      </div>

      {editing ? (
        <div className="editor-grid">
          <Field label="Senses, skills, languages" className="wide">
            <TextArea rows={2} value={pet.senses} onChange={set('senses')} />
          </Field>
          <Field label="Traits, actions & notes" className="wide">
            <TextArea rows={5} value={pet.notes} onChange={set('notes')} />
          </Field>
          <button type="button" className="link-button danger" onClick={onRemove}>
            <CloseIcon /> Remove companion
          </button>
        </div>
      ) : (
        <>
          {pet.senses && <p className="companion-senses">{pet.senses}</p>}
          {pet.notes && <p className="prose companion-notes">{pet.notes}</p>}
        </>
      )}
      <p className="sr-only">
        Modifiers: {ABILITIES.map((a) => `${a} ${formatMod(abilityMod(pet.abilities[a]))}`).join(', ')}
      </p>
    </article>
  );
}

export function Companions({ c, update }: Omit<SheetProps, 'catalog'>) {
  const change = (id: string) => (fn: (p: Companion) => Companion) =>
    update((prev) => ({ ...prev, companions: prev.companions.map((p) => (p.id === id ? fn(p) : p)) }));
  const remove = (pet: Companion) => {
    if (window.confirm(`Remove ${pet.name || 'this companion'}?`)) {
      update((prev) => ({ ...prev, companions: removeById(prev.companions, pet.id) }));
    }
  };

  return (
    <div className="tab-body">
      <div className="tab-subhead">
        <h3>Companions</h3>
        <button
          type="button"
          className="link-button"
          onClick={() => update((prev) => ({ ...prev, companions: [...prev.companions, newCompanion(newId())] }))}
        >
          <PlusIcon /> Add companion
        </button>
      </div>
      {c.companions.length === 0 ? (
        <p className="empty">Tamed monsters, pets, familiars and steeds go here, each with its own HP, attacks and rolls.</p>
      ) : (
        <div className="companion-list">
          {c.companions.map((pet) => (
            <CompanionCard key={pet.id} pet={pet} onChange={change(pet.id)} onRemove={() => remove(pet)} />
          ))}
        </div>
      )}
    </div>
  );
}
