// Loads the raw 5e-bits SRD JSON and reshapes it into the compact catalogs in
// shared/srd.ts. Raw shapes differ between the 2014 and 2024 datasets, so every
// accessor below is deliberately defensive. Results are cached per ruleset.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ABILITIES, SKILLS, SKILL_KEYS, type Ability, type SkillKey } from '../shared/rules.ts';
import type {
  Ruleset,
  SrdBackground,
  SrdCatalog,
  SrdClass,
  SrdCondition,
  SrdLineage,
  SrdSpell,
} from '../shared/srd.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw third-party JSON
type Raw = any;

const RAW_DIR = path.resolve('srd', 'raw');

function load(ruleset: Ruleset, name: string): Raw[] {
  return JSON.parse(readFileSync(path.join(RAW_DIR, ruleset, `5e-SRD-${name}.json`), 'utf8'));
}

const asAbility = (index: unknown): Ability | null =>
  ABILITIES.includes(index as Ability) ? (index as Ability) : null;

const SKILL_BY_NAME = new Map(SKILL_KEYS.map((k) => [SKILLS[k].name.toLowerCase(), k]));

/** "Skill: Animal Handling" -> "animalHandling" */
function skillFromProficiency(name: string): SkillKey | null {
  const m = /^skill:\s*(.+)$/i.exec(name);
  return m ? (SKILL_BY_NAME.get(m[1].trim().toLowerCase()) ?? null) : null;
}

const text = (v: unknown): string => (Array.isArray(v) ? v.join('\n\n') : typeof v === 'string' ? v : '');
const stripMarkdown = (s: string) => s.replace(/\*\*/g, '').replace(/^- /gm, '• ');

function bonuses(list: Raw[] | undefined): Partial<Record<Ability, number>> {
  const out: Partial<Record<Ability, number>> = {};
  for (const b of list ?? []) {
    const a = asAbility(b?.ability_score?.index);
    if (a) out[a] = (out[a] ?? 0) + Number(b.bonus ?? 0);
  }
  return out;
}

function buildClasses(ruleset: Ruleset): SrdClass[] {
  const levels = load(ruleset, 'Levels').filter((l) => !l.subclass);

  return load(ruleset, 'Classes').map((c): SrdClass => {
    const own = levels.filter((l) => l.class?.index === c.index).sort((a, b) => a.level - b.level);
    const byLevel = (lvl: number) => own.find((l) => l.level === lvl);

    const skillChoice = (c.proficiency_choices ?? [])
      .map((choice: Raw) => ({
        choose: Number(choice.choose ?? 0),
        from: (choice.from?.options ?? [])
          .map((o: Raw) => skillFromProficiency(o.item?.name ?? ''))
          .filter(Boolean) as SkillKey[],
      }))
      .find((choice: { from: SkillKey[] }) => choice.from.length > 0) ?? { choose: 0, from: [] };

    return {
      index: c.index,
      name: c.name,
      hitDie: Number(c.hit_die),
      savingThrows: (c.saving_throws ?? []).map((s: Raw) => asAbility(s.index)).filter(Boolean) as Ability[],
      spellcastingAbility: asAbility(c.spellcasting?.spellcasting_ability?.index),
      skillChoices: skillChoice,
      proficiencies: (c.proficiencies ?? [])
        .map((p: Raw) => String(p.name))
        .filter((n: string) => !/^saving throw/i.test(n)),
      slots: Array.from({ length: 20 }, (_, i) => {
        const sc = byLevel(i + 1)?.spellcasting ?? {};
        return Array.from({ length: 9 }, (_, s) => Number(sc[`spell_slots_level_${s + 1}`] ?? 0));
      }),
      cantripsKnown: Array.from({ length: 20 }, (_, i) => Number(byLevel(i + 1)?.spellcasting?.cantrips_known ?? 0)),
      features: own.flatMap((l) => (l.features ?? []).map((f: Raw) => ({ level: l.level, name: String(f.name) }))),
    };
  });
}

