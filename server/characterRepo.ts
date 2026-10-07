import { db } from './db.ts';
import {
  normalizeCharacter,
  type Character,
  type CharacterRecord,
  type CharacterSummary,
} from '../shared/character.ts';

interface Row {
  id: number;
  data: string;
  version: number;
  created_at: string;
  updated_at: string;
}

const RECORD_COLUMNS = 'id, data, version, created_at, updated_at';

const stmts = {
  list: db.prepare(`
    SELECT id, name, race, class_name AS className, level, updated_at AS updatedAt
    FROM characters
    ORDER BY updated_at DESC`),
  get: db.prepare(`SELECT ${RECORD_COLUMNS} FROM characters WHERE id = ?`),
  insert: db.prepare(`INSERT INTO characters (data) VALUES (?) RETURNING ${RECORD_COLUMNS}`),
  // The version check is skipped when the caller passes NULL (an explicit overwrite).
  update: db.prepare(`
    UPDATE characters SET data = ?, version = version + 1, updated_at = datetime('now')
    WHERE id = ? AND (? IS NULL OR version = ?)
    RETURNING ${RECORD_COLUMNS}`),
  remove: db.prepare('DELETE FROM characters WHERE id = ?'),
};

function toRecord(row: Row): CharacterRecord {
  let raw: unknown = null;
  try {
    raw = JSON.parse(row.data);
  } catch {
    // A corrupt row still opens (as defaults) instead of 500-ing the whole sheet.
    console.error(`[db] character ${row.id} has unreadable JSON`);
  }
  return {
    id: row.id,
    data: normalizeCharacter(raw),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCharacters(): CharacterSummary[] {
  return stmts.list.all() as unknown as CharacterSummary[];
}

export function getCharacter(id: number): CharacterRecord | undefined {
  const row = stmts.get.get(id) as Row | undefined;
  return row && toRecord(row);
}

export function createCharacter(data: Character): CharacterRecord {
  return toRecord(stmts.insert.get(JSON.stringify(data)) as unknown as Row);
}

export type UpdateResult =
  | { ok: true; record: CharacterRecord }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'conflict'; current: CharacterRecord };

/** `baseVersion` = the version the client's copy was based on; null overwrites unconditionally. */
export function updateCharacter(id: number, data: Character, baseVersion: number | null): UpdateResult {
  const row = stmts.update.get(JSON.stringify(data), id, baseVersion, baseVersion) as Row | undefined;
  if (row) return { ok: true, record: toRecord(row) };
  const current = getCharacter(id);
  return current ? { ok: false, reason: 'conflict', current } : { ok: false, reason: 'not-found' };
}

export function deleteCharacter(id: number): boolean {
  return Number(stmts.remove.run(id).changes) > 0;
}
