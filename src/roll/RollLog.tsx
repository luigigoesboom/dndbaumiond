import { useEffect, useState } from 'react';
import type { RollMode } from '../../shared/dice.ts';
import { formatMod } from '../../shared/rules.ts';
import { CloseIcon, D20Icon } from '../icons.tsx';
import { useRoll, type LogEntry } from './RollContext.tsx';

const MODES: { mode: RollMode; label: string; title: string }[] = [
  { mode: 'disadvantage', label: 'Dis', title: 'Next d20 roll with disadvantage' },
  { mode: 'normal', label: 'Normal', title: 'Next d20 roll normally' },
  { mode: 'advantage', label: 'Adv', title: 'Next d20 roll with advantage' },
];

const TOAST_MS = 4500;

function Breakdown({ entry }: { entry: LogEntry }) {
  const r = entry.result!;
  return (
    <span className="roll-breakdown">
      {r.dice.map((d, i) => (
        <span key={i} className={d.dropped ? 'die dropped' : 'die'}>
          {d.value}
          <small>d{d.sides}</small>
        </span>
      ))}
      {r.modifier !== 0 && <span className="die-mod">{formatMod(r.modifier)}</span>}
    </span>
  );
}

function Entry({ entry }: { entry: LogEntry }) {
  if (entry.kind === 'error') {
    return (
      <div className="roll-entry error">
        <span className="roll-label">{entry.label}</span>
        <span className="roll-message">{entry.message}</span>
      </div>
    );
  }
  const r = entry.result!;
  return (
    <div className={`roll-entry ${entry.kind}${r.crit ? ` crit-${r.crit}` : ''}`}>
      <span className="roll-label">
        {entry.label}
        {entry.mode !== 'normal' && <span className="roll-tag">{entry.mode === 'advantage' ? 'ADV' : 'DIS'}</span>}
        {r.crit && <span className="roll-tag crit">{r.crit === 'hit' ? 'NAT 20' : 'NAT 1'}</span>}
      </span>
      <span className="roll-total">{r.total}</span>
      <Breakdown entry={entry} />
    </div>
  );
}

/** Floating d20 (bottom-left, like D&D Beyond): each roll toasts; the button opens the full log. */
export function RollLog() {
  const { entries, mode, setMode, clear } = useRoll();
  const [open, setOpen] = useState(false);
  const [toastId, setToastId] = useState<string | null>(null);
  const latest = entries[0];

  useEffect(() => {
    if (!latest || open) return;
    setToastId(latest.id);
    const t = setTimeout(() => setToastId(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [latest, open]);

  return (
    <div className="dice-dock">
      {open && (
        <aside id="roll-log" className="roll-panel" aria-label="Dice rolls">
          <header className="roll-panel-head">
            <h2>Rolls</h2>
            <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close roll log">
              <CloseIcon />
            </button>
          </header>
          <ol className="roll-entries">
            {entries.length === 0 ? (
              <li className="roll-empty">Tap any bonus on the sheet to roll it. Pick Adv or Dis first for the next d20.</li>
            ) : (
              entries.map((e) => (
                <li key={e.id}>
                  <Entry entry={e} />
                </li>
              ))
            )}
          </ol>
          {entries.length > 0 && (
            <button type="button" className="link-button roll-clear" onClick={clear}>
              Clear rolls
            </button>
          )}
        </aside>
      )}

      <div className="sr-only" aria-live="polite">
        {latest?.result ? `${latest.label}: ${latest.result.total}` : latest?.message ?? ''}
      </div>
      {!open && latest && toastId === latest.id && (
        <div className="roll-toast" key={latest.id}>
          <Entry entry={latest} />
        </div>
      )}

      <div className="dock-row">
        <button
          type="button"
          className={`dice-button${mode !== 'normal' ? ` mode-${mode}` : ''}`}
          aria-expanded={open}
          aria-controls="roll-log"
          onClick={() => setOpen((o) => !o)}
          title="Roll history"
        >
          <D20Icon />
          <span className="sr-only">Roll history</span>
        </button>
        <div className="mode-toggle" role="group" aria-label="Next d20 roll">
          {MODES.map((m) => (
            <button key={m.mode} type="button" aria-pressed={mode === m.mode} title={m.title} onClick={() => setMode(m.mode)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
