/**
 * ElevenLabs Language-to-Voice Router
 * Maps terms and languages to the best-suited ElevenLabs speaker voices.
 *
 * Fully supports:
 * - Free-tier premade voices (100% accessible via API without subscription)
 * - Automatic language / script detection via eleven_multilingual_v2
 * - Optional environment variable overrides for custom / community library voices
 * - Seamless fallback if a custom library voice is restricted (HTTP 402/404)
 */

export const PREMADE_VOICES = {
  ADAM: 'pNInz6obpgDQGcFmaJgB', // American Male - Deep narrator (Default)
  DANIEL: 'onwK4e9ZLuTAKqWW03F9', // British Male - Steady broadcaster / scholarly orator
  ALICE: 'Xb7hH8MSUJpSbSDYk0k2', // British Female - Clear, articulate educator
  GEORGE: 'JBFqnCBsd6RMkjVDRZzb', // British Male - Warm, captivating storyteller
  LILY: 'pFZP5JQG7iQjIQuC4Bku', // British Female - Velvety, melodic actress
  BELLA: 'hpp4J3VqNfWAUOO0d1Us', // American Female - Bright, crisp, professional
  ERIC: 'cjVigY5qzO86Huf0OWal', // American Male - Smooth, classy, trustworthy
  ROGER: 'CwhRBWXzGAHq8TQ4Fs17', // American Male - Laid-back, resonant
  SARAH: 'EXAVITQu4vr4xnSDxMaL', // American Female - Mature, reassuring
} as const

export interface VoiceRoute {
  voiceId: string
  fallbackVoiceId: string
  voiceName: string
  languageCategory: string
}

/**
 * Resolves the optimal ElevenLabs voice ID based on the term's language and language group.
 */
