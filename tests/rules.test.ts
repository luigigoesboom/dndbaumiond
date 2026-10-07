import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { defaultCharacter, type Character } from '../shared/character.ts';
import {
  abilityMod,
  abilityScore,
  applyDamage,
  applyHealing,
  longRest,
  passivePerception,
  proficiencyBonus,
  saveBonus,
  shortRest,
  skillBonus,
  spellAttackBonus,
  spellSaveDc,
  spendHitDie,
  withHp,
} from '../shared/rules.ts';

const make = (patch: Partial<Character> = {}): Character => ({ ...defaultCharacter(), ...patch });

describe('ability scores', () => {
  test('modifier rounds down', () => {
    assert.deepEqual([1, 8, 9, 10, 11, 12, 15, 20, 30].map(abilityMod), [-5, -1, -1, 0, 0, 1, 2, 5, 10]);
  });

  test('score = base + race bonus + other bonus', () => {
    const c = make({ raceBonuses: { ...defaultCharacter().raceBonuses, dex: 2 }, abilityBonuses: { ...defaultCharacter().abilityBonuses, dex: 1 } });
    c.abilities = { ...c.abilities, dex: 14 };
    assert.equal(abilityScore(c, 'dex'), 17);
  });
});

describe('proficiency', () => {
  test('bonus by level', () => {
    assert.deepEqual([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonus), [2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  });

  test('skills: none / proficient / expertise', () => {
    const c = make({ level: 5, abilities: { ...defaultCharacter().abilities, wis: 14 } });
    assert.equal(skillBonus(c, 'perception'), 2);
    assert.equal(skillBonus({ ...c, skills: { perception: 'proficient' } }, 'perception'), 5);
    assert.equal(skillBonus({ ...c, skills: { perception: 'expertise' } }, 'perception'), 8);
    assert.equal(passivePerception({ ...c, skills: { perception: 'expertise' } }), 18);
  });

  test('saving throws', () => {
    const c = make({ level: 9, abilities: { ...defaultCharacter().abilities, con: 16 }, savingThrows: ['con'] });
    assert.equal(saveBonus(c, 'con'), 7);
    assert.equal(saveBonus(c, 'str'), 0);
  });

  test('spell save DC and attack', () => {
    const c = make({ level: 5, abilities: { ...defaultCharacter().abilities, int: 16 } });
    assert.equal(spellSaveDc(c), null);
    const caster = { ...c, spellcasting: { ...c.spellcasting, ability: 'int' as const } };
    assert.equal(spellSaveDc(caster), 14);
    assert.equal(spellAttackBonus(caster), 6);
  });
});

describe('hit points', () => {
  test('damage drains temp HP first and stops at 0', () => {
    assert.deepEqual(applyDamage({ max: 20, current: 15, temp: 5 }, 8), { max: 20, current: 12, temp: 0 });
    assert.deepEqual(applyDamage({ max: 20, current: 3, temp: 0 }, 50), { max: 20, current: 0, temp: 0 });
  });

  test('healing caps at max', () => {
    assert.deepEqual(applyHealing({ max: 20, current: 15, temp: 0 }, 50), { max: 20, current: 20, temp: 0 });
  });

  test('coming back from 0 HP clears death saves', () => {
    const down = make({ hp: { max: 10, current: 0, temp: 0 }, deathSaves: { successes: 1, failures: 2 } });
    assert.deepEqual(withHp(down, { max: 10, current: 4, temp: 0 }).deathSaves, { successes: 0, failures: 0 });
    // Still at 0: death saves are kept.
    assert.deepEqual(withHp(down, { max: 10, current: 0, temp: 3 }).deathSaves, { successes: 1, failures: 2 });
  });
});

describe('rests', () => {
  const tired = (ruleset: '2014' | '2024') =>
    make({
      ruleset,
      level: 10,
      hp: { max: 50, current: 7, temp: 4 },
      hitDice: { die: 8, spent: 10 },
      exhaustion: 2,
      spellcasting: { ability: 'int', slots: defaultCharacter().spellcasting.slots.map(() => ({ max: 2, spent: 2 })) },
      resources: [
        { id: 'a', name: 'Short', max: 2, spent: 2, recharge: 'short', classKey: null },
        { id: 'b', name: 'Long', max: 1, spent: 1, recharge: 'long', classKey: null },
        { id: 'c', name: 'Manual', max: 3, spent: 3, recharge: 'none', classKey: null },
      ],
    });

  test('2014 long rest: half the hit dice back', () => {
    const c = longRest(tired('2014'));
    assert.deepEqual(c.hp, { max: 50, current: 50, temp: 0 });
    assert.equal(c.hitDice.spent, 5);
    assert.equal(c.exhaustion, 1);
    assert.ok(c.spellcasting.slots.every((s) => s.spent === 0));
    assert.deepEqual(c.resources.map((r) => r.spent), [0, 0, 3]);
  });

  test('2024 long rest: all hit dice back', () => {
    assert.equal(longRest(tired('2024')).hitDice.spent, 0);
  });

  test('short rest recharges only short-rest resources', () => {
    assert.deepEqual(shortRest(tired('2014')).resources.map((r) => r.spent), [0, 1, 3]);
  });

  test('spending a hit die heals roll + CON and cannot overspend', () => {
    const c = make({ level: 2, abilities: { ...defaultCharacter().abilities, con: 14 }, hp: { max: 20, current: 5, temp: 0 } });
    const after = spendHitDie(c, 4);
    assert.equal(after.hp.current, 11);
    assert.equal(after.hitDice.spent, 1);
    const exhausted = { ...after, hitDice: { ...after.hitDice, spent: 2 } };
    assert.equal(spendHitDie(exhausted, 6), exhausted);
  });
});
