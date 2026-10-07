import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character, CharacterRecord } from '../../shared/character.ts';
import { ApiError, api } from '../api.ts';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

const DEBOUNCE_MS = 600;
const RETRY_MIN_MS = 2000;
const RETRY_MAX_MS = 30_000;

/**
 * Loads a character and keeps it saved.
 *
 * - Edits are debounced, and only one save is ever in flight; when it lands, the newest
 *   version is sent next (so an older save can never overwrite a newer one).
 * - Each save carries the version it was based on. If someone else saved in between,
 *   the server answers 409: saving pauses with status 'conflict' until the player picks
 *   `reloadFromServer` (take theirs) or `overwriteServer` (keep mine).
 * - Failed saves retry with backoff. Closing the tab tries a keepalive save and warns
 *   while anything is unsaved.
 */
export function useCharacterDoc(id: number) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');

  const version = useRef(0);
  const latest = useRef<Character | null>(null); // what the player sees
  const saved = useRef<Character | null>(null); // what the server has
  const inFlight = useRef(false);
  const paused = useRef(false); // conflict: don't save until resolved
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retry = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retryDelay = useRef(RETRY_MIN_MS);

  const accept = useCallback((record: CharacterRecord) => {
    version.current = record.version;
    saved.current = record.data;
    latest.current = record.data;
    paused.current = false;
    setCharacter(record.data);
  }, []);

  const flush = useCallback(
    async (overwrite = false): Promise<void> => {
      clearTimeout(debounce.current);
      const doc = latest.current;
      if (inFlight.current || (paused.current && !overwrite) || !doc || doc === saved.current) return;
      inFlight.current = true;
      setStatus('saving');
      let again = false;
      try {
        const record = await api.save(id, doc, overwrite ? null : version.current);
        version.current = record.version;
        saved.current = doc;
        paused.current = false;
        retryDelay.current = RETRY_MIN_MS;
        again = latest.current !== doc; // edited while this save was in flight
        setStatus(again ? 'saving' : 'saved');
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          paused.current = true;
          setStatus('conflict');
        } else {
          setStatus('error');
          clearTimeout(retry.current);
          retry.current = setTimeout(() => void flush(), retryDelay.current);
          retryDelay.current = Math.min(RETRY_MAX_MS, retryDelay.current * 2);
        }
      } finally {
        inFlight.current = false;
      }
      if (again) void flush();
    },
    [id],
  );

  // Load (again whenever the id changes).
  useEffect(() => {
    let cancelled = false;
    api.get(id).then(
      (record) => !cancelled && accept(record),
      (e: Error) => !cancelled && setLoadError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [id, accept]);

  // Debounced save after every edit.
  useEffect(() => {
    latest.current = character;
    if (!character || character === saved.current || paused.current) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [character, flush]);

  // Leaving the sheet inside the app: save immediately. Closing the tab: keepalive + warning.
  useEffect(() => {
    const dirty = () => latest.current !== null && latest.current !== saved.current;
    const onPageHide = () => {
      if (dirty() && !paused.current && !inFlight.current && latest.current) {
        if (api.saveOnExit(id, latest.current, version.current)) saved.current = latest.current;
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty()) return;
      void flush();
      e.preventDefault();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearTimeout(debounce.current);
      clearTimeout(retry.current);
      if (dirty()) void flush();
    };
  }, [id, flush]);

  const update = useCallback((fn: (prev: Character) => Character) => setCharacter((prev) => prev && fn(prev)), []);

  /** Conflict resolution: discard local edits and load what's on the server. */
  const reloadFromServer = useCallback(async () => {
    try {
      accept(await api.get(id));
      setStatus('idle');
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [id, accept]);

  /** Conflict resolution: write the local copy over the server's. */
  const overwriteServer = useCallback(() => flush(true), [flush]);

  return { character, loadError, status, update, reloadFromServer, overwriteServer };
}
