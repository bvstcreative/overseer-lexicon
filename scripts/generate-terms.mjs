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
  // Universal nature, science & culture domains
  FAUNA: 'Fauna & wildlife',
  FLORA: 'Flora & botany',
  MYTH: 'Mythology & folklore',
  FICTION: 'Fiction & pop culture',
  NATURE: 'Nature & cosmos',
  SCIENCE: 'Science & medicine',
  FOOD: 'Food & culinary',
  CULTURE: 'Culture & society',
  CRAFT: 'Tools & craft',
  TECH: 'Technology & computing',
  SPORT: 'Sports & games',
  ARCH: 'Architecture & places',
  LANG: 'Language & idioms',
  LAW: 'Law & justice',
  // Classical institutional, civic & workplace domains
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

const KNOWN_LANGUAGE_GROUPS = {
  'Ancient Greek': 'Greek',
  'Byzantine Greek': 'Greek',
  'Modern Greek': 'Greek',
  Greek: 'Greek',
  Latin: 'Latin',
  'Late Latin': 'Latin',
  'Medieval Latin': 'Latin',
  'Scientific Latin': 'Latin',
  'Old French': 'French',
  'Quebec French': 'French',
  French: 'French',
  English: 'English',
  'American English': 'English',
  'British English': 'English',
  'Old English': 'English',
  'Middle English': 'English',
  German: 'German',
  'Middle High German': 'German',
  'Old High German': 'German',
  Bavarian: 'German',
  Luxembourgish: 'German',
  Dutch: 'Dutch',
  Afrikaans: 'Dutch',
  Italian: 'Italian',
  Venetian: 'Italian',
  Spanish: 'Spanish',
  Catalan: 'Spanish',
  Galician: 'Portuguese',
  Occitan: 'French',
  Portuguese: 'Portuguese',
  'Brazilian Portuguese': 'Portuguese',
  'Old Norse': 'Scandinavian',
  Swedish: 'Scandinavian',
  Danish: 'Scandinavian',
  Norwegian: 'Scandinavian',
  Icelandic: 'Scandinavian',
  Finnish: 'Finnish',
  'Old East Slavic': 'Russian & East Slavic',
  Slavic: 'Russian & East Slavic',
  'Old Russian': 'Russian & East Slavic',
  Russian: 'Russian & East Slavic',
  Ukrainian: 'Russian & East Slavic',
  Belarusian: 'Russian & East Slavic',
  Polish: 'Polish',
  Czech: 'Czech',
  Slovak: 'Czech',
  Slovene: 'South Slavic',
  Croatian: 'South Slavic',
  Serbian: 'South Slavic',
  Bulgarian: 'South Slavic',
  Macedonian: 'South Slavic',
  Lithuanian: 'Baltic',
  Latvian: 'Baltic',
  Estonian: 'Estonian',
  Hungarian: 'Hungarian',
  Romanian: 'Romanian',
  Irish: 'Celtic',
  'Scottish Gaelic': 'Celtic',
  Welsh: 'Celtic',
  'Ottoman Turkish': 'Turkish',
  Turkish: 'Turkish',
  Azerbaijani: 'Turkic & Mongolic',
  Kazakh: 'Turkic & Mongolic',
  Kyrgyz: 'Turkic & Mongolic',
  Uzbek: 'Turkic & Mongolic',
  Armenian: 'Armenian',
  Georgian: 'Georgian',
  'Ancient Egyptian': 'Ancient Egyptian',
  Coptic: 'Ancient Egyptian',
  Sumerian: 'Sumerian',
  Akkadian: 'Akkadian',
  Babylonian: 'Akkadian',
  Assyrian: 'Akkadian',
  'Biblical Hebrew': 'Hebrew',
  Hebrew: 'Hebrew',
  'Modern Hebrew': 'Hebrew',
  Aramaic: 'Aramaic',
  Syriac: 'Aramaic',
  Arabic: 'Arabic',
  'Classical Arabic': 'Arabic',
  Persian: 'Persian',
  'Middle Persian': 'Persian',
  'Old Persian': 'Persian',
  Tajik: 'Persian',
  Mongolian: 'Turkic & Mongolic',
  Turkic: 'Turkic & Mongolic',
  Sanskrit: 'Sanskrit & Pali',
  Prakrit: 'Sanskrit & Pali',
  Pali: 'Sanskrit & Pali',
  Hindi: 'Hindi & Urdu',
  Urdu: 'Hindi & Urdu',
  Punjabi: 'Punjabi',
  Gujarati: 'Gujarati',
  Tamil: 'Tamil',
  Bengali: 'Bengali',
  Marathi: 'Marathi',
  Malayalam: 'Malayalam',
  Telugu: 'Telugu',
  Kannada: 'Kannada',
  Sinhala: 'Sinhala',
  Nepali: 'Nepali',
  'Classical Chinese': 'Chinese',
  'Han Chinese': 'Chinese',
  'Tang Chinese': 'Chinese',
  'Song Chinese': 'Chinese',
  'Ming Chinese': 'Chinese',
  'Qing Chinese': 'Chinese',
  'Mandarin Chinese': 'Chinese',
  Chinese: 'Chinese',
  Mandarin: 'Chinese',
  Cantonese: 'Chinese',
  Japanese: 'Japanese',
  'Classical Japanese': 'Japanese',
  Korean: 'Korean',
  'Middle Korean': 'Korean',
  Vietnamese: 'Vietnamese',
  Indonesian: 'Indonesian & Malay',
  Malay: 'Indonesian & Malay',
  'Old Javanese': 'Javanese',
  Javanese: 'Javanese',
  Balinese: 'Balinese',
  Sundanese: 'Indonesian & Malay',
  Tagalog: 'Tagalog',
  Thai: 'Thai',
  Lao: 'Thai',
  Khmer: 'Khmer',
  Burmese: 'Burmese',
  Hawaiian: 'Hawaiian',
  'Māori': 'Māori',
  Samoan: 'Samoan',
  Fijian: 'Fijian',
  Swahili: 'Swahili',
  Amharic: 'Amharic',
  Geʻez: 'Amharic',
  Hausa: 'Hausa',
  Yoruba: 'Yoruba',
  Igbo: 'Igbo',
  Akan: 'Akan',
  Zulu: 'Zulu',
  Xhosa: 'Zulu',
  Shona: 'Shona',
  Wolof: 'Wolof',
  Berber: 'Berber',
  Tamazight: 'Berber',
  Nahuatl: 'Nahuatl',
  'Classical Nahuatl': 'Nahuatl',
  Quechua: 'Quechua',
  'Classic Maya': 'Maya',
  'Yucatec Maya': 'Maya',
}

