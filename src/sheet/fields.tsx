import { useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { formatMod } from '../../shared/rules.ts';
import { useRoll } from '../roll/RollContext.tsx';

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

export function TextInput({
  value,
  onChange,
  ...rest
}: BaseInputProps & { value: string; onChange: (value: string) => void }) {
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

/**
 * A number field that keeps what you type locally and only commits valid numbers,
 * clamped to min/max. Clearing the field or typing "-" never writes a 0 into the sheet;
 * on blur an invalid draft snaps back to the current value.
 *
 * commit="blur" waits until you leave the field (or press Enter): use it where every
 * intermediate value has side effects, like Level (spell slots resync on each change).
 */
export function NumberInput({
  value,
  onChange,
  commit = 'change',
  className = '',
  onBlur,
  onKeyDown,
  ...rest
}: BaseInputProps & { value: number; onChange: (value: number) => void; commit?: 'change' | 'blur' }) {
  // The draft remembers which value it was typed over; if the value changes underneath it
  // (reload, another edit), the stale draft is dropped instead of being shown or committed.
  const [typed, setTyped] = useState<{ text: string; base: number } | null>(null);
  const draft = typed && typed.base === value ? typed.text : null;
  const setDraft = (text: string | null) => setTyped(text === null ? null : { text, base: value });
  const min = rest.min === undefined ? -Infinity : Number(rest.min);
  const max = rest.max === undefined ? Infinity : Number(rest.max);
  const allowsNegative = min < 0;

  const parse = (text: string): number | null => {
    const t = text.trim();
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Math.min(max, Math.max(min, Number(t)));
  };
  const commitDraft = () => {
    if (draft === null) return;
    const n = parse(draft);
    if (n !== null && n !== value) onChange(n);
    setDraft(null);
  };

  return (
    <input
      type="text"
      inputMode={allowsNegative ? 'text' : 'numeric'}
      autoComplete="off"
      className={`num ${className}`}
      value={draft ?? String(value)}
      onChange={(e) => {
        const text = e.target.value;
        if (!/^-?\d*(\.\d*)?$/.test(text.trim()) || (!allowsNegative && text.includes('-'))) return; // ignore letters
        setDraft(text);
        if (commit === 'change') {
          const n = parse(text);
          if (n !== null && n !== value) onChange(n);
        }
      }}
      onBlur={(e) => {
        commitDraft();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitDraft();
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const n = Math.min(max, Math.max(min, value + (e.key === 'ArrowUp' ? 1 : -1)));
          setDraft(null);
          if (n !== value) onChange(n);
        }
        onKeyDown?.(e);
      }}
      {...rest}
    />
  );
}

export function TextArea({
  value,
  onChange,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

/** A red-framed sheet box. The title sits on top, or as a caption underneath like D&D Beyond's saves/senses. */
export function Box({
  title,
  caption,
  actions,
  className = '',
  children,
}: {
  title?: string;
  caption?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`box ${className}`} aria-label={title ?? caption}>
      {(title || actions) && (
        <header className="box-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="box-actions">{actions}</div>}
        </header>
      )}
      {children}
      {caption && <p className="box-caption">{caption}</p>}
    </section>
  );
}

/** A bonus you can tap to roll d20 + bonus. */
export function RollButton({ label, bonus, className = '' }: { label: string; bonus: number; className?: string }) {
  const { rollCheck } = useRoll();
  return (
    <button type="button" className={`roll-btn ${className}`} onClick={() => rollCheck(label, bonus)} title={`Roll ${label}`}>
      <span className="sign">{bonus >= 0 ? '+' : '−'}</span>
      {Math.abs(bonus)}
      <span className="sr-only"> ({formatMod(bonus)})</span>
    </button>
  );
}

/** A row of boxes; spent ones are crossed out. */
export function Tally({
  total,
  spent,
  onChange,
  label,
  tone = 'neutral',
}: {
  total: number;
  spent: number;
  onChange: (spent: number) => void;
  label: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  return (
    <span className={`tally ${tone}`} role="group" aria-label={`${label}: ${spent} of ${total} marked`}>
      {Array.from({ length: total }, (_, i) => {
        const isSpent = i < spent;
        return (
          <button
            key={i}
            type="button"
            className={`tally-box${isSpent ? ' spent' : ''}`}
            aria-pressed={isSpent}
            aria-label={`${label} ${i + 1}`}
            onClick={() => onChange(isSpent ? i : i + 1)}
          />
        );
      })}
    </span>
  );
}
