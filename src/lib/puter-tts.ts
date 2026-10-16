/**
 * Puter.js Multilingual Text-to-Speech (TTS) Integration
 *
 * Provides studio-quality human voice generation powered by Puter.js:
 * - Google Gemini TTS as the primary voice for every language (reads native script
 *   directly, no API key needed via Puter's "User Pays" model) — it sounds the most
 *   fluent/native of the available voice banks.
 * - A short, style-only `instructions` hint (e.g. "native Russian accent") steers
 *   pronunciation without describing an action to perform. Earlier, full directive
 *   sentences like "Pronounce this word accurately... respecting native phonetics"
 *   got partially narrated by Puter's Gemini bridge instead of staying silent style
 *   guidance; short descriptors are far less likely to read as something to speak aloud.
 *   If this still leaks for a given language, drop that language's `instructions` arg.
 * - AWS Polly/OpenAI as a fallback if Gemini's preview endpoint errors.
 * - Word-only recitation (no prompts or instructions spoken)
 * - Server disk & SQLite caching integration
 */

export interface PuterTTSOptions {
  provider: 'aws-polly' | 'openai' | 'gemini' | 'speechify'
  voice?: string
  language?: string
  engine?: 'neural' | 'standard' | 'generative' | 'long-form'
  model?: string
  instructions?: string
}

// Google Gemini TTS, reached via Puter's "User Pays" model (no API key needed, same as
// aws-polly/openai above). It has no `language` parameter — it reads whatever script the
// text is in directly. `instructions` is optional and should stay a short style descriptor
// (2-4 words), not a full sentence describing what to do with the text — see file header.
function geminiOptions(voice: string, instructions?: string): PuterTTSOptions {
  return {
    provider: 'gemini',
    model: 'gemini-3.8-flash-tts',
    voice,
    ...(instructions ? { instructions } : {}),
  }
}

export interface PuterResolvedVoice {
  options: PuterTTSOptions
  fallbackOptions: PuterTTSOptions
  speakerName: string
  languageCategory: string
}

/**
 * Maps any language or language group from the lexicon database to the optimal Puter.js TTS voice.
 */
