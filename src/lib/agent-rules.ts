export const REGION_CODES: Record<string, string> = {
  EUR: 'Europe',
  MEA: 'Middle East',
  CAS: 'Central Asia & Caucasus',
  SAS: 'South Asia',
  EAS: 'East Asia',
  SEAS: 'Southeast Asia',
  OCE: 'Oceania',
  AFR: 'Africa',
  AME: 'Americas',
}

export const ERA_CODES: Record<string, string> = {
  A: 'Ancient',
  M: 'Historic',
  N: 'Modern',
}

export const DOMAIN_CODES: Record<string, string> = {
  // Universal nature, science & culture domains
  FAUNA: 'Fauna & wildlife',
  FLORA: 'Flora & botany',
  MYTH: 'Mythology & folklore',
  FICTION: 'Fiction & pop culture',
  NATURE: 'Nature & cosmos',
  SCIENCE: 'Science & medicine',
  FOOD: 'Food & culinary',
  CULTURE: 'Culture & society',
  CRAFT: 'Tools & craft',
  TECH: 'Technology & computing',
  SPORT: 'Sports & games',
  ARCH: 'Architecture & places',
  LANG: 'Language & idioms',
  LAW: 'Law & justice',
  // Classical institutional, civic & workplace domains
  STUDIO: 'Workshop & studio',
  GALLERY: 'Gallery & museum',
  OFFICE: 'Office & business',
  HOUSE: 'Household & estate',
  LAND: 'Land & farming',
  STATE: 'State & civil',
  FINANCE: 'Treasury & finance',
  TRADE: 'Trade & market',
  RELIGION: 'Religious & temple',
  EDUCATION: 'Library & school',
  PERFORM: 'Performing arts',
  PORT: 'Ships & ports',
  MILITARY: 'Military',
  LEAD: 'Leadership',
}

export function resolveRegion(raw: string): { code: string; label: string } | null {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (REGION_CODES[upper]) {
    return { code: upper, label: REGION_CODES[upper] }
  }
  const lower = trimmed.toLowerCase().replace(/\band\b/g, '&')
  for (const [code, label] of Object.entries(REGION_CODES)) {
    if (label.toLowerCase() === lower || label.toLowerCase().replace('&', 'and') === trimmed.toLowerCase()) {
      return { code, label }
    }
  }
  return null
}

export function resolveEra(raw: string): { code: string; label: string } | null {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (ERA_CODES[upper]) {
    return { code: upper, label: ERA_CODES[upper] }
  }
  const lower = trimmed.toLowerCase()
  for (const [code, label] of Object.entries(ERA_CODES)) {
    if (label.toLowerCase() === lower) {
      return { code, label }
    }
  }
  if (lower === 'medieval' || lower === 'historical' || lower === 'folklore') {
    return { code: 'M', label: ERA_CODES.M }
  }
  if (lower === 'contemporary' || lower === 'current') {
    return { code: 'N', label: ERA_CODES.N }
  }
  return null
}

export function formatCustomDomainLabel(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  // If it's an uppercase code or snake_case/kebab-case like "MARINE_BIOLOGY" or "ASTRONOMY"
  if (/^[A-Z0-9_-]+$/.test(trimmed)) {
    const words = trimmed.toLowerCase().split(/[_-]+/).filter(Boolean)
    if (words.length === 0) return trimmed
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
    return words.join(' ')
  }
  return trimmed
}

export function resolveDomain(
  raw: string,
  allowCustom = true
): { code: string; label: string; isCustom?: boolean } | null {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (DOMAIN_CODES[upper]) {
    return { code: upper, label: DOMAIN_CODES[upper], isCustom: false }
  }
  const lower = trimmed.toLowerCase()
  for (const [code, label] of Object.entries(DOMAIN_CODES)) {
    if (label.toLowerCase() === lower) {
      return { code, label, isCustom: false }
    }
  }
  if (allowCustom) {
    const code = upper.replace(/[^A-Z0-9_]/g, '_').replace(/^_+|_+$/g, '') || 'CUSTOM'
    const label = formatCustomDomainLabel(trimmed)
    return { code, label, isCustom: true }
  }
  return null
}

