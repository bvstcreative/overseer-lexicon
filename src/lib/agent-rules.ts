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

export const KNOWN_LANGUAGE_GROUPS: Record<string, string> = {
  'Ancient Greek': 'Greek',
  'Byzantine Greek': 'Greek',
  'Modern Greek': 'Greek',
  Greek: 'Greek',
  Latin: 'Latin',
  'Late Latin': 'Latin',
  'Medieval Latin': 'Latin',
  'Old French': 'French',
  French: 'French',
  English: 'English',
  'Old English': 'English',
  'Middle English': 'English',
  German: 'German',
  'Middle High German': 'German',
  Dutch: 'Dutch',
  Italian: 'Italian',
  Venetian: 'Italian',
  Spanish: 'Spanish',
  Portuguese: 'Portuguese',
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
  Polish: 'Polish',
  Czech: 'Czech',
  Slovak: 'Czech',
  Croatian: 'South Slavic',
  Serbian: 'South Slavic',
  Bulgarian: 'South Slavic',
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
  Mongolian: 'Turkic & Mongolic',
  Turkic: 'Turkic & Mongolic',
  Sanskrit: 'Sanskrit & Pali',
  Prakrit: 'Sanskrit & Pali',
  Pali: 'Sanskrit & Pali',
  Hindi: 'Hindi & Urdu',
  Urdu: 'Hindi & Urdu',
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
  Quechua: 'Quechua',
  'Classic Maya': 'Maya',
  'Yucatec Maya': 'Maya',
}

export function inferLanguageGroup(language: string): string {
  const trimmed = language.trim()
  if (KNOWN_LANGUAGE_GROUPS[trimmed]) {
    return KNOWN_LANGUAGE_GROUPS[trimmed]
  }

  // Substring inference
  const lower = trimmed.toLowerCase()
  if (lower.includes('greek')) return 'Greek'
  if (lower.includes('latin')) return 'Latin'
  if (lower.includes('french')) return 'French'
  if (lower.includes('german')) return 'German'
  if (lower.includes('dutch')) return 'Dutch'
  if (lower.includes('italian')) return 'Italian'
  if (lower.includes('spanish')) return 'Spanish'
  if (lower.includes('norse') || lower.includes('scandi')) return 'Scandinavian'
  if (lower.includes('slavic') || lower.includes('russian')) return 'Russian & East Slavic'
  if (lower.includes('hebrew')) return 'Hebrew'
  if (lower.includes('arabic')) return 'Arabic'
  if (lower.includes('persian')) return 'Persian'
  if (lower.includes('chinese')) return 'Chinese'
  if (lower.includes('japanese')) return 'Japanese'
  if (lower.includes('korean')) return 'Korean'
  if (lower.includes('turkish') || lower.includes('turkic')) return 'Turkish'
  if (lower.includes('sanskrit') || lower.includes('prakrit') || lower.includes('pali')) return 'Sanskrit & Pali'
  if (lower.includes('hindi') || lower.includes('urdu')) return 'Hindi & Urdu'
  if (lower.includes('malay') || lower.includes('indonesian')) return 'Indonesian & Malay'

  return trimmed
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
}

