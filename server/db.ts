import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH ?? path.resolve('data', 'dnd.sqlite');
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Append-only list. Index + 1 is the schema version stored in PRAGMA user_version.
// Never edit a migration that has shipped; add a new one instead.
const migrations: string[] = [
  `
  CREATE TABLE characters (
    id         INTEGER PRIMARY KEY,
    data       TEXT NOT NULL CHECK (json_valid(data)),
    -- Generated columns let us list/sort/filter without parsing JSON in JS.
    name       TEXT    GENERATED ALWAYS AS (json_extract(data, '$.name')) VIRTUAL,
    race       TEXT    GENERATED ALWAYS AS (json_extract(data, '$.race')) VIRTUAL,
    class_name TEXT    GENERATED ALWAYS AS (json_extract(data, '$.className')) VIRTUAL,
    level      INTEGER GENERATED ALWAYS AS (json_extract(data, '$.level')) VIRTUAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX characters_updated_at ON characters (updated_at DESC);
  `,
  `
  -- v2: user-defined classes (shared/customClass.ts CustomClassFile as JSON).
  CREATE TABLE custom_classes (
    id         INTEGER PRIMARY KEY,
    data       TEXT NOT NULL CHECK (json_valid(data)),
    name       TEXT GENERATED ALWAYS AS (json_extract(data, '$.name')) VIRTUAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
  `
  -- v3: user-defined spell collections (shared/customSpells.ts SpellCollectionFile as JSON).
  CREATE TABLE spell_collections (
    id         INTEGER PRIMARY KEY,
    data       TEXT NOT NULL CHECK (json_valid(data)),
    name       TEXT GENERATED ALWAYS AS (json_extract(data, '$.name')) VIRTUAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
];

function migrate(): void {
  const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = user_version; v < migrations.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(migrations[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
      console.log(`[db] migrated to v${v + 1}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

migrate();
