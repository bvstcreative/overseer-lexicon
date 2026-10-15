/**
 * Audio playback engine for Overseer Lexicon:
 * - Powered by Puter.js multilingual AI Text-to-Speech (puter.ai.txt2speech)
 * - Automatic language-to-voice routing (AWS Polly Neural + OpenAI Multilingual)
 * - Word-only recitation (strictly the term without prompts)
 * - Persistent server disk and SQLite audio caching
 * - Zero robotic browser-native SpeechSynthesis
 */

import { ensurePuterLoaded, resolvePuterVoice } from './puter-tts'

export interface SpeakOptions {
  id?: number
  term: string
  romanization?: string
  language?: string
  languageGroup?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: unknown) => void
}

let activeAudio: HTMLAudioElement | null = null

/**
 * Stops any currently active audio playback immediately.
 */
export function stopSpeaking(): void {
  if (activeAudio) {
    try {
      activeAudio.pause()
      activeAudio.src = ''
    } catch {}
    activeAudio = null
  }
}

/**
 * Sends newly generated audio from Puter.js to the server to persist on disk and in SQLite.
 */
async function cacheAudioToServer(termId: number, audioSrc: string, voiceName: string): Promise<void> {
  try {
    const res = await fetch(audioSrc)
    if (!res.ok) return
    const blob = await res.blob()

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string)?.split(',')[1]
      if (base64) {
        fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: termId,
            audioBase64: base64,
            mimeType: blob.type || 'audio/mpeg',
            voice: voiceName,
          }),
        }).catch((e) => console.warn('Failed to save audio cache on server:', e))
      }
    }
    reader.readAsDataURL(blob)
  } catch (err) {
    console.warn('Failed to extract Puter audio for server caching:', err)
  }
}

/**
 * Plays the studio-grade pronunciation audio for a lexicon term using Puter.js.
 * - Reuses existing saved audio from disk/SQLite if available.
 * - If not yet cached, synthesizes via Puter.js using the appropriate language voice and caches it.
 */
export async function speakLexiconTerm(options: SpeakOptions): Promise<void> {
  stopSpeaking()

  const { id, term, romanization, language, languageGroup, onStart, onEnd, onError } = options

  if (!id) {
    onError?.(new Error('Term ID is required to play pronunciation audio.'))
    return
  }

  if (typeof window === 'undefined') return

  onStart?.()

  let finished = false
  const cleanup = () => {
    if (!finished) {
      finished = true
      activeAudio = null
      onEnd?.()
    }
  }

  // 1. Check if server already has the cached audio file for this term
  const serverAudioUrl = `/api/tts?id=${encodeURIComponent(id)}`
  try {
    const checkRes = await fetch(`${serverAudioUrl}&check=1`)
    if (checkRes.ok) {
      const checkData = await checkRes.json()
      if (checkData.cached) {
        const audio = new Audio(serverAudioUrl)
        activeAudio = audio
        audio.onended = cleanup
        audio.onerror = () => {
          activeAudio = null
          cleanup()
          onError?.(new Error(`Failed to play cached audio for "${term}"`))
        }
        await audio.play()
        return
      }
    }
  } catch (checkErr) {
    console.warn('Cache check failed, continuing to Puter synthesis:', checkErr)
  }

  // 2. Synthesize using Puter.js with multilingual voice routing
  try {
    const puter = await ensurePuterLoaded()
    const resolved = resolvePuterVoice(language, languageGroup)

    // Strictly the word itself
    const textToRecite = (term || romanization || '').trim()
    if (!textToRecite) {
      cleanup()
      return
    }

    let puterAudio: HTMLAudioElement
    try {
      puterAudio = await puter.ai.txt2speech(textToRecite, resolved.options)
    } catch (firstErr) {
      console.warn(`Puter primary voice failed for ${language}. Retrying with fallback voice...`, firstErr)
      puterAudio = await puter.ai.txt2speech(textToRecite, resolved.fallbackOptions)
    }

    activeAudio = puterAudio
    puterAudio.onended = cleanup
    puterAudio.onerror = () => {
      activeAudio = null
      cleanup()
      onError?.(new Error(`Failed to play Puter audio for "${term}"`))
    }

    await puterAudio.play()

    // 3. Cache the newly generated audio on the server for future clicks
    if (puterAudio.src) {
      cacheAudioToServer(id, puterAudio.src, resolved.speakerName)
    }
  } catch (err) {
    activeAudio = null
    cleanup()
    const message = err instanceof Error ? err.message : `Failed to synthesize audio for "${term}" with Puter.js`
    onError?.(new Error(message))
  }
}
