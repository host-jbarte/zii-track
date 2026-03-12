import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')

mkdirSync(dataDir, { recursive: true })

const db = new Database(join(dataDir, 'zii-track.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    color      TEXT    NOT NULL DEFAULT '#06b6d4',
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    client_id  INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    color      TEXT    NOT NULL DEFAULT '#06b6d4',
    archived   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT    NOT NULL DEFAULT '',
    project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    started_at  INTEGER NOT NULL,
    stopped_at  INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE INDEX IF NOT EXISTS idx_entries_started ON time_entries(started_at);
  CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
  CREATE INDEX IF NOT EXISTS idx_entries_client  ON time_entries(client_id);
`)

export default db
