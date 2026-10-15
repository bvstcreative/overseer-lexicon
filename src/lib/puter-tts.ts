/**
 * Puter.js Multilingual Text-to-Speech (TTS) Integration
 *
 * Provides studio-quality human voice generation powered by Puter.js:
 * - Dynamic language & voice routing (AWS Polly Neural + OpenAI Multilingual)
 * - Word-only recitation (no prompts or instructions spoken)
 * - Automatic fallback between providers (Polly -> OpenAI)
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
  // AWS Polly has no Greek voice at all, so OpenAI's multilingual model is the only option.
  if (lang.includes('greek') || group.includes('greek')) {
    return {
      options: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'onyx', // deep, scholarly tone
      },
      fallbackOptions: generalFallback,
      speakerName: 'Onyx (Greek)',
      languageCategory: 'Hellenic',
    }
  }

  // 2. Latin & Classical Philology (Latin, Late Latin, Medieval Latin)
  // No provider speaks reconstructed/ecclesiastical Latin natively; an Italian neural
  // voice is the closest approximation. `Giorgio` only supports the `standard` engine —
  // `Adriano` is Polly's Italian male voice that actually supports `neural`.
  if (lang.includes('latin') || group.includes('latin')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'it-IT',
        voice: 'Adriano',
        engine: 'neural',
      },
      fallbackOptions: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'onyx',
      },
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
  // Neither Polly nor OpenAI has native voices for these; OpenAI's multilingual model
  // is the broadest best-effort option, with Polly's English voice as a last resort.
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
        options: {
          provider: 'openai',
          model: 'gpt-4o-mini-tts',
          voice: 'fable',
        },
        fallbackOptions: generalFallback,
        speakerName: 'Fable (Hebrew)',
        languageCategory: 'Hebrew',
      }
    }
    return {
      options: {
        provider: 'aws-polly',
        language: 'ar-AE',
        voice: 'Hala',
        engine: 'neural',
      },
      fallbackOptions: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'onyx',
      },
      speakerName: 'Hala (Arabic Neural)',
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
  // Polly has no neural tier for Russian (standard only), so it's noticeably more
  // robotic than other Polly languages here — OpenAI is the fallback if it fails.
  if (lang.includes('russ') || group.includes('russ') || lang.includes('slav') || group.includes('slav')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'ru-RU',
        voice: 'Tatyana',
        engine: 'standard',
      },
      fallbackOptions: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'echo',
      },
      speakerName: 'Tatyana (Russian)',
      languageCategory: 'Slavic',
    }
  }

  // 11a. Hindi, Sanskrit & Pali/Prakrit — Sanskrit and Pali are close enough to Hindi
  // phonetically (same Devanagari script family) that Polly's Hindi neural voice is a
  // reasonable fit.
  if (lang.includes('sanskrit') || lang.includes('pali') || lang.includes('prakrit') || lang.includes('hindi')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'hi-IN',
        voice: 'Kajal',
        engine: 'neural',
      },
      fallbackOptions: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
      },
      speakerName: 'Kajal (Indic Neural)',
      languageCategory: 'Indo-Aryan',
    }
  }

  // 11b. Tamil, Bengali, Marathi, Telugu — no Polly voice exists for any of these;
  // routing them through the Hindi voice above (as the old code did) silently
  // mispronounces the script, since they're different languages/scripts entirely.
  // OpenAI's multilingual model is the best available option for each.
  if (
    lang.includes('tamil') ||
    lang.includes('bengali') ||
    lang.includes('marathi') ||
    lang.includes('telugu')
  ) {
    return {
      options: {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
      },
      fallbackOptions: {
        provider: 'openai',
        model: 'tts-1-hd',
        voice: 'nova',
      },
      speakerName: 'Alloy (Indic)',
      languageCategory: 'Indo-Aryan/Dravidian',
    }
  }

  // 12. Turkish — `Filiz` only supports Polly's robotic `standard` engine; `Burcu` is
  // Polly's Turkish voice that actually supports `neural`, so it leads instead.
  if (lang.includes('turkish')) {
    return {
      options: {
        provider: 'aws-polly',
        language: 'tr-TR',
        voice: 'Burcu',
        engine: 'neural',
      },
      fallbackOptions: generalFallback,
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
