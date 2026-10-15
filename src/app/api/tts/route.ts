import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { getTermById, getAnyCachedTermAudio, saveCachedTermAudio } from '@/lib/db'

const AUDIO_CACHE_DIR = path.join(process.cwd(), 'data', 'audio')

function ensureAudioDir(): void {
  if (!fs.existsSync(AUDIO_CACHE_DIR)) {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true })
  }
}

/**
 * GET /api/tts
 * Retrieves cached audio file or checks cache status for a term.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Status query
    if (searchParams.get('status')) {
      return NextResponse.json({
        provider: 'puter.js',
        status: 'ready',
        description: 'Puter.js client-side multilingual neural text-to-speech with local audio caching',
      })
    }

    const idParam = searchParams.get('id') || searchParams.get('termId')
    const checkOnly = searchParams.get('check') === '1' || searchParams.get('check') === 'true'

    if (!idParam) {
      return NextResponse.json(
        { error: 'Missing term "id" query parameter' },
        { status: 400 }
      )
    }

    const termId = parseInt(idParam, 10)
    if (isNaN(termId)) {
      return NextResponse.json(
        { error: 'Invalid term "id" parameter' },
        { status: 400 }
      )
    }

    const term = getTermById(termId)
    if (!term) {
      return NextResponse.json(
        { error: 'Term not found in lexicon' },
        { status: 404 }
      )
    }

    ensureAudioDir()

    // 1. Check if saved audio file exists on disk
    // First check exact puter file, then any other saved audio for this term
    const puterFilePath = path.join(AUDIO_CACHE_DIR, `${term.id}_puter.mp3`)
    let existingFilePath: string | null = null

    if (fs.existsSync(puterFilePath) && fs.statSync(puterFilePath).size > 0) {
      existingFilePath = puterFilePath
    } else {
      const files = fs.readdirSync(AUDIO_CACHE_DIR)
      const prefix = `${term.id}_`
      const match = files.find((f) => f.startsWith(prefix) && (f.endsWith('.mp3') || f.endsWith('.wav')))
      if (match) {
        const fullPath = path.join(AUDIO_CACHE_DIR, match)
        if (fs.statSync(fullPath).size > 0) {
          existingFilePath = fullPath
        }
      }
    }

    if (existingFilePath) {
      if (checkOnly) {
        return NextResponse.json({ cached: true, source: 'disk-file' })
      }
      const fileBuffer = fs.readFileSync(existingFilePath)
      const mime = existingFilePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(fileBuffer.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-TTS-Source': 'disk-file',
        },
      })
    }

    // 2. Check SQLite audio cache
    const cached = getAnyCachedTermAudio(term.id)
    if (cached && cached.audio_data && cached.audio_data.length > 0) {
      if (checkOnly) {
        return NextResponse.json({ cached: true, source: 'sqlite-cache' })
      }

      const buffer = Buffer.from(cached.audio_data)
      try {
        fs.writeFileSync(puterFilePath, buffer)
      } catch (e) {
        console.warn('Failed to sync audio from SQLite to disk:', e)
      }

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': cached.mime_type || 'audio/mpeg',
          'Content-Length': String(buffer.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-TTS-Source': 'sqlite-cache',
        },
      })
    }

    // 3. Audio not in cache yet
    if (checkOnly) {
      return NextResponse.json({ cached: false })
    }

    return NextResponse.json(
      {
        cached: false,
        error: 'AUDIO_NOT_CACHED',
        message: 'Audio not generated yet. Client will synthesize via Puter.js.',
        term: {
          id: term.id,
          term: term.term,
          romanization: term.romanization,
          language: term.language,
          language_group: term.language_group,
        },
      },
      { status: 404 }
    )
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'digest' in err &&
      (err as { digest: string }).digest === 'NEXT_PRERENDER_INTERRUPTED'
    ) {
      throw err
    }
    console.error('Error in GET /api/tts:', err)
    const message = err instanceof Error ? err.message : 'Unknown TTS error'
    return NextResponse.json({ error: 'TTS_ERROR', message }, { status: 500 })
  }
}

/**
 * POST /api/tts
 * Caches newly generated Puter.js audio to local disk and SQLite.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, audioBase64, mimeType, voice } = body

    if (!id || !audioBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: "id" and "audioBase64"' },
        { status: 400 }
      )
    }

    const termId = parseInt(String(id), 10)
    if (isNaN(termId)) {
      return NextResponse.json(
        { error: 'Invalid term "id" parameter' },
        { status: 400 }
      )
    }

    const term = getTermById(termId)
    if (!term) {
      return NextResponse.json(
        { error: 'Term not found in lexicon' },
        { status: 404 }
      )
    }

    ensureAudioDir()
    const buffer = Buffer.from(audioBase64, 'base64')
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'Empty audio buffer received' },
        { status: 400 }
      )
    }

    const ext = mimeType?.includes('wav') ? 'wav' : 'mp3'
    const audioFilePath = path.join(AUDIO_CACHE_DIR, `${term.id}_puter.${ext}`)
    const targetMime = mimeType || (ext === 'wav' ? 'audio/wav' : 'audio/mpeg')
    const voiceTag = voice || 'puter'

    // Write to disk
    try {
      fs.writeFileSync(audioFilePath, buffer)
    } catch (fsErr) {
      console.warn('Failed to save audio file to disk:', fsErr)
    }

    // Write to SQLite
    try {
      saveCachedTermAudio(term.id, voiceTag, buffer, targetMime)
    } catch (cacheErr) {
      console.warn('Failed to cache audio in SQLite:', cacheErr)
    }

    return NextResponse.json({
      success: true,
      saved: true,
      termId: term.id,
      size: buffer.length,
      mimeType: targetMime,
      voice: voiceTag,
    })
  } catch (err: unknown) {
    console.error('Error in POST /api/tts:', err)
    const message = err instanceof Error ? err.message : 'Failed to save audio cache'
    return NextResponse.json({ error: 'TTS_SAVE_FAILED', message }, { status: 500 })
  }
}
