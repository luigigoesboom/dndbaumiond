import { useCallback, useEffect, useId, useState, type KeyboardEvent } from 'react';
import type { Character } from '../../shared/character.ts';
import { api } from '../api.ts';
import { useCatalog } from '../srd.ts';
import { AbilityScores } from './AbilityScores.tsx';
import { Actions } from './Attacks.tsx';
import { ArmorClassShield, DefensesConditions, HitPointsBox, InitiativeBox, StatBoxes } from './Combat.tsx';
import { Companions } from './Companions.tsx';
import { LimitedUse } from './Resources.tsx';
import { Inventory } from './Inventory.tsx';
import { Background, Features, Notes } from './Notes.tsx';
import { SavingThrows, Senses, Skills, Training } from './Proficiencies.tsx';
import { SheetHeader } from './SheetHeader.tsx';
import { Spells } from './Spells.tsx';
import type { SheetProps, Update } from './types.ts';
import { useAutosave } from './useAutosave.ts';

const TABS = [
  {
    id: 'actions',
    label: 'Actions',
    render: (p: SheetProps) => (
      <>
        <LimitedUse {...p} />
        <Actions {...p} />
      </>
    ),
  },
  { id: 'spells', label: 'Spells', render: (p: SheetProps) => <Spells {...p} /> },
  { id: 'companions', label: 'Companions', render: (p: SheetProps) => <Companions {...p} /> },
  { id: 'inventory', label: 'Inventory', render: (p: SheetProps) => <Inventory {...p} /> },
  { id: 'features', label: 'Features & Traits', render: (p: SheetProps) => <Features {...p} /> },
  { id: 'background', label: 'Background', render: (p: SheetProps) => <Background {...p} /> },
  { id: 'notes', label: 'Notes', render: (p: SheetProps) => <Notes {...p} /> },
] as const;
type TabId = (typeof TABS)[number]['id'];

function SheetTabs(props: SheetProps) {
  const [tab, setTab] = useState<TabId>('actions');
  const base = useId();
  const current = TABS.find((t) => t.id === tab)!;

  // Arrow-key navigation per the WAI-ARIA tabs pattern.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = TABS[(next + TABS.length) % TABS.length];
    setTab(t.id);
    document.getElementById(`${base}-tab-${t.id}`)?.focus();
  }

  return (
    <section className="box tabs-box" aria-label="Actions, spells and gear">
      <div className="tab-list" role="tablist" aria-label="Sheet sections" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`${base}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`${base}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${tab}`} className="tab-panel">
        {current.render(props)}
      </div>
    </section>
  );
}

export function CharacterSheet({ id, onBack }: { id: number; onBack: () => void }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = useAutosave(id, character);
  const catalog = useCatalog(character?.ruleset ?? '2014');

  useEffect(() => {
    let cancelled = false;
    api.get(id).then(
      (record) => !cancelled && setCharacter(record.data),
      (e: Error) => !cancelled && setError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update: Update = useCallback((fn) => setCharacter((prev) => prev && fn(prev)), []);

  if (error) return <p className="page-message error">Could not load this character: {error}</p>;
  if (!character) return <p className="page-message">Loading character…</p>;

  const props = { c: character, update, catalog };
  return (
    <article className="sheet">
      <SheetHeader {...props} status={status} onBack={onBack} />
      <div className="sheet-body">
        <div className="top-row">
          <AbilityScores {...props} />
          <div className="stat-boxes">
            <StatBoxes {...props} />
          </div>
          <HitPointsBox {...props} />
        </div>

        <div className="columns">
          <div className="col col-left">
            <SavingThrows {...props} />
            <Senses {...props} />
            <Training {...props} />
          </div>
          <div className="col col-skills">
            <Skills {...props} />
          </div>
          <div className="col col-main">
            <div className="combat-row">
              <InitiativeBox {...props} />
              <ArmorClassShield {...props} />
              <DefensesConditions {...props} />
            </div>
            <SheetTabs {...props} />
          </div>
        </div>
      </div>
    </article>
  );
}
