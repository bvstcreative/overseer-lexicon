#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dbPath = path.join(rootDir, 'data', 'lexicon.db')

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

const apiKey = process.env.ELEVENLABS_API_KEY
if (!apiKey) {
  console.error('\n❌ Error: ELEVENLABS_API_KEY is not set.')
  console.error('Please configure your ElevenLabs API key in .env.local:')
  console.error('  echo "ELEVENLABS_API_KEY=your_key_here" >> .env.local\n')
  process.exit(1)
}

// Premade Voices
const PREMADE = {
  ADAM: 'pNInz6obpgDQGcFmaJgB',
  DANIEL: 'onwK4e9ZLuTAKqWW03F9',
  ALICE: 'Xb7hH8MSUJpSbSDYk0k2',
  GEORGE: 'JBFqnCBsd6RMkjVDRZzb',
  LILY: 'pFZP5JQG7iQjIQuC4Bku',
  BELLA: 'hpp4J3VqNfWAUOO0d1Us',
  ERIC: 'cjVigY5qzO86Huf0OWal',
}

function resolveVoiceForTerm(language, languageGroup) {
  const lang = (language || '').trim().toLowerCase()
  const group = (languageGroup || '').trim().toLowerCase()

  if (lang.includes('greek') || group.includes('greek')) {
    return { id: process.env.ELEVENLABS_VOICE_GREEK || PREMADE.DANIEL, fallback: PREMADE.DANIEL, name: 'Daniel (Greek)' }
  }
  if (lang.includes('latin') || group.includes('latin')) {
    return { id: process.env.ELEVENLABS_VOICE_LATIN || PREMADE.DANIEL, fallback: PREMADE.DANIEL, name: 'Daniel (Latin)' }
  }
  if (lang.includes('sanskrit') || lang.includes('pali') || lang.includes('prakrit') || group.includes('sanskrit')) {
    return { id: process.env.ELEVENLABS_VOICE_SANSKRIT || PREMADE.DANIEL, fallback: PREMADE.DANIEL, name: 'Daniel (Sanskrit)' }
  }
  if (lang.includes('japan') || group.includes('japan') || lang === 'ainu') {
    return { id: process.env.ELEVENLABS_VOICE_JAPANESE || PREMADE.ALICE, fallback: PREMADE.ALICE, name: 'Alice (Japanese)' }
  }
  if (lang.includes('chinese') || group.includes('chinese') || lang === 'korean') {
    return { id: process.env.ELEVENLABS_VOICE_CHINESE || PREMADE.ALICE, fallback: PREMADE.ALICE, name: 'Alice (East Asian)' }
  }
  if (lang.includes('indones') || lang.includes('malay') || lang.includes('javan') || lang.includes('balin')) {
    return { id: process.env.ELEVENLABS_VOICE_INDONESIAN || PREMADE.ADAM, fallback: PREMADE.ADAM, name: 'Adam (Indonesian/Austronesian)' }
  }
  if (lang.includes('arab') || lang.includes('hebrew') || lang.includes('persian') || lang === 'akkadian') {
    return { id: process.env.ELEVENLABS_VOICE_ARABIC || PREMADE.GEORGE, fallback: PREMADE.GEORGE, name: 'George (Arabic/Near East)' }
  }
  if (lang.includes('german') || lang.includes('dutch') || lang.includes('norse') || group.includes('scandinavian')) {
    return { id: process.env.ELEVENLABS_VOICE_GERMAN || PREMADE.BELLA, fallback: PREMADE.BELLA, name: 'Bella (Germanic)' }
  }
  if (lang.includes('french') || lang.includes('italian') || lang.includes('spanish') || lang.includes('portuguese')) {
    return { id: process.env.ELEVENLABS_VOICE_FRENCH || PREMADE.LILY, fallback: PREMADE.LILY, name: 'Lily (Romance)' }
  }
  if (lang.includes('russ') || lang.includes('slav') || lang === 'polish') {
    return { id: process.env.ELEVENLABS_VOICE_RUSSIAN || PREMADE.ERIC, fallback: PREMADE.ERIC, name: 'Eric (Slavic)' }
  }
  return { id: process.env.ELEVENLABS_VOICE_ID || PREMADE.ADAM, fallback: PREMADE.ADAM, name: 'Adam (Default)' }
}

