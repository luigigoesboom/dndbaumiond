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
  created_at: string;
  updated_at: string;
}

const RECORD_COLUMNS = 'id, data, created_at, updated_at';

const stmts = {
  list: db.prepare(`
    SELECT id, name, race, class_name AS className, level, updated_at AS updatedAt
    FROM characters
    ORDER BY updated_at DESC`),
  get: db.prepare(`SELECT ${RECORD_COLUMNS} FROM characters WHERE id = ?`),
  insert: db.prepare(`INSERT INTO characters (data) VALUES (?) RETURNING ${RECORD_COLUMNS}`),
  update: db.prepare(`
    UPDATE characters SET data = ?, updated_at = datetime('now')
    WHERE id = ?
    RETURNING ${RECORD_COLUMNS}`),
  remove: db.prepare('DELETE FROM characters WHERE id = ?'),
};

const toRecord = (row: Row): CharacterRecord => ({
  id: row.id,
  data: normalizeCharacter(JSON.parse(row.data)),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

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

export function updateCharacter(id: number, data: Character): CharacterRecord | undefined {
  const row = stmts.update.get(JSON.stringify(data), id) as Row | undefined;
  return row && toRecord(row);
}

export function deleteCharacter(id: number): boolean {
  return Number(stmts.remove.run(id).changes) > 0;
}
