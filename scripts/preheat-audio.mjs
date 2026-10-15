#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'

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

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('\n❌ Error: GEMINI_API_KEY is not set.')
  console.error('Please configure your Gemini API key in .env.local:')
  console.error('  echo "GEMINI_API_KEY=your_key_here" >> .env.local\n')
  process.exit(1)
}

// Parse command line arguments
const args = process.argv.slice(2)
const isAll = args.includes('--all')
const isForce = args.includes('--force')
const voiceArg = args.find((a) => a.startsWith('--voice='))
const voice = voiceArg ? voiceArg.split('=')[1] : 'Charon'

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
    voice TEXT NOT NULL DEFAULT 'Charon',
    mime_type TEXT NOT NULL DEFAULT 'audio/wav',
    audio_data BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (term_id, voice),
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_term_audio_lookup ON term_audio(term_id, voice);
`)

let query = `
  SELECT t.id, t.term, t.romanization, t.language, t.domain, t.gloss
  FROM terms t
`
if (!isForce) {
  query += `
    LEFT JOIN term_audio a ON t.id = a.term_id AND a.voice = ?
    WHERE a.term_id IS NULL
  `
}
query += ` ORDER BY t.id ASC`
if (!isAll) {
  query += ` LIMIT ${limit}`
}

const termsToProcess = !isForce
  ? db.prepare(query).all(voice)
  : db.prepare(query).all()

if (termsToProcess.length === 0) {
  console.log(`\n✨ All terms already have pre-generated audio for voice "${voice}" in SQLite!`)
  process.exit(0)
}

console.log(`\n🎙️  Preheating Gemini TTS audio for ${termsToProcess.length} terms using voice "${voice}"...`)
console.log('Model: gemini-3.8-flash-lite-tts\n')

const ai = new GoogleGenAI({ apiKey })
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

const audioCacheDir = path.join(rootDir, 'data', 'audio')
if (!fs.existsSync(audioCacheDir)) {
  fs.mkdirSync(audioCacheDir, { recursive: true })
}

for (let i = 0; i < termsToProcess.length; i++) {
  const item = termsToProcess[i]
  const textToRecite = (item.term || item.romanization || '').trim()
  const audioFilePath = path.join(audioCacheDir, `${item.id}_${voice.toLowerCase()}.wav`)

  process.stdout.write(`[${i + 1}/${termsToProcess.length}] "${item.term}" (${item.language})... `)

  try {
    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash-lite-tts',
      input: [
        {
          type: 'user_input',
          content: [
            {
              type: 'text',
              text: textToRecite,
              annotations: [
                {
                  type: 'speech_metadata',
                  style: `${item.language} pronunciation`,
                },
              ],
            },
          ],
        },
      ],
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [
          { voice },
        ],
      },
    })

    const audioB64 = interaction.output_audio?.data
    if (!audioB64) {
      throw new Error('No audio returned in response')
    }

    const audioBuffer = Buffer.from(audioB64, 'base64')
    fs.writeFileSync(audioFilePath, audioBuffer)
    saveStmt.run(item.id, voice, 'audio/wav', audioBuffer)
    successCount++
    console.log(`✓ (${Math.round(audioBuffer.length / 1024)} KB WAV saved to disk & SQLite)`)
  } catch (err) {
    failCount++
    console.log(`✗ Error: ${err.message}`)
  }

  // Brief pause to be respectful to rate limits
  if (i < termsToProcess.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
}

console.log(`\n🎉 Completed! ${successCount} synthesized & cached in SQLite, ${failCount} failed.`)