export function resolveVoiceForLanguage(
  language?: string | null,
  languageGroup?: string | null
): VoiceRoute {
  const lang = (language || '').trim().toLowerCase()
  const group = (languageGroup || '').trim().toLowerCase()
  const defaultPremade = process.env.ELEVENLABS_VOICE_ID || PREMADE_VOICES.ADAM

  // 1. Hellenic & Classical Greek
  if (
    lang.includes('greek') ||
    group.includes('greek') ||
    lang === 'ancient greek' ||
    lang === 'byzantine greek' ||
    lang === 'modern greek'
  ) {
    const custom = process.env.ELEVENLABS_VOICE_GREEK
    return {
      voiceId: custom || PREMADE_VOICES.DANIEL,
      fallbackVoiceId: PREMADE_VOICES.DANIEL,
      voiceName: custom ? 'Custom Greek' : 'Daniel (Classical Orator)',
      languageCategory: 'Hellenic',
    }
  }

  // 2. Latin & Classical Philology
  if (
    lang.includes('latin') ||
    group.includes('latin') ||
    lang === 'late latin' ||
    lang === 'medieval latin'
  ) {
    const custom = process.env.ELEVENLABS_VOICE_LATIN
    return {
      voiceId: custom || PREMADE_VOICES.DANIEL,
      fallbackVoiceId: PREMADE_VOICES.DANIEL,
      voiceName: custom ? 'Custom Latin' : 'Daniel (Classical Orator)',
      languageCategory: 'Latin',
    }
  }

  // 3. Indo-Aryan, Sanskrit & Classical Indian languages
  if (
    lang.includes('sanskrit') ||
    lang.includes('pali') ||
    lang.includes('prakrit') ||
    group.includes('sanskrit') ||
    lang === 'hindi' ||
    lang === 'bengali' ||
    lang === 'marathi' ||
    lang === 'urdu' ||
    lang === 'tamil' ||
    lang === 'telugu' ||
    lang === 'kannada' ||
    lang === 'malayalam' ||
    lang === 'sinhala' ||
    lang === 'nepali'
  ) {
    const custom = process.env.ELEVENLABS_VOICE_SANSKRIT
    return {
      voiceId: custom || PREMADE_VOICES.DANIEL,
      fallbackVoiceId: PREMADE_VOICES.DANIEL,
      voiceName: custom ? 'Custom Indic' : 'Daniel (Scholarly)',
      languageCategory: 'Indo-Aryan',
    }
  }

  // 4. Japanese
  if (lang.includes('japan') || group.includes('japan') || lang === 'ainu') {
    const custom = process.env.ELEVENLABS_VOICE_JAPANESE
    return {
      voiceId: custom || PREMADE_VOICES.ALICE,
      fallbackVoiceId: PREMADE_VOICES.ALICE,
      voiceName: custom ? 'Custom Japanese' : 'Alice (Clear Enunciation)',
      languageCategory: 'Japanese',
    }
  }

  // 5. Sinitic & East Asian (Chinese, Korean, Tibetan, Vietnamese, etc.)
  if (
    lang.includes('chinese') ||
    group.includes('chinese') ||
    lang === 'korean' ||
    lang === 'tibetan' ||
    lang === 'vietnamese' ||
    lang === 'khmer' ||
    lang === 'burmese' ||
    lang === 'thai'
  ) {
    const custom =
      lang.includes('chinese') || group.includes('chinese')
        ? process.env.ELEVENLABS_VOICE_CHINESE
        : process.env.ELEVENLABS_VOICE_KOREAN
    return {
      voiceId: custom || PREMADE_VOICES.ALICE,
      fallbackVoiceId: PREMADE_VOICES.ALICE,
      voiceName: custom ? 'Custom East Asian' : 'Alice (Clear Enunciation)',
      languageCategory: 'East Asian',
    }
  }

  // 6. Austronesian & Southeast Asian (Indonesian, Malay, Javanese, Balinese, Tagalog, etc.)
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
    lang === 'chamorro' ||
    lang === 'fijian' ||
    lang === 'samoan' ||
    lang === 'hawaiian' ||
    lang === 'māori'
  ) {
    const custom = process.env.ELEVENLABS_VOICE_INDONESIAN
    return {
      voiceId: custom || PREMADE_VOICES.ADAM,
      fallbackVoiceId: PREMADE_VOICES.ADAM,
      voiceName: custom ? 'Custom Indonesian' : 'Adam (Narrator)',
      languageCategory: 'Austronesian',
    }
  }

  // 7. Semitic & Near Eastern (Arabic, Hebrew, Persian, Akkadian, Ancient Egyptian, Sumerian, Turkish)
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
    lang === 'sumerian' ||
    lang === 'turkish' ||
    lang === 'ottoman turkish' ||
    lang === 'berber'
  ) {
    const custom =
      lang.includes('arab') || group.includes('arab')
        ? process.env.ELEVENLABS_VOICE_ARABIC
        : process.env.ELEVENLABS_VOICE_HEBREW
    return {
      voiceId: custom || PREMADE_VOICES.GEORGE,
      fallbackVoiceId: PREMADE_VOICES.GEORGE,
      voiceName: custom ? 'Custom Semitic/Near East' : 'George (Warm Storyteller)',
      languageCategory: 'Near Eastern',
    }
  }

  // 8. Germanic & Nordic (German, Dutch, Danish, Swedish, Norwegian, Old Norse, etc.)
  if (
    lang.includes('german') ||
    group.includes('german') ||
    lang.includes('dutch') ||
    lang.includes('danish') ||
    lang.includes('swedish') ||
    lang.includes('norwegian') ||
    lang.includes('norse') ||
    group.includes('scandinavian') ||
    lang === 'finnish' ||
    lang === 'hungarian' ||
    lang === 'estonian'
  ) {
    const custom = process.env.ELEVENLABS_VOICE_GERMAN
    return {
      voiceId: custom || PREMADE_VOICES.BELLA,
      fallbackVoiceId: PREMADE_VOICES.BELLA,
      voiceName: custom ? 'Custom Germanic' : 'Bella (Articulate)',
      languageCategory: 'Germanic & Nordic',
    }
  }

  // 9. Romance (French, Spanish, Italian, Portuguese, Romanian, etc.)
  if (
    lang.includes('french') ||
    group.includes('french') ||
    lang.includes('italian') ||
    group.includes('italian') ||
    lang.includes('spanish') ||
    group.includes('spanish') ||
    lang.includes('portuguese') ||
    group.includes('portuguese') ||
    lang === 'romanian' ||
    lang === 'venetian' ||
    lang === 'catalan' ||
    lang === 'basque'
  ) {
    const custom =
      lang.includes('french')
        ? process.env.ELEVENLABS_VOICE_FRENCH
        : lang.includes('spanish')
          ? process.env.ELEVENLABS_VOICE_SPANISH
          : lang.includes('italian')
            ? process.env.ELEVENLABS_VOICE_ITALIAN
            : undefined

    return {
      voiceId: custom || PREMADE_VOICES.LILY,
      fallbackVoiceId: PREMADE_VOICES.LILY,
      voiceName: custom ? 'Custom Romance' : 'Lily (Velvety Romance)',
      languageCategory: 'Romance',
    }
  }

  // 10. Slavic & Baltic (Russian, Polish, Czech, Croatian, etc.)
  if (
    lang.includes('russ') ||
    group.includes('russ') ||
    lang.includes('slav') ||
    group.includes('slav') ||
    lang === 'polish' ||
    lang === 'czech' ||
    lang === 'croatian' ||
    lang === 'serbian' ||
    lang === 'lithuanian' ||
    lang === 'latvian'
  ) {
    const custom = process.env.ELEVENLABS_VOICE_RUSSIAN
    return {
      voiceId: custom || PREMADE_VOICES.ERIC,
      fallbackVoiceId: PREMADE_VOICES.ERIC,
      voiceName: custom ? 'Custom Slavic' : 'Eric (Resonant)',
      languageCategory: 'Slavic & Baltic',
    }
  }

  // 11. Celtic (Irish, Scottish Gaelic, Welsh, Manx)
  if (lang.includes('gaelic') || lang.includes('irish') || lang.includes('welsh') || group.includes('celtic')) {
    return {
      voiceId: PREMADE_VOICES.GEORGE,
      fallbackVoiceId: PREMADE_VOICES.GEORGE,
      voiceName: 'George (Storyteller)',
      languageCategory: 'Celtic',
    }
  }

  // 12. Default Fallback
  return {
    voiceId: defaultPremade,
    fallbackVoiceId: PREMADE_VOICES.ADAM,
    voiceName: 'Adam (Default Narrator)',
    languageCategory: 'Default',
  }
}

