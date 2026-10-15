import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { getTermById, getCachedTermAudio, saveCachedTermAudio } from '@/lib/db'
import { resolveVoiceForLanguage, PREMADE_VOICES } from '@/lib/voice-router'

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
        elevenLabsConfigured: !!process.env.ELEVENLABS_API_KEY,
        languageRoutingEnabled: true,
        defaultVoice: process.env.ELEVENLABS_VOICE_ID || PREMADE_VOICES.ADAM,
        availablePremadeVoices: PREMADE_VOICES,
      })
    }

    const idParam = searchParams.get('id') || searchParams.get('termId')

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

    // Determine speaker voice based on term's language or explicit query param
    const explicitVoice = searchParams.get('voice')?.trim()
    const voiceRoute = resolveVoiceForLanguage(term.language, term.language_group)
    let targetVoiceId = explicitVoice || voiceRoute.voiceId
    const fallbackVoiceId = voiceRoute.fallbackVoiceId

    ensureAudioDir()
    let audioFilePath = path.join(AUDIO_CACHE_DIR, `${term.id}_${targetVoiceId}.mp3`)

    // 1. Check if saved audio file already exists on disk
    if (fs.existsSync(audioFilePath)) {
      const fileBuffer = fs.readFileSync(audioFilePath)
      if (fileBuffer.length > 0) {
        return new Response(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(fileBuffer.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-TTS-Source': 'disk-file',
            'X-TTS-Voice': targetVoiceId,
            'X-TTS-Voice-Name': voiceRoute.voiceName,
            'X-TTS-Language': term.language || 'Unknown',
          },
        })
      }
    }

    // 2. Check SQLite audio cache
    const cached = getCachedTermAudio(term.id, targetVoiceId)
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
          'Content-Type': cached.mime_type || 'audio/mpeg',
          'Content-Length': String(buffer.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-TTS-Source': 'sqlite-cache',
          'X-TTS-Voice': targetVoiceId,
          'X-TTS-Voice-Name': voiceRoute.voiceName,
          'X-TTS-Language': term.language || 'Unknown',
        },
      })
    }

    // 3. Check if ELEVENLABS_API_KEY is available
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'ELEVENLABS_API_KEY_NOT_CONFIGURED',
          message: 'ElevenLabs API key is not configured in .env.local',
        },
        { status: 503 }
      )
    }

    // 4. Generate audio via ElevenLabs Text-to-Speech API
    // Strictly the word itself
    const textToRecite = (term.term || term.romanization || '').trim()

    let elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(targetVoiceId)}`,
      {
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
      }
    )

    // Seamless fallback to premade voice if custom/library voice returns 402 or 404
    if ((elevenRes.status === 402 || elevenRes.status === 404) && fallbackVoiceId && fallbackVoiceId !== targetVoiceId) {
      console.warn(
        `ElevenLabs voice ${targetVoiceId} failed with ${elevenRes.status}. Retrying with premade voice ${fallbackVoiceId}...`
      )
      targetVoiceId = fallbackVoiceId
      audioFilePath = path.join(AUDIO_CACHE_DIR, `${term.id}_${targetVoiceId}.mp3`)

      elevenRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(targetVoiceId)}`,
        {
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
        }
      )
    }

    if (!elevenRes.ok) {
      const errData = await elevenRes.json().catch(() => ({}))
      const errMsg =
        errData.detail?.message ||
        errData.message ||
        `ElevenLabs request failed with status ${elevenRes.status}`
      console.error('ElevenLabs API error:', errMsg)
      return NextResponse.json(
        { error: 'ELEVENLABS_API_ERROR', message: errMsg },
        { status: elevenRes.status }
      )
    }

    const audioArrayBuffer = await elevenRes.arrayBuffer()
    const audioBuffer = Buffer.from(audioArrayBuffer)

    // 5. Permanently save to disk file AND SQLite
    try {
      fs.writeFileSync(audioFilePath, audioBuffer)
    } catch (fsErr) {
      console.warn('Failed to save audio file to disk:', fsErr)
    }

    try {
      saveCachedTermAudio(term.id, targetVoiceId, audioBuffer, 'audio/mpeg')
    } catch (cacheErr) {
      console.warn('Failed to cache audio in SQLite:', cacheErr)
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-TTS-Source': 'elevenlabs-api',
        'X-TTS-Voice': targetVoiceId,
        'X-TTS-Voice-Name': voiceRoute.voiceName,
        'X-TTS-Language': term.language || 'Unknown',
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
