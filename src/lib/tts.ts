/**
 * Audio playback engine for Overseer Lexicon:
 * - Plays studio-grade human audio via Gemini 3.8 Flash TTS (/api/tts)
 * - Uses SQLite & local disk-cached audio files
 * - Fully removes browser-native robotic speech synthesis
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
 * Plays the studio-grade pronunciation audio for a lexicon term.
 */
export function speakLexiconTerm(options: SpeakOptions): void {
  stopSpeaking()

  const { id, term, voice = 'Charon', onStart, onEnd, onError } = options

  if (!id) {
    onError?.(new Error('Term ID is required to play pronunciation audio.'))
    return
  }

  if (typeof window === 'undefined') return

  onStart?.()

  const audioUrl = `/api/tts?id=${encodeURIComponent(id)}&voice=${encodeURIComponent(voice)}`
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
          data.error === 'GEMINI_API_KEY_NOT_CONFIGURED'
            ? 'Gemini API key is not configured in .env.local'
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