function buildLineages(ruleset: Ruleset): SrdLineage[] {
  const is2014 = ruleset === '2014';
  const subs = load(ruleset, is2014 ? 'Subraces' : 'Subspecies');
  const parentKey = is2014 ? 'race' : 'species';

  return load(ruleset, is2014 ? 'Races' : 'Species').map((r) => ({
    index: r.index,
    name: r.name,
    speed: Number(r.speed ?? 30),
    size: String(r.size ?? 'Medium'),
    abilityBonuses: bonuses(r.ability_bonuses),
    languages: (r.languages ?? []).map((l: Raw) => String(l.name)),
    traits: (r.traits ?? []).map((t: Raw) => String(t.name)),
    subs: subs
      .filter((s) => s[parentKey]?.index === r.index)
      .map((s) => ({
        index: s.index,
        name: s.name,
        abilityBonuses: bonuses(s.ability_bonuses),
        traits: (s.racial_traits ?? s.traits ?? []).map((t: Raw) => String(t.name)),
      })),
  }));
}

function buildBackgrounds(ruleset: Ruleset): SrdBackground[] {
  return load(ruleset, 'Backgrounds').map((b) => {
    const profs: string[] = (b.starting_proficiencies ?? b.proficiencies ?? []).map((p: Raw) => String(p.name));
    return {
      index: b.index,
      name: b.name,
      skills: profs.map(skillFromProficiency).filter(Boolean) as SkillKey[],
      tools: profs.filter((p) => /^tool:/i.test(p)).map((p) => p.replace(/^tool:\s*/i, '')),
      feature: b.feature?.name ?? (b.feat ? `${b.feat.name}${b.feat.note ? ` (${b.feat.note})` : ''}` : null),
      abilityOptions: (b.ability_scores ?? []).map((a: Raw) => asAbility(a.index)).filter(Boolean) as Ability[],
    };
  });
}

function buildConditions(ruleset: Ruleset): SrdCondition[] {
  return load(ruleset, 'Conditions').map((c) => ({
    index: c.index,
    name: c.name,
    description: stripMarkdown(text(c.description ?? c.desc)),
  }));
}

function buildSpells(ruleset: Ruleset): SrdSpell[] {
  return load(ruleset, 'Spells')
    .map((s) => ({
      index: s.index,
      name: s.name,
      level: Number(s.level),
      school: String(s.school?.name ?? ''),
      castingTime: String(s.casting_time ?? ''),
      range: String(s.range ?? ''),
      components: [(s.components ?? []).join(', '), s.material ? `(${String(s.material).replace(/\.$/, '')})` : '']
        .filter(Boolean)
        .join(' '),
      duration: String(s.duration ?? ''),
      concentration: Boolean(s.concentration),
      ritual: Boolean(s.ritual),
      classes: (s.classes ?? []).map((c: Raw) => String(c.name)),
      description: stripMarkdown(text(s.description ?? s.desc)),
      higherLevel: stripMarkdown(text(s.higher_level)),
    }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

const catalogs = new Map<Ruleset, SrdCatalog>();
const spellLists = new Map<Ruleset, SrdSpell[]>();

export function getCatalog(ruleset: Ruleset): SrdCatalog {
  let catalog = catalogs.get(ruleset);
  if (!catalog) {
    catalog = {
      ruleset,
      classes: buildClasses(ruleset),
      lineages: buildLineages(ruleset),
      backgrounds: buildBackgrounds(ruleset),
      conditions: buildConditions(ruleset),
      languages: load(ruleset, 'Languages').map((l) => String(l.name)),
    };
    catalogs.set(ruleset, catalog);
  }
  return catalog;
}

export function getSpells(ruleset: Ruleset): SrdSpell[] {
  let spells = spellLists.get(ruleset);
  if (!spells) {
    spells = buildSpells(ruleset);
    spellLists.set(ruleset, spells);
  }
  return spells;
}
