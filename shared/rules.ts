// 5e rules helpers. Everything here is derived from a Character and never stored.
import type { Attack, Character, HitPoints } from './character.ts';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_NAMES: Record<Ability, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const SKILLS = {
  acrobatics: { name: 'Acrobatics', ability: 'dex' },
  animalHandling: { name: 'Animal Handling', ability: 'wis' },
  arcana: { name: 'Arcana', ability: 'int' },
  athletics: { name: 'Athletics', ability: 'str' },
  deception: { name: 'Deception', ability: 'cha' },
  history: { name: 'History', ability: 'int' },
  insight: { name: 'Insight', ability: 'wis' },
  intimidation: { name: 'Intimidation', ability: 'cha' },
  investigation: { name: 'Investigation', ability: 'int' },
  medicine: { name: 'Medicine', ability: 'wis' },
  nature: { name: 'Nature', ability: 'int' },
  perception: { name: 'Perception', ability: 'wis' },
  performance: { name: 'Performance', ability: 'cha' },
  persuasion: { name: 'Persuasion', ability: 'cha' },
  religion: { name: 'Religion', ability: 'int' },
  sleightOfHand: { name: 'Sleight of Hand', ability: 'dex' },
  stealth: { name: 'Stealth', ability: 'dex' },
  survival: { name: 'Survival', ability: 'wis' },
} as const satisfies Record<string, { name: string; ability: Ability }>;

export type SkillKey = keyof typeof SKILLS;
export const SKILL_KEYS = Object.keys(SKILLS) as SkillKey[];

export type Proficiency = 'none' | 'proficient' | 'expertise';

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

/** Base score plus racial/background/other bonuses. */
export const abilityScore = (c: Character, a: Ability): number => c.abilities[a] + (c.abilityBonuses[a] ?? 0);

export const mod = (c: Character, a: Ability): number => abilityMod(abilityScore(c, a));

export const proficiencyBonus = (level: number): number =>
  2 + Math.floor((Math.min(20, Math.max(1, level)) - 1) / 4);

export const formatMod = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

const PROFICIENCY_MULTIPLIER: Record<Proficiency, number> = { none: 0, proficient: 1, expertise: 2 };

export function skillBonus(c: Character, skill: SkillKey): number {
  const prof = c.skills[skill] ?? 'none';
  return mod(c, SKILLS[skill].ability) + PROFICIENCY_MULTIPLIER[prof] * proficiencyBonus(c.level);
}

export function saveBonus(c: Character, ability: Ability): number {
  const prof = c.savingThrows.includes(ability) ? proficiencyBonus(c.level) : 0;
  return mod(c, ability) + prof;
}

export function attackBonus(c: Character, attack: Attack): number {
  return mod(c, attack.ability) + (attack.proficient ? proficiencyBonus(c.level) : 0);
}

export const initiative = (c: Character): number => mod(c, 'dex');

export const passivePerception = (c: Character): number => 10 + skillBonus(c, 'perception');

export const spellSaveDc = (c: Character): number | null =>
  c.spellcasting.ability ? 8 + proficiencyBonus(c.level) + mod(c, c.spellcasting.ability) : null;

export const spellAttackBonus = (c: Character): number | null =>
  c.spellcasting.ability ? proficiencyBonus(c.level) + mod(c, c.spellcasting.ability) : null;

/** HP to max, temp HP gone, slots back, half your hit dice back (min 1), one exhaustion level off. */
export function longRest(c: Character): Character {
  const regained = Math.max(1, Math.floor(c.level / 2));
  return {
    ...c,
    hp: { ...c.hp, current: c.hp.max, temp: 0 },
    hitDice: { ...c.hitDice, spent: Math.max(0, c.hitDice.spent - regained) },
    deathSaves: { successes: 0, failures: 0 },
    exhaustion: Math.max(0, c.exhaustion - 1),
    spellcasting: { ...c.spellcasting, slots: c.spellcasting.slots.map((s) => ({ ...s, spent: 0 })) },
    resources: c.resources.map((r) => (r.recharge === 'none' ? r : { ...r, spent: 0 })),
  };
}

/** Short rest: resources that recharge on a short rest come back (hit dice are spent separately). */
export function shortRest(c: Character): Character {
  return { ...c, resources: c.resources.map((r) => (r.recharge === 'short' ? { ...r, spent: 0 } : r)) };
}

/** Spend one hit die during a short rest: heal the rolled amount + CON mod (min 0). */
export function spendHitDie(c: Character, rolled: number): Character {
  if (c.hitDice.spent >= c.level) return c;
  return {
    ...c,
    hp: applyHealing(c.hp, Math.max(0, rolled + mod(c, 'con'))),
    hitDice: { ...c.hitDice, spent: c.hitDice.spent + 1 },
  };
}

/** Damage drains temporary HP first, then current HP (floored at 0). */
export function applyDamage(hp: HitPoints, amount: number): HitPoints {
  const fromTemp = Math.min(hp.temp, amount);
  return { ...hp, temp: hp.temp - fromTemp, current: Math.max(0, hp.current - (amount - fromTemp)) };
}

export function applyHealing(hp: HitPoints, amount: number): HitPoints {
  return { ...hp, current: Math.min(hp.max, hp.current + amount) };
}
