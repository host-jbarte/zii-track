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
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'member' CHECK(role IN ('manager', 'member')),
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

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
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
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

// Migrate: add user_id column to existing databases that don't have it yet
const cols = (db.prepare(`PRAGMA table_info(time_entries)`).all() as any[]).map(r => r.name)
if (!cols.includes('user_id')) {
  db.exec(`ALTER TABLE time_entries ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`)
}
// Index must be created after migration ensures the column exists
db.exec(`CREATE INDEX IF NOT EXISTS idx_entries_user ON time_entries(user_id)`)

// Migrate: add is_break column
const cols2 = (db.prepare(`PRAGMA table_info(time_entries)`).all() as any[]).map(r => r.name)
if (!cols2.includes('is_break')) {
  db.exec(`ALTER TABLE time_entries ADD COLUMN is_break INTEGER NOT NULL DEFAULT 0`)
}

// Migrate: add is_billable column
const cols3 = (db.prepare(`PRAGMA table_info(time_entries)`).all() as any[]).map(r => r.name)
if (!cols3.includes('is_billable')) {
  db.exec(`ALTER TABLE time_entries ADD COLUMN is_billable INTEGER NOT NULL DEFAULT 1`)
}

// Migrate: if there is exactly one user, assign all unowned entries to them
const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c
if (userCount === 1) {
  const soleUser = db.prepare('SELECT id FROM users LIMIT 1').get() as any
  db.prepare('UPDATE time_entries SET user_id = ? WHERE user_id IS NULL').run(soleUser.id)
}

export default db
