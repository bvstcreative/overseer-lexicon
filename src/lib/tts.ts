/**
 * Audio playback engine for Overseer Lexicon:
 * - Plays studio-grade human audio via ElevenLabs TTS (/api/tts)
 * - Uses SQLite & local disk-cached audio files
 */

export interface SpeakOptions {
  id?: number
  term: string
  romanization?: string
  language?: string
  voice?: string
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
 * Plays the studio-grade pronunciation audio for a lexicon term using ElevenLabs.
 */
export function speakLexiconTerm(options: SpeakOptions): void {
  stopSpeaking()

  const { id, term, voice, onStart, onEnd, onError } = options

  if (!id) {
    onError?.(new Error('Term ID is required to play pronunciation audio.'))
    return
  }

  if (typeof window === 'undefined') return

  onStart?.()

  const voiceQuery = voice ? `&voice=${encodeURIComponent(voice)}` : ''
  const audioUrl = `/api/tts?id=${encodeURIComponent(id)}${voiceQuery}`
  const audio = new Audio()
  activeAudio = audio

  let finished = false
  const cleanup = () => {
    if (!finished) {
      finished = true
      activeAudio = null
      onEnd?.()
    }
  }

  audio.onended = cleanup

  audio.onerror = async () => {
    activeAudio = null
    try {
      // Inspect endpoint response to give accurate user-facing feedback
      const res = await fetch(audioUrl)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message =
          data.error === 'ELEVENLABS_API_KEY_NOT_CONFIGURED'
            ? 'ElevenLabs API key is not configured in .env.local'
            : data.message || `Failed to load audio (${res.status})`
        cleanup()
        onError?.(new Error(message))
        return
      }
    } catch {}

    cleanup()
    onError?.(new Error(`Failed to play audio for "${term}"`))
  }

  audio.src = audioUrl
  audio.play().catch((err) => {
    activeAudio = null
    cleanup()
    onError?.(err)
  })
}