export function resolvePuterVoice(
  language?: string | null,
  languageGroup?: string | null
): PuterResolvedVoice {
  const lang = (language || '').trim().toLowerCase()
  const group = (languageGroup || '').trim().toLowerCase()

  // General fallback option: OpenAI multilingual TTS (supports 50+ languages natively)
  const generalFallback: PuterTTSOptions = {
    provider: 'openai',
    model: 'gpt-4o-mini-tts',
    voice: 'alloy',
  }

  // 1. Hellenic & Classical Greek (Ancient Greek, Byzantine Greek, Modern Greek)
  if (lang.includes('greek') || group.includes('greek')) {
    return {
      options: geminiOptions('Charon', 'native Greek accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'en-US',
        voice: 'Matthew',
        engine: 'neural',
      },
      speakerName: 'Charon (Greek, Gemini)',
      languageCategory: 'Hellenic',
    }
  }

  // 2. Latin & Classical Philology (Latin, Late Latin, Medieval Latin)
  if (lang.includes('latin') || group.includes('latin')) {
    return {
      options: geminiOptions('Orus', 'classical Latin pronunciation'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'it-IT',
        voice: 'Adriano',
        engine: 'neural',
      },
      speakerName: 'Orus (Classical Latin, Gemini)',
      languageCategory: 'Latin',
    }
  }

  // 3. Japanese & Ainu
  if (lang.includes('japan') || group.includes('japan') || lang === 'ainu') {
    return {
      options: geminiOptions('Puck', 'native Japanese accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'ja-JP',
        voice: 'Takumi',
        engine: 'neural',
      },
      speakerName: 'Puck (Japanese, Gemini)',
      languageCategory: 'Japanese',
    }
  }

  // 4. Sinitic & East Asian (Chinese, Classical Chinese, Han Chinese, Ming Chinese, Tang Chinese)
  if (lang.includes('chinese') || group.includes('chinese') || lang === 'taiwanese') {
    return {
      options: geminiOptions('Zephyr', 'native Mandarin accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'cmn-CN',
        voice: 'Zhiyu',
        engine: 'neural',
      },
      speakerName: 'Zephyr (Mandarin, Gemini)',
      languageCategory: 'Chinese',
    }
  }

  // 5. Korean
  if (lang.includes('korean') || group.includes('korean')) {
    return {
      options: geminiOptions('Aoede', 'native Korean accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'ko-KR',
        voice: 'Seoyeon',
        engine: 'neural',
      },
      speakerName: 'Aoede (Korean, Gemini)',
      languageCategory: 'Korean',
    }
  }

  // 6. Austronesian & Southeast Asian (Indonesian, Malay, Javanese, Balinese, Sundanese, Tagalog, Hawaiian, Maori)
  if (
    lang.includes('indones') ||
    lang.includes('malay') ||
    lang.includes('javan') ||
    lang.includes('balin') ||
    lang.includes('sundan') ||
    lang.includes('tagalog') ||
    lang.includes('filipino') ||
    group.includes('indones') ||
    group.includes('malay') ||
    lang === 'hawaiian' ||
    lang === 'māori' ||
    lang === 'fijian' ||
    lang === 'samoan'
  ) {
    return {
      options: geminiOptions('Kore', 'native Indonesian accent'),
      fallbackOptions: generalFallback,
      speakerName: 'Kore (Austronesian/Indonesian, Gemini)',
      languageCategory: 'Austronesian',
    }
  }

  // 7. Semitic & Near Eastern (Arabic, Hebrew, Persian, Akkadian, Ancient Egyptian, Sumerian)
  if (
    lang.includes('arab') ||
    group.includes('arab') ||
    lang.includes('hebrew') ||
    group.includes('hebrew') ||
    lang.includes('persian') ||
    group.includes('persian') ||
    lang === 'aramaic' ||
    lang === 'akkadian' ||
    lang === 'ancient egyptian' ||
    lang === 'sumerian'
  ) {
    if (lang.includes('hebrew') || group.includes('hebrew')) {
      return {
        options: geminiOptions('Iapetus', 'native Hebrew accent'),
        fallbackOptions: {
          provider: 'openai',
          model: 'gpt-4o-mini-tts',
          voice: 'fable',
        },
        speakerName: 'Iapetus (Hebrew, Gemini)',
        languageCategory: 'Hebrew',
      }
    }
    return {
      options: geminiOptions('Charon', 'native Arabic accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'ar-AE',
        voice: 'Hala',
        engine: 'neural',
      },
      speakerName: 'Charon (Arabic, Gemini)',
      languageCategory: 'Near Eastern',
    }
  }

  // 8. Germanic & Nordic (German, Dutch, Danish, Swedish, Norwegian, Old Norse, Finnish, etc.)
  if (
    lang.includes('german') ||
    group.includes('german') ||
    lang.includes('dutch') ||
    lang.includes('danish') ||
    lang.includes('swedish') ||
    lang.includes('norwegian') ||
    lang.includes('norse') ||
    group.includes('scandinavian')
  ) {
    return {
      options: geminiOptions('Fenrir', 'native German accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'de-DE',
        voice: 'Vicki',
        engine: 'neural',
      },
      speakerName: 'Fenrir (Germanic, Gemini)',
      languageCategory: 'Germanic',
    }
  }

  // 9. Romance (French, Spanish, Italian, Portuguese, Romanian)
  if (lang.includes('french') || group.includes('french')) {
    return {
      options: geminiOptions('Leda', 'native French accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'fr-FR',
        voice: 'Lea',
        engine: 'neural',
      },
      speakerName: 'Leda (French, Gemini)',
      languageCategory: 'French',
    }
  }

  if (lang.includes('spanish') || group.includes('spanish')) {
    return {
      options: geminiOptions('Despina', 'native Spanish accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'es-ES',
        voice: 'Lucia',
        engine: 'neural',
      },
      speakerName: 'Despina (Spanish, Gemini)',
      languageCategory: 'Spanish',
    }
  }

  if (lang.includes('italian') || group.includes('italian') || lang === 'venetian') {
    return {
      options: geminiOptions('Callirrhoe', 'native Italian accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'it-IT',
        voice: 'Bianca',
        engine: 'neural',
      },
      speakerName: 'Callirrhoe (Italian, Gemini)',
      languageCategory: 'Italian',
    }
  }

  if (lang.includes('portuguese') || group.includes('portuguese')) {
    return {
      options: geminiOptions('Autonoe', 'native Portuguese accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'pt-PT',
        voice: 'Ines',
        engine: 'neural',
      },
      speakerName: 'Autonoe (Portuguese, Gemini)',
      languageCategory: 'Portuguese',
    }
  }

  // 10. Slavic & Baltic (Russian, Polish, Czech, Croatian, etc.)
  if (lang.includes('russ') || group.includes('russ') || lang.includes('slav') || group.includes('slav')) {
    return {
      options: geminiOptions('Algieba', 'native Russian accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'ru-RU',
        voice: 'Tatyana',
        engine: 'standard',
      },
      speakerName: 'Algieba (Russian/Slavic, Gemini)',
      languageCategory: 'Slavic',
    }
  }

  // 11. Indo-Aryan & Dravidian (Hindi, Sanskrit, Pali, Prakrit, Bengali, Marathi, Tamil, Telugu)
  if (
    lang.includes('sanskrit') ||
    lang.includes('pali') ||
    lang.includes('prakrit') ||
    lang.includes('hindi') ||
    lang.includes('tamil') ||
    lang.includes('bengali') ||
    lang.includes('marathi') ||
    lang.includes('telugu')
  ) {
    return {
      options: geminiOptions('Despina', 'native Indian accent'),
      fallbackOptions: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
      },
      speakerName: 'Despina (Indic, Gemini)',
      languageCategory: 'Indo-Aryan/Dravidian',
    }
  }

  // 12. Turkish
  if (lang.includes('turkish')) {
    return {
      options: geminiOptions('Achernar', 'native Turkish accent'),
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'tr-TR',
        voice: 'Burcu',
        engine: 'neural',
      },
      speakerName: 'Achernar (Turkish, Gemini)',
      languageCategory: 'Turkish',
    }
  }

  // 13. Default English Narrator
  return {
    options: geminiOptions('Puck'),
    fallbackOptions: {
      provider: 'aws-polly',
      language: 'en-US',
      voice: 'Matthew',
      engine: 'neural',
    },
    speakerName: 'Puck (English, Gemini)',
    languageCategory: 'English',
  }
}

