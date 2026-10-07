import express from 'express';
import { normalizeCharacter } from '../shared/character.ts';
import * as repo from './characterRepo.ts';
import { parseId } from './http.ts';

export const charactersRouter = express.Router();

const isCharacterLike = (body: unknown): boolean =>
  typeof body === 'object' && body !== null && !Array.isArray(body) && typeof (body as { name?: unknown }).name === 'string';

/** Clients send the version their copy is based on; no header = explicit overwrite. */
function baseVersion(header: string | undefined): number | null | 'invalid' {
  if (header === undefined) return null;
  const v = Number(header);
  return Number.isInteger(v) && v >= 0 ? v : 'invalid';
}

charactersRouter.get('/', (_req, res) => {
  res.json(repo.listCharacters());
});

charactersRouter.get('/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === undefined) return;
  const record = repo.getCharacter(id);
  if (!record) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  res.json(record);
});

// Body is optional: an empty POST creates a default character.
charactersRouter.post('/', (req, res) => {
  if (req.body !== undefined && !(typeof req.body === 'object' && !Array.isArray(req.body))) {
    res.status(400).json({ error: 'Body must be a character object' });
    return;
  }
  res.status(201).json(repo.createCharacter(normalizeCharacter(req.body)));
});

charactersRouter.put('/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === undefined) return;
  if (!isCharacterLike(req.body)) {
    res.status(400).json({ error: 'Body must be a character object with a name' });
    return;
  }
  const version = baseVersion(req.get('X-Base-Version'));
  if (version === 'invalid') {
    res.status(400).json({ error: 'Invalid X-Base-Version header' });
    return;
  }
  const result = repo.updateCharacter(id, normalizeCharacter(req.body), version);
  if (result.ok) res.json(result.record);
  else if (result.reason === 'conflict')
    res.status(409).json({ error: 'This character was changed somewhere else', current: result.current });
  else res.status(404).json({ error: 'Character not found' });
});

charactersRouter.delete('/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === undefined) return;
  if (!repo.deleteCharacter(id)) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  res.status(204).end();
});
