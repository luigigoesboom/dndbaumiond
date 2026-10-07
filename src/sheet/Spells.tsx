import { useState } from 'react';
import type { Spell } from '../../shared/character.ts';
import { ABILITIES, ABILITY_NAMES, spellAttackBonus, spellSaveDc, type Ability } from '../../shared/rules.ts';
import { blankSpell, spellFromSrd } from '../../shared/srdApply.ts';
import { CloseIcon, PlusIcon } from '../icons.tsx';
import { Field, NumberInput, RollButton, Tally, TextArea, TextInput } from './fields.tsx';
import { LEVEL_NAME, SpellBrowser } from './SpellBrowser.tsx';
import type { SheetProps } from './types.ts';

function SpellRow({
  spell,
  open,
  onToggle,
  onEdit,
  onRemove,
  onCast,
  slotsLeft,
}: {
  spell: Spell;
  open: boolean;
  onToggle: () => void;
  onEdit: (patch: Partial<Spell>) => void;
  onRemove: () => void;
  onCast: () => void;
  slotsLeft: number;
}) {
  const isCantrip = spell.level === 0;
  return (
    <li className={`spell${open ? ' open' : ''}${spell.prepared || isCantrip ? '' : ' unprepared'}`}>
      <div className="spell-line">
        {isCantrip ? (
          <span className="prof-dot placeholder" aria-hidden="true" />
        ) : (
          <button
            type="button"
            className={`prof-dot ${spell.prepared ? 'proficient' : 'none'}`}
            onClick={() => onEdit({ prepared: !spell.prepared })}
            aria-label={`${spell.name}: ${spell.prepared ? 'prepared' : 'not prepared'}`}
            title={spell.prepared ? 'Prepared' : 'Not prepared'}
          />
        )}
        <button type="button" className="spell-name" aria-expanded={open} onClick={onToggle}>
          {spell.name || 'Unnamed spell'}
          {spell.concentration && <abbr title="Concentration">C</abbr>}
          {spell.ritual && <abbr title="Ritual">R</abbr>}
        </button>
        <span className="spell-meta">
          {spell.castingTime}
          {spell.range && ` · ${spell.range}`}
        </span>
      </div>

      {open && (
        <div className="spell-detail">
          {!isCantrip && (
            <button type="button" className="solid-button small" disabled={slotsLeft === 0} onClick={onCast}>
              {slotsLeft === 0 ? `No ${LEVEL_NAME[spell.level]}-level slots left` : `Cast: spend a ${LEVEL_NAME[spell.level]}-level slot`}
            </button>
          )}
          <div className="spell-fields">
            <Field label="Name">
              <TextInput value={spell.name} onChange={(name) => onEdit({ name })} />
            </Field>
            <Field label="Level" className="narrow">
              <NumberInput min={0} max={9} value={spell.level} onChange={(level) => onEdit({ level: Math.min(9, Math.max(0, level)) })} />
            </Field>
            <Field label="School">
              <TextInput value={spell.school} onChange={(school) => onEdit({ school })} />
            </Field>
            <Field label="Casting time">
              <TextInput value={spell.castingTime} onChange={(castingTime) => onEdit({ castingTime })} />
            </Field>
            <Field label="Range">
              <TextInput value={spell.range} onChange={(range) => onEdit({ range })} />
            </Field>
            <Field label="Duration">
              <TextInput value={spell.duration} onChange={(duration) => onEdit({ duration })} />
            </Field>
            <Field label="Components" className="wide">
              <TextInput value={spell.components} onChange={(components) => onEdit({ components })} />
            </Field>
            <label className="check">
              <input type="checkbox" checked={spell.concentration} onChange={(e) => onEdit({ concentration: e.target.checked })} />
              Concentration
            </label>
            <label className="check">
              <input type="checkbox" checked={spell.ritual} onChange={(e) => onEdit({ ritual: e.target.checked })} />
              Ritual
            </label>
          </div>
          <Field label="Description">
            <TextArea rows={5} value={spell.description} onChange={(description) => onEdit({ description })} />
          </Field>
          <Field label="At higher levels">
            <TextArea rows={2} value={spell.higherLevel} onChange={(higherLevel) => onEdit({ higherLevel })} />
          </Field>
          <button type="button" className="link-button danger" onClick={onRemove}>
            <CloseIcon /> Remove from sheet
          </button>
        </div>
      )}
    </li>
  );
}