export const KNOWN_LANGUAGE_GROUPS: Record<string, string> = {
  'Ancient Greek': 'Greek',
  'Byzantine Greek': 'Greek',
  'Modern Greek': 'Greek',
  Greek: 'Greek',
  Latin: 'Latin',
  'Late Latin': 'Latin',
  'Medieval Latin': 'Latin',
  'Scientific Latin': 'Latin',
  'Old French': 'French',
  'Quebec French': 'French',
  French: 'French',
  English: 'English',
  'American English': 'English',
  'British English': 'English',
  'Old English': 'English',
  'Middle English': 'English',
  German: 'German',
  'Middle High German': 'German',
  'Old High German': 'German',
  Bavarian: 'German',
  Luxembourgish: 'German',
  Dutch: 'Dutch',
  Afrikaans: 'Dutch',
  Italian: 'Italian',
  Venetian: 'Italian',
  Spanish: 'Spanish',
  Catalan: 'Spanish',
  Galician: 'Portuguese',
  Occitan: 'French',
  Portuguese: 'Portuguese',
  'Brazilian Portuguese': 'Portuguese',
  'Old Norse': 'Scandinavian',
  Swedish: 'Scandinavian',
  Danish: 'Scandinavian',
  Norwegian: 'Scandinavian',
  Icelandic: 'Scandinavian',
  Finnish: 'Finnish',
  'Old East Slavic': 'Russian & East Slavic',
  Slavic: 'Russian & East Slavic',
  'Old Russian': 'Russian & East Slavic',
  Russian: 'Russian & East Slavic',
  Ukrainian: 'Russian & East Slavic',
  Belarusian: 'Russian & East Slavic',
  Polish: 'Polish',
  Czech: 'Czech',
  Slovak: 'Czech',
  Slovene: 'South Slavic',
  Croatian: 'South Slavic',
  Serbian: 'South Slavic',
  Bulgarian: 'South Slavic',
  Macedonian: 'South Slavic',
  Lithuanian: 'Baltic',
  Latvian: 'Baltic',
  Estonian: 'Estonian',
  Hungarian: 'Hungarian',
  Romanian: 'Romanian',
  Irish: 'Celtic',
  'Scottish Gaelic': 'Celtic',
  Welsh: 'Celtic',
  'Ottoman Turkish': 'Turkish',
  Turkish: 'Turkish',
  Azerbaijani: 'Turkic & Mongolic',
  Kazakh: 'Turkic & Mongolic',
  Kyrgyz: 'Turkic & Mongolic',
  Uzbek: 'Turkic & Mongolic',
  Armenian: 'Armenian',
  Georgian: 'Georgian',
  'Ancient Egyptian': 'Ancient Egyptian',
  Coptic: 'Ancient Egyptian',
  Sumerian: 'Sumerian',
  Akkadian: 'Akkadian',
  Babylonian: 'Akkadian',
  Assyrian: 'Akkadian',
  'Biblical Hebrew': 'Hebrew',
  Hebrew: 'Hebrew',
  'Modern Hebrew': 'Hebrew',
  Aramaic: 'Aramaic',
  Syriac: 'Aramaic',
  Arabic: 'Arabic',
  'Classical Arabic': 'Arabic',
  Persian: 'Persian',
  'Middle Persian': 'Persian',
  'Old Persian': 'Persian',
  Tajik: 'Persian',
  Mongolian: 'Turkic & Mongolic',
  Turkic: 'Turkic & Mongolic',
  Sanskrit: 'Sanskrit & Pali',
  Prakrit: 'Sanskrit & Pali',
  Pali: 'Sanskrit & Pali',
  Hindi: 'Hindi & Urdu',
  Urdu: 'Hindi & Urdu',
  Punjabi: 'Punjabi',
  Gujarati: 'Gujarati',
  Tamil: 'Tamil',
  Bengali: 'Bengali',
  Marathi: 'Marathi',
  Malayalam: 'Malayalam',
  Telugu: 'Telugu',
  Kannada: 'Kannada',
  Sinhala: 'Sinhala',
  Nepali: 'Nepali',
  'Classical Chinese': 'Chinese',
  'Han Chinese': 'Chinese',
  'Tang Chinese': 'Chinese',
  'Song Chinese': 'Chinese',
  'Ming Chinese': 'Chinese',
  'Qing Chinese': 'Chinese',
  'Mandarin Chinese': 'Chinese',
  Chinese: 'Chinese',
  Mandarin: 'Chinese',
  Cantonese: 'Chinese',
  Japanese: 'Japanese',
  'Classical Japanese': 'Japanese',
  Korean: 'Korean',
  'Middle Korean': 'Korean',
  Vietnamese: 'Vietnamese',
  Indonesian: 'Indonesian & Malay',
  Malay: 'Indonesian & Malay',
  'Old Javanese': 'Javanese',
  Javanese: 'Javanese',
  Balinese: 'Balinese',
  Sundanese: 'Indonesian & Malay',
  Tagalog: 'Tagalog',
  Thai: 'Thai',
  Lao: 'Thai',
  Khmer: 'Khmer',
  Burmese: 'Burmese',
  Hawaiian: 'Hawaiian',
  'Māori': 'Māori',
  Samoan: 'Samoan',
  Fijian: 'Fijian',
  Swahili: 'Swahili',
  Amharic: 'Amharic',
  Geʻez: 'Amharic',
  Hausa: 'Hausa',
  Yoruba: 'Yoruba',
  Igbo: 'Igbo',
  Akan: 'Akan',
  Zulu: 'Zulu',
  Xhosa: 'Zulu',
  Shona: 'Shona',
  Wolof: 'Wolof',
  Berber: 'Berber',
  Tamazight: 'Berber',
  Nahuatl: 'Nahuatl',
  'Classical Nahuatl': 'Nahuatl',
  Quechua: 'Quechua',
  'Classic Maya': 'Maya',
  'Yucatec Maya': 'Maya',
}