export interface PuterInstance {
  ai: {
    txt2speech: (
      text: string,
      options?: PuterTTSOptions,
      testMode?: boolean
    ) => Promise<HTMLAudioElement>
  }
}

interface WindowWithPuter extends Window {
  puter?: PuterInstance
}

/**
 * Ensures the Puter.js runtime is loaded and initialized in the browser.
 */
export function ensurePuterLoaded(): Promise<PuterInstance> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Puter.js can only be loaded in a browser environment.'))
  }

  const win = window as unknown as WindowWithPuter
  if (win.puter?.ai?.txt2speech) {
    return Promise.resolve(win.puter)
  }

  return new Promise((resolve, reject) => {
    // Check if script already exists in the document
    const existing = document.querySelector<HTMLScriptElement>('script[src*="js.puter.com"]')
    if (existing) {
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (win.puter?.ai?.txt2speech) {
          clearInterval(interval)
          resolve(win.puter)
        } else if (attempts > 50) {
          clearInterval(interval)
          reject(new Error('Puter.js initialization timed out.'))
        }
      }, 100)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://js.puter.com/v2/'
    script.async = true
    script.onload = () => {
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (win.puter?.ai?.txt2speech) {
          clearInterval(interval)
          resolve(win.puter)
        } else if (attempts > 30) {
          clearInterval(interval)
          if (win.puter) {
            resolve(win.puter)
          } else {
            reject(new Error('Puter.js initialization timed out.'))
          }
        }
      }, 50)
    }
    script.onerror = () => {
      reject(new Error('Failed to load Puter.js script from js.puter.com'))
    }
    document.head.appendChild(script)
  })
}
