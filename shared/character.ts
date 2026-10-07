// The character document. Stored as a single JSON blob in SQLite (see server/db.ts).
import { newId } from './id.ts';
import { ABILITIES, SKILL_KEYS, type Ability, type Proficiency, type SkillKey } from './rules.ts';
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
  /** Bonuses from the (2014) race / subrace; filled by the race picker. */
  raceBonuses: Record<Ability, number>;
  /** Everything else the player adds: background (2024), feats, ASIs, items. The picker never touches it. */
  abilityBonuses: Record<Ability, number>;
  attacksPerAction: number;
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
  /** Bumped on every save; used to detect edits from another tab or player. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const zeroAbilities = (): Record<Ability, number> => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
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
    raceBonuses: zeroAbilities(),
    abilityBonuses: zeroAbilities(),
    attacksPerAction: 1,
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

// ---------- Normalization ----------
// Every read and write goes through normalizeCharacter, so documents from older app
// versions (or hand-made / hostile requests) always come out in the current, valid
// shape: unknown keys dropped, wrong types replaced by defaults, list entries checked.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown): Obj => (isObj(v) ? v : {});
const txt = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown): boolean => v === true;
function num(v: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}
const nullableTxt = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const ability = (v: unknown): Ability | null => (ABILITIES.includes(v as Ability) ? (v as Ability) : null);
const RECHARGES: Recharge[] = ['short', 'long', 'none'];
const PROFICIENCIES: Proficiency[] = ['none', 'proficient', 'expertise'];

function abilityRecord(v: unknown, fallback: number, min: number, max: number): Record<Ability, number> {
  const o = obj(v);
  return Object.fromEntries(ABILITIES.map((a) => [a, num(o[a], fallback, min, max)])) as Record<Ability, number>;
}

/** Keep only object entries, normalize each, and give every entry a unique id. */
function list<T extends { id: string }>(v: unknown, normalizeItem: (o: Obj) => T): T[] {
  const seen = new Set<string>();
  return (Array.isArray(v) ? v : []).filter(isObj).map((o) => {
    const item = normalizeItem(o);
    if (!item.id || seen.has(item.id)) item.id = newId();
    seen.add(item.id);
    return item;
  });
}

function normalizeHp(v: unknown, d: HitPoints): HitPoints {
  const o = obj(v);
  return { max: num(o.max, d.max, 1, 9999), current: num(o.current, d.current, 0, 9999), temp: num(o.temp, d.temp, 0, 9999) };
}

function normalizeSpell(o: Obj): Spell {
  return {
    id: txt(o.id),
    srdIndex: nullableTxt(o.srdIndex),
    name: txt(o.name),
    level: num(o.level, 0, 0, 9),
    school: txt(o.school),
    castingTime: txt(o.castingTime),
    range: txt(o.range),
    components: txt(o.components),
    duration: txt(o.duration),
    concentration: bool(o.concentration),
    ritual: bool(o.ritual),
    description: txt(o.description),
    higherLevel: txt(o.higherLevel),
    prepared: bool(o.prepared),
  };
}

