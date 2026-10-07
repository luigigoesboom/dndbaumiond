import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { Character } from '../../shared/character.ts';
import { LEVEL_NAME } from '../../shared/rules.ts';
import { RULESET_LABEL, type SrdSpell } from '../../shared/srd.ts';
import { CloseIcon, PlusIcon, SearchIcon } from '../icons.tsx';
import { useSpellList } from '../srd.ts';

export function SpellBrowser({
  c,
  open,
  onClose,
  onAdd,
  onAddCustom,
}: {
  c: Character;
  open: boolean;
  onClose: () => void;
  onAdd: (spell: SrdSpell) => void;
  onAddCustom: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const spells = useSpellList(c.ruleset, open);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number | 'all'>('all');
  const [onlyClass, setOnlyClass] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const owned = useMemo(() => new Set(c.spells.map((s) => s.srdIndex).filter(Boolean)), [c.spells]);
  const className = c.srd.class ? c.className : null;

  const results = useMemo(() => {
    if (!spells) return [];
    const q = deferredQuery.trim().toLowerCase();
    return spells.filter(
      (s) =>
        (level === 'all' || s.level === level) &&
        // Collection spells tagged with no class are open to everyone.
        (!onlyClass || !className || s.classes.length === 0 || s.classes.includes(className)) &&
        (!q || s.name.toLowerCase().includes(q) || s.school.toLowerCase().includes(q)),
    );
  }, [spells, deferredQuery, level, onlyClass, className]);

  return (
    <dialog ref={dialog} className="spell-browser" aria-labelledby="spell-browser-title" onClose={onClose}>
      <header className="browser-head">
        <h2 id="spell-browser-title">Add spells</h2>
        <span className="ruleset-tag">{RULESET_LABEL[c.ruleset]} SRD</span>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </header>

      <div className="browser-filters">
        <label className="search">
          <SearchIcon />
          <span className="sr-only">Search spells</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or school" autoFocus />
        </label>
        <div className="chips" role="group" aria-label="Spell level">
          {(['all', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((l) => (
            <button key={l} type="button" className="chip" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l === 'all' ? 'All' : l === 0 ? 'Cantrips' : l}
            </button>
          ))}
        </div>
        {className && (
          <label className="check">
            <input type="checkbox" checked={onlyClass} onChange={(e) => setOnlyClass(e.target.checked)} />
            Only {className} spells
          </label>
        )}
      </div>

      <div className="browser-results">
        {!spells ? (
          <p className="empty">Loading the spell list…</p>
        ) : results.length === 0 ? (
          <p className="empty">No spells match. Clear the search or switch off the class filter.</p>
        ) : (
          <ul className="browser-list">
            {results.map((s) => {
              const isOwned = owned.has(s.index);
              const isOpen = expanded === s.index;
              return (
                <li key={s.index} className={isOpen ? 'open' : undefined}>
                  <button
                    type="button"
                    className="browser-row"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : s.index)}
                  >
                    <span className="lvl">{s.level === 0 ? 'C' : s.level}</span>
                    <span className="browser-name">{s.name}</span>
                    <span className="browser-meta">
                      {s.source && <span className="source-tag">{s.source}</span>}
                      {s.school}
                      {s.concentration && <abbr title="Concentration">C</abbr>}
                      {s.ritual && <abbr title="Ritual">R</abbr>}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="outline-button small"
                    disabled={isOwned}
                    onClick={() => onAdd(s)}
                    aria-label={isOwned ? `${s.name} is on your sheet` : `Add ${s.name}`}
                  >
                    {isOwned ? 'Added' : 'Add'}
                  </button>
                  {isOpen && (
                    <div className="browser-detail">
                      <p className="spell-facts">
                        {LEVEL_NAME[s.level]}
                        {s.level > 0 && ' level'} {s.school} · {s.castingTime} · {s.range} · {s.duration}
                        <br />
                        {s.components}
                        <br />
                        {s.classes.join(', ')}
                      </p>
                      <p className="prose">{s.description}</p>
                      {s.higherLevel && <p className="prose">{s.higherLevel}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="browser-foot">
        <span className="hint">Spell not in the SRD? Type it in yourself.</span>
        <button type="button" className="solid-button" onClick={onAddCustom}>
          <PlusIcon /> Custom spell
        </button>
      </footer>
    </dialog>
  );
}
