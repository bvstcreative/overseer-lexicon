/**
 * Text-to-Speech (TTS) engine with:
 * 1. Studio-grade human audio via Gemini 3.8 Flash TTS (/api/tts)
 * 2. SQLite audio caching for instant 0ms, zero-cost replays
 * 3. Graceful client-side fallback to Web Speech API with automatic native-tongue BCP-47 resolution
 */

export const LANGUAGE_BCP47_MAP: Record<string, string> = {
  // Classical & Ancient languages
  'Ancient Greek': 'el-GR',
  'Byzantine Greek': 'el-GR',
  'Modern Greek': 'el-GR',
  Greek: 'el-GR',
  Latin: 'it-IT', // Ecclesiastical Latin pronunciation via Italian engine
  'Late Latin': 'it-IT',
  'Medieval Latin': 'it-IT',
  'Old Norse': 'is-IS', // Icelandic is the closest living relative to Old Norse
  'Old East Slavic': 'ru-RU',
  'Old Russian': 'ru-RU',
  'Old French': 'fr-FR',
  'Old Persian': 'fa-IR',
  'Middle Persian': 'fa-IR',
  'Ottoman Turkish': 'tr-TR',
  'Biblical Hebrew': 'he-IL',
  'Modern Hebrew': 'he-IL',
  Hebrew: 'he-IL',
  'Classical Chinese': 'zh-CN',
  'Han Chinese': 'zh-CN',
  'Ming Chinese': 'zh-CN',
  'Tang Chinese': 'zh-CN',
  Chinese: 'zh-CN',
  Sanskrit: 'hi-IN', // Hindi/Indian phonology handles Devanagari Sanskrit
  Pali: 'hi-IN',
  Prakrit: 'hi-IN',
  Aramaic: 'he-IL',
  'Ancient Egyptian': 'ar-EG',
  Akkadian: 'ar-IQ',
  Sumerian: 'ar-IQ',
  'Classic Maya': 'es-MX',
  'Yucatec Maya': 'es-MX',
  Nahuatl: 'es-MX',
  Taíno: 'es-DO',

  // Modern World Languages
  English: 'en-US',
  French: 'fr-FR',
  German: 'de-DE',
  Spanish: 'es-ES',
  'Spanish Philippines': 'es-ES',
  Italian: 'it-IT',
  Venetian: 'it-IT',
  Portuguese: 'pt-PT',
  Dutch: 'nl-NL',
  Russian: 'ru-RU',
  Slavic: 'ru-RU',
  'South Slavic': 'sr-RS',
  Polish: 'pl-PL',
  Czech: 'cs-CZ',
  Croatian: 'hr-HR',
  Serbian: 'sr-RS',
  Hungarian: 'hu-HU',
  Romanian: 'ro-RO',
  Swedish: 'sv-SE',
  Danish: 'da-DK',
  Norwegian: 'nb-NO',
  Finnish: 'fi-FI',
  Estonian: 'et-EE',
  Latvian: 'lv-LV',
  Lithuanian: 'lt-LT',
  Irish: 'ga-IE',
  'Scottish Gaelic': 'gd-GB',
  Welsh: 'cy-GB',

  // Asian Languages
  Japanese: 'ja-JP',
  Korean: 'ko-KR',
  Vietnamese: 'vi-VN',
  Thai: 'th-TH',
  Khmer: 'km-KH',
  Burmese: 'my-MM',
  Indonesian: 'id-ID',
  Malay: 'ms-MY',
  Javanese: 'jv-ID',
  Balinese: 'id-ID',
  Tagalog: 'fil-PH',
  Mongolian: 'mn-MN',

  // South Asian Languages
  Hindi: 'hi-IN',
  Urdu: 'ur-PK',
  Bengali: 'bn-BD',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Marathi: 'mr-IN',
  Kannada: 'kn-IN',
  Malayalam: 'ml-IN',
  Sinhala: 'si-LK',
  Nepali: 'ne-NP',

  // Middle Eastern & Caucasian
  Arabic: 'ar-SA',
  Persian: 'fa-IR',
  Turkish: 'tr-TR',
  Turkic: 'tr-TR',
  Armenian: 'hy-AM',
  Georgian: 'ka-GE',

  // African Languages
  Swahili: 'sw-KE',
  Amharic: 'am-ET',
  Hausa: 'ha-NG',
  Yoruba: 'yo-NG',
  Igbo: 'ig-NG',
  Zulu: 'zu-ZA',
  Shona: 'sn-ZW',
  Wolof: 'wo-SN',
  Akan: 'ak-GH',
  Berber: 'ar-MA',

  // Oceania & Americas
  Hawaiian: 'haw-US',
  Māori: 'mi-NZ',
  Samoan: 'sm-WS',
  Fijian: 'fj-FJ',
  Quechua: 'qu-PE',
  Lakota: 'en-US',
  Narragansett: 'en-US',
}

/**
 * Check if the browser environment supports the Web Speech API.
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

/**
 * Normalizes language name to a primary BCP-47 tag.
 */
