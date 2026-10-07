import { useEffect, useState } from 'react';
import type { Ruleset, SrdCatalog, SrdSpell } from '../shared/srd.ts';

// Module-level caches: each ruleset is fetched at most once per page load.
const catalogs = new Map<Ruleset, Promise<SrdCatalog>>();
const spellLists = new Map<Ruleset, Promise<SrdSpell[]>>();

/** Custom classes are merged into the catalog server-side; call this after editing one. */
export function invalidateSrd(): void {
  catalogs.clear();
  spellLists.clear();
}

function fetchJson<T>(url: string): Promise<T> {
  // 'no-cache' = always revalidate: custom classes can change while a browser holds an older copy.
  return fetch(url, { cache: 'no-cache' }).then((res) => {
    if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
    return res.json() as Promise<T>;
  });
}

function cached<T>(cache: Map<Ruleset, Promise<T>>, ruleset: Ruleset, url: string): Promise<T> {
  let p = cache.get(ruleset);
  if (!p) {
    p = fetchJson<T>(url);
    p.catch(() => cache.delete(ruleset)); // allow a retry after a failure
    cache.set(ruleset, p);
  }
  return p;
}

/** `load` must be fully determined by `key`; an empty key loads nothing. */
function useCached<T>(load: () => Promise<T>, key: string): T | null {
  const [state, setState] = useState<{ key: string; value: T } | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    load().then((value) => live && setState({ key, value }), console.error);
    return () => {
      live = false;
    };
  }, [key]); // load is derived from key (see doc comment)
  return state?.key === key ? state.value : null;
}

export const useCatalog = (ruleset: Ruleset) =>
  useCached(() => cached(catalogs, ruleset, `/api/srd/${ruleset}`), ruleset);

/** The full spell list is ~400-500 KB, so it only loads once `enabled` (the browser is opened). */
export const useSpellList = (ruleset: Ruleset, enabled: boolean) =>
  useCached(() => cached(spellLists, ruleset, `/api/srd/${ruleset}/spells`), enabled ? ruleset : '');
