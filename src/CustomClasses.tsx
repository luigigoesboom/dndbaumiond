import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CustomClassFile } from '../shared/customClass.ts';
import type { SpellCollectionFile } from '../shared/customSpells.ts';
import { ApiError, classApi, spellCollectionApi, type LibraryRecord, type libraryApi } from './api.ts';
import { BackIcon, PlusIcon, TrashIcon } from './icons.tsx';
import { invalidateSrd } from './srd.ts';

type Editing = { id: number | null; text: string };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name || 'data'}.json` });
  a.click();
  URL.revokeObjectURL(url);
}

interface LibraryConfig<T> {
  title: string;
  noun: string;
  intro: ReactNode;
  api: ReturnType<typeof libraryApi<T>>;
  badge: (data: T) => string;
  summary: (data: T) => string;
}

/** Paste / edit user-entered JSON documents (homebrew, or books you own). */
function JsonLibraryPage<T>({ config, onBack }: { config: LibraryConfig<T>; onBack: () => void }) {
  const { api, noun } = config;
  const [items, setItems] = useState<LibraryRecord<T>[] | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = () => api.list().then(setItems, (e: Error) => setLoadError(e.message));
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  async function startNew() {
    const template = await api.template();
    setErrors([]);
    setEditing({ id: null, text: JSON.stringify(template, null, 2) });
  }

  async function save() {
    if (!editing) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(editing.text);
    } catch (e) {
      setErrors([`That isn't valid JSON: ${(e as Error).message}. Check for a missing comma or quote near that spot.`]);
      return;
    }
    setSaving(true);
    try {
      if (editing.id === null) await api.create(parsed);
      else await api.save(editing.id, parsed);
      invalidateSrd();
      setEditing(null);
      setErrors([]);
      await reload();
    } catch (e) {
      setErrors(e instanceof ApiError && e.details.length ? e.details : [(e as Error).message]);
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: LibraryRecord<T>) {
    if (!window.confirm(`Delete ${record.name}? Characters keep anything already copied onto their sheet.`)) return;
    await api.remove(record.id);
    invalidateSrd();
    await reload();
  }

  function importFile(file: File) {
    file.text().then((text) => {
      setErrors([]);
      setEditing({ id: null, text });
    });
  }

  function downloadCurrent() {
    if (!editing) return;
    let name = noun;
    try {
      name = String((JSON.parse(editing.text) as { name?: string }).name ?? noun);
    } catch {
      /* keep the generic name for unparseable drafts */
    }
    download(name, editing.text);
  }

  return (
    <section className="roster classes-page" aria-labelledby="library-title">
      <button type="button" className="link-button back-link" onClick={onBack}>
        <BackIcon /> My characters
      </button>
      <header className="roster-head">
        <h1 id="library-title">{config.title}</h1>
        {!editing && (
          <div className="head-actions">
            <button type="button" className="outline-button" onClick={() => fileInput.current?.click()}>
              Import .json
            </button>
            <button type="button" className="solid-button" onClick={startNew}>
              <PlusIcon /> New {noun}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) importFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
        )}
      </header>

      <p className="hint intro">{config.intro}</p>

      {loadError && <p className="page-message error">Could not load: {loadError}</p>}

      {editing ? (
        <div className="class-editor box">
          <div className="editor-head">
            <h2>{editing.id === null ? `New ${noun}` : `Edit ${noun}`}</h2>
            <button type="button" className="link-button" onClick={downloadCurrent}>
              Download .json
            </button>
          </div>
          <p className="hint">
            The <code>_instructions</code> at the top explain every field. Tip: it's often easier to download this, fill it in
            with a text editor, and import it back.
          </p>
          <label className="sr-only" htmlFor="library-json">
            {noun} JSON
          </label>
          <textarea
            id="library-json"
            className="json-editor"
            spellCheck={false}
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            rows={26}
          />
          {errors.length > 0 && (
            <div className="editor-errors" role="alert">
              <p>
                <strong>Fix {errors.length === 1 ? 'this' : `these ${errors.length} things`} before saving:</strong>
              </p>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="editor-actions">
            <button type="button" className="outline-button" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="button" className="solid-button" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : `Save ${noun}`}
            </button>
          </div>
        </div>
      ) : items?.length === 0 ? (
        <div className="roster-empty">
          <p>Nothing here yet.</p>
          <p className="hint">Start with “New {noun}” to get a blank template.</p>
        </div>
      ) : (
        <ul className="roster-list">
          {items?.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                className="roster-row"
                onClick={() => {
                  setErrors([]);
                  setEditing({ id: k.id, text: JSON.stringify(k.data, null, 2) });
                }}
              >
                <span className="portrait small" aria-hidden="true">
                  {config.badge(k.data)}
                </span>
                <span className="roster-name">{k.name}</span>
                <span className="roster-line">{config.summary(k.data)}</span>
                <span className="roster-date">Edit JSON</span>
              </button>
              <button type="button" className="icon-button" onClick={() => remove(k)} aria-label={`Delete ${k.name}`}>
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const CLASS_CONFIG: LibraryConfig<CustomClassFile> = {
  title: 'Custom classes',
  noun: 'class',
  intro:
    "Add classes from your own books or homebrew. Fill in the template once; the class then appears in every character's class picker for your whole group, with its features, spell slots, resources and spells.",
  api: classApi,
  badge: (d) => `d${d.hitDie}`,
  summary: (d) =>
    `${d.levels.reduce((n, l) => n + l.features.length, 0)} features · ${d.resources.length} resources · ${d.spells.length} spells`,
};

const SPELL_CONFIG: LibraryConfig<SpellCollectionFile> = {
  title: 'Custom spells',
  noun: 'spell collection',
  intro:
    'Add spells from your own books or homebrew as a collection (one per book works well). Tag each spell with the classes that can learn it; it then shows up in the spell browser for those characters.',
  api: spellCollectionApi,
  badge: (d) => String(d.spells.length),
  summary: (d) => {
    const classes = [...new Set(d.spells.flatMap((s) => s.classes))];
    return `${d.spells.length} spells${classes.length ? ` · ${classes.join(', ')}` : ' · all classes'}`;
  },
};

export const CustomClasses = ({ onBack }: { onBack: () => void }) => <JsonLibraryPage config={CLASS_CONFIG} onBack={onBack} />;
export const CustomSpells = ({ onBack }: { onBack: () => void }) => <JsonLibraryPage config={SPELL_CONFIG} onBack={onBack} />;