export function normalizeCharacter(raw: unknown): Character {
  const d = defaultCharacter();
  if (!isObj(raw)) return d;
  const r = raw;
  const srd = obj(r.srd);
  const hitDice = obj(r.hitDice);
  const deathSaves = obj(r.deathSaves);
  const prof = obj(r.proficiencies);
  const persona = obj(r.personality);
  const currency = obj(r.currency);
  const casting = obj(r.spellcasting);
  const slots = Array.isArray(casting.slots) ? casting.slots : [];
  const skills = obj(r.skills);
  const level = num(r.level, d.level, 1, 20);

  return {
    ruleset: isRuleset(r.ruleset) ? r.ruleset : d.ruleset,
    srd: {
      class: nullableTxt(srd.class),
      lineage: nullableTxt(srd.lineage),
      subLineage: nullableTxt(srd.subLineage),
      background: nullableTxt(srd.background),
    },
    name: txt(r.name, d.name),
    race: txt(r.race),
    subrace: txt(r.subrace),
    className: txt(r.className),
    subclass: txt(r.subclass),
    level,
    background: txt(r.background),
    alignment: txt(r.alignment),
    xp: num(r.xp, 0, 0),
    abilities: abilityRecord(r.abilities, 10, 1, 30),
    raceBonuses: abilityRecord(r.raceBonuses, 0, -10, 10),
    abilityBonuses: abilityRecord(r.abilityBonuses, 0, -10, 20),
    attacksPerAction: num(r.attacksPerAction, 1, 1, 10),
    savingThrows: [...new Set((Array.isArray(r.savingThrows) ? r.savingThrows : []).map(ability).filter((a) => a !== null))],
    skills: Object.fromEntries(
      SKILL_KEYS.filter((k) => PROFICIENCIES.includes(skills[k] as Proficiency) && skills[k] !== 'none').map((k) => [k, skills[k]]),
    ) as Partial<Record<SkillKey, Proficiency>>,
    armorClass: num(r.armorClass, d.armorClass, 0, 99),
    speed: num(r.speed, d.speed, 0, 999),
    hp: normalizeHp(r.hp, d.hp),
    hitDice: { die: num(hitDice.die, d.hitDice.die, 2, 20), spent: num(hitDice.spent, 0, 0, level) },
    deathSaves: { successes: num(deathSaves.successes, 0, 0, 3), failures: num(deathSaves.failures, 0, 0, 3) },
    inspiration: bool(r.inspiration),
    conditions: [...new Set((Array.isArray(r.conditions) ? r.conditions : []).filter((x): x is string => typeof x === 'string'))],
    exhaustion: num(r.exhaustion, 0, 0, 6),
    defenses: txt(r.defenses),
    proficiencies: { armor: txt(prof.armor), weapons: txt(prof.weapons), tools: txt(prof.tools), languages: txt(prof.languages) },
    attacks: list(r.attacks, (o) => ({
      id: txt(o.id),
      name: txt(o.name),
      ability: ability(o.ability) ?? 'str',
      proficient: bool(o.proficient),
      damage: txt(o.damage),
      damageType: txt(o.damageType),
      range: txt(o.range),
      notes: txt(o.notes),
    })),
    resources: list(r.resources, (o) => {
      const max = num(o.max, 1, 0, 99);
      return {
        id: txt(o.id),
        name: txt(o.name),
        max,
        spent: num(o.spent, 0, 0, max),
        recharge: RECHARGES.includes(o.recharge as Recharge) ? (o.recharge as Recharge) : 'long',
        classKey: nullableTxt(o.classKey),
      };
    }),
    companions: list(r.companions, (o) => ({
      ...newCompanion(txt(o.id)),
      name: txt(o.name),
      kind: txt(o.kind),
      armorClass: num(o.armorClass, 10, 0, 99),
      hp: normalizeHp(o.hp, d.hp),
      speed: txt(o.speed),
      abilities: abilityRecord(o.abilities, 10, 1, 30),
      attacks: list(o.attacks, (a) => ({
        id: txt(a.id),
        name: txt(a.name),
        toHit: num(a.toHit, 0, -20, 30),
        damage: txt(a.damage),
        damageType: txt(a.damageType),
      })),
      senses: txt(o.senses),
      notes: txt(o.notes),
    })),
    spellcasting: {
      ability: ability(casting.ability),
      slots: d.spellcasting.slots.map((_, i) => {
        const s = obj(slots[i]);
        const max = num(s.max, 0, 0, 9);
        return { max, spent: num(s.spent, 0, 0, max) };
      }),
    },
    spells: list(r.spells, normalizeSpell),
    inventory: list(r.inventory, (o) => ({
      id: txt(o.id),
      name: txt(o.name),
      quantity: num(o.quantity, 1, 0, 99999),
      weight: num(o.weight, 0, 0, 99999),
      equipped: bool(o.equipped),
    })),
    currency: { cp: num(currency.cp, 0, 0), sp: num(currency.sp, 0, 0), ep: num(currency.ep, 0, 0), gp: num(currency.gp, 0, 0), pp: num(currency.pp, 0, 0) },
    personality: { traits: txt(persona.traits), ideals: txt(persona.ideals), bonds: txt(persona.bonds), flaws: txt(persona.flaws) },
    appearance: txt(r.appearance),
    features: txt(r.features),
    notes: txt(r.notes),
  };
}
