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
  <K extends 'proficiencies' | 'personality' | 'hp' | 'currency'>(key: K) =>
  <F extends keyof Character[K]>(field: F) =>
  (value: Character[K][F]) =>
    update((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
