import { useEffect, useRef, useState } from 'react';
import type { Character } from '../../shared/character.ts';
import { api } from '../api.ts';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced save of the whole character document. The first non-null value is
 * treated as "already saved" (it's what we just loaded). Pending edits are
 * flushed on unmount so navigating away never loses the last keystroke.
 */
export function useAutosave(id: number, character: Character | null, delayMs = 600): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const lastSaved = useRef<Character | null>(null);
  const latest = useRef<Character | null>(null);

  useEffect(() => {
    latest.current = character;
    if (!character) return;
    if (lastSaved.current === null) {
      lastSaved.current = character;
      return;
    }
    if (character === lastSaved.current) return;

    const timer = setTimeout(() => {
      setStatus('saving');
      api.save(id, character).then(
        () => {
          lastSaved.current = character;
          setStatus('saved');
        },
        () => setStatus('error'),
      );
    }, delayMs);
    return () => clearTimeout(timer);
  }, [id, character, delayMs]);

  useEffect(
    () => () => {
      const pending = latest.current;
      if (pending && lastSaved.current && pending !== lastSaved.current) void api.save(id, pending);
    },
    [id],
  );

  return status;
}
