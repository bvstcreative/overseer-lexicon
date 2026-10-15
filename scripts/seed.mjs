import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dbDir = path.join(rootDir, 'data')
const dbPath = path.join(dbDir, 'lexicon.db')
const seedPath = path.join(rootDir, 'src', 'data', 'overseer.json')

console.log('Seeding SQLite database at:', dbPath)

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
  CREATE TABLE IF NOT EXISTS terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT NOT NULL,
    romanization TEXT DEFAULT '',
    language TEXT NOT NULL,
    language_group TEXT NOT NULL,
    region TEXT NOT NULL,
    era TEXT NOT NULL,
    domain TEXT NOT NULL,
    gloss TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_terms_domain ON terms(domain);
  CREATE INDEX IF NOT EXISTS idx_terms_region ON terms(region);
  CREATE INDEX IF NOT EXISTS idx_terms_era ON terms(era);
  CREATE INDEX IF NOT EXISTS idx_terms_lang_group ON terms(language_group);

  CREATE TABLE IF NOT EXISTS stars (
    term_id INTEGER PRIMARY KEY,
    starred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    email TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_stars (
    user_id INTEGER NOT NULL,
    term_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, term_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_stars_user ON user_stars(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_stars_term ON user_stars(term_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS term_audio (
    term_id INTEGER NOT NULL,
    voice TEXT NOT NULL DEFAULT 'Charon',
    mime_type TEXT NOT NULL DEFAULT 'audio/wav',
    audio_data BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (term_id, voice),
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_term_audio_lookup ON term_audio(term_id, voice);

  CREATE VIRTUAL TABLE IF NOT EXISTS terms_fts USING fts5(
    term,
    romanization,
    gloss,
    content='terms',
    content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS terms_ai AFTER INSERT ON terms BEGIN
    INSERT INTO terms_fts(rowid, term, romanization, gloss)
    VALUES (new.id, new.term, new.romanization, new.gloss);
  END;

  CREATE TRIGGER IF NOT EXISTS terms_ad AFTER DELETE ON terms BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, term, romanization, gloss)
    VALUES ('delete', old.id, old.term, old.romanization, old.gloss);
  END;

  CREATE TRIGGER IF NOT EXISTS terms_au AFTER UPDATE ON terms BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, term, romanization, gloss)
    VALUES ('delete', old.id, old.term, old.romanization, old.gloss);
    INSERT INTO terms_fts(rowid, term, romanization, gloss)
    VALUES (new.id, new.term, new.romanization, new.gloss);
  END;
`)

const force = process.argv.includes('--force')
const currentCount = db.prepare('SELECT count(*) as count FROM terms').get().count

if (currentCount > 0 && !force) {
  console.log(`Database already contains ${currentCount} terms. Use --force to re-seed.`)
  process.exit(0)
}

if (force) {
  console.log('Force re-seeding: clearing existing terms & stars...')
  db.exec('DELETE FROM stars;')
  db.exec('DELETE FROM terms;')
  db.exec('DELETE FROM terms_fts;')
}

const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
const stmt = db.prepare(`
  INSERT INTO terms (term, romanization, language, language_group, region, era, domain, gloss)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

db.exec('BEGIN')
for (const item of raw) {
  stmt.run(
    item[0] || '',
    item[1] || '',
    item[2] || '',
    item[3] || '',
    item[4] || '',
    item[5] || '',
    item[6] || '',
    item[7] || ''
  )
}
db.exec('COMMIT')

const finalCount = db.prepare('SELECT count(*) as count FROM terms').get().count
console.log(`Successfully seeded ${finalCount} terms into SQLite database!`)

