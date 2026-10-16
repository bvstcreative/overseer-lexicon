/**
 * Puter.js Multilingual Text-to-Speech (TTS) Integration
 *
 * Provides studio-quality human voice generation powered by Puter.js:
 * - AWS Polly (explicit locale + neural voice) or OpenAI as the primary voice for any
 *   language that has one — Gemini TTS has NO `language` parameter, so it can't be
 *   trusted with accent-sensitive Latin-script languages (German, French, Turkish,
 *   Indonesian, etc.) where it has no signal beyond the raw text to pick an accent.
 * - Google Gemini TTS only for languages with no good Polly/OpenAI voice AND an
 *   unambiguous non-Latin script (Greek, Hebrew, Cyrillic, Devanagari/Tamil/Bengali/
 *   Telugu) — there, script alone reliably tells Gemini which language to speak.
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
// text is in directly, and sounds the most fluent/native of the available voice banks.
//
// Deliberately NOT passing `instructions`: Puter's Gemini bridge doesn't reliably keep
// style instructions silent — it sometimes narrates the instruction text itself before
// the word (e.g. "...respecting native phonetics. Say the following text aloud ---- word").
// Plain `text` + `voice` with no instructions avoids that leak entirely.
function geminiOptions(voice: string): PuterTTSOptions {
  return {
    provider: 'gemini',
    model: 'gemini-3.8-flash-tts',
    voice,
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
      options: geminiOptions('Charon'),
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
  // Latin alphabet is ambiguous to Gemini (no language signal), so Polly's explicit
  // it-IT locale leads; Gemini is only the fallback.
  if (lang.includes('latin') || group.includes('latin')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'it-IT',
        voice: 'Adriano',
        engine: 'neural',
      },
      fallbackOptions: geminiOptions('Orus'),
      speakerName: 'Adriano (Classical Latin)',
      languageCategory: 'Latin',
    }
  }

  // 3. Japanese & Ainu
  if (lang.includes('japan') || group.includes('japan') || lang === 'ainu') {
    return {
      options: {
        provider: 'aws-polly',
        language: 'ja-JP',
        voice: 'Takumi',
        engine: 'neural',
      },
      fallbackOptions: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'nova',
      },
      speakerName: 'Takumi (Japanese Neural)',
      languageCategory: 'Japanese',
    }
  }

  // 4. Sinitic & East Asian (Chinese, Classical Chinese, Han Chinese, Ming Chinese, Tang Chinese)
  if (lang.includes('chinese') || group.includes('chinese') || lang === 'taiwanese') {
    return {
      options: {
        provider: 'aws-polly',
        language: 'cmn-CN',
        voice: 'Zhiyu',
        engine: 'neural',
      },
      fallbackOptions: generalFallback,
      speakerName: 'Zhiyu (Mandarin Neural)',
      languageCategory: 'Chinese',
    }
  }

  // 5. Korean
  if (lang.includes('korean') || group.includes('korean')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'ko-KR',
        voice: 'Seoyeon',
        engine: 'neural',
      },
      fallbackOptions: generalFallback,
      speakerName: 'Seoyeon (Korean Neural)',
      languageCategory: 'Korean',
    }
  }

  // 6. Austronesian & Southeast Asian (Indonesian, Malay, Javanese, Balinese, Sundanese, Tagalog, Hawaiian, Maori)
  // Latin alphabet, no Polly voice exists for any of these — but Gemini also has no
  // `language` param to disambiguate Latin-script text, so it defaults toward an
  // English-leaning read. OpenAI's multilingual model (no instructions needed) handles
  // this better in practice; Polly's English voice is the last-resort fallback.
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
      options: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
      },
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'en-US',
        voice: 'Matthew',
        engine: 'neural',
      },
      speakerName: 'Alloy (Austronesian/Indonesian)',
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
        options: geminiOptions('Iapetus'),
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
      options: geminiOptions('Charon'),
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
  // Latin alphabet — Polly's explicit de-DE locale leads so the accent stays German.
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
      options: {
        provider: 'aws-polly',
        language: 'de-DE',
        voice: 'Vicki',
        engine: 'neural',
      },
      fallbackOptions: {
        provider: 'aws-polly',
        language: 'de-DE',
        voice: 'Daniel',
        engine: 'neural',
      },
      speakerName: 'Vicki (Germanic Neural)',
      languageCategory: 'Germanic',
    }
  }

  // 9. Romance (French, Spanish, Italian, Portuguese, Romanian)
  // Latin alphabet — explicit Polly locale keeps the correct accent for each.
  if (lang.includes('french') || group.includes('french')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'fr-FR',
        voice: 'Lea',
        engine: 'neural',
      },
      fallbackOptions: generalFallback,
      speakerName: 'Lea (French Neural)',
      languageCategory: 'French',
    }
  }

  if (lang.includes('spanish') || group.includes('spanish')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'es-ES',
        voice: 'Lucia',
        engine: 'neural',
      },
      fallbackOptions: generalFallback,
      speakerName: 'Lucia (Spanish Neural)',
      languageCategory: 'Spanish',
    }
  }

  if (lang.includes('italian') || group.includes('italian') || lang === 'venetian') {
    return {
      options: {
        provider: 'aws-polly',
        language: 'it-IT',
        voice: 'Bianca',
        engine: 'neural',
      },
      fallbackOptions: generalFallback,
      speakerName: 'Bianca (Italian Neural)',
      languageCategory: 'Italian',
    }
  }

  if (lang.includes('portuguese') || group.includes('portuguese')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'pt-PT',
        voice: 'Ines',
        engine: 'neural',
      },
      fallbackOptions: generalFallback,
      speakerName: 'Ines (Portuguese Neural)',
      languageCategory: 'Portuguese',
    }
  }

  // 10. Slavic & Baltic (Russian, Polish, Czech, Croatian, etc.)
  if (lang.includes('russ') || group.includes('russ') || lang.includes('slav') || group.includes('slav')) {
    return {
      options: geminiOptions('Algieba'),
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
  // Previously split across Polly's Hindi voice (wrong script for Tamil/Bengali/Marathi/Telugu)
  // and OpenAI. Gemini reads each script directly, so one voice now covers all of them correctly.
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
      options: geminiOptions('Despina'),
      fallbackOptions: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
      },
      speakerName: 'Despina (Indic, Gemini)',
      languageCategory: 'Indo-Aryan/Dravidian',
    }
  }

  // 12. Turkish — Latin alphabet, so Polly's explicit tr-TR locale leads.
  if (lang.includes('turkish')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'tr-TR',
        voice: 'Burcu',
        engine: 'neural',
      },
      fallbackOptions: geminiOptions('Achernar'),
      speakerName: 'Burcu (Turkish Neural)',
      languageCategory: 'Turkish',
    }
  }

  // 13. Default English Narrator
  return {
    options: {
      provider: 'aws-polly',
      language: 'en-US',
      voice: 'Matthew',
      engine: 'neural',
    },
    fallbackOptions: generalFallback,
    speakerName: 'Matthew (English Neural)',
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
