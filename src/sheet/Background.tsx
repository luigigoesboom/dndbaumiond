import { Field, TextArea } from './fields.tsx';
import { fieldSetter, nestedSetter, type SheetProps } from './types.ts';

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
