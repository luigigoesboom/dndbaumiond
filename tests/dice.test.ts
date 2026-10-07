import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseDice, roll, rollD20 } from '../shared/dice.ts';

describe('parseDice', () => {
  test('reads common notation', () => {
    assert.deepEqual(parseDice('1d20+5'), { terms: [{ count: 1, sides: 20, sign: 1 }], modifier: 5 });
    assert.deepEqual(parseDice('d8'), { terms: [{ count: 1, sides: 8, sign: 1 }], modifier: 0 });
    assert.deepEqual(parseDice(' 2d6 + 1d4 - 1 '), {
      terms: [
        { count: 2, sides: 6, sign: 1 },
        { count: 1, sides: 4, sign: 1 },
      ],
      modifier: -1,
    });
    assert.deepEqual(parseDice('1D6-1d4'), {
      terms: [
        { count: 1, sides: 6, sign: 1 },
        { count: 1, sides: 4, sign: -1 },
      ],
      modifier: 0,
    });
    assert.deepEqual(parseDice('-1'), { terms: [], modifier: -1 });
  });

  test('rejects junk and missing operators', () => {
    for (const bad of ['', '   ', 'fire', '1d', 'd', '2 d6', '1d6 2', '1d6 1d6', '1d6+', '1d1', '0d6']) {
      assert.equal(parseDice(bad), null, `"${bad}" should be rejected`);
    }
  });

  test('caps dice count and modifier size', () => {
    assert.ok(parseDice('100d6'));
    assert.equal(parseDice('101d6'), null);
    assert.equal(parseDice('60d6+60d6'), null);
    assert.equal(parseDice('1d6+1001'), null);
    assert.equal(parseDice('1d1001'), null);
  });
});

describe('rolling', () => {
  test('totals stay within bounds', () => {
    for (let i = 0; i < 500; i++) {
      const r = roll('2d6+3')!;
      assert.equal(r.dice.length, 2);
      assert.ok(r.total >= 5 && r.total <= 15);
      assert.equal(r.total, r.dice[0].value + r.dice[1].value + 3);
    }
  });

  test('advantage keeps the higher die, disadvantage the lower', () => {
    for (let i = 0; i < 300; i++) {
      const adv = rollD20(2, 'advantage');
      const [a, b] = adv.dice;
      assert.equal(adv.total, Math.max(a.value, b.value) + 2);
      assert.equal(adv.dice.filter((d) => d.dropped).length, 1);
      const dis = rollD20(0, 'disadvantage');
      assert.equal(dis.total, Math.min(dis.dice[0].value, dis.dice[1].value));
    }
  });

  test('crits follow the kept die', () => {
    for (let i = 0; i < 300; i++) {
      const r = rollD20(5);
      const kept = r.total - 5;
      assert.equal(r.crit, kept === 20 ? 'hit' : kept === 1 ? 'miss' : null);
    }
  });

  test('every face of a d20 shows up', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(rollD20(0).total);
    assert.equal(seen.size, 20);
  });
});
