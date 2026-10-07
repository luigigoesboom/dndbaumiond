import { derivedFeatures } from '../../shared/srdApply.ts';
import { Field, TextArea } from './fields.tsx';
import { fieldSetter, nestedSetter, type SheetProps } from './types.ts';

export function Features({ c, update, catalog }: SheetProps) {
  const set = fieldSetter(update);
  const groups = derivedFeatures(c, catalog);
  return (
    <div className="tab-body">
      {groups.length === 0 && (
        <p className="empty">Pick a class, race or background under Manage and their features show up here.</p>
      )}
      {groups.map((g) => (
        <section key={g.source} className="feature-group">
          <div className="tab-subhead">
            <h3>{g.source}</h3>
          </div>
          {g.features.some((f) => f.description) ? (
            <div className="feature-details">
              {g.features.map((f) =>
                f.description ? (
                  <details key={f.name}>
                    <summary>
                      {f.name}
                      {f.level && <span className="muted"> · level {f.level}</span>}
                    </summary>
                    <p className="prose">{f.description}</p>
                  </details>
                ) : (
                  <p key={f.name} className="feature-plain">
                    {f.name}
                    {f.level && <span className="muted"> · level {f.level}</span>}
                  </p>
                ),
              )}
            </div>
          ) : (
            <ul className="feature-list">
              {g.features.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <Field label="Other features, feats & notes">
        <TextArea rows={6} value={c.features} onChange={set('features')} />
      </Field>
    </div>
  );
}

export function Background({ c, update }: Omit<SheetProps, 'catalog'>) {
  const set = fieldSetter(update);
  const persona = nestedSetter(update)('personality');
  return (
    <div className="tab-body">
      <div className="tab-subhead">
        <h3>{c.background || 'Background'}</h3>
        {c.alignment && <span className="muted">{c.alignment}</span>}
      </div>
      <div className="story-grid">
        <Field label="Personality traits">
          <TextArea rows={3} value={c.personality.traits} onChange={persona('traits')} />
        </Field>
        <Field label="Ideals">
          <TextArea rows={3} value={c.personality.ideals} onChange={persona('ideals')} />
        </Field>
        <Field label="Bonds">
          <TextArea rows={3} value={c.personality.bonds} onChange={persona('bonds')} />
        </Field>
        <Field label="Flaws">
          <TextArea rows={3} value={c.personality.flaws} onChange={persona('flaws')} />
        </Field>
        <Field label="Appearance" className="wide">
          <TextArea rows={3} value={c.appearance} onChange={set('appearance')} />
        </Field>
      </div>
    </div>
  );
}

export function Notes({ c, update }: Omit<SheetProps, 'catalog'>) {
  const set = fieldSetter(update);
  return (
    <div className="tab-body">
      <Field label="Notes, backstory, allies, quests">
        <TextArea rows={14} value={c.notes} onChange={set('notes')} />
      </Field>
    </div>
  );
}