export function Spells({ c, update }: Omit<SheetProps, 'catalog'>) {
  const [browsing, setBrowsing] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const dc = spellSaveDc(c);
  const attack = spellAttackBonus(c);
  const slots = c.spellcasting.slots;

  const editSpell = (id: string, patch: Partial<Spell>) =>
    update((prev) => ({ ...prev, spells: prev.spells.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const removeSpell = (id: string) => update((prev) => ({ ...prev, spells: prev.spells.filter((s) => s.id !== id) }));
  const setSlot = (i: number, patch: Partial<{ max: number; spent: number }>) =>
    update((prev) => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        slots: prev.spellcasting.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)),
      },
    }));

  function addCustom() {
    const spell = blankSpell(crypto.randomUUID());
    update((prev) => ({ ...prev, spells: [...prev.spells, spell] }));
    setOpenId(spell.id);
    setBrowsing(false);
  }

  const levels = Array.from({ length: 10 }, (_, l) => l).filter(
    (l) => c.spells.some((s) => s.level === l) || (l > 0 && slots[l - 1].max > 0),
  );

  return (
    <div className="tab-body">
      <div className="tab-subhead">
        <h3>Spells</h3>
        <button type="button" className="link-button" onClick={() => setBrowsing(true)}>
          <PlusIcon /> Add spells
        </button>
      </div>
      <div className="casting-line">
        <label className="cast-stat">
          <select
            value={c.spellcasting.ability ?? ''}
            onChange={(e) =>
              update((prev) => ({
                ...prev,
                spellcasting: { ...prev.spellcasting, ability: (e.target.value || null) as Ability | null },
              }))
            }
          >
            <option value="">—</option>
            {ABILITIES.map((a) => (
              <option key={a} value={a}>
                {ABILITY_NAMES[a]}
              </option>
            ))}
          </select>
          <span className="cast-label">Spellcasting ability</span>
        </label>
        <div className="cast-stat">
          <span className="cast-value">{dc ?? '—'}</span>
          <span className="cast-label">Save DC</span>
        </div>
        <div className="cast-stat">
          {attack === null ? <span className="cast-value">—</span> : <RollButton label="Spell attack" bonus={attack} className="cast-roll" />}
          <span className="cast-label">Spell attack</span>
        </div>
      </div>

      {adjusting && (
        <fieldset className="slot-adjust">
          <legend>Spell slots per level</legend>
          {slots.map((s, i) => (
            <Field key={i} label={LEVEL_NAME[i + 1]} className="narrow">
              <NumberInput min={0} max={9} value={s.max} onChange={(max) => setSlot(i, { max, spent: Math.min(s.spent, max) })} />
            </Field>
          ))}
        </fieldset>
      )}

      {levels.length === 0 ? (
        <p className="empty">
          No spells yet. Use <strong>Add spells</strong> to browse the SRD, or pick a spellcasting class to get slots.
        </p>
      ) : (
        levels.map((l) => {
          const slot = l > 0 ? slots[l - 1] : null;
          const group = c.spells.filter((s) => s.level === l).sort((a, b) => a.name.localeCompare(b.name));
          return (
            <div key={l} className="spell-group">
              <div className="spell-group-head">
                <h3 className="sub-head">{l === 0 ? 'Cantrips' : `${LEVEL_NAME[l]} level`}</h3>
                {slot && slot.max > 0 && (
                  <Tally total={slot.max} spent={slot.spent} onChange={(spent) => setSlot(l - 1, { spent })} label={`${LEVEL_NAME[l]}-level slot`} />
                )}
              </div>
              <ul className="spell-list">
                {group.map((s) => (
                  <SpellRow
                    key={s.id}
                    spell={s}
                    open={openId === s.id}
                    onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                    onEdit={(patch) => editSpell(s.id, patch)}
                    onRemove={() => removeSpell(s.id)}
                    onCast={() => slot && setSlot(l - 1, { spent: Math.min(slot.max, slot.spent + 1) })}
                    slotsLeft={slot ? slot.max - slot.spent : 0}
                  />
                ))}
              </ul>
            </div>
          );
        })
      )}

      <button type="button" className="link-button adjust" aria-expanded={adjusting} onClick={() => setAdjusting((a) => !a)}>
        {adjusting ? 'Done adjusting slots' : 'Adjust slot counts'}
      </button>

      <SpellBrowser
        c={c}
        open={browsing}
        onClose={() => setBrowsing(false)}
        onAdd={(s) => update((prev) => ({ ...prev, spells: [...prev.spells, spellFromSrd(s, crypto.randomUUID())] }))}
        onAddCustom={addCustom}
      />
    </div>
  );
}
