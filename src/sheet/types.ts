import type { Character } from '../../shared/character.ts';
import type { SrdCatalog } from '../../shared/srd.ts';

/** Functional updater, so concurrent edits never clobber each other. */
export type Update = (fn: (prev: Character) => Character) => void;

export interface SheetProps {
  c: Character;
  update: Update;
  /** SRD data for the character's ruleset; null while loading. */
  catalog: SrdCatalog | null;
}

/** `field('race')` returns an onChange handler that sets that top-level field. */
export const fieldSetter =
  (update: Update) =>
  <K extends keyof Character>(key: K) =>
  (value: Character[K]) =>
    update((prev) => ({ ...prev, [key]: value }));

/** Same as fieldSetter, one level down: `nested('proficiencies')('tools')`. */
export const nestedSetter =
  (update: Update) =>
  <K extends 'proficiencies' | 'personality' | 'currency'>(key: K) => // not hp: HP changes go through withHp()
  <F extends keyof Character[K]>(field: F) =>
  (value: Character[K][F]) =>
    update((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

/** Merge a patch into the list entry with this id. */
export const patchById = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const removeById = <T extends { id: string }>(list: T[], id: string): T[] => list.filter((x) => x.id !== id);
