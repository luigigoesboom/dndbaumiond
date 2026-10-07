import { shortRest, spendHitDie } from '../../shared/rules.ts';
import { useRoll } from '../roll/RollContext.tsx';
import { Tally } from './fields.tsx';
import type { SheetProps } from './types.ts';

/** Short rest: spend hit dice to heal, then recharge short-rest resources. */
export function ShortRestDrawer({
  c,
  update,
  id,
  hidden,
  onDone,
}: Omit<SheetProps, 'catalog'> & { id: string; hidden: boolean; onDone: () => void }) {
  const { rollDice } = useRoll();
  function rollHitDie() {
    const result = rollDice('Hit die', `1d${c.hitDice.die}`, 'heal');
    if (result) update((prev) => spendHitDie(prev, result.total));
  }
  const hitDiceLeft = c.level - Math.min(c.hitDice.spent, c.level);

  return (
    <div id={id} className="drawer rest-drawer" hidden={hidden}>
      <h2 className="drawer-title">Short rest</h2>
      <p className="hint">
        Spend hit dice to heal: each one rolls d{c.hitDice.die} + your Constitution modifier. Then finish the rest to
        recharge short-rest resources.
      </p>
      <div className="rest-row">
        <Tally
          total={c.level}
          spent={Math.min(c.hitDice.spent, c.level)}
          onChange={(spent) => update((prev) => ({ ...prev, hitDice: { ...prev.hitDice, spent } }))}
          label="Hit dice spent"
        />
        <span className="hint">
          {hitDiceLeft} of {c.level} left
        </span>
        <button type="button" className="solid-button heal" onClick={rollHitDie} disabled={hitDiceLeft === 0}>
          Roll a hit die
        </button>
      </div>
      {c.resources.some((r) => r.recharge === 'short') && (
        <div className="rest-row">
          <span className="hint">
            Recharges: {c.resources.filter((r) => r.recharge === 'short').map((r) => r.name).join(', ')}
          </span>
        </div>
      )}
      <div className="rest-row">
        <button
          type="button"
          className="solid-button"
          onClick={() => {
            update(shortRest);
            onDone();
          }}
        >
          Finish short rest
        </button>
      </div>
    </div>

  );
}
