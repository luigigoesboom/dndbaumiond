import { newId } from '../../shared/id.ts';
import type { Coin, Item } from '../../shared/character.ts';
import { abilityScore } from '../../shared/rules.ts';
import { CloseIcon, PlusIcon } from '../icons.tsx';
import { NumberInput, TextInput } from './fields.tsx';
import type { SheetProps } from './types.ts';

const COINS: { coin: Coin; name: string }[] = [
  { coin: 'pp', name: 'Platinum' },
  { coin: 'gp', name: 'Gold' },
  { coin: 'ep', name: 'Electrum' },
  { coin: 'sp', name: 'Silver' },
  { coin: 'cp', name: 'Copper' },
];

const newItem = (): Item => ({ id: newId(), name: '', quantity: 1, weight: 0, equipped: false });

export function Inventory({ c, update }: Omit<SheetProps, 'catalog'>) {
  const edit = (id: string, patch: Partial<Item>) =>
    update((prev) => ({ ...prev, inventory: prev.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const remove = (id: string) => update((prev) => ({ ...prev, inventory: prev.inventory.filter((i) => i.id !== id) }));
  const add = () => update((prev) => ({ ...prev, inventory: [...prev.inventory, newItem()] }));

  const carried = c.inventory.reduce((sum, i) => sum + i.quantity * i.weight, 0);
  const capacity = abilityScore(c, 'str') * 15;

  return (
    <div className="tab-body">
      <div className="tab-subhead">
        <h3>Inventory</h3>
        <button type="button" className="link-button" onClick={add}>
          <PlusIcon /> Add item
        </button>
      </div>
      <div className="purse">
        {COINS.map(({ coin, name }) => (
          <label key={coin} className="coin">
            <NumberInput
              min={0}
              value={c.currency[coin]}
              onChange={(v) => update((prev) => ({ ...prev, currency: { ...prev.currency, [coin]: v } }))}
              aria-label={`${name} pieces`}
            />
            <span className="coin-label">{coin.toUpperCase()}</span>
          </label>
        ))}
      </div>

      {c.inventory.length === 0 ? (
        <p className="empty">Your pack is empty.</p>
      ) : (
        <table className="ruled-table">
          <thead>
            <tr>
              <th scope="col" className="col-eq">
                <abbr title="Equipped">Eq</abbr>
              </th>
              <th scope="col">Item</th>
              <th scope="col" className="col-num">
                Qty
              </th>
              <th scope="col" className="col-num">
                lb
              </th>
              <th scope="col">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {c.inventory.map((i) => (
              <tr key={i.id}>
                <td className="col-eq">
                  <input type="checkbox" checked={i.equipped} onChange={(e) => edit(i.id, { equipped: e.target.checked })} aria-label="Equipped" />
                </td>
                <td>
                  <TextInput value={i.name} onChange={(name) => edit(i.id, { name })} placeholder="Item" aria-label="Item name" />
                </td>
                <td className="col-num">
                  <NumberInput min={0} value={i.quantity} onChange={(quantity) => edit(i.id, { quantity })} aria-label="Quantity" />
                </td>
                <td className="col-num">
                  <NumberInput min={0} step={0.5} value={i.weight} onChange={(weight) => edit(i.id, { weight })} aria-label="Weight each" />
                </td>
                <td>
                  <button type="button" className="icon-button" onClick={() => remove(i.id)} aria-label={`Remove ${i.name || 'item'}`}>
                    <CloseIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className={`carry${carried > capacity ? ' over' : ''}`}>
        Carrying <strong>{Math.round(carried * 10) / 10}</strong> of {capacity} lb
      </p>
    </div>
  );
}
