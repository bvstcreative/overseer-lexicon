import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { getTermById, getCachedTermAudio, saveCachedTermAudio } from '@/lib/db'
import { GoogleGenAI } from '@google/genai'

const AUDIO_CACHE_DIR = path.join(process.cwd(), 'data', 'audio')

function ensureAudioDir(): void {
  if (!fs.existsSync(AUDIO_CACHE_DIR)) {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Status query
    if (searchParams.get('status')) {
      return NextResponse.json({
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        defaultVoice: 'Charon',
      })
    }

    const idParam = searchParams.get('id') || searchParams.get('termId')
    const voice = (searchParams.get('voice') || 'Charon').trim()

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
    const audioFilePath = path.join(AUDIO_CACHE_DIR, `${term.id}_${voice.toLowerCase()}.wav`)

    // 1. Check if saved audio file already exists on disk
    if (fs.existsSync(audioFilePath)) {
      const fileBuffer = fs.readFileSync(audioFilePath)
      if (fileBuffer.length > 0) {
        return new Response(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': String(fileBuffer.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-TTS-Source': 'disk-file',
          },
        })
      }
    }

    // 2. Check SQLite audio cache
    const cached = getCachedTermAudio(term.id, voice)
    if (cached && cached.audio_data && cached.audio_data.length > 0) {
      const buffer = Buffer.from(cached.audio_data)
      try {
        fs.writeFileSync(audioFilePath, buffer)
      } catch (e) {
        console.warn('Failed to sync audio from SQLite to disk:', e)
      }

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': cached.mime_type || 'audio/wav',
          'Content-Length': String(buffer.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-TTS-Source': 'sqlite-cache',
        },
      })
    }

    // 3. Check if GEMINI_API_KEY is available
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY_NOT_CONFIGURED',
          message: 'Gemini API key is not configured in .env.local',
        },
        { status: 503 }
      )
    }

    // 4. Generate studio audio via Gemini 3.8 Flash-Lite TTS
    const ai = new GoogleGenAI({ apiKey })

    // Speak ONLY the word itself (never instructions or preambles)
    const textToRecite = (term.term || term.romanization || '').trim()

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
                  style: `${term.language} pronunciation`,
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

    const audioDataB64 = interaction.output_audio?.data
    if (!audioDataB64) {
      return NextResponse.json(
        { error: 'Failed to retrieve audio output from Gemini' },
        { status: 502 }
      )
    }

    const audioBuffer = Buffer.from(audioDataB64, 'base64')

    // 5. Permanently save to disk file AND SQLite so it is NEVER generated again
    try {
      fs.writeFileSync(audioFilePath, audioBuffer)
    } catch (fsErr) {
      console.warn('Failed to save audio file to disk:', fsErr)
    }

    try {
      saveCachedTermAudio(term.id, voice, audioBuffer, 'audio/wav')
    } catch (cacheErr) {
      console.warn('Failed to cache audio in SQLite:', cacheErr)
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-TTS-Source': 'gemini-api',
      },
    })
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'digest' in err &&
      (err as { digest: string }).digest === 'NEXT_PRERENDER_INTERRUPTED'
    ) {
      throw err
    }
    console.error('Error in /api/tts:', err)
    const message = err instanceof Error ? err.message : 'Unknown TTS error'
    return NextResponse.json(
      { error: 'TTS_GENERATION_FAILED', message },
      { status: 500 }
    )
  }
}