function inferLanguageGroup(language) {
  const trimmed = String(language || '').trim()
  if (!trimmed) return ''
  if (KNOWN_LANGUAGE_GROUPS[trimmed]) return KNOWN_LANGUAGE_GROUPS[trimmed]
  const lower = trimmed.toLowerCase()
  if (lower.includes('english')) return 'English'
  if (lower.includes('greek')) return 'Greek'
  if (lower.includes('latin')) return 'Latin'
  if (lower.includes('french')) return 'French'
  if (lower.includes('german')) return 'German'
  if (lower.includes('dutch')) return 'Dutch'
  if (lower.includes('italian')) return 'Italian'
  if (lower.includes('spanish')) return 'Spanish'
  if (lower.includes('portuguese')) return 'Portuguese'
  if (lower.includes('norse') || lower.includes('scandi')) return 'Scandinavian'
  if (lower.includes('slavic') || lower.includes('russian')) return 'Russian & East Slavic'
  if (lower.includes('gaelic') || lower.includes('celtic')) return 'Celtic'
  if (lower.includes('hebrew')) return 'Hebrew'
  if (lower.includes('arabic')) return 'Arabic'
  if (lower.includes('persian')) return 'Persian'
  if (lower.includes('chinese') || lower.includes('mandarin') || lower.includes('cantonese')) return 'Chinese'
  if (lower.includes('japanese')) return 'Japanese'
  if (lower.includes('korean')) return 'Korean'
  if (lower.includes('turkish') || lower.includes('turkic')) return 'Turkish'
  if (lower.includes('sanskrit') || lower.includes('prakrit') || lower.includes('pali')) return 'Sanskrit & Pali'
  if (lower.includes('hindi') || lower.includes('urdu')) return 'Hindi & Urdu'
  if (lower.includes('malay') || lower.includes('indonesian')) return 'Indonesian & Malay'
  if (lower.includes('nahuatl')) return 'Nahuatl'
  if (lower.includes('maya')) return 'Maya'
  return trimmed
}

