#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dbPath = path.join(rootDir, 'data', 'lexicon.db')
const rulesPath = path.join(rootDir, 'RULES.md')

// Load environment variables from .env.local if present
const envLocalPath = path.join(rootDir, '.env.local')
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=')
      const val = vals.join('=').replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const REGION_CODES = {
  EUR: 'Europe',
  MEA: 'Middle East',
  CAS: 'Central Asia & Caucasus',
  SAS: 'South Asia',
  EAS: 'East Asia',
  SEAS: 'Southeast Asia',
  OCE: 'Oceania',
  AFR: 'Africa',
  AME: 'Americas',
}

const ERA_CODES = {
  A: 'Ancient',
  M: 'Historic',
  N: 'Modern',
}

const DOMAIN_CODES = {
  STUDIO: 'Workshop & studio',
  GALLERY: 'Gallery & museum',
  OFFICE: 'Office & business',
  HOUSE: 'Household & estate',
  LAND: 'Land & farming',
  STATE: 'State & civil',
  FINANCE: 'Treasury & finance',
  TRADE: 'Trade & market',
  RELIGION: 'Religious & temple',
  EDUCATION: 'Library & school',
  PERFORM: 'Performing arts',
  PORT: 'Ships & ports',
  MILITARY: 'Military',
  LEAD: 'Leadership',
}

function getDb() {
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}. Please run: pnpm seed`)
    process.exit(1)
  }
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON;')
  return db
}

function getExistingTerms(db) {
  return db.prepare('SELECT id, term, language FROM terms ORDER BY id ASC').all()
}

function readRules() {
  if (fs.existsSync(rulesPath)) {
    return fs.readFileSync(rulesPath, 'utf8')
  }
  return ''
}

function buildPrompt(existingPairs, count = 50, focus = '') {
  const systemPrompt = readRules()
  const userPrompt = `Generate ${count} new entries following the rules in the system prompt.

${focus ? `Focus: ${focus}\n` : ''}
Already have (do not repeat these term + language pairs):
${existingPairs.slice(0, 300).join('\n')}
${existingPairs.length > 300 ? `... (+ ${existingPairs.length - 300} more in database)` : ''}
`
  return { systemPrompt, userPrompt }
}

function parseAndValidate(rawText, existingPairsSet, options = {}) {
  const { duplicateMode = 'term_language' } = options
  const lines = rawText.split(/\r?\n/)
  const valid = []
  const duplicates = []
  const errors = []
  const batchSeen = new Set()

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//') || rawLine.startsWith('```')) {
      continue
    }

    const parts = rawLine.split('|')
    if (parts.length !== 7) {
      errors.push({ line: i + 1, raw: rawLine, error: `Expected 7 pipe fields, found ${parts.length}` })
      continue
    }

    const term = parts[0].trim()
    const romanization = parts[1].trim() || term
    const language = parts[2].trim()
    const regCode = parts[3].trim().toUpperCase()
    const eraCode = parts[4].trim().toUpperCase()
    const domCode = parts[5].trim().toUpperCase()
    const gloss = parts[6].trim().replace(/\.$/, '')

    if (!term || !language) {
      errors.push({ line: i + 1, raw: rawLine, error: 'Term and language cannot be empty' })
      continue
    }

    if (!REGION_CODES[regCode]) {
      errors.push({ line: i + 1, raw: rawLine, error: `Invalid region code: ${regCode}` })
      continue
    }

    if (!ERA_CODES[eraCode]) {
      errors.push({ line: i + 1, raw: rawLine, error: `Invalid era code: ${eraCode}` })
      continue
    }

    if (!DOMAIN_CODES[domCode]) {
      errors.push({ line: i + 1, raw: rawLine, error: `Invalid domain code: ${domCode}` })
      continue
    }

    const checkKey = duplicateMode === 'term'
      ? term.toLowerCase()
      : `${term.toLowerCase()}|${language.toLowerCase()}`

    if (batchSeen.has(checkKey)) {
      duplicates.push({ line: i + 1, term, language, type: 'batch_repeat' })
      continue
    }
    batchSeen.add(checkKey)

    if (existingPairsSet.has(checkKey)) {
      duplicates.push({
        line: i + 1,
        term,
        romanization,
        language,
        region: REGION_CODES[regCode],
        era: ERA_CODES[eraCode],
        domain: DOMAIN_CODES[domCode],
        gloss,
        type: 'in_database',
      })
      continue
    }

    valid.push({
      term,
      romanization,
      language,
      language_group: language,
      region: REGION_CODES[regCode],
      era: ERA_CODES[eraCode],
      domain: DOMAIN_CODES[domCode],
      gloss,
    })
  }

  return { valid, duplicates, errors }
}

