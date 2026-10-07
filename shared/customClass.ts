// User-defined classes (homebrew or third-party books you own), entered as JSON.
// Stored in SQLite (server/libraries.ts) and merged into the class picker.
import { ABILITIES, SKILL_KEYS, type Ability, type SkillKey } from './rules.ts';
import type { Recharge, SrdClass, SrdSpell } from './srd.ts';
import { isObj, str, type Result } from './validate.ts';

export interface CustomSpellEntry {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevel: string;
}

export interface CustomLevelEntry {
  level: number;
  /** Names of features gained at this level (describe them in featureDescriptions). */
  features: string[];
  cantripsKnown: number;
  /** Spell slots for spell levels 1-9 at this character level. */
  slots: number[];
  /** Uses per resource key at this level, e.g. { "bond-points": 3 }. */
  resources: Record<string, number>;
}

/** The JSON shape you fill in and paste into the app. */
export interface CustomClassFile {
  _instructions?: string[];
  name: string;
  hitDie: number;
  savingThrows: Ability[];
  spellcastingAbility: Ability | null;
  skillChoices: { choose: number; from: SkillKey[] };
  proficiencies: string[];
  resources: { key: string; name: string; recharge: Recharge }[];
  levels: CustomLevelEntry[];
  featureDescriptions: Record<string, string>;
  spells: CustomSpellEntry[];
}

export const HIT_DICE = [4, 6, 8, 10, 12];
const RECHARGES: Recharge[] = ['short', 'long', 'none'];

const INSTRUCTIONS = [
  'Fill this in from your own copy of the book, then paste it into DnD Baumiond > Custom classes.',
  'Keys starting with _ are ignored. Everything here stays editable later.',
  `Abilities: ${ABILITIES.join(', ')}. Skills (skillChoices.from): ${SKILL_KEYS.join(', ')}.`,
  'hitDie: 4, 6, 8, 10 or 12. spellcastingAbility: an ability or null.',
  'levels: exactly 20 entries. slots = spell slots for spell levels 1-9 at that character level.',
  'resources: define each limited-use resource once (key, name, recharge: short | long | none), then give its uses per level in levels[n].resources, e.g. { "my-key": 2 }. Delete the blank example if you have none.',
  'featureDescriptions: { "Feature name": "what it does" }. Names must match the ones in levels[n].features.',
  'spells: class-specific spells. Rows with an empty name are skipped. They show up in the spell browser under this class.',
];

export const blankSpellEntry = (): CustomSpellEntry => ({
  name: '',
  level: 1,
  school: '',
  castingTime: '1 action',
  range: '',
  components: '',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  description: '',
  higherLevel: '',
});

export function customClassTemplate(name = 'Tamer'): CustomClassFile {
  return {
    _instructions: INSTRUCTIONS,
    name,
    hitDie: 8,
    savingThrows: [],
    spellcastingAbility: null,
    skillChoices: { choose: 2, from: [] },
    proficiencies: [],
    resources: [{ key: '', name: '', recharge: 'long' }],
    levels: Array.from({ length: 20 }, (_, i) => ({
      level: i + 1,
      features: [],
      cantripsKnown: 0,
      slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      resources: {},
    })),
    featureDescriptions: {},
    spells: [blankSpellEntry()],
  };
}

const int = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;

/** Shared by class files and spell collections. Rows with an empty name are skipped (blank template rows). */
export function parseSpellEntries(raw: unknown, path: string, errors: string[]): CustomSpellEntry[] {
  const spells: CustomSpellEntry[] = [];
  (Array.isArray(raw) ? raw : []).forEach((s, i) => {
    if (!isObj(s) || !str(s.name)) return;
    const level = int(s.level, 0, 9);
    if (level === null) errors.push(`${path}[${i}].level: 0 (cantrip) to 9.`);
    spells.push({
      ...blankSpellEntry(),
      name: str(s.name),
      level: level ?? 0,
      school: str(s.school),
      castingTime: str(s.castingTime),
      range: str(s.range),
      components: str(s.components),
      duration: str(s.duration),
      concentration: s.concentration === true,
      ritual: s.ritual === true,
      description: typeof s.description === 'string' ? s.description : '',
      higherLevel: typeof s.higherLevel === 'string' ? s.higherLevel : '',
    });
  });
  return spells;
}

