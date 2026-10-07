// Storage + REST routes for user-entered JSON documents with a `name`
// (custom classes, spell collections). Each lives in its own table with the
// shape: id, data (JSON), name (generated from data), created_at, updated_at.
import express, { type Request, type Response } from 'express';
import type { LibraryRecord, Result } from '../shared/validate.ts';
import { db } from './db.ts';
import { parseId } from './http.ts';

interface Row {
  id: number;
  name: string;
  data: string;
  updated_at: string;
}

/** `table` must be a trusted constant (it is interpolated into SQL). */
export function jsonLibrary<T>(table: 'custom_classes' | 'spell_collections') {
  const cols = 'id, name, data, updated_at';
  const stmts = {
    list: db.prepare(`SELECT ${cols} FROM ${table} ORDER BY name COLLATE NOCASE`),
    insert: db.prepare(`INSERT INTO ${table} (data) VALUES (?) RETURNING ${cols}`),
    update: db.prepare(`UPDATE ${table} SET data = ?, updated_at = datetime('now') WHERE id = ? RETURNING ${cols}`),
    remove: db.prepare(`DELETE FROM ${table} WHERE id = ?`),
  };
  const toRecord = (row: Row): LibraryRecord<T> => ({
    id: row.id,
    name: row.name,
    data: JSON.parse(row.data) as T,
    updatedAt: row.updated_at,
  });
  return {
    list: (): LibraryRecord<T>[] => (stmts.list.all() as unknown as Row[]).map(toRecord),
    create: (data: T): LibraryRecord<T> => toRecord(stmts.insert.get(JSON.stringify(data)) as unknown as Row),
    update(id: number, data: T): LibraryRecord<T> | undefined {
      const row = stmts.update.get(JSON.stringify(data), id) as Row | undefined;
      return row && toRecord(row);
    },
    remove: (id: number): boolean => Number(stmts.remove.run(id).changes) > 0,
  };
}

export function jsonLibraryRouter<T>(
  repo: ReturnType<typeof jsonLibrary<T>>,
  parse: (raw: unknown) => Result<T>,
  template: (name?: string) => T,
  noun: string,
) {
  const router = express.Router();

  const validated = (req: Request, res: Response): T | undefined => {
    const parsed = parse(req.body);
    if (parsed.ok) return parsed.value;
    res.status(422).json({ error: `The ${noun} has problems`, details: parsed.errors });
    return undefined;
  };

  router.get('/', (_req, res) => {
    res.json(repo.list());
  });

  router.get('/template', (req, res) => {
    const name = typeof req.query.name === 'string' && req.query.name.trim() ? req.query.name.trim() : undefined;
    res.json(template(name));
  });

  router.post('/', (req, res) => {
    const data = validated(req, res);
    if (data !== undefined) res.status(201).json(repo.create(data));
  });

  router.put('/:id', (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    const data = validated(req, res);
    if (data === undefined) return;
    const record = repo.update(id, data);
    if (record) res.json(record);
    else res.status(404).json({ error: `${noun} not found` });
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    if (repo.remove(id)) res.status(204).end();
    else res.status(404).json({ error: `${noun} not found` });
  });

  return router;
}