export function parseAgentOutput(
  text: string,
  existingPairs?: Set<string>,
  options?: ParseOptions
): {
  valid: ParsedLine[]
  duplicates: ParsedLine[]
  invalid: ParsedLine[]
  all: ParsedLine[]
} {
  const duplicateMode = options?.duplicateMode || 'term'
  const existingTerms = options?.existingTerms
  const lines = text.split(/\r?\n/)
  const all: ParsedLine[] = []
  const valid: ParsedLine[] = []
  const duplicates: ParsedLine[] = []
  const invalid: ParsedLine[] = []
  const batchSeen = new Set<string>()

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
        error: `Expected 7 pipe-separated fields (6 pipes), found ${parts.length} fields`,
      }
      all.push(parsedItem)
      invalid.push(parsedItem)
      continue
    }

    const term = parts[0].trim()
    const romanization = parts[1].trim() || term
    const language = parts[2].trim()
    const regCode = parts[3].trim().toUpperCase()
    const eraCode = parts[4].trim().toUpperCase()
    const domCode = parts[5].trim().toUpperCase()
    const gloss = parts[6].trim().replace(/\.$/, '') // ensure no final period per rule 5

    if (!term || !language) {
      const parsedItem: ParsedLine = {
        raw: line,
        lineNumber: lineNum,
        term,
        romanization,
        language,
        language_group: '',
        region: '',
        region_code: regCode,
        era: '',
        era_code: eraCode,
        domain: '',
        domain_code: domCode,
        gloss,
        status: 'invalid_format',
        error: 'Term and language cannot be empty',
      }
      all.push(parsedItem)
      invalid.push(parsedItem)
      continue
    }

    const region = REGION_CODES[regCode]
    if (!region) {
      const parsedItem: ParsedLine = {
        raw: line,
        lineNumber: lineNum,
        term,
        romanization,
        language,
        language_group: '',
        region: '',
        region_code: regCode,
        era: '',
        era_code: eraCode,
        domain: '',
        domain_code: domCode,
        gloss,
        status: 'invalid_code',
        error: `Invalid region code: '${regCode}'. Allowed: ${Object.keys(REGION_CODES).join(', ')}`,
      }
      all.push(parsedItem)
      invalid.push(parsedItem)
      continue
    }

    const era = ERA_CODES[eraCode]
    if (!era) {
      const parsedItem: ParsedLine = {
        raw: line,
        lineNumber: lineNum,
        term,
        romanization,
        language,
        language_group: '',
        region,
        region_code: regCode,
        era: '',
        era_code: eraCode,
        domain: '',
        domain_code: domCode,
        gloss,
        status: 'invalid_code',
        error: `Invalid era code: '${eraCode}'. Allowed: A, M, N`,
      }
      all.push(parsedItem)
      invalid.push(parsedItem)
      continue
    }

    const domain = DOMAIN_CODES[domCode]
    if (!domain) {
      const parsedItem: ParsedLine = {
        raw: line,
        lineNumber: lineNum,
        term,
        romanization,
        language,
        language_group: '',
        region,
        region_code: regCode,
        era,
        era_code: eraCode,
        domain: '',
        domain_code: domCode,
        gloss,
        status: 'invalid_code',
        error: `Invalid domain code: '${domCode}'. Allowed: ${Object.keys(DOMAIN_CODES).join(', ')}`,
      }
      all.push(parsedItem)
      invalid.push(parsedItem)
      continue
    }

    const termKey = term.toLowerCase()
    const pairKey = `${termKey}|${language.toLowerCase()}`
    const checkKey = duplicateMode === 'term' ? termKey : pairKey
    const language_group = inferLanguageGroup(language)

    if (batchSeen.has(checkKey)) {
      const parsedItem: ParsedLine = {
        raw: line,
        lineNumber: lineNum,
        term,
        romanization,
        language,
        language_group,
        region,
        region_code: regCode,
        era,
        era_code: eraCode,
        domain,
        domain_code: domCode,
        gloss,
        status: 'duplicate_batch',
        error: duplicateMode === 'term'
          ? `Repeated term "${term}" in this batch`
          : `Repeated term "${term}" in ${language} in this batch`,
      }
      all.push(parsedItem)
      duplicates.push(parsedItem)
      continue
    }
    batchSeen.add(checkKey)

    const isExistingDup = duplicateMode === 'term'
      ? (existingTerms && existingTerms.has(termKey))
      : (existingPairs && existingPairs.has(pairKey))

    if (isExistingDup) {
      const parsedItem: ParsedLine = {
        raw: line,
        lineNumber: lineNum,
        term,
        romanization,
        language,
        language_group,
        region,
        region_code: regCode,
        era,
        era_code: eraCode,
        domain,
        domain_code: domCode,
        gloss,
        status: 'duplicate_existing',
        error: duplicateMode === 'term'
          ? `Term "${term}" already exists in database`
          : `Term "${term}" (${language}) already exists in database`,
      }
      all.push(parsedItem)
      duplicates.push(parsedItem)
      continue
    }

    const parsedItem: ParsedLine = {
      raw: line,
      lineNumber: lineNum,
      term,
      romanization,
      language,
      language_group,
      region,
      region_code: regCode,
      era,
      era_code: eraCode,
      domain,
      domain_code: domCode,
      gloss,
      status: 'valid',
    }
    all.push(parsedItem)
    valid.push(parsedItem)
  }

  return { valid, duplicates, invalid, all }
}

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
  const topicClean = topic.trim() || 'mythological creatures name around the world'
  const existingSubset = existingPairs.slice(0, 400)

  return `You are an expert multilingual lexicographer.

TASK:
Generate exactly ${countStr} unique entries for: "${topicClean}".

STRICT OUTPUT FORMAT:
Return raw data lines ONLY. One entry per line. No headers, no bullet points, no commentary, no code fences.
Each line must have exactly 6 pipe characters (|) separating 7 fields:

term|romanization|language|region|era|domain|meaning

FIELD DEFINITIONS:
1. term: The word in its NATIVE script (Greek, Arabic, 漢字, Devanagari, Cyrillic, Thai, Hangul, or Latin with original diacritics).
2. romanization: A Latin-alphabet reading. If native script is Latin, repeat term exactly.
3. language: Specific language variety in English (e.g. Ancient Greek, Sanskrit, Classical Chinese, Japanese, Old Norse, Nahuatl, Arabic, Latin, Gaelic, Yoruba).
4. region: One code from:
   - EUR (Europe)
   - MEA (Middle East)
   - CAS (Central Asia & Caucasus)
   - SAS (South Asia)
   - EAS (East Asia)
   - SEAS (Southeast Asia)
   - OCE (Oceania)
   - AFR (Africa)
   - AME (Americas)
   (Pick where the term/culture originates).
5. era: One code from:
   - A (Ancient, before c. 500 CE)
   - M (Historic / Medieval / Folklore, c. 500 to 1900)
   - N (Modern / Contemporary)
6. domain: One code from:
   - RELIGION (spirits, deities, sacred, mythology, temple, rites)
   - LAND (nature, forest, mountain, earth, beast, farming)
   - PORT (water, sea, river, oceanic, maritime)
   - MILITARY (war, battle, guardian, warrior, defense)
   - HOUSE (domestic, household, dwelling spirits)
   - STUDIO (craft, creation, artisan)
   - GALLERY (collection, museum, lore)
   - OFFICE (administration, hierarchy)
   - STATE (civil, realm, kingdom)
   - FINANCE (wealth, treasure, hoard)
   - TRADE (market, commerce)
   - EDUCATION (lore, wisdom, library, school)
   - PERFORM (bardic, music, storytelling, dance)
   - LEAD (rulers, chief entities, primordial beings)
   (Choose the single best fitting domain).
7. meaning: Concise English description, 5 to 18 words, lowercase start, no final period. Explaining what it is.

ACCURACY & DIVERSITY RULES:
- Never invent fictional words. Every entry must be a genuine cultural, mythological, folklore, historical, or linguistic entity.
- Provide worldwide diversity across multiple continents and languages.
- Ensure exact spelling and accurate diacritics.

${existingSubset.length > 0 ? `DO NOT REPEAT these existing term|language pairs:\n${existingSubset.join('\n')}\n` : ''}
Generate the ${countStr} entries now:`
}