function saveToDatabase(db, items, options = {}) {
  const { duplicateMode = 'term_language', onDuplicate = 'skip' } = options

  const checkStmt = duplicateMode === 'term'
    ? db.prepare('SELECT id FROM terms WHERE lower(term) = lower(?)')
    : db.prepare('SELECT id FROM terms WHERE lower(term) = lower(?) AND lower(language) = lower(?)')

  const insertStmt = db.prepare(`
    INSERT INTO terms (term, romanization, language, language_group, region, era, domain, gloss)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const updateStmt = db.prepare(`
    UPDATE terms
    SET romanization = ?, language = ?, language_group = ?, region = ?, era = ?, domain = ?, gloss = ?
    WHERE id = ?
  `)

  let inserted = 0
  let updated = 0
  let skipped = 0

  db.exec('BEGIN')
  try {
    for (const item of items) {
      const existing = (duplicateMode === 'term'
        ? checkStmt.get(item.term)
        : checkStmt.get(item.term, item.language))

      if (existing) {
        if (onDuplicate === 'update') {
          updateStmt.run(
            item.romanization || item.term,
            item.language,
            item.language_group || item.language,
            item.region,
            item.era,
            item.domain,
            item.gloss,
            existing.id
          )
          updated++
        } else {
          skipped++
        }
        continue
      }

      insertStmt.run(
        item.term,
        item.romanization || item.term,
        item.language,
        item.language_group || item.language,
        item.region,
        item.era,
        item.domain,
        item.gloss
      )
      inserted++
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return { inserted, updated, skipped }
}

async function callGemini(systemPrompt, userPrompt, model = 'gemini-2.5-flash', apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }
      ],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${errorBody}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Main CLI logic
async function main() {
  const args = process.argv.slice(2)
  const argMap = {}
  for (const a of args) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=')
      argMap[k] = v === undefined ? true : v
    }
  }

  const db = getDb()
  const existingRows = getExistingTerms(db)
  const existingPairs = existingRows.map(r => `${r.term}|${r.language}`)
  const existingPairsSet = new Set(existingPairs.map(p => p.toLowerCase()))

  const count = parseInt(argMap.count, 10) || 50
  const focus = argMap.focus || ''
  const model = argMap.model || 'gemini-2.5-flash'
  const save = Boolean(argMap.save)
  const dupMode = argMap['dup-mode'] || 'term_language'
  const onDup = argMap['on-dup'] || 'skip'

  console.log(`\n📚 Overseer Lexicon Term Generator`)
  console.log(`Current terms in database: ${existingRows.length}\n`)

  if (argMap.help) {
    console.log(`Usage:
  node scripts/generate-terms.mjs [options]

Options:
  --prompt               Print formatted prompt to stdout (or write with --out=file.txt)
  --out=<file>           Write prompt or generated output to file
  --generate             Generate using Gemini API
  --count=<N>            Number of terms to request (default: 50)
  --focus="<focus>"      Focus topic/domain/region (e.g. "maritime & port masters")
  --model=<name>         Gemini model (default: gemini-2.5-flash)
  --import=<file>        Import raw pipe-separated lines from file into database
  --save                 Persist valid generated or imported terms into SQLite
  --dup-mode=<term|term_language>  Check duplicates by exact term or term+language (default: term_language)
  --on-dup=<skip|update> Skip or update existing duplicates (default: skip)
`)
    return
  }

  if (argMap.prompt) {
    const { systemPrompt, userPrompt } = buildPrompt(existingPairs, count, focus)
    const combined = `=== SYSTEM PROMPT ===\n\n${systemPrompt}\n\n=== USER PROMPT ===\n\n${userPrompt}`
    if (argMap.out) {
      fs.writeFileSync(argMap.out, combined, 'utf8')
      console.log(`✓ Prompt written to: ${argMap.out}`)
    } else {
      console.log(combined)
    }
    return
  }

  if (argMap.import) {
    const filePath = path.resolve(process.cwd(), argMap.import)
    if (!fs.existsSync(filePath)) {
      console.error(`Import file not found: ${filePath}`)
      process.exit(1)
    }
    console.log(`Importing from file: ${filePath}`)
    const text = fs.readFileSync(filePath, 'utf8')
    const { valid, duplicates, errors } = parseAndValidate(text, existingPairsSet, { duplicateMode: dupMode, onDuplicate: onDup })
    console.log(`\nResults: ${valid.length} valid, ${duplicates.length} duplicates, ${errors.length} formatting errors`)

    if (save && (valid.length > 0 || (onDup === 'update' && duplicates.length > 0))) {
      const itemsToSave = onDup === 'update' ? [...valid, ...duplicates.filter(d => d.type === 'in_database')] : valid
      const stats = saveToDatabase(db, itemsToSave, { duplicateMode: dupMode, onDuplicate: onDup })
      console.log(`✓ SQLite updated: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.skipped} skipped`)
    } else if (!save) {
      console.log(`Run with --save to persist valid entries to SQLite.`)
    }
    return
  }

  if (argMap.generate) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error(`Error: GEMINI_API_KEY is not set in environment or .env.local`)
      console.error(`Please set GEMINI_API_KEY=your_key in .env.local or pass it in the environment.`)
      process.exit(1)
    }

    console.log(`Generating ${count} terms using ${model}...`)
    if (focus) console.log(`Focus: ${focus}`)

    const { systemPrompt, userPrompt } = buildPrompt(existingPairs, count, focus)
    const rawOutput = await callGemini(systemPrompt, userPrompt, model, apiKey)

    if (argMap.out) {
      fs.writeFileSync(argMap.out, rawOutput, 'utf8')
      console.log(`Raw output saved to: ${argMap.out}`)
    }

    const { valid, duplicates, errors } = parseAndValidate(rawOutput, existingPairsSet, { duplicateMode: dupMode, onDuplicate: onDup })
    console.log(`\nParsing result:`)
    console.log(`  ✓ Valid:      ${valid.length}`)
    console.log(`  ⚠️ Duplicates: ${duplicates.length}`)
    console.log(`  ✕ Errors:     ${errors.length}`)

    if (valid.length > 0) {
      console.log(`\nSample valid entries:`)
      for (const item of valid.slice(0, 5)) {
        console.log(`  • ${item.term} (${item.romanization}) [${item.language}] - ${item.gloss}`)
      }
    }

    if (save && (valid.length > 0 || (onDup === 'update' && duplicates.length > 0))) {
      const itemsToSave = onDup === 'update' ? [...valid, ...duplicates.filter(d => d.type === 'in_database')] : valid
      const stats = saveToDatabase(db, itemsToSave, { duplicateMode: dupMode, onDuplicate: onDup })
      console.log(`\n✓ SQLite database updated: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.skipped} skipped.`)
    } else if (!save) {
      console.log(`\nDry run complete. Re-run with --save to insert entries into SQLite.`)
    }
  } else {
    console.log(`No action specified. Run with --prompt, --generate, or --import=<file>. Use --help for full options.`)
  }
}

main().catch(err => {
  console.error('Execution error:', err)
  process.exit(1)
})