export function inferLanguageGroup(language: string): string {
  const trimmed = String(language || '').trim()
  if (!trimmed) return ''
  if (KNOWN_LANGUAGE_GROUPS[trimmed]) {
    return KNOWN_LANGUAGE_GROUPS[trimmed]
  }

  // Substring inference
  const lower = trimmed.toLowerCase()
  if (lower.includes('english')) return 'English'
  if (lower.includes('greek')) return 'Greek'
  if (lower.includes('latin')) return 'Latin'
  if (lower.includes('french')) return 'French'
  if (lower.includes('german')) return 'German'
  if (lower.includes('dutch')) return 'Dutch'
  if (lower.includes('italian')) return 'Italian'
  if (lower.includes('spanish')) return 'Spanish'
  if (lower.includes('portuguese')) return 'Portuguese'
  if (lower.includes('norse') || lower.includes('scandi')) return 'Scandinavian'
  if (lower.includes('slavic') || lower.includes('russian')) return 'Russian & East Slavic'
  if (lower.includes('gaelic') || lower.includes('celtic')) return 'Celtic'
  if (lower.includes('hebrew')) return 'Hebrew'
  if (lower.includes('arabic')) return 'Arabic'
  if (lower.includes('persian')) return 'Persian'
  if (lower.includes('chinese') || lower.includes('mandarin') || lower.includes('cantonese')) return 'Chinese'
  if (lower.includes('japanese')) return 'Japanese'
  if (lower.includes('korean')) return 'Korean'
  if (lower.includes('turkish') || lower.includes('turkic')) return 'Turkish'
  if (lower.includes('sanskrit') || lower.includes('prakrit') || lower.includes('pali')) return 'Sanskrit & Pali'
  if (lower.includes('hindi') || lower.includes('urdu')) return 'Hindi & Urdu'
  if (lower.includes('malay') || lower.includes('indonesian')) return 'Indonesian & Malay'
  if (lower.includes('nahuatl')) return 'Nahuatl'
  if (lower.includes('maya')) return 'Maya'

  return trimmed
}

