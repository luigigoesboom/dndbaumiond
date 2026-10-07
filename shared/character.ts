// The character document. Stored as a single JSON blob in SQLite (see server/db.ts).
import { ABILITIES, type Ability, type Proficiency, type SkillKey } from './rules.ts';
import { isRuleset, type Recharge, type Ruleset } from './srd.ts';

export interface HitPoints {
  max: number;
  current: number;
  temp: number;
}

export interface Attack {
  id: string;
  name: string;
  ability: Ability;
  proficient: boolean;
  damage: string;
  damageType: string;
  /** Added later; older documents may lack these. */
  range?: string;
  notes?: string;
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  equipped: boolean;
}

export type Coin = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

/** A spell on the sheet. SRD spells are copied in (snapshot), custom ones are typed in. */
export interface Spell {
  id: string;
  srdIndex: string | null;
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
  prepared: boolean;
}

export interface SpellSlot {
  max: number;
  spent: number;
}

/** A limited-use counter (class resource or anything the player wants to track). */
export interface Resource {
  id: string;
  name: string;
  max: number;
  spent: number;
  recharge: Recharge;
  /** The class resource key it came from; null for resources added by hand. */
  classKey: string | null;
}

export interface CompanionAttack {
  id: string;
  name: string;
  toHit: number;
  damage: string;
  damageType: string;
}

/** A tamed monster, pet, familiar or steed with its own small stat block. */
export interface Companion {
  id: string;
  name: string;
  kind: string;
  armorClass: number;
  hp: HitPoints;
  speed: string;
  abilities: Record<Ability, number>;
  attacks: CompanionAttack[];
  senses: string;
  notes: string;
}

export interface Character {
  ruleset: Ruleset;
  /** SRD indices behind the display names below; null when custom. */
  srd: { class: string | null; lineage: string | null; subLineage: string | null; background: string | null };

  name: string;
  race: string;
  subrace: string;
  className: string;
  subclass: string;
  level: number;
  background: string;
  alignment: string;
  xp: number;

  /** Base scores (point buy / rolled). */
  abilities: Record<Ability, number>;
  /** Racial, background and other bonuses added on top of the base score. */
  abilityBonuses: Record<Ability, number>;
  savingThrows: Ability[];
  skills: Partial<Record<SkillKey, Proficiency>>;

  armorClass: number;
  speed: number;
  hp: HitPoints;
  hitDice: { die: number; spent: number };
  deathSaves: { successes: number; failures: number };
  inspiration: boolean;
  conditions: string[];
  exhaustion: number;
  defenses: string;

  proficiencies: { armor: string; weapons: string; tools: string; languages: string };

  attacks: Attack[];
  resources: Resource[];
  companions: Companion[];
  spellcasting: { ability: Ability | null; slots: SpellSlot[] };
  spells: Spell[];
  inventory: Item[];
  currency: Record<Coin, number>;

  personality: { traits: string; ideals: string; bonds: string; flaws: string };
  appearance: string;
  features: string;
  notes: string;
}

/** Row shape for the character list (served from generated columns). */
export interface CharacterSummary {
  id: number;
  name: string;
  race: string;
  className: string;
  level: number;
  updatedAt: string;
}

export interface CharacterRecord {
  id: number;
  data: Character;
  createdAt: string;
  updatedAt: string;
}

const zeroAbilities = (): Record<Ability, number> => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
const emptySlots = (): SpellSlot[] => Array.from({ length: 9 }, () => ({ max: 0, spent: 0 }));

export function defaultCharacter(): Character {
  return {
    ruleset: '2014',
    srd: { class: null, lineage: null, subLineage: null, background: null },
    name: 'New Character',
    race: '',
    subrace: '',
    className: '',
    subclass: '',
    level: 1,
    background: '',
    alignment: '',
    xp: 0,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    abilityBonuses: zeroAbilities(),
    savingThrows: [],
    skills: {},
    armorClass: 10,
    speed: 30,
    hp: { max: 10, current: 10, temp: 0 },
    hitDice: { die: 8, spent: 0 },
    deathSaves: { successes: 0, failures: 0 },
    inspiration: false,
    conditions: [],
    exhaustion: 0,
    defenses: '',
    proficiencies: { armor: '', weapons: '', tools: '', languages: '' },
    attacks: [],
    resources: [],
    companions: [],
    spellcasting: { ability: null, slots: emptySlots() },
    spells: [],
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    personality: { traits: '', ideals: '', bonds: '', flaws: '' },
    appearance: '',
    features: '',
    notes: '',
  };
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function newCompanion(id: string): Companion {
  return {
    id,
    name: 'New companion',
    kind: '',
    armorClass: 10,
    hp: { max: 10, current: 10, temp: 0 },
    speed: '30 ft.',
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    attacks: [],
    senses: '',
    notes: '',
  };
}

/**
 * Fill in any missing fields with defaults. Run on every read and write so that
 * documents saved by older versions of the app keep working as the shape grows.
 */
export function normalizeCharacter(raw: unknown): Character {
  const d = defaultCharacter();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<Character>;
  const slots = arr<SpellSlot>(r.spellcasting?.slots);
  return {
    ...d,
    ...r,
    ruleset: isRuleset(r.ruleset) ? r.ruleset : d.ruleset,
    srd: { ...d.srd, ...r.srd },
    abilities: { ...d.abilities, ...r.abilities },
    abilityBonuses: { ...d.abilityBonuses, ...r.abilityBonuses },
    savingThrows: arr<Ability>(r.savingThrows).filter((a) => ABILITIES.includes(a)),
    skills: { ...r.skills },
    hp: { ...d.hp, ...r.hp },
    hitDice: { ...d.hitDice, ...r.hitDice },
    deathSaves: { ...d.deathSaves, ...r.deathSaves },
    conditions: arr<string>(r.conditions),
    proficiencies: { ...d.proficiencies, ...r.proficiencies },
    attacks: arr<Attack>(r.attacks),
    resources: arr<Resource>(r.resources),
    companions: arr<Companion>(r.companions).map((x) => ({
      ...newCompanion(x.id ?? ''),
      ...x,
      hp: { ...d.hp, ...x.hp },
      abilities: { ...d.abilities, ...x.abilities },
      attacks: arr<CompanionAttack>(x.attacks),
    })),
    spellcasting: {
      ability: r.spellcasting?.ability ?? null,
      slots: d.spellcasting.slots.map((s, i) => ({ ...s, ...slots[i] })),
    },
    spells: arr<Spell>(r.spells),
    inventory: arr<Item>(r.inventory),
    currency: { ...d.currency, ...r.currency },
    personality: { ...d.personality, ...r.personality },
  };
}
