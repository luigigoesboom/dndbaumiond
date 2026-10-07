import type { CustomClassFile } from '../shared/customClass.ts';
import type { SpellCollectionFile } from '../shared/customSpells.ts';
import { jsonLibrary } from './jsonLibrary.ts';

/** User-entered classes and spell collections (see server/jsonLibrary.ts). */
export const customClasses = jsonLibrary<CustomClassFile>('custom_classes');
export const spellCollections = jsonLibrary<SpellCollectionFile>('spell_collections');