// Parse command line arguments
const args = process.argv.slice(2)
const isAll = args.includes('--all')
const isForce = args.includes('--force')
const voiceArg = args.find((a) => a.startsWith('--voice='))
const fixedVoice = voiceArg ? voiceArg.split('=')[1] : null

const limitArg = args.find((a) => a.startsWith('--limit='))
let limit = 20
if (limitArg) {
  limit = parseInt(limitArg.split('=')[1], 10) || 20
}

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL;')

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS term_audio (
    term_id INTEGER NOT NULL,
    voice TEXT NOT NULL DEFAULT 'pNInz6obpgDQGcFmaJgB',
    mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
    audio_data BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (term_id, voice),
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_term_audio_lookup ON term_audio(term_id, voice);
`)

let query = `
  SELECT t.id, t.term, t.romanization, t.language, t.language_group, t.domain, t.gloss
  FROM terms t
  ORDER BY t.id ASC
`
if (!isAll && fixedVoice) {
  query += ` LIMIT ${limit}`
}

const allTerms = db.prepare(query).all()
const audioCacheDir = path.join(rootDir, 'data', 'audio')
if (!fs.existsSync(audioCacheDir)) {
  fs.mkdirSync(audioCacheDir, { recursive: true })
}

// Filter terms that need processing
const termsToProcess = []
for (const t of allTerms) {
  const resolved = fixedVoice
    ? { id: fixedVoice, fallback: PREMADE.ADAM, name: fixedVoice }
    : resolveVoiceForTerm(t.language, t.language_group)

  const audioFilePath = path.join(audioCacheDir, `${t.id}_${resolved.id}.mp3`)
  const existsOnDisk = fs.existsSync(audioFilePath) && fs.statSync(audioFilePath).size > 0
  const row = db.prepare('SELECT 1 FROM term_audio WHERE term_id = ? AND voice = ?').get(t.id, resolved.id)

  if (isForce || (!existsOnDisk && !row)) {
    termsToProcess.push({ ...t, resolvedVoice: resolved })
    if (!isAll && termsToProcess.length >= limit) break
  }
}

if (termsToProcess.length === 0) {
  console.log(`\n✨ All terms already have pre-generated audio for their respective language voices!`)
  process.exit(0)
}

console.log(`\n🎙️  Preheating ElevenLabs TTS audio for ${termsToProcess.length} terms using language-based voices...`)
console.log('Model: eleven_multilingual_v2\n')

const saveStmt = db.prepare(`
  INSERT INTO term_audio (term_id, voice, mime_type, audio_data)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(term_id, voice) DO UPDATE SET
    audio_data = excluded.audio_data,
    mime_type = excluded.mime_type,
    created_at = CURRENT_TIMESTAMP
`)

let successCount = 0
let failCount = 0

for (let i = 0; i < termsToProcess.length; i++) {
  const item = termsToProcess[i]
  const textToRecite = (item.term || item.romanization || '').trim()
  let voiceId = item.resolvedVoice.id
  let audioFilePath = path.join(audioCacheDir, `${item.id}_${voiceId}.mp3`)

  process.stdout.write(
    `[${i + 1}/${termsToProcess.length}] "${item.term}" (${item.language}) -> ${item.resolvedVoice.name}... `
  )

  try {
    let res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: textToRecite,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
    })

    if ((res.status === 402 || res.status === 404) && item.resolvedVoice.fallback && item.resolvedVoice.fallback !== voiceId) {
      voiceId = item.resolvedVoice.fallback
      audioFilePath = path.join(audioCacheDir, `${item.id}_${voiceId}.mp3`)
      res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: textToRecite,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      })
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.detail?.message || errJson.message || `HTTP ${res.status}`)
    }

    const audioArrayBuffer = await res.arrayBuffer()
    const audioBuffer = Buffer.from(audioArrayBuffer)

    fs.writeFileSync(audioFilePath, audioBuffer)
    saveStmt.run(item.id, voiceId, 'audio/mpeg', audioBuffer)
    successCount++
    console.log(`✓ (${Math.round(audioBuffer.length / 1024)} KB MP3 saved)`)
  } catch (err) {
    failCount++
    console.log(`✗ Error: ${err.message}`)
  }

  // Rate limit delay between requests
  if (i < termsToProcess.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 350))
  }
}

console.log(`\n🎉 Completed! ${successCount} synthesized & cached, ${failCount} failed.`)
