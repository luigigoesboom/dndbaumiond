import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { customClassTemplate, parseCustomClass, slug, toSrdClass, toSrdSpells, type CustomClassFile } from '../shared/customClass.ts';
import { collectionToSrdSpells, parseSpellCollection, spellCollectionTemplate } from '../shared/customSpells.ts';

const errorsOf = (r: { ok: boolean; errors?: string[] }) => (r.ok ? [] : r.errors!);

function filledClass(): CustomClassFile {
  const t = customClassTemplate('Test Class');
  t.savingThrows = ['wis', 'con'];
  t.resources = [{ key: 'pts', name: 'Points', recharge: 'short' }];
  t.levels.forEach((l, i) => {
    l.resources = { pts: i < 4 ? 2 : 3 };
  });
  t.levels[0].features = ['First Feature'];
  t.featureDescriptions = { 'First Feature': 'Does a thing.' };
  t.spells = [{ ...t.spells[0], name: 'Test Spell' }];
  return t;
}

describe('custom classes', () => {
  test('the blank template is valid', () => {
    assert.deepEqual(errorsOf(parseCustomClass(customClassTemplate())), []);
  });

  test('reports every problem at once', () => {
    const bad = filledClass() as unknown as Record<string, unknown>;
    bad.name = '';
    bad.hitDie = 7;
    bad.savingThrows = ['str', 'luck'];
    (bad.levels as { resources: Record<string, number> }[])[0].resources = { nope: 1 };
    const errors = errorsOf(parseCustomClass(bad));
    assert.equal(errors.length, 4, errors.join('\n'));
  });

  test('requires 20 levels and well-formed slots', () => {
    const t = filledClass();
    assert.ok(errorsOf(parseCustomClass({ ...t, levels: t.levels.slice(0, 19) })).some((e) => e.startsWith('levels:')));
    t.levels[2].slots = [1, 2];
    assert.ok(errorsOf(parseCustomClass(t)).some((e) => e.startsWith('levels[2].slots')));
  });

  test('converts to the SRD class shape with resources by level', () => {
    const parsed = parseCustomClass(filledClass());
    assert.ok(parsed.ok);
    const cls = toSrdClass(7, parsed.value);
    assert.equal(cls.index, 'custom-7');
    assert.deepEqual(cls.resources![0].maxByLevel.slice(2, 6), [2, 2, 3, 3]);
    assert.deepEqual(cls.features, [{ level: 1, name: 'First Feature', description: 'Does a thing.' }]);
    assert.deepEqual(toSrdSpells(7, parsed.value).map((s) => [s.index, s.classes]), [['custom-7-test-spell', ['Test Class']]]);
  });

  test('built-in object names are just names', () => {
    const t = filledClass();
    t.resources = [{ key: 'constructor', name: 'Constructor', recharge: 'long' }];
    t.levels.forEach((l) => (l.resources = {}));
    t.levels[0].features = ['toString'];
    t.featureDescriptions = {};
    const parsed = parseCustomClass(t);
    assert.ok(parsed.ok);
    const cls = toSrdClass(1, parsed.value);
    assert.deepEqual(cls.resources![0].maxByLevel.slice(0, 2), [0, 0]);
    assert.equal(cls.features[0].description, undefined);
  });

  test('duplicate spell names (after slugging) are rejected', () => {
    const t = filledClass();
    t.spells = [{ ...t.spells[0], name: 'Fire Bolt' }, { ...t.spells[0], name: 'fire-bolt' }];
    assert.ok(errorsOf(parseCustomClass(t)).some((e) => e.includes('appears twice')));
  });
});

describe('spell collections', () => {
  test('template is valid and blank rows are skipped', () => {
    const parsed = parseSpellCollection(spellCollectionTemplate());
    assert.ok(parsed.ok);
    assert.equal(parsed.value.spells.length, 0);
  });

  test('keeps class tags and validates them', () => {
    const t = spellCollectionTemplate('Book');
    t.spells = [
      { ...t.spells[0], name: 'Beast Bond', classes: ['Tamer'] },
      { ...t.spells[0], name: 'Anyone', level: 0, classes: [] },
    ];
    const parsed = parseSpellCollection(t);
    assert.ok(parsed.ok);
    const spells = collectionToSrdSpells(3, parsed.value);
    assert.deepEqual(spells.map((s) => [s.index, s.classes, s.source]), [
      ['set-3-beast-bond', ['Tamer'], 'Book'],
      ['set-3-anyone', [], 'Book'],
    ]);
    const bad = { ...t, spells: [{ ...t.spells[0], name: 'X', classes: 'Tamer' }] };
    assert.ok(errorsOf(parseSpellCollection(bad)).some((e) => e.includes('classes must be a list')));
  });
});

test('slug is Unicode-aware', () => {
  assert.equal(slug('Čar'), 'car');
  assert.equal(slug('Žar'), 'zar');
  assert.equal(slug("  Melf's Acid Arrow! "), 'melf-s-acid-arrow');
});
