import { useEffect, useState } from 'react';
import type { CharacterSummary } from '../shared/character.ts';
import { api } from './api.ts';
import { PlusIcon, TrashIcon } from './icons.tsx';

function formatDate(sqlDate: string): string {
  // SQLite datetime('now') is UTC without a zone marker.
  const d = new Date(`${sqlDate.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? sqlDate : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CharacterList({
  onOpen,
  onClasses,
  onSpells,
}: {
  onOpen: (id: number) => void;
  onClasses: () => void;
  onSpells: () => void;
}) {
  const [characters, setCharacters] = useState<CharacterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.list().then(setCharacters, (e: Error) => setError(e.message));
  }, []);

  async function create() {
    setCreating(true);
    try {
      const record = await api.create();
      onOpen(record.id);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }

  async function remove(c: CharacterSummary) {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    try {
      await api.remove(c.id);
      setCharacters((list) => list?.filter((x) => x.id !== c.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="roster" aria-labelledby="roster-title">
      <header className="roster-head">
        <h1 id="roster-title">My Characters</h1>
        <div className="head-actions">
          <button type="button" className="outline-button" onClick={onClasses}>
            Custom classes
          </button>
          <button type="button" className="outline-button" onClick={onSpells}>
            Custom spells
          </button>
          <button type="button" className="solid-button" onClick={create} disabled={creating}>
            <PlusIcon /> New character
          </button>
        </div>
      </header>

      {error && <p className="page-message error">Something went wrong talking to the server: {error}</p>}
      {!characters && !error && <p className="page-message">Loading…</p>}

      {characters?.length === 0 && (
        <div className="roster-empty">
          <p>No adventurers on file yet.</p>
          <p className="hint">Create one, pick a class and a race or species from the SRD, and the sheet fills itself in.</p>
        </div>
      )}

      {characters && characters.length > 0 && (
        <ol className="roster-list">
          {characters.map((c) => (
            <li key={c.id}>
              <button type="button" className="roster-row" onClick={() => onOpen(c.id)}>
                <span className="portrait small" aria-hidden="true">
                  {(c.name || '?')
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                <span className="roster-name">{c.name || 'Unnamed'}</span>
                <span className="roster-line">
                  Level {c.level} {[c.race, c.className].filter(Boolean).join(' ')}
                </span>
                <span className="roster-date">{formatDate(c.updatedAt)}</span>
              </button>
              <button type="button" className="icon-button" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}>
                <TrashIcon />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
