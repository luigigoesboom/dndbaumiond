import { useId, useState } from 'react';
import { longRest } from '../../shared/rules.ts';
import { RULESET_LABEL } from '../../shared/srd.ts';
import { initials } from '../format.ts';
import { BackIcon, CampfireIcon, MoonIcon } from '../icons.tsx';
import { TextInput } from './fields.tsx';
import { ManageDrawer } from './ManageDrawer.tsx';
import { ShortRestDrawer } from './ShortRestDrawer.tsx';
import { fieldSetter, type SheetProps } from './types.ts';
import type { SaveStatus } from './useCharacterDoc.ts';

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved yet, retrying…',
  conflict: 'Not saved: changed elsewhere',
};

export function SheetHeader({
  c,
  update,
  catalog,
  status,
  onBack,
}: SheetProps & { status: SaveStatus; onBack: () => void }) {
  const set = fieldSetter(update);
  const [panel, setPanel] = useState<'none' | 'manage' | 'short-rest'>('none');
  const manageId = useId();
  const restId = useId();

  const toggle = (p: typeof panel) => setPanel((cur) => (cur === p ? 'none' : p));

  function takeLongRest() {
    const hitDice = c.ruleset === '2024' ? 'all your hit dice' : 'half your hit dice';
    if (window.confirm(`Take a long rest? HP, spell slots, resources and ${hitDice} come back.`)) update(longRest);
  }

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

      <ShortRestDrawer c={c} update={update} id={restId} hidden={panel !== 'short-rest'} onDone={() => setPanel('none')} />
      <ManageDrawer c={c} update={update} catalog={catalog} id={manageId} hidden={panel !== 'manage'} />
    </header>
  );
}