export interface RawTermEntry {
  term?: string
  romanization?: string
  language?: string
  language_group?: string
  region?: string
  era?: string
  domain?: string
  meaning?: string
  gloss?: string
  definition?: string
}

export interface ParsedLine {
  raw: string
  lineNumber: number
  term: string
  romanization: string
  language: string
  language_group: string
  region: string
  region_code: string
  era: string
  era_code: string
  domain: string
  domain_code: string
  gloss: string
  status: 'valid' | 'duplicate_existing' | 'duplicate_batch' | 'invalid_format' | 'invalid_code'
  error?: string
}

export interface ParseOptions {
  duplicateMode?: 'term' | 'term_language'
  existingTerms?: Set<string>
  allowCustomDomains?: boolean
}

function validateCandidateEntry(
  candidate: {
    raw: string
    lineNumber: number
    term: string
    romanization: string
    language: string
    language_group?: string
    regionRaw: string
    eraRaw: string
    domainRaw: string
    glossRaw: string
  },
  existingPairs: Set<string> | undefined,
  existingTerms: Set<string> | undefined,
  batchSeen: Set<string>,
  duplicateMode: 'term' | 'term_language',
  allowCustomDomains: boolean
): ParsedLine {
  const term = candidate.term.trim()
  const romanization = candidate.romanization.trim() || term
  const language = candidate.language.trim()
  const regRaw = candidate.regionRaw.trim()
  const eraRaw = candidate.eraRaw.trim()
  const domRaw = candidate.domainRaw.trim()
  const gloss = candidate.glossRaw.trim().replace(/\.$/, '')

  if (!term || !language || !gloss) {
    return {
      raw: candidate.raw,
      lineNumber: candidate.lineNumber,
      term,
      romanization,
      language,
      language_group: '',
      region: '',
      region_code: regRaw,
      era: '',
      era_code: eraRaw,
      domain: '',
      domain_code: domRaw,
      gloss,
      status: 'invalid_format',
      error: !term || !language ? 'Term and language cannot be empty' : 'Meaning / gloss cannot be empty',
    }
  }

  const resolvedRegion = resolveRegion(regRaw)
  if (!resolvedRegion) {
    return {
      raw: candidate.raw,
      lineNumber: candidate.lineNumber,
      term,
      romanization,
      language,
      language_group: '',
      region: '',
      region_code: regRaw,
      era: '',
      era_code: eraRaw,
      domain: '',
      domain_code: domRaw,
      gloss,
      status: 'invalid_code',
      error: `Invalid region: '${regRaw}'. Allowed codes: ${Object.keys(REGION_CODES).join(', ')}`,
    }
  }

  const resolvedEra = resolveEra(eraRaw)
  if (!resolvedEra) {
    return {
      raw: candidate.raw,
      lineNumber: candidate.lineNumber,
      term,
      romanization,
      language,
      language_group: '',
      region: resolvedRegion.label,
      region_code: resolvedRegion.code,
      era: '',
      era_code: eraRaw,
      domain: '',
      domain_code: domRaw,
      gloss,
      status: 'invalid_code',
      error: `Invalid era: '${eraRaw}'. Allowed codes: A, M, N`,
    }
  }

  const resolvedDomain = resolveDomain(domRaw, allowCustomDomains)
  if (!resolvedDomain) {
    return {
      raw: candidate.raw,
      lineNumber: candidate.lineNumber,
      term,
      romanization,
      language,
      language_group: '',
      region: resolvedRegion.label,
      region_code: resolvedRegion.code,
      era: resolvedEra.label,
      era_code: resolvedEra.code,
      domain: '',
      domain_code: domRaw,
      gloss,
      status: 'invalid_code',
      error: `Invalid domain: '${domRaw}'. Allowed codes: ${Object.keys(DOMAIN_CODES).join(', ')}`,
    }
  }

  const termKey = term.toLowerCase()
  const pairKey = `${termKey}|${language.toLowerCase()}`
  const checkKey = duplicateMode === 'term' ? termKey : pairKey
  const language_group = candidate.language_group?.trim() || inferLanguageGroup(language)

  if (batchSeen.has(checkKey)) {
    return {
      raw: candidate.raw,
      lineNumber: candidate.lineNumber,
      term,
      romanization,
      language,
      language_group,
      region: resolvedRegion.label,
      region_code: resolvedRegion.code,
      era: resolvedEra.label,
      era_code: resolvedEra.code,
      domain: resolvedDomain.label,
      domain_code: resolvedDomain.code,
      gloss,
      status: 'duplicate_batch',
      error: duplicateMode === 'term'
        ? `Repeated term "${term}" in this batch`
        : `Repeated term "${term}" in ${language} in this batch`,
    }
  }
  batchSeen.add(checkKey)

  const isExistingDup = duplicateMode === 'term'
    ? Boolean(existingTerms && existingTerms.has(termKey))
    : Boolean(existingPairs && existingPairs.has(pairKey))

  if (isExistingDup) {
    return {
      raw: candidate.raw,
      lineNumber: candidate.lineNumber,
      term,
      romanization,
      language,
      language_group,
      region: resolvedRegion.label,
      region_code: resolvedRegion.code,
      era: resolvedEra.label,
      era_code: resolvedEra.code,
      domain: resolvedDomain.label,
      domain_code: resolvedDomain.code,
      gloss,
      status: 'duplicate_existing',
      error: duplicateMode === 'term'
        ? `Term "${term}" already exists in database`
        : `Term "${term}" (${language}) already exists in database`,
    }
  }

  return {
    raw: candidate.raw,
    lineNumber: candidate.lineNumber,
    term,
    romanization,
    language,
    language_group,
    region: resolvedRegion.label,
    region_code: resolvedRegion.code,
    era: resolvedEra.label,
    era_code: resolvedEra.code,
    domain: resolvedDomain.label,
    domain_code: resolvedDomain.code,
    gloss,
    status: 'valid',
  }
}

