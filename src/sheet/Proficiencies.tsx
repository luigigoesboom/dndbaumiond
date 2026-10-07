import {
  ABILITIES,
  ABILITY_NAMES,
  SKILLS,
  SKILL_KEYS,
  passivePerception,
  saveBonus,
  skillBonus,
  type Ability,
  type Proficiency,
} from '../../shared/rules.ts';
import { Box, Field, RollButton, TextArea } from './fields.tsx';
import { nestedSetter, type SheetProps } from './types.ts';

const NEXT: Record<Proficiency, Proficiency> = { none: 'proficient', proficient: 'expertise', expertise: 'none' };
const PROF_LABEL: Record<Proficiency, string> = { none: 'not proficient', proficient: 'proficient', expertise: 'expertise' };

/** Empty ring, filled dot, or dot with a ring for expertise. */
function ProfDot({ level, label, onClick }: { level: Proficiency; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`prof-dot ${level}`}
      onClick={onClick}
      title={`${PROF_LABEL[level]} (tap to change)`}
      aria-label={`${label}: ${PROF_LABEL[level]}`}
    />
  );
}

export function SavingThrows({ c, update }: Omit<SheetProps, 'catalog'>) {
  const toggle = (a: Ability) =>
    update((prev) => ({
      ...prev,
      savingThrows: prev.savingThrows.includes(a) ? prev.savingThrows.filter((x) => x !== a) : [...prev.savingThrows, a],
    }));
  return (
    <Box caption="Saving throws" className="saves-box">
      <ul className="saves-grid">
        {ABILITIES.map((a) => (
          <li key={a} className="save-pill">
            <ProfDot level={c.savingThrows.includes(a) ? 'proficient' : 'none'} label={`${ABILITY_NAMES[a]} save`} onClick={() => toggle(a)} />
            <span className="save-abbr" title={ABILITY_NAMES[a]}>
              {a.toUpperCase()}
            </span>
            <RollButton label={`${ABILITY_NAMES[a]} save`} bonus={saveBonus(c, a)} className="pill-roll" />
          </li>
        ))}
      </ul>
    </Box>
  );
}

export function Senses({ c, catalog }: Pick<SheetProps, 'c' | 'catalog'>) {
  const lineage = catalog?.lineages.find((x) => x.index === c.srd.lineage);
  const sub = lineage?.subs.find((s) => s.index === c.srd.subLineage);
  const senses = [...(lineage?.traits ?? []), ...(sub?.traits ?? [])].filter((t) => /darkvision|blindsight|tremorsense|truesight/i.test(t));
  const passives = [
    { label: 'Passive Perception', value: passivePerception(c) },
    { label: 'Passive Investigation', value: 10 + skillBonus(c, 'investigation') },
    { label: 'Passive Insight', value: 10 + skillBonus(c, 'insight') },
  ];
  return (
    <Box caption="Senses" className="senses-box">
      <ul className="passives">
        {passives.map((p) => (
          <li key={p.label} className="passive-pill">
            <span className="passive-value">{p.value}</span>
            <span className="passive-label">{p.label}</span>
          </li>
        ))}
      </ul>
      {senses.length > 0 && <p className="senses-text">{senses.join(', ')}</p>}
    </Box>
  );
}

export function Skills({ c, update }: Omit<SheetProps, 'catalog'>) {
  return (
    <Box caption="Skills" className="skills-box">
      <table className="skills-table">
        <thead>
          <tr>
            <th scope="col">
              <abbr title="Proficiency">Prof</abbr>
            </th>
            <th scope="col">
              <abbr title="Ability modifier">Mod</abbr>
            </th>
            <th scope="col">Skill</th>
            <th scope="col" className="num">
              Bonus
            </th>
          </tr>
        </thead>
        <tbody>
          {SKILL_KEYS.map((key) => {
            const level = c.skills[key] ?? 'none';
            return (
              <tr key={key}>
                <td>
                  <ProfDot
                    level={level}
                    label={SKILLS[key].name}
                    onClick={() => update((prev) => ({ ...prev, skills: { ...prev.skills, [key]: NEXT[level] } }))}
                  />
                </td>
                <td className="skill-mod">{SKILLS[key].ability.toUpperCase()}</td>
                <td className="skill-name">{SKILLS[key].name}</td>
                <td className="num">
                  <RollButton label={SKILLS[key].name} bonus={skillBonus(c, key)} className="cell-roll" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Box>
  );
}

export function Training({ c, update }: Omit<SheetProps, 'catalog'>) {
  const prof = nestedSetter(update)('proficiencies');
  return (
    <Box caption="Proficiencies & training" className="training-box">
      <div className="training">
        <Field label="Armor">
          <TextArea rows={1} value={c.proficiencies.armor} onChange={prof('armor')} />
        </Field>
        <Field label="Weapons">
          <TextArea rows={2} value={c.proficiencies.weapons} onChange={prof('weapons')} />
        </Field>
        <Field label="Tools">
          <TextArea rows={1} value={c.proficiencies.tools} onChange={prof('tools')} />
        </Field>
        <Field label="Languages">
          <TextArea rows={1} value={c.proficiencies.languages} onChange={prof('languages')} />
        </Field>
      </div>
    </Box>
  );
}
