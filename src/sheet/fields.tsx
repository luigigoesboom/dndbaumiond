import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
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

export function NumberInput({
  value,
  onChange,
  ...rest
}: BaseInputProps & { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
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
