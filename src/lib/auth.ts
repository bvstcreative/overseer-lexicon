import crypto from 'node:crypto'
import { getDb } from './db'
import { NextRequest } from 'next/server'

export interface SafeUser {
  id: number
  username: string
  email: string | null
}

export const AUTH_COOKIE_NAME = 'lexicon_session'
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex')
    const derivedBuf = Buffer.from(derived, 'hex')
    const hashBuf = Buffer.from(hash, 'hex')
    if (derivedBuf.length !== hashBuf.length) return false
    return crypto.timingSafeEqual(derivedBuf, hashBuf)
  } catch {
    return false
  }
}

export function createUser(username: string, email: string | null, password: string): SafeUser {
  const trimmedUsername = username.trim()
  const trimmedEmail = email && email.trim() ? email.trim().toLowerCase() : null

  if (!trimmedUsername || trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    throw new Error('Username must be between 3 and 30 characters.')
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
    throw new Error('Username can only contain letters, numbers, underscores, and hyphens.')
  }
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new Error('Invalid email address format.')
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.')
  }

  const db = getDb()

  // Check existing username (case-insensitive)
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(trimmedUsername)
  if (existingUser) {
    throw new Error('Username is already taken.')
  }

  // Check existing email if provided
  if (trimmedEmail) {
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(trimmedEmail)
    if (existingEmail) {
      throw new Error('Email is already registered.')
    }
  }

  const { salt, hash } = hashPassword(password)

  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash, salt)
    VALUES (?, ?, ?, ?)
  `).run(trimmedUsername, trimmedEmail, hash, salt)

  const id = Number(result.lastInsertRowid)
  return {
    id,
    username: trimmedUsername,
    email: trimmedEmail,
  }
}

export function verifyCredentials(usernameOrEmail: string, password: string): SafeUser | null {
  const trimmed = usernameOrEmail.trim()
  if (!trimmed || !password) return null

  const db = getDb()
  const row = db.prepare(`
    SELECT id, username, email, password_hash, salt
    FROM users
    WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
    LIMIT 1
  `).get(trimmed, trimmed) as {
    id: number
    username: string
    email: string | null
    password_hash: string
    salt: string
  } | undefined

  if (!row) return null

  const isValid = verifyPassword(password, row.password_hash, row.salt)
  if (!isValid) return null

  return {
    id: row.id,
    username: row.username,
    email: row.email,
  }
}

export function createSession(userId: number): string {
  const db = getDb()
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt)

  return token
}

export function validateSession(token: string): SafeUser | null {
  if (!token) return null
  const db = getDb()
  const now = Date.now()

  const row = db.prepare(`
    SELECT u.id, u.username, u.email
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
    LIMIT 1
  `).get(token, now) as {
    id: number
    username: string
    email: string | null
  } | undefined

  return row || null
}

export function deleteSession(token: string): void {
  if (!token) return
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function getUserFromRequest(request: NextRequest): SafeUser | null {
  let token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim()
    }
  }
  if (!token) return null
  return validateSession(token)
}

