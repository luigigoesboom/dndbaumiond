// Dice notation: "1d20+5", "2d6 + 1d4 - 1", "d8". Rolling uses crypto randomness.

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DieResult {
  sides: number;
  value: number;
  /** Dropped by advantage / disadvantage. */
  dropped?: boolean;
}

export interface RollResult {
  expression: string;
  dice: DieResult[];
  modifier: number;
  total: number;
  /** Natural 20 / natural 1 on a d20 check. */
  crit: 'hit' | 'miss' | null;
}

interface Term {
  count: number;
  sides: number;
  sign: 1 | -1;
}

const TERM = /([+-])?\s*(\d*)d(\d+)|([+-])?\s*(\d+)/gi;

export function parseDice(expression: string): { terms: Term[]; modifier: number } | null {
  const terms: Term[] = [];
  let modifier = 0;
  let consumed = '';
  for (const m of expression.matchAll(TERM)) {
    consumed += m[0];
    if (m[3]) {
      const count = m[2] ? Number(m[2]) : 1;
      const sides = Number(m[3]);
      if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
      terms.push({ count, sides, sign: m[1] === '-' ? -1 : 1 });
    } else if (m[5]) {
      modifier += (m[4] === '-' ? -1 : 1) * Number(m[5]);
    }
  }
  // Reject strings with junk we didn't understand ("fire", "1d").
  if (consumed.replace(/\s/g, '') !== expression.replace(/\s/g, '') || (!terms.length && !modifier)) return null;
  return { terms, modifier };
}

export function rollDie(sides: number): number {
  const buf = new Uint32Array(1);
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(0x100000000 / sides) * sides;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return (buf[0] % sides) + 1;
}

export function roll(expression: string): RollResult | null {
  const parsed = parseDice(expression);
  if (!parsed) return null;
  const dice: DieResult[] = [];
  let total = parsed.modifier;
  for (const t of parsed.terms) {
    for (let i = 0; i < t.count; i++) {
      const value = rollDie(t.sides);
      dice.push({ sides: t.sides, value });
      total += t.sign * value;
    }
  }
  return { expression, dice, modifier: parsed.modifier, total, crit: null };
}

/** A d20 check/save/attack with advantage or disadvantage. */
export function rollD20(bonus: number, mode: RollMode = 'normal'): RollResult {
  const a = rollDie(20);
  const dice: DieResult[] = [{ sides: 20, value: a }];
  let kept = a;
  if (mode !== 'normal') {
    const b = rollDie(20);
    kept = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
    const dropIndex = kept === a ? 1 : 0;
    dice.push({ sides: 20, value: b });
    dice[dropIndex].dropped = true;
  }
  return {
    expression: `1d20${bonus >= 0 ? '+' : ''}${bonus}`,
    dice,
    modifier: bonus,
    total: kept + bonus,
    crit: kept === 20 ? 'hit' : kept === 1 ? 'miss' : null,
  };
}
