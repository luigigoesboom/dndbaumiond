import express from 'express';
import { toSrdClass, toSrdSpells } from '../shared/customClass.ts';
import { collectionToSrdSpells } from '../shared/customSpells.ts';
import { isRuleset } from '../shared/srd.ts';
import { customClasses, spellCollections } from './libraries.ts';
import { getCatalog, getSpells } from './srd.ts';

export const srdRouter = express.Router();

// Custom classes and spell collections are merged in on every request, so no HTTP caching:
// something imported by one player shows up for everyone on the next load.

srdRouter.get('/:ruleset', (req, res) => {
  const { ruleset } = req.params;
  if (!isRuleset(ruleset)) {
    res.status(404).json({ error: 'Unknown ruleset' });
    return;
  }
  const catalog = getCatalog(ruleset);
  const custom = customClasses.list().map((r) => toSrdClass(r.id, r.data));
  res.json({ ...catalog, classes: [...catalog.classes, ...custom] });
});

srdRouter.get('/:ruleset/spells', (req, res) => {
  const { ruleset } = req.params;
  if (!isRuleset(ruleset)) {
    res.status(404).json({ error: 'Unknown ruleset' });
    return;
  }
  const fromClasses = customClasses.list().flatMap((r) => toSrdSpells(r.id, r.data));
  const fromCollections = spellCollections.list().flatMap((r) => collectionToSrdSpells(r.id, r.data));
  res.json(
    [...getSpells(ruleset), ...fromClasses, ...fromCollections].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
  );
});
