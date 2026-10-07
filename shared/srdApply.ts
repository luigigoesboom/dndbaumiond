// Apply SRD picks to a character. Every function returns a new character and
// leaves the result fully editable ("the SRD helps, never cages").
import type { Character, Resource, Spell } from './character.ts';
import { ABILITIES, type Ability } from './rules.ts';
import type { SrdBackground, SrdCatalog, SrdClass, SrdLineage, SrdSpell } from './srd.ts';

const zero = (): Record<Ability, number> => Object.fromEntries(ABILITIES.map((a) => [a, 0])) as Record<Ability, number>;

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

export function applyLineage(c: Character, lineage: SrdLineage, subIndex: string | null): Character {
  const sub = lineage.subs.find((s) => s.index === subIndex) ?? null;
  const bonuses = zero();
  for (const source of [lineage.abilityBonuses, sub?.abilityBonuses ?? {}]) {
    for (const [a, v] of Object.entries(source)) bonuses[a as Ability] += v ?? 0;
  }
  return {
    ...c,
    race: lineage.name,
    subrace: sub?.name ?? '',
    srd: { ...c.srd, lineage: lineage.index, subLineage: sub?.index ?? null },
    speed: lineage.speed,
    // 2024 species grant no ability bonuses; keep whatever the background set.
    abilityBonuses: c.ruleset === '2014' ? bonuses : c.abilityBonuses,
    proficiencies: {
      ...c.proficiencies,
      languages: lineage.languages.length ? lineage.languages.join(', ') : c.proficiencies.languages,
    },
  };
}

export function applyBackground(c: Character, bg: SrdBackground): Character {
  const skills = { ...c.skills };
  for (const s of bg.skills) if ((skills[s] ?? 'none') === 'none') skills[s] = 'proficient';
  return {
    ...c,
    background: bg.name,
    srd: { ...c.srd, background: bg.index },
    skills,
    proficiencies: {
      ...c.proficiencies,
      tools: [c.proficiencies.tools, ...bg.tools].filter(Boolean).join(', '),
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
