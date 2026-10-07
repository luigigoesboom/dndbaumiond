// Compact, app-shaped views of the 5e SRD. Built by server/srd.ts from the raw
// 5e-bits/5e-database JSON in srd/raw/<ruleset>. SRD 5.1 / 5.2: CC-BY-4.0.
import type { Ability, SkillKey } from './rules.ts';

export const RULESETS = ['2014', '2024'] as const;
export type Ruleset = (typeof RULESETS)[number];

export const RULESET_LABEL: Record<Ruleset, string> = { '2014': '2014 rules', '2024': '2024 rules' };
/** 2014 says "Race", 2024 says "Species". */
export const LINEAGE_TERM: Record<Ruleset, string> = { '2014': 'Race', '2024': 'Species' };

export interface SrdFeature {
  level: number;
  name: string;
  /** Custom classes only: the description the user typed in. */
  description?: string;
}

export type Recharge = 'short' | 'long' | 'none';

/** A limited-use class resource; maxByLevel[characterLevel - 1]. Custom classes only. */
export interface ClassResource {
  key: string;
  name: string;
  recharge: Recharge;
  maxByLevel: number[];
}

export interface SrdClass {
  index: string;
  name: string;
  hitDie: number;
  savingThrows: Ability[];
  spellcastingAbility: Ability | null;
  skillChoices: { choose: number; from: SkillKey[] };
  /** Armor and weapon proficiencies, e.g. "Light Armor", "Simple Weapons". */
  proficiencies: string[];
  /** slots[characterLevel - 1][spellLevel - 1] */
  slots: number[][];
  /** cantripsKnown[characterLevel - 1] */
  cantripsKnown: number[];
  features: SrdFeature[];
  /** Set for user-defined classes (see shared/customClass.ts). */
  custom?: { id: number };
  resources?: ClassResource[];
}

export interface SrdSubLineage {
  index: string;
  name: string;
  abilityBonuses: Partial<Record<Ability, number>>;
  traits: string[];
}

/** A 2014 race or a 2024 species. */
export interface SrdLineage {
  index: string;
  name: string;
  speed: number;
  size: string;
  abilityBonuses: Partial<Record<Ability, number>>;
  languages: string[];
  traits: string[];
  subs: SrdSubLineage[];
}

export interface SrdBackground {
  index: string;
  name: string;
  skills: SkillKey[];
  tools: string[];
  /** 2014: the background feature. 2024: the origin feat. */
  feature: string | null;
  /** 2024 only: the three abilities the background can raise. */
  abilityOptions: Ability[];
}

export interface SrdCondition {
  index: string;
  name: string;
  description: string;
}

export interface SrdSpell {
  index: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  classes: string[];
  description: string;
  higherLevel: string;
  /** Where a non-SRD spell came from (custom class or spell collection name). */
  source?: string;
}

export interface SrdCatalog {
  ruleset: Ruleset;
  classes: SrdClass[];
  lineages: SrdLineage[];
  backgrounds: SrdBackground[];
  conditions: SrdCondition[];
  languages: string[];
}

export const isRuleset = (v: unknown): v is Ruleset => RULESETS.includes(v as Ruleset);