export function resolveBcp47(language: string): string {
  if (!language) return 'en-US'
  const trimmed = language.trim()
  if (LANGUAGE_BCP47_MAP[trimmed]) {
    return LANGUAGE_BCP47_MAP[trimmed]
  }

  // Partial match fallback
  for (const [key, code] of Object.entries(LANGUAGE_BCP47_MAP)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed.toLowerCase())) {
      return code
    }
  }

  return 'en-US'
}

/**
 * Checks whether text contains characters outside basic Latin / Latin Extended alphabets.
 */
function hasNonLatinScript(text: string): boolean {
  return /[^\u0000-\u024F\u1E00-\u1EFF]/.test(text)
}

/**
 * Find the most suitable voice in the browser for a given BCP-47 code.
 */
function findBestVoice(voices: SpeechSynthesisVoice[], bcp47: string): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null

  const target = bcp47.toLowerCase().replace('_', '-')
  const primaryLang = target.split('-')[0]

  // 1. Exact match (e.g. ja-JP === ja-JP)
  const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === target)
  if (exact) return exact

  // 2. Primary language match (e.g. ja-* matches ja-JP)
  const prefixMatch = voices.find((v) => {
    const vLang = v.lang.toLowerCase().replace('_', '-')
    return vLang.startsWith(primaryLang + '-') || vLang === primaryLang
  })
  if (prefixMatch) return prefixMatch

  return null
}

export interface SpeakOptions {
  id?: number
  term: string
  romanization?: string
  language: string
  voice?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: unknown) => void
}

let activeAudio: HTMLAudioElement | null = null

/**
 * Stops any currently active audio playback (both Gemini audio and Web Speech).
 */
export function stopSpeaking(): void {
  if (activeAudio) {
    try {
      activeAudio.pause()
      activeAudio.src = ''
    } catch {}
    activeAudio = null
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {}
  }
}

/**
 * Fallback to browser native Web Speech API if Gemini TTS is unavailable or unconfigured.
 */
function speakWithWebSpeech({
  term,
  romanization,
  language,
  onStart,
  onEnd,
  onError,
}: SpeakOptions): void {
  if (!isSpeechSupported()) {
    onError?.(new Error('Speech synthesis is not supported in this browser.'))
    onEnd?.()
    return
  }

  try {
    window.speechSynthesis.cancel()

    const bcp47 = resolveBcp47(language)
    const voices = window.speechSynthesis.getVoices()
    const voice = findBestVoice(voices, bcp47)

    const nonLatin = hasNonLatinScript(term)
    const textToRead = nonLatin && !voice && romanization ? romanization : term

    const utterance = new SpeechSynthesisUtterance(textToRead)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = bcp47
    }

    utterance.rate = 0.88
    utterance.pitch = 1.0

    let finished = false
    const cleanup = () => {
      if (!finished) {
        finished = true
        onEnd?.()
      }
    }

    utterance.onstart = () => {
      onStart?.()
    }

    utterance.onend = cleanup
    utterance.onerror = (e) => {
      cleanup()
      onError?.(e)
    }

    const estimatedDurationMs = Math.max(2500, textToRead.length * 300)
    setTimeout(() => {
      if (!finished && window.speechSynthesis.speaking) {
        // Still speaking naturally
      } else if (!finished) {
        cleanup()
      }
    }, estimatedDurationMs + 1000)

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    onEnd?.()
    onError?.(err)
  }
}

/**
 * Speaks a lexicon term:
 * 1. First attempts to fetch and stream human studio-grade audio via Gemini 3.8 Flash TTS (/api/tts)
 * 2. If Gemini is unconfigured or unavailable, gracefully falls back to Web Speech API.
 */
export function speakLexiconTerm(options: SpeakOptions): void {
  stopSpeaking()

  const { id, term, romanization, language, voice = 'Charon', onStart, onEnd, onError } = options

  // If term has a database ID, try Gemini TTS endpoint with SQLite caching
  if (id && typeof window !== 'undefined') {
    onStart?.()

    const audioUrl = `/api/tts?id=${encodeURIComponent(id)}&voice=${encodeURIComponent(voice)}`
    const audio = new Audio()
    activeAudio = audio

    let ended = false
    const handleEnd = () => {
      if (!ended) {
        ended = true
        activeAudio = null
        onEnd?.()
      }
    }

    audio.onended = handleEnd

    audio.onerror = () => {
      // Endpoint returned an error (e.g. 503 GEMINI_API_KEY_NOT_CONFIGURED), fallback to Web Speech
      activeAudio = null
      speakWithWebSpeech({
        term,
        romanization,
        language,
        onStart,
        onEnd: handleEnd,
        onError,
      })
    }

    audio.src = audioUrl
    audio.play().catch(() => {
      // Audio playback blocked or network failure, fallback to Web Speech
      activeAudio = null
      speakWithWebSpeech({
        term,
        romanization,
        language,
        onStart,
        onEnd: handleEnd,
        onError,
      })
    })
    return
  }

  // If no DB ID is provided (e.g. pre-import preview), use Web Speech
  speakWithWebSpeech(options)
}
