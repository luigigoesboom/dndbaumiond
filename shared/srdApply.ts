// Apply SRD picks to a character. Every function returns a new character and
// leaves the result fully editable ("the SRD helps, never cages").
import { zeroAbilities, type Character, type Resource, type Spell } from './character.ts';
import type { Ability } from './rules.ts';
import type { SrdBackground, SrdCatalog, SrdClass, SrdLineage, SrdSpell } from './srd.ts';

/**
 * Spell slot and class-resource maxima for the class at the character's level; spent counts are clamped.
 * Hand-added resources (classKey null) are left alone.
 */
export function syncSlots(c: Character, cls: SrdClass | undefined): Character {
  if (!cls) return c;
  const lvl = Math.min(20, Math.max(1, c.level)) - 1;
  const table = cls.slots[lvl];
  const classResources: Resource[] = (cls.resources ?? []).map((def) => {
    const existing = c.resources.find((r) => r.classKey === def.key);
    const max = def.maxByLevel[lvl] ?? 0;
    return {
      id: existing?.id ?? `class-${def.key}`,
      name: def.name,
      max,
      spent: Math.min(existing?.spent ?? 0, max),
      recharge: def.recharge,
      classKey: def.key,
    };
  });
  return {
    ...c,
    spellcasting: {
      ...c.spellcasting,
      slots: c.spellcasting.slots.map((s, i) => ({ max: table[i], spent: Math.min(s.spent, table[i]) })),
    },
    resources: [...classResources.filter((r) => r.max > 0), ...c.resources.filter((r) => r.classKey === null)],
  };
}

export function applyClass(c: Character, cls: SrdClass): Character {
  const armor = cls.proficiencies.filter((p) => /armor|shield/i.test(p)).join(', ');
  const weapons = cls.proficiencies.filter((p) => !/armor|shield/i.test(p)).join(', ');
  return syncSlots(
    {
      ...c,
      className: cls.name,
      srd: { ...c.srd, class: cls.index },
      savingThrows: cls.savingThrows,
      hitDice: { die: cls.hitDie, spent: Math.min(c.hitDice.spent, c.level) },
      spellcasting: { ...c.spellcasting, ability: cls.spellcastingAbility },
      proficiencies: { ...c.proficiencies, armor, weapons },
    },
    cls,
  );
}

/**
 * Swap entries in a comma-separated text field: drop what the previous pick added,
 * add what the new pick grants, keep everything the player typed themselves.
 */
export function swapListItems(text: string, remove: string[], add: string[]): string {
  const key = (s: string) => s.trim().toLowerCase();
  const removed = new Set(remove.map(key));
  const items = text.split(',').map((s) => s.trim()).filter((s) => s && !removed.has(key(s)));
  for (const a of add) if (!items.some((s) => key(s) === key(a))) items.push(a);
  return items.join(', ');
}

/**
 * Pick a race / species. Race bonuses (2014) go to `raceBonuses`, never touching the
 * player's own `abilityBonuses`; languages from the previous pick are swapped out.
 */
export function applyLineage(c: Character, lineage: SrdLineage, subIndex: string | null, previous?: SrdLineage): Character {
  const sub = lineage.subs.find((s) => s.index === subIndex) ?? null;
  const bonuses = zeroAbilities();
  if (c.ruleset === '2014') {
    for (const source of [lineage.abilityBonuses, sub?.abilityBonuses ?? {}]) {
      for (const [a, v] of Object.entries(source)) bonuses[a as Ability] += v ?? 0;
    }
  }
  return {
    ...c,
    race: lineage.name,
    subrace: sub?.name ?? '',
    srd: { ...c.srd, lineage: lineage.index, subLineage: sub?.index ?? null },
    speed: lineage.speed,
    raceBonuses: bonuses,
    proficiencies: {
      ...c.proficiencies,
      languages: swapListItems(c.proficiencies.languages, previous?.languages ?? [], lineage.languages),
    },
  };
}

/** Clear the race link (switching to a custom race): its bonuses and languages go too. */
export function clearLineage(c: Character, previous?: SrdLineage): Character {
  return {
    ...c,
    srd: { ...c.srd, lineage: null, subLineage: null },
    raceBonuses: zeroAbilities(),
    proficiencies: { ...c.proficiencies, languages: swapListItems(c.proficiencies.languages, previous?.languages ?? [], []) },
  };
}

/**
 * Pick a background (or null for a custom one). Skills and tools granted by the previous
 * background are removed first, unless the player raised a skill to expertise.
 */
export function applyBackground(c: Character, bg: SrdBackground | null, previous?: SrdBackground): Character {
  const skills = { ...c.skills };
  for (const s of previous?.skills ?? []) if (skills[s] === 'proficient') delete skills[s];
  for (const s of bg?.skills ?? []) if ((skills[s] ?? 'none') === 'none') skills[s] = 'proficient';
  return {
    ...c,
    background: bg ? bg.name : c.background,
    srd: { ...c.srd, background: bg?.index ?? null },
    skills,
    proficiencies: {
      ...c.proficiencies,
      tools: swapListItems(c.proficiencies.tools, previous?.tools ?? [], bg?.tools ?? []),
    },
  };
}

/** Features & traits implied by the SRD picks, derived on render (never stored). */
export interface DerivedFeature {
  name: string;
  level?: number;
  description?: string;
}

export function derivedFeatures(c: Character, catalog: SrdCatalog | null): { source: string; features: DerivedFeature[] }[] {
  if (!catalog) return [];
  const out: { source: string; features: DerivedFeature[] }[] = [];
  const named = (names: string[]) => names.map((name) => ({ name }));
  const cls = catalog.classes.find((x) => x.index === c.srd.class);
  if (cls) {
    const seen = new Set<string>();
    const features = cls.features.filter((f) => f.level <= c.level && !seen.has(f.name) && seen.add(f.name));
    out.push({ source: `${cls.name} ${c.level}`, features });
  }
  const lineage = catalog.lineages.find((x) => x.index === c.srd.lineage);
  if (lineage) {
    const sub = lineage.subs.find((s) => s.index === c.srd.subLineage);
    out.push({ source: sub?.name ?? lineage.name, features: named([...lineage.traits, ...(sub?.traits ?? [])]) });
  }
  const bg = catalog.backgrounds.find((x) => x.index === c.srd.background);
  if (bg?.feature) out.push({ source: bg.name, features: named([bg.feature]) });
  return out.filter((group) => group.features.length > 0);
}

export function spellFromSrd(s: SrdSpell, id: string): Spell {
  return {
    id,
    srdIndex: s.index,
    name: s.name,
    level: s.level,
    school: s.school,
    castingTime: s.castingTime,
    range: s.range,
    components: s.components,
    duration: s.duration,
    concentration: s.concentration,
    ritual: s.ritual,
    description: s.description,
    higherLevel: s.higherLevel,
    prepared: s.level === 0,
  };
}

export function blankSpell(id: string, level = 1): Spell {
  return {
    id,
    srdIndex: null,
    name: '',
    level,
    school: '',
    castingTime: '1 action',
    range: '',
    components: '',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    description: '',
    higherLevel: '',
    prepared: true,
  };
}