function resolveRegion(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (REGION_CODES[upper]) return REGION_CODES[upper]
  const lower = trimmed.toLowerCase().replace(/\band\b/g, '&')
  for (const label of Object.values(REGION_CODES)) {
    if (label.toLowerCase() === lower || label.toLowerCase().replace('&', 'and') === trimmed.toLowerCase()) {
      return label
    }
  }
  return null
}

function resolveEra(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (ERA_CODES[upper]) return ERA_CODES[upper]
  const lower = trimmed.toLowerCase()
  for (const label of Object.values(ERA_CODES)) {
    if (label.toLowerCase() === lower) return label
  }
  if (lower === 'medieval' || lower === 'historical' || lower === 'folklore') return ERA_CODES.M
  if (lower === 'contemporary' || lower === 'current') return ERA_CODES.N
  return null
}

function resolveDomain(raw, allowCustom = true) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (DOMAIN_CODES[upper]) return DOMAIN_CODES[upper]
  const lower = trimmed.toLowerCase()
  for (const label of Object.values(DOMAIN_CODES)) {
    if (label.toLowerCase() === lower) return label
  }
  if (allowCustom) {
    if (/^[A-Z0-9_-]+$/.test(trimmed)) {
      const words = trimmed.toLowerCase().split(/[_-]+/).filter(Boolean)
      if (words.length > 0) {
        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
        return words.join(' ')
      }
    }
    return trimmed
  }
  return null
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
  const { duplicateMode = 'term_language', allowCustomDomains = true } = options
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
    const regRaw = parts[3].trim()
    const eraRaw = parts[4].trim()
    const domRaw = parts[5].trim()
    const gloss = parts[6].trim().replace(/\.$/, '')

    if (!term || !language) {
      errors.push({ line: i + 1, raw: rawLine, error: 'Term and language cannot be empty' })
      continue
    }

    const region = resolveRegion(regRaw)
    if (!region) {
      errors.push({ line: i + 1, raw: rawLine, error: `Invalid region code: ${regRaw}` })
      continue
    }

    const era = resolveEra(eraRaw)
    if (!era) {
      errors.push({ line: i + 1, raw: rawLine, error: `Invalid era code: ${eraRaw}` })
      continue
    }

    const domain = resolveDomain(domRaw, allowCustomDomains)
    if (!domain) {
      errors.push({ line: i + 1, raw: rawLine, error: `Invalid domain code: ${domRaw}` })
      continue
    }

    const language_group = inferLanguageGroup(language)
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
        language_group,
        region,
        era,
        domain,
        gloss,
        type: 'in_database',
      })
      continue
    }

    valid.push({
      term,
      romanization,
      language,
      language_group,
      region,
      era,
      domain,
      gloss,
    })
  }

  return { valid, duplicates, errors }
}

