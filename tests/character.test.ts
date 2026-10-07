import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { defaultCharacter, normalizeCharacter } from '../shared/character.ts';

describe('normalizeCharacter', () => {
  test('non-objects become a default character', () => {
    for (const raw of [null, undefined, 42, 'x', [1, 2]]) assert.deepEqual(normalizeCharacter(raw), defaultCharacter());
  });

  test('a normalized character round-trips unchanged', () => {
    const c = normalizeCharacter({ name: 'Elara', level: 5, skills: { arcana: 'expertise' } });
    assert.deepEqual(normalizeCharacter(JSON.parse(JSON.stringify(c))), c);
  });

  test('drops junk list entries and fixes ids', () => {
    const c = normalizeCharacter({
      attacks: [null, 5, 'x', { name: 'Bite', id: 'a' }, { name: 'Claw', id: 'a' }, { name: 'Tail' }],
      companions: [null, { name: 'Wolf', attacks: [null, { name: 'Bite' }] }],
    });
    assert.deepEqual(c.attacks.map((a) => a.name), ['Bite', 'Claw', 'Tail']);
    const ids = c.attacks.map((a) => a.id);
    assert.equal(new Set(ids).size, 3, 'ids are unique');
    assert.ok(ids.every(Boolean), 'every entry has an id');
    assert.equal(c.companions.length, 1);
    assert.equal(c.companions[0].attacks.length, 1);
  });

  test('replaces wrong types and clamps numbers', () => {
    const c = normalizeCharacter({
      level: '5',
      xp: -10,
      abilities: { str: 99, dex: 'high' },
      skills: { arcana: 'bogus', stealth: 'expertise', notASkill: 'proficient' },
      savingThrows: ['str', 'luck', 'str'],
      hp: { max: 0, current: -3 },
      hitDice: { die: 8, spent: 50 },
      exhaustion: 9,
      spellcasting: { ability: 'charm', slots: [{ max: 4, spent: 9 }] },
    });
    assert.equal(c.level, 1);
    assert.equal(c.xp, 0);
    assert.equal(c.abilities.str, 30);
    assert.equal(c.abilities.dex, 10);
    assert.deepEqual(c.skills, { stealth: 'expertise' });
    assert.deepEqual(c.savingThrows, ['str']);
    assert.deepEqual(c.hp, { max: 1, current: 0, temp: 0 });
    assert.equal(c.hitDice.spent, 1, 'cannot spend more hit dice than your level');
    assert.equal(c.exhaustion, 6);
    assert.equal(c.spellcasting.ability, null);
    assert.deepEqual(c.spellcasting.slots[0], { max: 4, spent: 4 });
    assert.equal(c.spellcasting.slots.length, 9);
  });

  test('drops unknown keys (nothing smuggled into storage)', () => {
    const c = normalizeCharacter({ name: 'x', evil: '<script>', __proto__: { polluted: true } }) as unknown as Record<string, unknown>;
    assert.equal('evil' in c, false);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  });

  test('older documents get the new fields', () => {
    const old = { name: 'Thorin', level: 5, abilityBonuses: { con: 2 } };
    const c = normalizeCharacter(old);
    assert.equal(c.attacksPerAction, 1);
    assert.deepEqual(c.raceBonuses, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
    assert.equal(c.abilityBonuses.con, 2);
    assert.deepEqual(c.resources, []);
    assert.deepEqual(c.companions, []);
  });
});
