// User-defined spell collections: a named list of spells (homebrew or from books you own),
// each tagged with the classes that can learn it. Stored in SQLite (server/customSpellRepo.ts)
// and merged into the spell browser.
import {
  blankSpellEntry,
  isObj,
  parseSpellEntries,
  str,
  type CustomSpellEntry,
  type Result,
} from './customClass.ts';
import type { SrdSpell } from './srd.ts';

export interface CollectionSpell extends CustomSpellEntry {
  /** Class names exactly as they appear in the class picker, e.g. ["Tamer", "Druid"]. */
  classes: string[];
}

export interface SpellCollectionFile {
  _instructions?: string[];
  name: string;
  spells: CollectionSpell[];
}

export interface SpellCollectionRecord {
  id: number;
  name: string;
  data: SpellCollectionFile;
  updatedAt: string;
}

const INSTRUCTIONS = [
  'A collection of spells from your own books or homebrew. Fill it in, then paste or import it under Custom spells.',
  'Keys starting with _ are ignored. Copy the example spell object once per spell; rows with an empty name are skipped.',
  'level: 0 for cantrips, 1-9 otherwise. concentration / ritual: true or false.',
  'classes: class names exactly as they appear in the class picker (SRD classes like "Wizard", or your custom ones like "Tamer"). The spell browser shows the spell for those classes; leave it empty to show it for everyone.',
  'components: free text, e.g. "V, S, M (a pinch of salt)".',
];

export function spellCollectionTemplate(name = 'My spells'): SpellCollectionFile {
  return {
    _instructions: INSTRUCTIONS,
    name,
    spells: [{ ...blankSpellEntry(), classes: [] }],
  };
}

export function parseSpellCollection(raw: unknown): Result<SpellCollectionFile> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ['The JSON must be an object like the template.'] };
  const name = str(raw.name);
  if (!name) errors.push('name: required (the collection name, e.g. the book title).');
  if (!Array.isArray(raw.spells)) errors.push('spells: must be a list of spell objects.');

  const rows = Array.isArray(raw.spells) ? raw.spells : [];
  const entries = parseSpellEntries(rows, 'spells', errors);
  // parseSpellEntries skips blank rows, so match class lists back up by name.
  const named = rows.filter((s) => isObj(s) && str(s.name)) as Record<string, unknown>[];
  const spells: CollectionSpell[] = entries.map((s, i) => {
    const cls = named[i]?.classes;
    if (cls !== undefined && !Array.isArray(cls)) errors.push(`spells "${s.name}": classes must be a list like ["Tamer"].`);
    return { ...s, classes: (Array.isArray(cls) ? cls : []).map(str).filter(Boolean) };
  });

  const seen = new Set<string>();
  for (const s of spells) {
    const key = s.name.toLowerCase();
    if (seen.has(key)) errors.push(`spells: "${s.name}" appears twice.`);
    seen.add(key);
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { name, spells } };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function collectionToSrdSpells(id: number, f: SpellCollectionFile): SrdSpell[] {
  return f.spells.map((s) => ({
    ...s,
    index: `set-${id}-${slug(s.name)}`,
    source: f.name,
  }));
}