/** Validate pasted JSON. Collects every problem so the user can fix them in one go. */
export function parseCustomClass(raw: unknown): Result<CustomClassFile> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ['The JSON must be an object like the template.'] };

  const name = str(raw.name);
  if (!name) errors.push('name: required.');

  const hitDie = int(raw.hitDie, 4, 12);
  if (hitDie === null || !HIT_DICE.includes(hitDie)) errors.push('hitDie: must be 4, 6, 8, 10 or 12.');

  const abilityList = (v: unknown, path: string): Ability[] => {
    if (!Array.isArray(v)) {
      errors.push(`${path}: must be a list like ["str", "con"].`);
      return [];
    }
    return v.filter((a, i) => {
      const ok = ABILITIES.includes(a as Ability);
      if (!ok) errors.push(`${path}[${i}]: "${String(a)}" is not one of ${ABILITIES.join(', ')}.`);
      return ok;
    }) as Ability[];
  };
  const savingThrows = abilityList(raw.savingThrows, 'savingThrows');

  let spellcastingAbility: Ability | null = null;
  if (raw.spellcastingAbility != null) {
    if (ABILITIES.includes(raw.spellcastingAbility as Ability)) spellcastingAbility = raw.spellcastingAbility as Ability;
    else errors.push(`spellcastingAbility: must be null or one of ${ABILITIES.join(', ')}.`);
  }

  const sc = isObj(raw.skillChoices) ? raw.skillChoices : {};
  const choose = int(sc.choose, 0, 18) ?? 0;
  const from = (Array.isArray(sc.from) ? sc.from : []).filter((s, i) => {
    const ok = SKILL_KEYS.includes(s as SkillKey);
    if (!ok) errors.push(`skillChoices.from[${i}]: "${String(s)}" is not a skill key (e.g. ${SKILL_KEYS.slice(0, 3).join(', ')}).`);
    return ok;
  }) as SkillKey[];

  const proficiencies = (Array.isArray(raw.proficiencies) ? raw.proficiencies : []).map(str).filter(Boolean);

  const resources: CustomClassFile['resources'] = [];
  (Array.isArray(raw.resources) ? raw.resources : []).forEach((r, i) => {
    if (!isObj(r) || (!str(r.key) && !str(r.name))) return; // blank template row
    const key = str(r.key);
    const rname = str(r.name);
    const recharge = r.recharge as Recharge;
    if (!key || !/^[a-z0-9-]+$/.test(key)) errors.push(`resources[${i}].key: use lowercase letters, digits and dashes.`);
    if (!rname) errors.push(`resources[${i}].name: required.`);
    if (!RECHARGES.includes(recharge)) errors.push(`resources[${i}].recharge: must be short, long or none.`);
    if (resources.some((x) => x.key === key)) errors.push(`resources[${i}].key: "${key}" is used twice.`);
    resources.push({ key, name: rname, recharge });
  });
  const resourceKeys = new Set(resources.map((r) => r.key));

  const levels: CustomLevelEntry[] = [];
  if (!Array.isArray(raw.levels) || raw.levels.length !== 20) {
    errors.push('levels: must contain exactly 20 entries (levels 1-20).');
  } else {
    raw.levels.forEach((l, i) => {
      const p = `levels[${i}]`;
      if (!isObj(l)) {
        errors.push(`${p}: must be an object.`);
        return;
      }
      if (l.level !== i + 1) errors.push(`${p}.level: expected ${i + 1}.`);
      const slots = Array.isArray(l.slots) ? l.slots : [];
      if (slots.length !== 9 || slots.some((s) => int(s, 0, 9) === null)) errors.push(`${p}.slots: nine whole numbers 0-9.`);
      const res: Record<string, number> = {};
      for (const [k, v] of Object.entries(isObj(l.resources) ? l.resources : {})) {
        if (!resourceKeys.has(k)) errors.push(`${p}.resources: "${k}" is not defined in resources.`);
        else if (int(v, 0, 99) === null) errors.push(`${p}.resources.${k}: a whole number 0-99.`);
        else res[k] = v as number;
      }
      levels.push({
        level: i + 1,
        features: (Array.isArray(l.features) ? l.features : []).map(str).filter(Boolean),
        cantripsKnown: int(l.cantripsKnown, 0, 20) ?? 0,
        slots: slots.map((s) => int(s, 0, 9) ?? 0),
        resources: res,
      });
    });
  }

  const featureDescriptions: Record<string, string> = {};
  for (const [k, v] of Object.entries(isObj(raw.featureDescriptions) ? raw.featureDescriptions : {})) {
    if (typeof v === 'string' && k.trim()) featureDescriptions[k.trim()] = v;
  }

  const spells = parseSpellEntries(raw.spells, 'spells', errors);
  const spellIds = new Set<string>();
  for (const s of spells) {
    if (spellIds.has(slug(s.name))) errors.push(`spells: "${s.name}" appears twice.`);
    spellIds.add(slug(s.name));
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      hitDie: hitDie!,
      savingThrows,
      spellcastingAbility,
      skillChoices: { choose, from },
      proficiencies,
      resources,
      levels,
      featureDescriptions,
      spells,
    },
  };
}

export const customClassIndex = (id: number) => `custom-${id}`;
/** Unicode-aware: "Čar" → "car", "Žar" → "zar" (an ASCII-only slug made both "ar"). */
export const slug = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

/** Own-property lookup, so names like "constructor" can't hit Object.prototype. */
const own = <V>(o: Record<string, V>, k: string): V | undefined => (Object.hasOwn(o, k) ? o[k] : undefined);

/** Present a stored custom class in the same shape as an SRD class. */
export function toSrdClass(id: number, f: CustomClassFile): SrdClass {
  return {
    index: customClassIndex(id),
    name: f.name,
    hitDie: f.hitDie,
    savingThrows: f.savingThrows,
    spellcastingAbility: f.spellcastingAbility,
    skillChoices: f.skillChoices,
    proficiencies: f.proficiencies,
    slots: f.levels.map((l) => l.slots),
    cantripsKnown: f.levels.map((l) => l.cantripsKnown),
    features: f.levels.flatMap((l) =>
      l.features.map((name) => ({ level: l.level, name, description: own(f.featureDescriptions, name) })),
    ),
    custom: { id },
    resources: f.resources.map((r) => ({ ...r, maxByLevel: f.levels.map((l) => own(l.resources, r.key) ?? 0) })),
  };
}

export function toSrdSpells(id: number, f: CustomClassFile): SrdSpell[] {
  return f.spells.map((s) => ({
    ...s,
    index: `custom-${id}-${slug(s.name)}`,
    classes: [f.name],
    source: f.name,
  }));
}