function parseJsonAndValidate(rawText, existingPairsSet, options = {}) {
  const { duplicateMode = 'term_language', allowCustomDomains = true } = options
  const valid = []
  const duplicates = []
  const errors = []
  const batchSeen = new Set()

  let parsed
  try {
    const cleaned = rawText.trim().replace(/^```(?:json)?\s*\r?\n?/i, '').replace(/\r?\n?```\s*$/, '').trim()
    parsed = JSON.parse(cleaned)
  } catch (err) {
    errors.push({ line: 0, raw: '', error: `Invalid JSON: ${err.message}` })
    return { valid, duplicates, errors }
  }

  const data = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.terms)
      ? parsed.terms
      : Array.isArray(parsed?.entries)
        ? parsed.entries
        : Array.isArray(parsed?.data)
          ? parsed.data
          : null

  if (!Array.isArray(data)) {
    errors.push({ line: 0, raw: '', error: 'JSON root must be an array of entries (or { terms: [...] })' })
    return { valid, duplicates, errors }
  }

  data.forEach((item, idx) => {
    const lineNum = idx + 1
    if (!item || typeof item !== 'object') {
      errors.push({ line: lineNum, raw: JSON.stringify(item), error: 'Entry is not an object' })
      return
    }

    const term = String(item.term ?? '').trim()
    const romanization = String(item.romanization ?? '').trim() || term
    const language = String(item.language ?? '').trim()
    const regRaw = String(item.region ?? '').trim()
    const eraRaw = String(item.era ?? '').trim()
    const domRaw = String(item.domain ?? '').trim()
    const gloss = String(item.meaning ?? item.gloss ?? item.definition ?? '').trim().replace(/\.$/, '')

    if (!term || !language) {
      errors.push({ line: lineNum, raw: JSON.stringify(item), error: 'term and language cannot be empty' })
      return
    }
    const region = resolveRegion(regRaw)
    if (!region) {
      errors.push({ line: lineNum, raw: JSON.stringify(item), error: `Invalid region code: ${regRaw}` })
      return
    }
    const era = resolveEra(eraRaw)
    if (!era) {
      errors.push({ line: lineNum, raw: JSON.stringify(item), error: `Invalid era code: ${eraRaw}` })
      return
    }
    const domain = resolveDomain(domRaw, allowCustomDomains)
    if (!domain) {
      errors.push({ line: lineNum, raw: JSON.stringify(item), error: `Invalid domain code: ${domRaw}` })
      return
    }

    const language_group = item.language_group
      ? String(item.language_group).trim()
      : inferLanguageGroup(language)

    const checkKey = duplicateMode === 'term'
      ? term.toLowerCase()
      : `${term.toLowerCase()}|${language.toLowerCase()}`

    if (batchSeen.has(checkKey)) {
      duplicates.push({ line: lineNum, term, language, type: 'batch_repeat' })
      return
    }
    batchSeen.add(checkKey)

    if (existingPairsSet.has(checkKey)) {
      duplicates.push({
        line: lineNum,
        term,
        romanization,
        language,
        language_group,
        region,
        era,
        domain,
        gloss,
        type: 'in_database',
      })
      return
    }

    valid.push({
      term,
      romanization,
      language,
      language_group,
      region,
      era,
      domain,
      gloss,
    })
  })

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

  const count = parseInt(argMap.count, 10) || 50
  const focus = argMap.focus || ''
  const model = argMap.model || 'gemini-2.5-flash'
  const save = Boolean(argMap.save)
  const dupMode = argMap['dup-mode'] || 'term_language'
  const onDup = argMap['on-dup'] || 'skip'

  const db = getDb()
  const existingRows = getExistingTerms(db)
  const existingPairs = existingRows.map(r => `${r.term}|${r.language}`)
  const existingPairsSet = new Set(
    dupMode === 'term'
      ? existingRows.map(r => r.term.toLowerCase())
      : existingPairs.map(p => p.toLowerCase())
  )

  console.log(`\n📚 The Lexicon — Universal Term Generator & Importer`)
  console.log(`Current terms in database: ${existingRows.length}\n`)

  if (argMap.help) {
    console.log(`Usage:
  node scripts/generate-terms.mjs [options]

Options:
  --prompt               Print formatted prompt to stdout (or write with --out=file.txt)
  --out=<file>           Write prompt or generated output to file
  --generate             Generate using Gemini API
  --count=<N>            Number of terms to request (default: 50)
  --focus="<focus>"      Focus topic/domain/region (e.g. "squirrel species & folklore")
  --model=<name>         Gemini model (default: gemini-2.5-flash)
  --import=<file>        Import entries from a file into the database (JSON array or pipe-delimited .txt — auto-detected)
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
    const trimmed = text.trim()
    const isJson = filePath.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')
    const { valid, duplicates, errors } = isJson
      ? parseJsonAndValidate(text, existingPairsSet, { duplicateMode: dupMode })
      : parseAndValidate(text, existingPairsSet, { duplicateMode: dupMode, onDuplicate: onDup })
    console.log(`Format detected: ${isJson ? 'JSON' : 'pipe-delimited'}`)
    console.log(`\nResults: ${valid.length} valid, ${duplicates.length} duplicates, ${errors.length} formatting errors`)

    if (errors.length > 0) {
      console.log(`\nSample errors:`)
      for (const e of errors.slice(0, 5)) {
        console.log(`  ✕ Line/Entry ${e.line}: ${e.error}`)
      }
    }

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

    const cleanedOut = rawOutput.trim().replace(/^```(?:json)?\s*\r?\n?/i, '').trim()
    const isJsonOut = cleanedOut.startsWith('[') || cleanedOut.startsWith('{')
    const { valid, duplicates, errors } = isJsonOut
      ? parseJsonAndValidate(rawOutput, existingPairsSet, { duplicateMode: dupMode })
      : parseAndValidate(rawOutput, existingPairsSet, { duplicateMode: dupMode, onDuplicate: onDup })
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
