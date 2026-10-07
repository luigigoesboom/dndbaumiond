import { useState } from 'react';
import type { Resource } from '../../shared/character.ts';
import { newId } from '../../shared/id.ts';
import type { Recharge } from '../../shared/srd.ts';
import { CloseIcon, PlusIcon } from '../icons.tsx';
import { Field, NumberInput, Tally, TextInput } from './fields.tsx';
import { type SheetProps, patchById, removeById } from './types.ts';

const RECHARGE_LABEL: Record<Recharge, string> = { short: 'Short rest', long: 'Long rest', none: 'Manual' };

/** Limited-use trackers: class resources (from a custom class) plus anything added by hand. */
export function LimitedUse({ c, update }: Omit<SheetProps, 'catalog'>) {
  const [editing, setEditing] = useState<string | null>(null);
  const edit = (id: string, patch: Partial<Resource>) =>
    update((prev) => ({ ...prev, resources: patchById(prev.resources, id, patch) }));
  const remove = (id: string) => update((prev) => ({ ...prev, resources: removeById(prev.resources, id) }));

  function add() {
    const r: Resource = { id: newId(), name: 'New tracker', max: 1, spent: 0, recharge: 'long', classKey: null };
    update((prev) => ({ ...prev, resources: [...prev.resources, r] }));
    setEditing(r.id);
  }

  return (
    <section className="limited-use" aria-label="Limited use">
      <div className="tab-subhead">
        <h3>Limited use</h3>
        <button type="button" className="link-button" onClick={add}>
          <PlusIcon /> Add tracker
        </button>
      </div>
      {c.resources.length === 0 ? (
        <p className="empty">Nothing to track yet. Class resources appear here automatically; add your own for items or feats.</p>
      ) : (
        <ul className="resource-list">
          {c.resources.map((r) => {
            const isEditing = editing === r.id;
            return (
              <li key={r.id}>
                <div className="resource-line">
                  <span className="resource-name">{r.name}</span>
                  <span className={`recharge-tag ${r.recharge}`}>{RECHARGE_LABEL[r.recharge]}</span>
                  {r.max <= 12 ? (
                    <Tally total={r.max} spent={Math.min(r.spent, r.max)} onChange={(spent) => edit(r.id, { spent })} label={`${r.name} used`} />
                  ) : (
                    <span className="resource-count">
                      <NumberInput
                        min={0}
                        max={r.max}
                        value={r.max - r.spent}
                        onChange={(left) => edit(r.id, { spent: Math.min(r.max, Math.max(0, r.max - left)) })}
                        aria-label={`${r.name} remaining`}
                      />
                      <span className="muted">/ {r.max}</span>
                    </span>
                  )}
                  {r.classKey === null && (
                    <button type="button" className="link-button" aria-expanded={isEditing} onClick={() => setEditing(isEditing ? null : r.id)}>
                      {isEditing ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>
                {isEditing && (
                  <div className="editor-grid">
                    <Field label="Name">
                      <TextInput value={r.name} onChange={(name) => edit(r.id, { name })} />
                    </Field>
                    <Field label="Uses" className="narrow">
                      <NumberInput min={1} max={99} value={r.max} onChange={(max) => edit(r.id, { max, spent: Math.min(r.spent, max) })} />
                    </Field>
                    <Field label="Recharges on">
                      <select value={r.recharge} onChange={(e) => edit(r.id, { recharge: e.target.value as Recharge })}>
                        <option value="short">Short rest</option>
                        <option value="long">Long rest</option>
                        <option value="none">Manual only</option>
                      </select>
                    </Field>
                    <button type="button" className="link-button danger" onClick={() => remove(r.id)}>
                      <CloseIcon /> Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