export const AGENT_SYSTEM_PROMPT = `# Overseer Lexicon: term generation rules

Use this whole file as the **system prompt**. Send the filled-in request template (last section) as the **user message**.

---

## 1. Task

Generate new entries for a multilingual lexicon of words that mean **a person who manages, oversees, keeps or runs something**: a household, estate, workshop or atelier, gallery or museum, office, treasury, market, ship or port, temple, school, village or state department.

Return data lines only, in the exact format in section 2. Another program reads your output, so any extra text breaks it.

## 2. Output format

One entry per line. Seven fields separated by the pipe character \`|\`:

\`\`\`
term|romanization|language|region|era|domain|meaning
\`\`\`

| # | Field | Rule |
|---|-------|------|
| 1 | term | The word in its **native script** (Greek, Arabic, 漢字, Devanagari and so on). For Latin-script languages, the normal spelling with its diacritics. |
| 2 | romanization | A Latin-letter reading for non-Latin scripts. For Latin-script terms, repeat the term exactly. |
| 3 | language | The specific variety, in English: \`Ancient Greek\`, \`Classical Chinese\`, \`Ottoman Turkish\`, \`Old Norse\`, \`Medieval Latin\`, \`Javanese\`. |
| 4 | region | One region code from section 3. |
| 5 | era | One era code from section 3. |
| 6 | domain | One domain code from section 3. |
| 7 | meaning | Plain English, 5 to 18 words. See section 5. |

Hard format rules:

- Output **raw lines only**. No header row, no numbering, no bullets, no code fences, no blank lines, no commentary before or after.
- Exactly **6 pipe characters per line**. Never use \`|\` inside a field.
- Use UTF-8. Keep diacritics. Do not replace native script with romanization.
- Do not wrap fields in quotes.

## 2b. Romanization standards

| Language | Scheme |
|----------|--------|
| Chinese | Pinyin with tone marks |
| Japanese | Hepburn, with macrons for long vowels |
| Korean | Revised Romanization |
| Sanskrit, Pali, Prakrit | IAST |
| Hindi, Urdu, Bengali, Tamil and other Indic languages | IAST-style with macrons and dots |
| Arabic, Persian, Hebrew | Common scholarly transliteration (ā, ī, ū, ḥ, ṣ, ʿ), no all-caps |
| Greek | Standard Latinization (ē, ō, y for upsilon) |
| Russian, Ukrainian, Bulgarian | Scholarly transliteration |
| Thai, Khmer, Burmese | Common reading, no tone marks needed |
| Ancient Egyptian | Conventional Egyptological spelling such as \`imy-r per\`, avoiding rare Unicode characters |

## 3. Codes

**Region** (field 4)

| Code | Meaning |
|------|---------|
| \`EUR\` | Europe |
| \`MEA\` | Middle East |
| \`CAS\` | Central Asia and Caucasus |
| \`SAS\` | South Asia |
| \`EAS\` | East Asia |
| \`SEAS\` | Southeast Asia |
| \`OCE\` | Oceania |
| \`AFR\` | Africa |
| \`AME\` | Americas |

Pick the region where the language is or was spoken. Egyptian and Berber are \`AFR\`. Arabic, Hebrew and Persian are \`MEA\`.

**Era** (field 5)

| Code | Meaning |
|------|---------|
| \`A\` | Ancient, before about 500 CE |
| \`M\` | Historic, about 500 to 1900 |
| \`N\` | Modern, in current use or coined in the modern era |

If unsure between two eras, choose the later one.

**Domain** (field 6)

| Code | Covers |
|------|--------|
| \`STUDIO\` | workshop, atelier, studio, building site, craft master, foreman |
| \`GALLERY\` | gallery, museum, collection, curator, exhibition |
| \`OFFICE\` | office, company, administration, secretary, manager |
| \`HOUSE\` | household, palace staff, steward, butler, estate house |
| \`LAND\` | farm, estate land, village land, irrigation, overseer of workers |
| \`STATE\` | government office, district, city, provincial official |
| \`FINANCE\` | treasury, accounts, tax, mint |
| \`TRADE\` | market, merchants, guilds, trading post |
| \`RELIGION\` | temple, church, monastery, mosque, endowment |
| \`EDUCATION\` | library, school, college, archive |
| \`PERFORM\` | theatre, troupe, festival, stage, orchestra |
| \`PORT\` | ship, harbour, fleet, shipping |
| \`MILITARY\` | garrison, camp, supply, army or navy command |
| \`LEAD\` | general head, chief or leader with managing duties that fit no other domain |

Choose the single best fit.

## 4. What counts as a valid term

Include a word only if **all** of these are true:

1. It names a **role or title of a person** (or a clearly personified office), not a place, tool or abstract noun.
2. The role is about **managing, supervising, keeping, administering or running** something, not only ruling, fighting or worshipping.
3. It is a **real word used in that language**, in the stated era, found in dictionaries, historical sources or normal modern usage.
4. You are **confident** about its spelling, script, and meaning.

Rulers, priests and generals are acceptable only when the title carries administrative or managerial duties (for example a temple administrator, a provincial governor, a treasury head). Skip pure royal or military rank titles.

## 5. Writing the meaning

- English, one short phrase, 5 to 18 words.
- Start with a lowercase letter. No final period.
- Say plainly what the person does and of what: \`steward who managed a noble household\`, \`overseer of a royal workshop\`.
- Add a short etymology only when it is well known and helps, for example \`from Persian shāh-bandar\`.
- Do not copy dictionary definitions word for word. Do not include the term itself in the meaning.
- No opinions, no marketing words, no emoji.

## 6. Accuracy rules (most important)

- **Never invent a word.** Do not translate an English word into another language by guess. Do not blend roots or create plausible-sounding titles.
- If you are not sure a term exists, is spelled that way, or means that, **leave it out**.
- Do not guess the script of a language you cannot write reliably. Skip it.
- Prefer terms with clear historical or current use over obscure ones you cannot verify.
- Keep each entry to the sense of managing. Do not stretch a meaning to fit.
- Producing **fewer lines than requested is correct** when reaching the count would require guessing. Never pad.

## 7. Coverage and balance

Spread entries across the lexicon instead of clustering:

- Use many languages in one batch. No single language should be more than about 12 percent of a batch.
- Give extra weight to regions that have fewer entries: \`CAS\`, \`OCE\`, \`AME\`, \`AFR\`, \`SEAS\`.
- Give extra weight to domains that have fewer entries: \`GALLERY\`, \`EDUCATION\`, \`PERFORM\`, \`PORT\`, \`MILITARY\`.
- Include a mix of eras, with modern workplace roles (studio, gallery, office, production) as well as ancient and historic ones.
- If the request names a **focus** (a region, era, domain or language), follow it, and ignore the balance rules above for that dimension.

## 8. No duplicates

- Do not repeat any \`term\` + \`language\` pair from the **already have** list in the request.
- Do not repeat a pair within your own output.
- The same word in a different language is allowed.
- Do not add a different spelling, script or romanization of a word that is already present.

## 9. Examples (format reference only, do not output these)

\`\`\`
οἰκονόμος|oikonomos|Ancient Greek|EUR|A|HOUSE|household manager or steward; root of "economy"
Baumeister|Baumeister|German|EUR|M|STUDIO|master builder
学芸員|gakugeiin|Japanese|EAS|N|GALLERY|museum curator
شاهبندر|shāhbandar|Arabic|MEA|M|PORT|harbour master and head of merchants in a port
pochtecatl|pōchtēcatl|Nahuatl|AME|M|TRADE|long-distance merchant belonging to a trading guild
pemangku|pemangku|Balinese|SEAS|M|RELIGION|temple priest who manages temple rites
\`\`\`

## 10. Request template (user message)

Fill in the values in double braces and send as the user message.

\`\`\`
Generate {{COUNT}} new entries following the rules in the system prompt.

Focus (optional, leave blank for balanced coverage): {{FOCUS}}

Already have (do not repeat these term + language pairs):
{{EXISTING}}
\`\`\`

\`{{EXISTING}}\` should be one \`term|language\` pair per line.

## 11. Notes for running it

- For best accuracy, request **100 to 150 entries per call** and repeat with an updated \`{{EXISTING}}\` list, instead of asking for a very large count at once.
- Check the output before use: every line must have 7 fields, valid region, era and domain codes, and no duplicate \`term\` + \`language\` pair.
- Spot-check a sample of entries for spelling and meaning, especially in less common languages.
`