export function parseLexiconInput(
  text: string,
  existingPairs?: Set<string>,
  options?: ParseOptions
): {
  valid: ParsedLine[]
  duplicates: ParsedLine[]
  invalid: ParsedLine[]
  all: ParsedLine[]
  format: 'json' | 'pipe'
} {
  const duplicateMode = options?.duplicateMode || 'term_language'
  const existingTerms = options?.existingTerms
  const allowCustomDomains = options?.allowCustomDomains !== false

  const all: ParsedLine[] = []
  const valid: ParsedLine[] = []
  const duplicates: ParsedLine[] = []
  const invalid: ParsedLine[] = []
  const batchSeen = new Set<string>()

  // Strip optional markdown code fences if user pasted ```json ... ```
  const trimmedText = text.trim().replace(/^```(?:json|txt|csv)?\s*\r?\n?/i, '').replace(/\r?\n?```\s*$/, '').trim()

  // Auto-detect JSON array or object wrapper
  if (trimmedText.startsWith('[') || trimmedText.startsWith('{')) {
    try {
      const parsedJson = JSON.parse(trimmedText)
      const items: unknown[] = Array.isArray(parsedJson)
        ? parsedJson
        : Array.isArray(parsedJson?.terms)
          ? parsedJson.terms
          : Array.isArray(parsedJson?.entries)
            ? parsedJson.entries
            : Array.isArray(parsedJson?.data)
              ? parsedJson.data
              : [parsedJson]

      items.forEach((item, idx) => {
        const lineNum = idx + 1
        if (Array.isArray(item)) {
          // Support 7-tuple or 8-tuple array format (like overseer.json)
          const is8Tuple = item.length >= 8
          const parsedItem = validateCandidateEntry(
            {
              raw: JSON.stringify(item),
              lineNumber: lineNum,
              term: String(item[0] ?? ''),
              romanization: String(item[1] ?? ''),
              language: String(item[2] ?? ''),
              language_group: is8Tuple ? String(item[3] ?? '') : undefined,
              regionRaw: String(item[is8Tuple ? 4 : 3] ?? ''),
              eraRaw: String(item[is8Tuple ? 5 : 4] ?? ''),
              domainRaw: String(item[is8Tuple ? 6 : 5] ?? ''),
              glossRaw: String(item[is8Tuple ? 7 : 6] ?? ''),
            },
            existingPairs,
            existingTerms,
            batchSeen,
            duplicateMode,
            allowCustomDomains
          )
          all.push(parsedItem)
          if (parsedItem.status === 'valid') valid.push(parsedItem)
          else if (parsedItem.status === 'duplicate_existing' || parsedItem.status === 'duplicate_batch') duplicates.push(parsedItem)
          else invalid.push(parsedItem)
          return
        }

        if (!item || typeof item !== 'object') {
          const errItem: ParsedLine = {
            raw: JSON.stringify(item),
            lineNumber: lineNum,
            term: '',
            romanization: '',
            language: '',
            language_group: '',
            region: '',
            region_code: '',
            era: '',
            era_code: '',
            domain: '',
            domain_code: '',
            gloss: '',
            status: 'invalid_format',
            error: 'JSON entry must be an object or tuple array',
          }
          all.push(errItem)
          invalid.push(errItem)
          return
        }

        const obj = item as RawTermEntry
        const parsedItem = validateCandidateEntry(
          {
            raw: JSON.stringify(obj),
            lineNumber: lineNum,
            term: String(obj.term ?? ''),
            romanization: String(obj.romanization ?? ''),
            language: String(obj.language ?? ''),
            language_group: obj.language_group ? String(obj.language_group) : undefined,
            regionRaw: String(obj.region ?? ''),
            eraRaw: String(obj.era ?? ''),
            domainRaw: String(obj.domain ?? ''),
            glossRaw: String(obj.meaning ?? obj.gloss ?? obj.definition ?? ''),
          },
          existingPairs,
          existingTerms,
          batchSeen,
          duplicateMode,
          allowCustomDomains
        )
        all.push(parsedItem)
        if (parsedItem.status === 'valid') valid.push(parsedItem)
        else if (parsedItem.status === 'duplicate_existing' || parsedItem.status === 'duplicate_batch') duplicates.push(parsedItem)
        else invalid.push(parsedItem)
      })

      return { valid, duplicates, invalid, all, format: 'json' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax'
      const errItem: ParsedLine = {
        raw: trimmedText.slice(0, 120),
        lineNumber: 1,
        term: '',
        romanization: '',
        language: '',
        language_group: '',
        region: '',
        region_code: '',
        era: '',
        era_code: '',
        domain: '',
        domain_code: '',
        gloss: '',
        status: 'invalid_format',
        error: `JSON parse error: ${msg}`,
      }
      return { valid: [], duplicates: [], invalid: [errItem], all: [errItem], format: 'json' }
    }
  }

  // Pipe-delimited format
  const lines = text.split(/\r?\n/)
  let lineNum = 0
  for (const rawLine of lines) {
    lineNum++
    const line = rawLine.trim()
    if (!line) continue

    // Ignore comment lines or markdown headers if any accidentally included
    if (line.startsWith('#') || line.startsWith('//') || line.startsWith('```')) continue

    const parts = line.split('|')
    if (parts.length !== 7) {
      const parsedItem: ParsedLine = {
        raw: line,
        lineNumber: lineNum,
        term: parts[0] || '',
        romanization: parts[1] || '',
        language: parts[2] || '',
        language_group: '',
        region: '',
        region_code: parts[3] || '',
        era: '',
        era_code: parts[4] || '',
        domain: '',
        domain_code: parts[5] || '',
        gloss: parts.slice(6).join('|'),
        status: 'invalid_format',
        error: `Expected 7 pipe-separated fields (6 pipes) or a JSON array, found ${parts.length} fields`,
      }
      all.push(parsedItem)
      invalid.push(parsedItem)
      continue
    }

    const parsedItem = validateCandidateEntry(
      {
        raw: line,
        lineNumber: lineNum,
        term: parts[0],
        romanization: parts[1],
        language: parts[2],
        regionRaw: parts[3],
        eraRaw: parts[4],
        domainRaw: parts[5],
        glossRaw: parts[6],
      },
      existingPairs,
      existingTerms,
      batchSeen,
      duplicateMode,
      allowCustomDomains
    )
    all.push(parsedItem)
    if (parsedItem.status === 'valid') valid.push(parsedItem)
    else if (parsedItem.status === 'duplicate_existing' || parsedItem.status === 'duplicate_batch') duplicates.push(parsedItem)
    else invalid.push(parsedItem)
  }

  return { valid, duplicates, invalid, all, format: 'pipe' }
}

// Keep parseAgentOutput alias for backward compatibility across the codebase
export const parseAgentOutput = parseLexiconInput

export function generateUserPrompt(count: number, focus: string, existingPairs: string[]): string {
  const countStr = count > 0 ? String(count) : '100'
  const focusStr = focus ? focus.trim() : ''
  const existingStr = existingPairs.join('\n')

  return `Generate ${countStr} new entries following the rules in the system prompt.

Focus (optional, leave blank for balanced coverage): ${focusStr}

Already have (do not repeat these term + language pairs):
${existingStr}`
}

export function extractCountAndTopic(input: string): { topic: string; count: number } {
  const trimmed = input.trim()
  const match = trimmed.match(/^(?:give\s+me\s+|generate\s+|show\s+me\s+|list\s+)?(\d+)\s+(.+)$/i)
  if (match) {
    const num = parseInt(match[1], 10)
    let topic = match[2].trim()
    topic = topic.replace(/^(?:names?\s+(?:of|for)\s+)/i, '')
    return { count: Math.min(Math.max(num, 5), 200), topic: topic || trimmed }
  }
  return { count: 100, topic: trimmed }
}

export function generateEasyPrompt(topic: string, count: number, existingPairs: string[] = []): string {
  const countStr = count > 0 ? String(count) : '100'
  const topicClean = topic.trim() || 'multilingual cultural, historical, and natural terms around the world'
  const existingSubset = existingPairs.slice(0, 400)

  return `You are an expert multilingual lexicographer for The Lexicon.

TASK:
Generate exactly ${countStr} unique entries for: "${topicClean}".

STRICT OUTPUT FORMAT:
Return a valid JSON array of objects (or raw pipe-delimited lines: term|romanization|language|region|era|domain|meaning).
Each entry must have these 7 fields:
- term: The word in its NATIVE script (Greek, Arabic, 漢字, Devanagari, Cyrillic, Thai, Hangul, or Latin with original diacritics).
- romanization: A Latin-alphabet reading. If native script is Latin, repeat term exactly.
- language: Specific language variety in English (e.g. Ancient Greek, Sanskrit, Classical Chinese, Japanese, Old Norse, Nahuatl, Arabic, Latin, Gaelic, Yoruba).
- region: One code from: EUR, MEA, CAS, SAS, EAS, SEAS, OCE, AFR, AME.
- era: One code from: A (Ancient, before c. 500 CE), M (Historic / Medieval / Folklore, c. 500 to 1900), N (Modern / Contemporary).
- domain: One code from:
  FAUNA, FLORA, MYTH, FICTION, NATURE, SCIENCE, FOOD, CULTURE, CRAFT, TECH, SPORT, ARCH, LANG, LAW,
  STUDIO, GALLERY, OFFICE, HOUSE, LAND, STATE, FINANCE, TRADE, RELIGION, EDUCATION, PERFORM, PORT, MILITARY, LEAD
  (or another concise uppercase domain code if specialized).
- meaning: Concise English description, 5 to 18 words, lowercase start, no final period.

ACCURACY & DIVERSITY RULES:
- Never invent fictional words. Every entry must be a genuine linguistic, cultural, historical, scientific, or folklore term.
- Never output an English descriptive phrase as the term for a non-English language — use the authentic native word.
- Provide worldwide diversity across multiple continents and languages.
- Ensure exact spelling and accurate diacritics.

${existingSubset.length > 0 ? `DO NOT REPEAT these existing term|language pairs:\n${existingSubset.join('\n')}\n` : ''}
Generate the ${countStr} entries now:`
}

export const LEXICON_SYSTEM_PROMPT = `# The Lexicon: Universal Term Generation Rules

Use this whole file as the **system prompt**. Send the filled-in request template (last section) as the **user message**.

---

## 1. Task

Generate new entries for **The Lexicon** — a universal multilingual dictionary cataloging words across world languages, history, nature, science, mythology, culture, and institutions according to the requested **Focus / Topic** (or steward/overseer roles if no topic is specified).

Return a **JSON array** of objects (preferred) or raw pipe-delimited lines in the exact format in section 2.

## 2. Output format

### Option A: JSON Array (Preferred)
\`\`\`json
[
  {
    "term": "σκίουρος",
    "romanization": "skíouros",
    "language": "Ancient Greek",
    "region": "EUR",
    "era": "A",
    "domain": "FAUNA",
    "meaning": "tree rodent; literally shadow-tail, from skia (shadow) and oura (tail)"
  }
]
\`\`\`

### Option B: Pipe-delimited lines
\`\`\`
term|romanization|language|region|era|domain|meaning
\`\`\`

| # | Field | Rule |
|---|-------|------|
| 1 | term | The word in its **native script** (Greek, Arabic, 漢字, Devanagari and so on). For Latin-script languages, the normal spelling with its diacritics. |
| 2 | romanization | A Latin-letter reading for non-Latin scripts. For Latin-script terms, repeat the term exactly. |
| 3 | language | The specific variety, in English: \`Ancient Greek\`, \`Classical Chinese\`, \`Ottoman Turkish\`, \`Old Norse\`, \`Medieval Latin\`, \`Javanese\`. |
| 4 | region | One region code from section 3 (\`EUR\`, \`MEA\`, \`CAS\`, \`SAS\`, \`EAS\`, \`SEAS\`, \`OCE\`, \`AFR\`, \`AME\`). |
| 5 | era | One era code from section 3 (\`A\`, \`M\`, \`N\`). |
| 6 | domain | One domain code from section 3 (e.g. \`FAUNA\`, \`FLORA\`, \`MYTH\`, \`FICTION\`, \`CULTURE\`, \`HOUSE\`, \`STUDIO\`, \`STATE\`, etc.). |
| 7 | meaning | Plain English, 5 to 18 words, lowercase start, no final period. |

## 3. Codes

**Region**: \`EUR\` (Europe), \`MEA\` (Middle East), \`CAS\` (Central Asia & Caucasus), \`SAS\` (South Asia), \`EAS\` (East Asia), \`SEAS\` (Southeast Asia), \`OCE\` (Oceania), \`AFR\` (Africa), \`AME\` (Americas).

**Era**: \`A\` (Ancient, before c. 500 CE), \`M\` (Historic, c. 500 to 1900), \`N\` (Modern, current or recent).

**Domain**:
- Universal: \`FAUNA\` (Fauna & wildlife), \`FLORA\` (Flora & botany), \`MYTH\` (Mythology & folklore), \`FICTION\` (Fiction & pop culture), \`NATURE\` (Nature & cosmos), \`SCIENCE\` (Science & medicine), \`FOOD\` (Food & culinary), \`CULTURE\` (Culture & society), \`CRAFT\` (Tools & craft), \`TECH\` (Technology & computing), \`SPORT\` (Sports & games), \`ARCH\` (Architecture & places), \`LANG\` (Language & idioms), \`LAW\` (Law & justice).
- Institutional / Civic: \`STUDIO\` (Workshop & studio), \`GALLERY\` (Gallery & museum), \`OFFICE\` (Office & business), \`HOUSE\` (Household & estate), \`LAND\` (Land & farming), \`STATE\` (State & civil), \`FINANCE\` (Treasury & finance), \`TRADE\` (Trade & market), \`RELIGION\` (Religious & temple), \`EDUCATION\` (Library & school), \`PERFORM\` (Performing arts), \`PORT\` (Ships & ports), \`MILITARY\` (Military), \`LEAD\` (Leadership).
`

export const AGENT_SYSTEM_PROMPT = LEXICON_SYSTEM_PROMPT


