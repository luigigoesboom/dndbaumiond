import express, { type Request, type Response } from 'express';
import { normalizeCharacter } from '../shared/character.ts';
import * as repo from './characterRepo.ts';

export const charactersRouter = express.Router();

function parseId(req: Request, res: Response): number | undefined {
  const id = Number(req.params.id);
  if (Number.isInteger(id) && id > 0) return id;
  res.status(400).json({ error: 'Invalid id' });
  return undefined;
}

// TODO: swap this for a real schema validator (e.g. zod) once the shape settles.
function isCharacterLike(body: unknown): boolean {
  return typeof body === 'object' && body !== null && typeof (body as { name?: unknown }).name === 'string';
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
  res.status(201).json(repo.createCharacter(normalizeCharacter(req.body)));
});

charactersRouter.put('/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === undefined) return;
  if (!isCharacterLike(req.body)) {
    res.status(400).json({ error: 'Body must be a character object with a name' });
    return;
  }
  const record = repo.updateCharacter(id, normalizeCharacter(req.body));
  if (!record) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  res.json(record);
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
