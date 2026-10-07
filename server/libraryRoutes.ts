import { customClassTemplate, parseCustomClass } from '../shared/customClass.ts';
import { parseSpellCollection, spellCollectionTemplate } from '../shared/customSpells.ts';
import { customClasses, spellCollections } from './libraries.ts';
import { jsonLibraryRouter } from './jsonLibrary.ts';

export const customClassRouter = jsonLibraryRouter(customClasses, parseCustomClass, customClassTemplate, 'class');
export const spellCollectionRouter = jsonLibraryRouter(
  spellCollections,
  parseSpellCollection,
  spellCollectionTemplate,
  'spell collection',
);
