import { newId } from '../../shared/id.ts';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { roll, rollD20, type RollMode, type RollResult } from '../../shared/dice.ts';

export interface LogEntry {
  id: string;
  label: string;
  kind: 'check' | 'damage' | 'heal' | 'error';
  mode: RollMode;
  result: RollResult | null;
  message?: string;
}

interface RollApi {
  entries: LogEntry[];
  mode: RollMode;
  setMode: (mode: RollMode) => void;
  /** d20 + bonus. Advantage/disadvantage applies to this roll only, then resets. */
  rollCheck: (label: string, bonus: number) => RollResult;
  /** Arbitrary dice notation ("2d6+3"). Returns null and logs an error when unreadable. */
  rollDice: (label: string, expression: string, kind?: 'damage' | 'heal') => RollResult | null;
  clear: () => void;
}

const RollCtx = createContext<RollApi | null>(null);
const MAX_ENTRIES = 50;

export function RollProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [mode, setMode] = useState<RollMode>('normal');

  const push = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setEntries((list) => [{ ...entry, id: newId() }, ...list].slice(0, MAX_ENTRIES));
  }, []);

  const rollCheck = useCallback(
    (label: string, bonus: number) => {
      const result = rollD20(bonus, mode);
      push({ label, kind: 'check', mode, result });
      setMode('normal');
      return result;
    },
    [mode, push],
  );

  const rollDice = useCallback(
    (label: string, expression: string, kind: 'damage' | 'heal' = 'damage') => {
      const result = roll(expression);
      if (!result) {
        push({ label, kind: 'error', mode: 'normal', result: null, message: `Couldn't read “${expression}” as dice. Try something like 1d8+3.` });
        return null;
      }
      push({ label, kind, mode: 'normal', result });
      return result;
    },
    [push],
  );

  const value = useMemo<RollApi>(
    () => ({ entries, mode, setMode, rollCheck, rollDice, clear: () => setEntries([]) }),
    [entries, mode, rollCheck, rollDice],
  );
  return <RollCtx.Provider value={value}>{children}</RollCtx.Provider>;
}

export function useRoll(): RollApi {
  const ctx = useContext(RollCtx);
  if (!ctx) throw new Error('useRoll must be used inside <RollProvider>');
  return ctx;
}
