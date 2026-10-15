import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

export interface TermRecord {
  id: number
  term: string
  romanization: string
  language: string
  language_group: string
  region: string
  era: string
  domain: string
  gloss: string
  created_at: string
  starred: boolean
}

export interface NewTermInput {
  term: string
  romanization?: string
  language: string
  language_group: string
  region: string
  era: string
  domain: string
  gloss: string
}

export interface TermFilter {
  q?: string
  domain?: string[]
  region?: string[]
  era?: string[]
  lg?: string[]
  starred?: boolean
  sort?: string
}

export interface LexiconStats {
  totalTerms: number
  totalStarred: number
  domains: Record<string, number>
  regions: Record<string, number>
  eras: Record<string, number>
  languages: Record<string, number>
}

export function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u02bb\u02bf\u02be\u2019\u2018\u0060]/g, '')
    .replace(/[\u0142]/g, 'l')
    .replace(/[\u00f8]/g, 'o')
    .replace(/[\ua723\ua725]/g, 'a')
    .replace(/[\u0259]/g, 'e')
}

declare global {
  var _lexiconDb: DatabaseSync | undefined
}

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'lexicon.db')
const SEED_FILE = path.join(process.cwd(), 'src/data/overseer.json')

export function getDb(): DatabaseSync {
  if (globalThis._lexiconDb) {
    return globalThis._lexiconDb
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  const db = new DatabaseSync(DB_PATH)

  // Configure pragmas
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')

  // Register custom SQL function for accent/diacritic-insensitive matching
  db.function('norm', (val: unknown) => norm(String(val ?? '')))

  // Create tables & indexes
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

  // Auto-seed if empty
  const countRow = db.prepare('SELECT count(*) as count FROM terms').get() as { count: number }
  if (countRow.count === 0 && fs.existsSync(SEED_FILE)) {
    seedDatabaseFromPath(db, SEED_FILE)
  }

  globalThis._lexiconDb = db
  return db
}

function seedDatabaseFromPath(db: DatabaseSync, filePath: string) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Array<[
      string, string, string, string, string, string, string, string
    ]>

    const insertStmt = db.prepare(`
      INSERT INTO terms (term, romanization, language, language_group, region, era, domain, gloss)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    db.exec('BEGIN')
    for (const item of raw) {
      insertStmt.run(
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
  } catch (err) {
    try { db.exec('ROLLBACK') } catch {}
    console.error('Failed to seed database:', err)
  }
}

export function seedDatabase(force = false): { seeded: number } {
  const db = getDb()
  if (force) {
    db.exec('DELETE FROM stars')
    db.exec('DELETE FROM terms')
    db.exec('DELETE FROM terms_fts')
  }
  if (fs.existsSync(SEED_FILE)) {
    seedDatabaseFromPath(db, SEED_FILE)
  }
  const countRow = db.prepare('SELECT count(*) as count FROM terms').get() as { count: number }
  return { seeded: countRow.count }
}

export function getAllTerms(filter?: TermFilter, userId?: number): TermRecord[] {
  const db = getDb()
  const conditions: string[] = []
  const joinParams: unknown[] = []
  const whereParams: unknown[] = []

  let starJoin = ''
  let starSelect = ''

  if (userId) {
    starJoin = `LEFT JOIN user_stars us ON t.id = us.term_id AND us.user_id = ?`
    starSelect = `CASE WHEN us.term_id IS NOT NULL THEN 1 ELSE 0 END as starred`
    joinParams.push(userId)
  } else {
    starJoin = `LEFT JOIN stars s ON t.id = s.term_id`
    starSelect = `CASE WHEN s.term_id IS NOT NULL THEN 1 ELSE 0 END as starred`
  }

  if (filter?.q) {
    const tokens = norm(filter.q).split(/\s+/).filter(Boolean)
    for (const token of tokens) {
      conditions.push(`
        norm(t.term || ' ' || COALESCE(t.romanization, '') || ' ' || t.language || ' ' || t.language_group || ' ' || t.region || ' ' || t.era || ' ' || t.domain || ' ' || t.gloss) LIKE ?
      `)
      whereParams.push(`%${token}%`)
    }
  }

  if (filter?.domain && filter.domain.length > 0) {
    const placeholders = filter.domain.map(() => '?').join(', ')
    conditions.push(`t.domain IN (${placeholders})`)
    whereParams.push(...filter.domain)
  }

  if (filter?.region && filter.region.length > 0) {
    const placeholders = filter.region.map(() => '?').join(', ')
    conditions.push(`t.region IN (${placeholders})`)
    whereParams.push(...filter.region)
  }

  if (filter?.era && filter.era.length > 0) {
    const placeholders = filter.era.map(() => '?').join(', ')
    conditions.push(`t.era IN (${placeholders})`)
    whereParams.push(...filter.era)
  }

  if (filter?.lg && filter.lg.length > 0) {
    const placeholders = filter.lg.map(() => '?').join(', ')
    conditions.push(`t.language_group IN (${placeholders})`)
    whereParams.push(...filter.lg)
  }

  if (filter?.starred) {
    if (userId) {
      conditions.push(`us.term_id IS NOT NULL`)
    } else {
      conditions.push(`s.term_id IS NOT NULL`)
    }
  }

  let orderBy = `ORDER BY t.term COLLATE NOCASE ASC`
  if (filter?.sort === 'lang') {
    orderBy = `ORDER BY t.language_group COLLATE NOCASE ASC, t.term COLLATE NOCASE ASC`
  } else if (filter?.sort === 'region') {
    orderBy = `ORDER BY t.region COLLATE NOCASE ASC, t.term COLLATE NOCASE ASC`
  } else if (filter?.sort === 'era') {
    orderBy = `ORDER BY CASE t.era WHEN 'Ancient' THEN 0 WHEN 'Historic' THEN 1 WHEN 'Modern' THEN 2 ELSE 3 END ASC, t.term COLLATE NOCASE ASC`
  } else if (filter?.sort === 'domain') {
    orderBy = `ORDER BY t.domain COLLATE NOCASE ASC, t.term COLLATE NOCASE ASC`
  } else if (filter?.sort === 'rand') {
    orderBy = `ORDER BY RANDOM()`
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const sql = `
    SELECT 
      t.id,
      t.term,
      t.romanization,
      t.language,
      t.language_group,
      t.region,
      t.era,
      t.domain,
      t.gloss,
      t.created_at,
      ${starSelect}
    FROM terms t
    ${starJoin}
    ${whereClause}
    ${orderBy}
  `

  const params = [...joinParams, ...whereParams]
  const rows = db.prepare(sql).all(...params) as Array<{
    id: number
    term: string
    romanization: string | null
    language: string
    language_group: string
    region: string
    era: string
    domain: string
    gloss: string
    created_at: string
    starred: number
  }>

  return rows.map((r) => ({
    id: r.id,
    term: r.term,
    romanization: r.romanization ?? '',
    language: r.language,
    language_group: r.language_group,
    region: r.region,
    era: r.era,
    domain: r.domain,
    gloss: r.gloss,
    created_at: r.created_at,
    starred: Boolean(r.starred),
  }))
}

export function getTermById(id: number, userId?: number): TermRecord | null {
  const db = getDb()
  let sql = ''
  let params: unknown[] = []

  if (userId) {
    sql = `
      SELECT 
        t.id,
        t.term,
        t.romanization,
        t.language,
        t.language_group,
        t.region,
        t.era,
        t.domain,
        t.gloss,
        t.created_at,
        CASE WHEN us.term_id IS NOT NULL THEN 1 ELSE 0 END as starred
      FROM terms t
      LEFT JOIN user_stars us ON t.id = us.term_id AND us.user_id = ?
      WHERE t.id = ?
    `
    params = [userId, id]
  } else {
    sql = `
      SELECT 
        t.id,
        t.term,
        t.romanization,
        t.language,
        t.language_group,
        t.region,
        t.era,
        t.domain,
        t.gloss,
        t.created_at,
        CASE WHEN s.term_id IS NOT NULL THEN 1 ELSE 0 END as starred
      FROM terms t
      LEFT JOIN stars s ON t.id = s.term_id
      WHERE t.id = ?
    `
    params = [id]
  }

  const row = db.prepare(sql).get(...params) as {
    id: number
    term: string
    romanization: string | null
    language: string
    language_group: string
    region: string
    era: string
    domain: string
    gloss: string
    created_at: string
    starred: number
  } | undefined

  if (!row) return null

  return {
    id: row.id,
    term: row.term,
    romanization: row.romanization ?? '',
    language: row.language,
    language_group: row.language_group,
    region: row.region,
    era: row.era,
    domain: row.domain,
    gloss: row.gloss,
    created_at: row.created_at,
    starred: Boolean(row.starred),
  }
}

export function createTerm(input: NewTermInput): TermRecord {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO terms (term, romanization, language, language_group, region, era, domain, gloss)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    input.term.trim(),
    (input.romanization || '').trim(),
    input.language.trim(),
    input.language_group.trim(),
    input.region.trim(),
    input.era.trim(),
    input.domain.trim(),
    input.gloss.trim()
  )

  const id = Number(result.lastInsertRowid)
  return getTermById(id)!
}

export function updateTerm(id: number, input: Partial<NewTermInput>): TermRecord | null {
  const db = getDb()
  const existing = getTermById(id)
  if (!existing) return null

  const updated = {
    term: input.term !== undefined ? input.term.trim() : existing.term,
    romanization: input.romanization !== undefined ? (input.romanization || '').trim() : existing.romanization,
    language: input.language !== undefined ? input.language.trim() : existing.language,
    language_group: input.language_group !== undefined ? input.language_group.trim() : existing.language_group,
    region: input.region !== undefined ? input.region.trim() : existing.region,
    era: input.era !== undefined ? input.era.trim() : existing.era,
    domain: input.domain !== undefined ? input.domain.trim() : existing.domain,
    gloss: input.gloss !== undefined ? input.gloss.trim() : existing.gloss,
  }

  db.prepare(`
    UPDATE terms
    SET term = ?, romanization = ?, language = ?, language_group = ?, region = ?, era = ?, domain = ?, gloss = ?
    WHERE id = ?
  `).run(
    updated.term,
    updated.romanization,
    updated.language,
    updated.language_group,
    updated.region,
    updated.era,
    updated.domain,
    updated.gloss,
    id
  )

  return getTermById(id)
}

export function deleteTerm(id: number): boolean {
  const db = getDb()
  const res = db.prepare('DELETE FROM terms WHERE id = ?').run(id)
  return Number(res.changes) > 0
}

export function toggleStar(termId: number, setStarred?: boolean): boolean {
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM stars WHERE term_id = ?').get(termId)

  const shouldStar = setStarred !== undefined ? setStarred : !exists

  if (shouldStar) {
    db.prepare('INSERT OR IGNORE INTO stars (term_id) VALUES (?)').run(termId)
    return true
  } else {
    db.prepare('DELETE FROM stars WHERE term_id = ?').run(termId)
    return false
  }
}

export function getStarredTermIds(): number[] {
  const db = getDb()
  const rows = db.prepare('SELECT term_id FROM stars ORDER BY starred_at DESC').all() as Array<{ term_id: number }>
  return rows.map((r) => r.term_id)
}

export function getUserStarredTermIds(userId: number): number[] {
  const db = getDb()
  const rows = db.prepare('SELECT term_id FROM user_stars WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Array<{ term_id: number }>
  return rows.map((r) => r.term_id)
}

export function toggleUserStar(userId: number, termId: number, setStarred?: boolean): boolean {
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM user_stars WHERE user_id = ? AND term_id = ?').get(userId, termId)

  const shouldStar = setStarred !== undefined ? setStarred : !exists

  if (shouldStar) {
    db.prepare('INSERT OR IGNORE INTO user_stars (user_id, term_id) VALUES (?, ?)').run(userId, termId)
    return true
  } else {
    db.prepare('DELETE FROM user_stars WHERE user_id = ? AND term_id = ?').run(userId, termId)
    return false
  }
}

export function syncUserStars(userId: number, termIds: number[]): number {
  if (!termIds || termIds.length === 0) return 0
  const db = getDb()
  const stmt = db.prepare('INSERT OR IGNORE INTO user_stars (user_id, term_id) VALUES (?, ?)')
  let count = 0
  db.exec('BEGIN')
  try {
    for (const tid of termIds) {
      const num = Number(tid)
      if (!isNaN(num) && num > 0) {
        const res = stmt.run(userId, num)
        if (Number(res.changes) > 0) count++
      }
    }
    db.exec('COMMIT')
  } catch (err) {
    try { db.exec('ROLLBACK') } catch {}
    throw err
  }
  return count
}

export function getUserStarredCount(userId: number): number {
  const db = getDb()
  const row = db.prepare('SELECT count(*) as count FROM user_stars WHERE user_id = ?').get(userId) as { count: number } | undefined
  return row?.count || 0
}

export function getStats(userId?: number): LexiconStats {
  const db = getDb()

  const totalTermsRow = db.prepare('SELECT count(*) as count FROM terms').get() as { count: number }
  const totalStarsRow = userId
    ? (db.prepare('SELECT count(*) as count FROM user_stars WHERE user_id = ?').get(userId) as { count: number })
    : (db.prepare('SELECT count(*) as count FROM stars').get() as { count: number })

  const domainRows = db.prepare('SELECT domain, count(*) as count FROM terms GROUP BY domain').all() as Array<{ domain: string; count: number }>
  const regionRows = db.prepare('SELECT region, count(*) as count FROM terms GROUP BY region').all() as Array<{ region: string; count: number }>
  const eraRows = db.prepare('SELECT era, count(*) as count FROM terms GROUP BY era').all() as Array<{ era: string; count: number }>
  const langRows = db.prepare('SELECT language_group, count(*) as count FROM terms GROUP BY language_group').all() as Array<{ language_group: string; count: number }>

  const domains: Record<string, number> = {}
  for (const r of domainRows) domains[r.domain] = r.count

  const regions: Record<string, number> = {}
  for (const r of regionRows) regions[r.region] = r.count

  const eras: Record<string, number> = {}
  for (const r of eraRows) eras[r.era] = r.count

  const languages: Record<string, number> = {}
  for (const r of langRows) languages[r.language_group] = r.count

  return {
    totalTerms: totalTermsRow.count,
    totalStarred: totalStarsRow ? totalStarsRow.count : 0,
    domains,
    regions,
    eras,
    languages,
  }
}

export function getExistingTermPairs(): Array<{ term: string; language: string }> {
  const db = getDb()
  return db.prepare('SELECT term, language FROM terms ORDER BY id ASC').all() as Array<{ term: string; language: string }>
}

export function getAllTermKeys(): Array<{ id: number; term: string; language: string }> {
  const db = getDb()
  return db.prepare('SELECT id, term, language FROM terms ORDER BY id ASC').all() as Array<{ id: number; term: string; language: string }>
}

export interface BatchOptions {
  duplicateMode?: 'term' | 'term_language'
  onDuplicate?: 'skip' | 'update'
}

export function createTermsBatch(
  terms: NewTermInput[],
  options?: BatchOptions
): {
  inserted: TermRecord[]
  updatedCount: number
  skippedCount: number
} {
  const db = getDb()
  const duplicateMode = options?.duplicateMode || 'term'
  const onDuplicate = options?.onDuplicate || 'skip'

  const inserted: TermRecord[] = []
  let updatedCount = 0
  let skippedCount = 0

  const checkStmt = duplicateMode === 'term'
    ? db.prepare('SELECT id, term, language FROM terms WHERE lower(term) = lower(?)')
    : db.prepare('SELECT id, term, language FROM terms WHERE lower(term) = lower(?) AND lower(language) = lower(?)')

  const updateStmt = db.prepare(`
    UPDATE terms
    SET romanization = ?, language = ?, language_group = ?, region = ?, era = ?, domain = ?, gloss = ?
    WHERE id = ?
  `)

  const insertStmt = db.prepare(`
    INSERT INTO terms (term, romanization, language, language_group, region, era, domain, gloss)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  db.exec('BEGIN')
  try {
    for (const input of terms) {
      const term = input.term.trim()
      const lang = input.language.trim()
      const existing = (duplicateMode === 'term'
        ? checkStmt.get(term)
        : checkStmt.get(term, lang)) as { id: number; term: string; language: string } | undefined

      if (existing) {
        if (onDuplicate === 'update') {
          updateStmt.run(
            (input.romanization || '').trim(),
            lang,
            input.language_group.trim(),
            input.region.trim(),
            input.era.trim(),
            input.domain.trim(),
            input.gloss.trim(),
            existing.id
          )
          updatedCount++
          const updatedRecord = getTermById(existing.id)
          if (updatedRecord) inserted.push(updatedRecord)
        } else {
          skippedCount++
        }
        continue
      }

      const res = insertStmt.run(
        term,
        (input.romanization || '').trim(),
        lang,
        input.language_group.trim(),
        input.region.trim(),
        input.era.trim(),
        input.domain.trim(),
        input.gloss.trim()
      )
      const id = Number(res.lastInsertRowid)
      inserted.push({
        id,
        term,
        romanization: (input.romanization || '').trim(),
        language: lang,
        language_group: input.language_group.trim(),
        region: input.region.trim(),
        era: input.era.trim(),
        domain: input.domain.trim(),
        gloss: input.gloss.trim(),
        created_at: new Date().toISOString(),
        starred: false,
      })
    }
    db.exec('COMMIT')
  } catch (err) {
    try {
      db.exec('ROLLBACK')
    } catch {}
    throw err
  }

  return { inserted, updatedCount, skippedCount }
}

export interface CachedAudioRecord {
  term_id: number
  voice: string
  mime_type: string
  audio_data: Uint8Array | Buffer
  created_at: string
}

export function getCachedTermAudio(termId: number, voice = 'Charon'): CachedAudioRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT term_id, voice, mime_type, audio_data, created_at FROM term_audio WHERE term_id = ? AND voice = ?').get(termId, voice) as CachedAudioRecord | undefined
  return row || null
}

export function getAnyCachedTermAudio(termId: number): CachedAudioRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT term_id, voice, mime_type, audio_data, created_at FROM term_audio WHERE term_id = ? ORDER BY created_at DESC LIMIT 1').get(termId) as CachedAudioRecord | undefined
  return row || null
}

export function saveCachedTermAudio(
  termId: number,
  voice: string,
  audioData: Uint8Array | Buffer,
  mimeType = 'audio/mpeg'
): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO term_audio (term_id, voice, mime_type, audio_data)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(term_id, voice) DO UPDATE SET
      audio_data = excluded.audio_data,
      mime_type = excluded.mime_type,
      created_at = CURRENT_TIMESTAMP
  `).run(termId, voice, mimeType, audioData)
}


