import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { defaultCharacter, type Character } from '../shared/character.ts';
import type { SrdBackground, SrdClass, SrdLineage } from '../shared/srd.ts';
import { applyBackground, applyClass, applyLineage, clearLineage, swapListItems, syncSlots } from '../shared/srdApply.ts';

const wizard: SrdClass = {
  index: 'wizard',
  name: 'Wizard',
  hitDie: 6,
  savingThrows: ['int', 'wis'],
  spellcastingAbility: 'int',
  skillChoices: { choose: 2, from: ['arcana', 'history'] },
  proficiencies: ['Daggers', 'Quarterstaffs'],
  slots: Array.from({ length: 20 }, (_, i) => [Math.min(4, i + 2), i >= 2 ? 2 : 0, 0, 0, 0, 0, 0, 0, 0]),
  cantripsKnown: Array(20).fill(3),
  features: [],
  resources: [{ key: 'focus', name: 'Focus', recharge: 'short', maxByLevel: Array.from({ length: 20 }, (_, i) => (i < 2 ? 0 : 2)) }],
};

const elf: SrdLineage = {
  index: 'elf',
  name: 'Elf',
  speed: 30,
  size: 'Medium',
  abilityBonuses: { dex: 2 },
  languages: ['Common', 'Elvish'],
  traits: ['Darkvision'],
  subs: [{ index: 'high-elf', name: 'High Elf', abilityBonuses: { int: 1 }, traits: [] }],
};
const dwarf: SrdLineage = { ...elf, index: 'dwarf', name: 'Dwarf', speed: 25, abilityBonuses: { con: 2 }, languages: ['Common', 'Dwarvish'], subs: [] };

const acolyte: SrdBackground = { index: 'acolyte', name: 'Acolyte', skills: ['insight', 'religion'], tools: [], feature: null, abilityOptions: [] };
const sage: SrdBackground = { index: 'sage', name: 'Sage', skills: ['arcana', 'history'], tools: ["Calligrapher's Supplies"], feature: null, abilityOptions: [] };

const make = (patch: Partial<Character> = {}): Character => ({ ...defaultCharacter(), ...patch });

describe('class', () => {
  test('applyClass fills saves, hit die, casting, slots and resources', () => {
    const c = applyClass(make({ level: 3 }), wizard);
    assert.deepEqual(c.savingThrows, ['int', 'wis']);
    assert.equal(c.hitDice.die, 6);
    assert.equal(c.spellcasting.ability, 'int');
    assert.deepEqual(c.spellcasting.slots.slice(0, 2).map((s) => s.max), [4, 2]);
    assert.deepEqual(c.resources.map((r) => [r.name, r.max, r.recharge]), [['Focus', 2, 'short']]);
  });

  test('levelling keeps spent slots (clamped) and hand-made trackers', () => {
    let c = applyClass(make({ level: 3 }), wizard);
    c = { ...c, spellcasting: { ...c.spellcasting, slots: c.spellcasting.slots.map((s, i) => (i === 0 ? { ...s, spent: 3 } : s)) } };
    c = { ...c, resources: [...c.resources, { id: 'mine', name: 'Lucky coin', max: 1, spent: 1, recharge: 'long', classKey: null }] };
    const up = syncSlots({ ...c, level: 4 }, wizard);
    assert.equal(up.spellcasting.slots[0].spent, 3);
    const down = syncSlots({ ...c, level: 1 }, wizard);
    assert.equal(down.spellcasting.slots[0].spent, 2, 'clamped to the two first-level slots of level 1');
    assert.ok(down.resources.every((r) => r.classKey === null), 'class resource with 0 uses at level 1 is hidden');
    assert.equal(down.resources[0].name, 'Lucky coin');
  });
});

describe('race / species', () => {
  test('2014 race bonuses go to raceBonuses, never to the player\'s own bonuses', () => {
    const mine = make({ abilityBonuses: { ...defaultCharacter().abilityBonuses, dex: 1 } });
    const c = applyLineage(mine, elf, 'high-elf');
    assert.deepEqual([c.raceBonuses.dex, c.raceBonuses.int], [2, 1]);
    assert.equal(c.abilityBonuses.dex, 1, 'feat bonus survives');
  });

  test('switching race swaps languages and keeps ones the player added', () => {
    let c = make({ proficiencies: { ...defaultCharacter().proficiencies, languages: 'Sylvan' } });
    c = applyLineage(c, elf, null);
    assert.equal(c.proficiencies.languages, 'Sylvan, Common, Elvish');
    c = applyLineage(c, dwarf, null, elf);
    assert.equal(c.proficiencies.languages, 'Sylvan, Common, Dwarvish');
    assert.equal(c.speed, 25);
    c = clearLineage(c, dwarf);
    assert.equal(c.proficiencies.languages, 'Sylvan');
    assert.deepEqual(Object.values(c.raceBonuses), [0, 0, 0, 0, 0, 0]);
  });

  test('2024 species give no ability bonuses', () => {
    assert.deepEqual(Object.values(applyLineage(make({ ruleset: '2024' }), elf, 'high-elf').raceBonuses), [0, 0, 0, 0, 0, 0]);
  });
});

describe('background', () => {
  test('switching background swaps skills and tools but keeps expertise', () => {
    let c = applyBackground(make(), acolyte);
    assert.deepEqual(c.skills, { insight: 'proficient', religion: 'proficient' });
    c = { ...c, skills: { ...c.skills, insight: 'expertise' } };
    c = applyBackground(c, sage, acolyte);
    assert.deepEqual(c.skills, { insight: 'expertise', arcana: 'proficient', history: 'proficient' });
    assert.equal(c.proficiencies.tools, "Calligrapher's Supplies");
    c = applyBackground(c, null, sage);
    assert.equal(c.srd.background, null);
    assert.equal(c.proficiencies.tools, '');
  });

  test('swapListItems is case-insensitive and de-duplicates', () => {
    assert.equal(swapListItems('Common, elvish,  , Thieves Cant', ['Elvish'], ['common', 'Draconic']), 'Common, Thieves Cant, Draconic');
  });
});
