import { ABILITIES, ABILITY_NAMES, abilityScore, formatMod, mod } from '../../shared/rules.ts';
import { NumberInput, RollButton } from './fields.tsx';
import type { SheetProps } from './types.ts';

/** D&D Beyond-style ability boxes: name, big modifier (tap to roll), score in an oval tab. */
export function AbilityScores({ c, update }: Omit<SheetProps, 'catalog'>) {
  return (
    <div className="abilities" role="group" aria-label="Ability scores">
      {ABILITIES.map((a) => {
        const bonus = c.abilityBonuses[a];
        return (
          <div key={a} className="ability">
            <span className="ability-name">{ABILITY_NAMES[a]}</span>
            <span className="ability-abbr" aria-hidden="true">
              {a.toUpperCase()}
            </span>
            <RollButton className="ability-mod" label={`${ABILITY_NAMES[a]} check`} bonus={mod(c, a)} />
            <span className="ability-oval" title={bonus ? `Base ${c.abilities[a]} ${formatMod(bonus)} bonus` : undefined}>
              {bonus ? (
                <>
                  <span className="ability-total">{abilityScore(c, a)}</span>
                  <NumberInput
                    className="ability-base small"
                    min={1}
                    max={30}
                    value={c.abilities[a]}
                    onChange={(v) => update((prev) => ({ ...prev, abilities: { ...prev.abilities, [a]: v } }))}
                    aria-label={`${ABILITY_NAMES[a]} base score (before ${formatMod(bonus)} bonus)`}
                  />
                </>
              ) : (
                <NumberInput
                  className="ability-base"
                  min={1}
                  max={30}
                  value={c.abilities[a]}
                  onChange={(v) => update((prev) => ({ ...prev, abilities: { ...prev.abilities, [a]: v } }))}
                  aria-label={`${ABILITY_NAMES[a]} score`}
                />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
