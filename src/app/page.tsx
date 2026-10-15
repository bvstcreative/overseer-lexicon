'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  parseAgentOutput,
  AGENT_SYSTEM_PROMPT,
  REGION_CODES,
  ERA_CODES,
  DOMAIN_CODES,
  extractCountAndTopic,
} from '@/lib/agent-rules'

interface TermApiRecord {
  id: number
  term: string
  romanization: string
  language: string
  language_group: string
  region: string
  era: string
  domain: string
  gloss: string
  created_at: string
  starred: boolean
}

interface LexiconItem {
  i: number
  dbId: number
  t: string
  r: string
  l: string
  lg: string
  rg: string
  e: string
  d: string
  g: string
  key: string
  hay: string
  id: string
  tag: string
}

type IconProps = React.SVGProps<SVGSVGElement>

const ICON = {
  star: (props: IconProps) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
    </svg>
  ),
  x: (props: IconProps) => (
    <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  cards: (props: IconProps) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="7" rx="1.5" />
      <rect x="4" y="13" width="16" height="7" rx="1.5" />
    </svg>
  ),
  list: (props: IconProps) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  sparkles: (props: IconProps) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.91 5.89L20 10l-4.5 4.38L16.59 21 12 17.77 7.41 21 8.5 14.38 4 10l6.09-1.11L12 3z" />
    </svg>
  ),
  copy: (props: IconProps) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  bolt: (props: IconProps) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

const ERA_ORDER: Record<string, number> = { Ancient: 0, Historic: 1, Modern: 2 }
const ERA_NOTE: Record<string, string> = { Ancient: 'to c. 500 CE', Historic: 'c. 500 to 1900', Modern: 'current or recent' }
const DOMAIN_ORDER = ['Workshop & studio', 'Gallery & museum', 'Office & business', 'Household & estate', 'Leadership', 'State & civil', 'Treasury & finance', 'Trade & market', 'Land & farming', 'Religious & temple', 'Library & school', 'Performing arts', 'Ships & ports', 'Military']
const REGION_ORDER = ['Europe', 'Middle East', 'Central Asia & Caucasus', 'South Asia', 'East Asia', 'Southeast Asia', 'Oceania', 'Africa', 'Americas']

const LANG_TAGS: Array<[string, string]> = [
  ['Japanese', 'ja'], ['Korean', 'ko'], ['Chinese', 'zh'], ['Arabic', 'ar'], ['Persian', 'fa'], ['Hebrew', 'he'], ['Aramaic', 'arc'], ['Thai', 'th'], ['Hindi', 'hi'], ['Urdu', 'ur'], ['Marathi', 'mr'], ['Sanskrit', 'sa'], ['Pali', 'pi'], ['Prakrit', 'sa'], ['Tamil', 'ta'], ['Bengali', 'bn'], ['Telugu', 'te'], ['Kannada', 'kn'], ['Malayalam', 'ml'], ['Sinhala', 'si'], ['Nepali', 'ne'], ['Greek', 'el'], ['Russian', 'ru'], ['Slavic', 'ru'], ['Amharic', 'am'], ['Khmer', 'km'], ['Burmese', 'my'], ['Georgian', 'ka'], ['Armenian', 'hy']
]

function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u02bb\u02bf\u02be\u2019\u2018\u0060]/g, '')
    .replace(/[\u0142]/g, 'l')
    .replace(/[\u00f8]/g, 'o')
    .replace(/[\ua723\ua725]/g, 'a')
    .replace(/[\u0259]/g, 'e')
}

function langTag(l: string): string {
  for (let i = 0; i < LANG_TAGS.length; i++) {
    if (l.indexOf(LANG_TAGS[i][0]) > -1) return LANG_TAGS[i][1]
  }
  return ''
}

function transformDbTerms(terms: TermApiRecord[]): LexiconItem[] {
  return terms.map((item, i) => {
    const term = item.term || ''
    const roman = item.romanization || ''
    const keyNorm = norm(roman || term).replace(/[^a-z0-9 ]/g, '').trim() || norm(term)
    const hay = norm([term, roman, item.language, item.language_group, item.region, item.era, item.domain, item.gloss].join(' '))
    const uniqueKey = term + '|' + (item.language || '')
    return {
      i,
      dbId: item.id,
      t: term,
      r: roman,
      l: item.language || '',
      lg: item.language_group || '',
      rg: item.region || '',
      e: item.era || '',
      d: item.domain || '',
      g: item.gloss || '',
      key: keyNorm,
      hay,
      id: uniqueKey,
      tag: langTag(item.language || '')
    }
  })
}

const KEY = 'overseer-lexicon-v1'
const API_KEY_STORAGE = 'lexicon_gemini_api_key'

const PRESET_TOPICS = [
  'give me 100 mythological creatures name around the world',
  '50 ancient magistrates and civil overseers',
  '50 harbour masters and maritime navigators',
  '50 craft guildmasters and studio artisans',
  '30 agricultural and estate stewards',
]

const SAMPLE_AI_OUTPUT = `Baumeister|Baumeister|German|EUR|M|STUDIO|master builder who oversees masonry and construction
学芸員|gakugeiin|Japanese|EAS|N|GALLERY|museum curator who manages collections and exhibitions
pochtecatl|pōchtēcatl|Nahuatl|AME|M|TRADE|merchant leader directing guild trade caravans
pemangku|pemangku|Balinese|SEAS|M|RELIGION|temple priest managing ritual offerings and temple grounds
shahbandar|shāhbandar|Persian|MEA|M|PORT|harbour master overseeing port trade and foreign merchants`

export default function Home() {
  const [rows, setRows] = useState<LexiconItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [domain, setDomain] = useState<Set<string>>(new Set())
  const [region, setRegion] = useState<Set<string>>(new Set())
  const [era, setEra] = useState<Set<string>>(new Set())
  const [lg, setLg] = useState<Set<string>>(new Set())
  const [starred, setStarred] = useState(false)
  const [sort, setSort] = useState('az')
  const [group, setGroup] = useState('none')
  const [view, setView] = useState<'cards' | 'compact'>('cards')
  const [stars, setStars] = useState<Set<string>>(new Set())
  const [shuffleRank, setShuffleRank] = useState<number[] | null>(null)
  const [langQ, setLangQ] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [langExpanded, setLangExpanded] = useState(false)

  // AI Agent modal state
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentTab, setAgentTab] = useState<'easy' | 'input' | 'prompt' | 'rules'>('easy')

  // Easy mode state
  const [easyInput, setEasyInput] = useState('give me 100 mythological creatures name around the world')
  const [customCount, setCustomCount] = useState<number | null>(null)
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === 'undefined') return ''
    try {
      return localStorage.getItem(API_KEY_STORAGE) || ''
    } catch {
      return ''
    }
  })
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Manual input / paste state
  const [agentText, setAgentText] = useState('')
  const [promptCount, setPromptCount] = useState(100)
  const [promptFocus, setPromptFocus] = useState('')
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Storage & duplicate options
  const [autoStoreSqlite, setAutoStoreSqlite] = useState(true)
  const [duplicateMode, setDuplicateMode] = useState<'term' | 'term_language'>('term')
  const [onDuplicate, setOnDuplicate] = useState<'skip' | 'update'>('skip')

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  const saveApiKey = (key: string) => {
    setApiKey(key)
    try {
      localStorage.setItem(API_KEY_STORAGE, key.trim())
      showToast('Gemini API key saved!')
    } catch {}
  }

  // Fetch terms and stars from SQLite backend
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const res = await fetch('/api/terms')
        const data = await res.json()
        if (isMounted && Array.isArray(data.terms)) {
          const transformed = transformDbTerms(data.terms)
          setRows(transformed)

          // Precompute shuffle rank on initial data load
          const idx = transformed.map((_, i) => i)
          for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const t = idx[i]; idx[i] = idx[j]; idx[j] = t
          }
          const rank = new Array(transformed.length).fill(0)
          idx.forEach((v, pos) => { rank[v] = pos })
          setShuffleRank(rank)

          const starSet = new Set<string>()
          data.terms.forEach((t: TermApiRecord) => {
            if (t.starred) {
              starSet.add(String(t.id))
              starSet.add(t.term + '|' + t.language)
            }
          })

          // Merge with localStorage if previous saved state exists
          try {
            const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
            if (Array.isArray(saved.stars)) {
              saved.stars.forEach((s: string) => starSet.add(s))
            }
            if (saved.view === 'compact' || saved.view === 'cards') {
              setView(saved.view)
            }
          } catch {}

          setStars(starSet)
        }
      } catch (err) {
        console.error('Failed to load terms from SQLite backend:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const qTokens = useMemo(() => norm(q).split(/\s+/).filter(Boolean), [q])

  const saveLocal = useCallback(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ stars: Array.from(stars), view }))
    } catch {}
  }, [stars, view])

  useEffect(() => {
    if (!loading) saveLocal()
  }, [saveLocal, loading])

  const isStarred = useCallback((r: LexiconItem) => {
    return stars.has(r.id) || stars.has(String(r.dbId))
  }, [stars])

  const toggleStarItem = useCallback(async (r: LexiconItem) => {
    const currentlyStarred = isStarred(r)
    const nextStars = new Set(stars)

    if (currentlyStarred) {
      nextStars.delete(r.id)
      nextStars.delete(String(r.dbId))
    } else {
      nextStars.add(r.id)
      nextStars.add(String(r.dbId))
    }
    setStars(nextStars)

    try {
      await fetch('/api/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId: r.dbId, starred: !currentlyStarred }),
      })
    } catch (err) {
      console.error('Failed to sync star status to backend:', err)
    }
  }, [stars, isStarred])

  const reshuffle = useCallback(() => {
    setRows((prevRows) => {
      const idx = prevRows.map((_, i) => i)
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = idx[i]; idx[i] = idx[j]; idx[j] = t
      }
      const rank = new Array(prevRows.length).fill(0)
      idx.forEach((v, pos) => { rank[v] = pos })
      setShuffleRank(rank)
      return prevRows
    })
  }, [])

  // Parse agent text whenever it changes
  const existingTermSet = useMemo(() => {
    return new Set(rows.map((r) => r.t.toLowerCase()))
  }, [rows])

  const existingPairSet = useMemo(() => {
    return new Set(rows.map((r) => `${r.t.toLowerCase()}|${r.l.toLowerCase()}`))
  }, [rows])

  const parsedBatch = useMemo(() => {
    if (!agentText.trim()) return null
    return parseAgentOutput(agentText, existingPairSet, {
      duplicateMode,
      existingTerms: existingTermSet,
    })
  }, [agentText, existingPairSet, existingTermSet, duplicateMode])

  // Computed topic and count for Easy Mode
  const easyParsed = useMemo(() => {
    const extracted = extractCountAndTopic(easyInput)
    return {
      topic: extracted.topic,
      count: customCount !== null ? customCount : extracted.count,
    }
  }, [easyInput, customCount])

  // Handle importing valid terms
  const handleImport = async () => {
    if (!parsedBatch) return
    const itemsToImport = onDuplicate === 'update'
      ? [...parsedBatch.valid, ...parsedBatch.duplicates.filter((d) => d.status === 'duplicate_existing')]
      : parsedBatch.valid

    if (itemsToImport.length === 0) return
    setImporting(true)

    try {
      const payload = {
        terms: itemsToImport.map((v) => ({
          term: v.term,
          romanization: v.romanization,
          language: v.language,
          language_group: v.language_group,
          region: v.region,
          era: v.era,
          domain: v.domain,
          gloss: v.gloss,
        })),
        duplicateMode,
        onDuplicate,
      }

      const res = await fetch('/api/terms/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        if (data.updatedCount > 0) {
          const resAll = await fetch('/api/terms')
          const allData = await resAll.json()
          if (Array.isArray(allData.terms)) {
            setRows(transformDbTerms(allData.terms))
          }
        } else if (Array.isArray(data.terms) && data.terms.length > 0) {
          const newLexiconItems = transformDbTerms(data.terms)
          setRows((prev) => [...prev, ...newLexiconItems])
        }
        setAgentText('')
        setAgentOpen(false)
        const parts: string[] = []
        if (data.insertedCount > 0) parts.push(`${data.insertedCount} added`)
        if (data.updatedCount > 0) parts.push(`${data.updatedCount} updated`)
        if (data.skippedCount > 0) parts.push(`${data.skippedCount} skipped`)
        showToast(`SQLite: ${parts.join(', ') || 'No changes'}`)
      } else {
        alert(data.error || 'Failed to import terms')
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Error importing terms into SQLite database.')
    } finally {
      setImporting(false)
    }
  }

  // Easy Mode: Copy complete self-contained prompt
  const copyEasyPrompt = async () => {
    try {
      const params = new URLSearchParams({
        input: easyInput,
        count: String(easyParsed.count),
        topic: easyParsed.topic,
      })
      const res = await fetch(`/api/agent/prompt?${params.toString()}`)
      const data = await res.json()
      if (data.easyPrompt) {
        await navigator.clipboard.writeText(data.easyPrompt)
        showToast(`Easy AI prompt copied (${data.count} items, ${data.existingCount} existing checked)!`)
      }
    } catch (err) {
      console.error('Failed to fetch easy prompt:', err)
      alert('Failed to generate prompt.')
    }
  }

  // Easy Mode: Direct Gemini generation
  const handleGenerateWithAI = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: easyInput,
          count: easyParsed.count,
          apiKey: apiKey.trim() || undefined,
          storeInSqlite: autoStoreSqlite,
          duplicateMode,
          onDuplicate,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Generation failed.')
        return
      }

      if (data.rawText) {
        setAgentText(data.rawText)
      }

      if (data.storedInSqlite) {
        if (data.updatedCount > 0) {
          const resAll = await fetch('/api/terms')
          const allData = await resAll.json()
          if (Array.isArray(allData.terms)) {
            setRows(transformDbTerms(allData.terms))
          }
        } else if (Array.isArray(data.storedTerms) && data.storedTerms.length > 0) {
          const newItems = transformDbTerms(data.storedTerms)
          setRows((prev) => [...prev, ...newItems])
        }
        const parts: string[] = []
        if (data.storedCount > 0) parts.push(`${data.storedCount} added`)
        if (data.updatedCount > 0) parts.push(`${data.updatedCount} updated`)
        if (data.skippedCount > 0) parts.push(`${data.skippedCount} skipped`)
        showToast(`Stored in SQLite: ${parts.join(', ') || 'No changes'}`)
      } else {
        showToast(`Generated ${data.parsed?.valid?.length || 0} terms! Review below and click Import.`)
      }
    } catch (err) {
      console.error('AI generation error:', err)
      alert('Error generating with AI.')
    } finally {
      setGenerating(false)
    }
  }

  // Advanced Prompt: Copy System Prompt
  const copySystemPrompt = () => {
    navigator.clipboard.writeText(AGENT_SYSTEM_PROMPT).then(() => {
      showToast('System prompt copied to clipboard!')
    })
  }

  // Advanced Prompt: Copy User Prompt
  const copyUserPrompt = async () => {
    try {
      const res = await fetch(`/api/agent/prompt?count=${promptCount}&focus=${encodeURIComponent(promptFocus)}`)
      const data = await res.json()
      if (data.userPrompt) {
        await navigator.clipboard.writeText(data.userPrompt)
        showToast(`User prompt copied (${data.existingCount} existing terms included)!`)
      }
    } catch (err) {
      console.error('Failed to fetch prompt:', err)
      alert('Failed to generate user prompt.')
    }
  }

  const passes = useCallback((r: LexiconItem, skip?: string) => {
    for (let i = 0; i < qTokens.length; i++) {
      if (r.hay.indexOf(qTokens[i]) < 0) return false
    }
    if (domain.size && !domain.has(r.d) && skip !== 'domain') return false
    if (region.size && !region.has(r.rg) && skip !== 'region') return false
    if (era.size && !era.has(r.e) && skip !== 'era') return false
    if (lg.size && !lg.has(r.lg) && skip !== 'lg') return false
    if (starred && skip !== 'starred' && !isStarred(r)) return false
    return true
  }, [qTokens, domain, region, era, lg, starred, isStarred])

  const list = useMemo(() => {
    const filtered = rows.filter(r => passes(r))
    filtered.sort((a, b) => {
      let c = 0
      if (sort === 'rand' && shuffleRank) return shuffleRank[a.i] - shuffleRank[b.i]
      if (sort === 'lang') c = a.lg.localeCompare(b.lg)
      else if (sort === 'region') c = REGION_ORDER.indexOf(a.rg) - REGION_ORDER.indexOf(b.rg)
      else if (sort === 'era') c = ERA_ORDER[a.e] - ERA_ORDER[b.e]
      else if (sort === 'domain') c = DOMAIN_ORDER.indexOf(a.d) - DOMAIN_ORDER.indexOf(b.d)
      return c || a.key.localeCompare(b.key) || a.t.localeCompare(b.t)
    })
    return filtered
  }, [rows, passes, sort, shuffleRank])

  const total = useMemo(() => {
    const td: Record<string, number> = {}, tr: Record<string, number> = {}, te: Record<string, number> = {}, tl: Record<string, number> = {}
    rows.forEach(r => {
      td[r.d] = (td[r.d] || 0) + 1; tr[r.rg] = (tr[r.rg] || 0) + 1; te[r.e] = (te[r.e] || 0) + 1; tl[r.lg] = (tl[r.lg] || 0) + 1
    })
    return { domain: td, region: tr, era: te, lg: tl }
  }, [rows])

  const facetCounts = useCallback((facet: 'domain' | 'region' | 'era' | 'lg') => {
    const m: Record<string, number> = {}
    rows.forEach(r => {
      if (passes(r, facet)) {
        let v = ''
        if (facet === 'domain') v = r.d
        if (facet === 'region') v = r.rg
        if (facet === 'era') v = r.e
        if (facet === 'lg') v = r.lg
        if (v) m[v] = (m[v] || 0) + 1
      }
    })
    return m
  }, [rows, passes])

  const ordered = useCallback((facet: 'domain' | 'region' | 'era' | 'lg') => {
    const keys = Object.keys(total[facet])
    if (facet === 'domain') {
      return DOMAIN_ORDER.filter(k => total.domain[k]).concat(keys.filter(k => DOMAIN_ORDER.indexOf(k) < 0))
    }
    if (facet === 'region') {
      return REGION_ORDER.filter(k => total.region[k]).concat(keys.filter(k => REGION_ORDER.indexOf(k) < 0))
    }
    if (facet === 'era') return ['Ancient', 'Historic', 'Modern']
    return keys.sort((a, b) => total.lg[b] - total.lg[a] || a.localeCompare(b))
  }, [total])

  const options = useMemo(() => ({
    domain: ordered('domain'),
    region: ordered('region'),
    era: ordered('era'),
    lg: ordered('lg')
  }), [ordered])

  const cd = facetCounts('domain'), cr = facetCounts('region'), ce = facetCounts('era'), cl = facetCounts('lg')

  const toggle = (f: string, v: string) => {
    if (f === 'domain') {
      if (v === '__all') { setDomain(new Set()); return }
      const s = new Set(domain); if (s.has(v)) s.delete(v); else s.add(v); setDomain(s)
    } else if (f === 'region') {
      const s = new Set(region); if (s.has(v)) s.delete(v); else s.add(v); setRegion(s)
    } else if (f === 'era') {
      const s = new Set(era); if (s.has(v)) s.delete(v); else s.add(v); setEra(s)
    } else if (f === 'lg') {
      const s = new Set(lg); if (s.has(v)) s.delete(v); else s.add(v); setLg(s)
    } else if (f === 'star') {
      setStarred(s => !s)
    } else if (f === 'group') {
      setGroup(v)
    }
  }

  const resetAll = () => {
    setQ(''); setDomain(new Set()); setRegion(new Set()); setEra(new Set()); setLg(new Set()); setStarred(false); setLangQ('')
  }

  const activeCount = (domain.size + region.size + era.size + lg.size) + (starred ? 1 : 0)

  const langShown = useMemo(() => {
    let shown = options.lg
    const nq = norm(langQ).trim()
    if (nq) shown = shown.filter(v => norm(v).indexOf(nq) > -1)
    else if (!langExpanded) shown = shown.filter((v, i) => i < 12 || lg.has(v))
    return shown
  }, [options.lg, langQ, langExpanded, lg])

  return (
    <div>
      <header className="hero">
        <div className="in">
          <h1>Overseer Lexicon</h1>
          <p className="lede">Words for the person who runs the place: stewards, foremen, workshop heads, gallery curators, harbour masters and village headmen, from ancient and modern languages.</p>
          <ul className="stats" id="stats">
            <li><b>{rows.length}</b> terms</li>
            <li><b>{options.lg.length}</b> languages</li>
            <li><b>{options.region.length}</b> regions</li>
            <li><b>{options.domain.length}</b> domains</li>
          </ul>
        </div>
      </header>

      <div className="bar">
        <div className="in">
          <label className="search">
            <span className="sr">Search terms</span>
            <svg className="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input
              id="q"
              type="search"
              placeholder="Try steward, curator, harbour, Meister"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              enterKeyHint="search"
            />
            <button className="clear" type="button" hidden={!q} onClick={() => setQ('')} aria-label="Clear search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </label>
          <button className="btn" id="openSheet" type="button" aria-haspopup="dialog" onClick={() => setSheetOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h8M16 6h4M4 12h4M12 12h8M4 18h10M18 18h2"/><circle cx="14" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>
            <span>Filters</span><span className="badge" id="badge" hidden={activeCount === 0}>{activeCount}</span>
          </button>
          <button className="btn" id="openAgent" type="button" aria-haspopup="dialog" onClick={() => setAgentOpen(true)}>
            <ICON.sparkles />
            <span>AI Agent</span>
          </button>
        </div>
      </div>

      <main>
        <div className="in">
          <div className="tools" id="tools">
            <label className="select"><span>Sort</span>
              <select id="sort" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="az">A to Z</option>
                <option value="lang">Language</option>
                <option value="region">Region</option>
                <option value="era">Oldest first</option>
                <option value="domain">Domain</option>
                <option value="rand">Shuffled</option>
              </select>
            </label>
            <button className="ibtn" id="shuffle" type="button" aria-label="Shuffle the order" onClick={() => { reshuffle(); setSort('rand') }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
            </button>
            <button className="ibtn" id="view" type="button" aria-label={view === 'cards' ? 'Switch to compact list' : 'Switch to cards'} onClick={() => setView(v => v === 'cards' ? 'compact' : 'cards')}>
              {view === 'cards' ? <ICON.list /> : <ICON.cards />}
            </button>
          </div>
          <div className="quick" id="quick" role="group" aria-label="Quick filter by domain">
            <button className="chip" type="button" onClick={() => setDomain(new Set())} aria-pressed={domain.size === 0}>All</button>
            {options.domain.map(d => (
              <button key={d} className="chip" type="button" onClick={() => toggle('domain', d)} aria-pressed={domain.has(d)}>
                {d} <span className="n">{cd[d] || 0}</span>
              </button>
            ))}
          </div>
          <div className="status">
            <p id="count" aria-live="polite">
              {loading ? (
                'Loading terms from database...'
              ) : (
                <><b>{list.length}</b> of {rows.length} terms</>
              )}
            </p>
            <div className="active" id="active">
              {Array.from(domain).map(v => (
                <button key={v} className="chip x" type="button" onClick={() => toggle('domain', v)} aria-label={`Remove filter ${v}`}>Domain: {v}<ICON.x /></button>
              ))}
              {Array.from(region).map(v => (
                <button key={v} className="chip x" type="button" onClick={() => toggle('region', v)} aria-label={`Remove filter ${v}`}>Region: {v}<ICON.x /></button>
              ))}
              {Array.from(era).map(v => (
                <button key={v} className="chip x" type="button" onClick={() => toggle('era', v)} aria-label={`Remove filter ${v}`}>Era: {v}<ICON.x /></button>
              ))}
              {Array.from(lg).map(v => (
                <button key={v} className="chip x" type="button" onClick={() => toggle('lg', v)} aria-label={`Remove filter ${v}`}>Language: {v}<ICON.x /></button>
              ))}
              {starred && <button className="chip x" type="button" onClick={() => setStarred(false)} aria-label="Remove starred filter">Starred only<ICON.x /></button>}
              {activeCount > 0 && <button className="chip x" type="button" onClick={resetAll} style={{background:'none',borderColor:'var(--line)'}}>Reset all</button>}
            </div>
          </div>
          <div id="out">
            {loading ? (
              <div className="empty"><p>Connecting to SQLite database...</p></div>
            ) : group === 'none' ? (
              list.length === 0 ? (
                <div className="empty"><p>No terms match. Remove a filter or try a shorter search.</p><button className="btn primary" type="button" onClick={resetAll}>Reset everything</button></div>
              ) : view === 'compact' ? (
                <div className="rows">
                  {list.map(r => (
                    <article key={r.id + r.i} className="row">
                      <div className="main">
                        <div>
                          <bdi className="term">{r.t}</bdi>
                          {r.r && r.r !== r.t && <span className="rom">{r.r}</span>}
                        </div>
                        <p className="gloss">{r.g}</p>
                        <div className="sub">{r.l} · {r.rg} · {r.d}</div>
                      </div>
                      <div className="side">
                        <button className="star" type="button" aria-pressed={isStarred(r)} onClick={() => toggleStarItem(r)}>
                          <ICON.star />
                        </button>
                        <span className={`era era-${r.e}`}>{r.e}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="grid">
                  {list.map(r => (
                    <article key={r.id + r.i} className="card">
                      <div className="top">
                        <div>
                          <bdi className="term">{r.t}</bdi>
                          {r.r && r.r !== r.t && <span className="rom">{r.r}</span>}
                        </div>
                        <button className="star" type="button" aria-pressed={isStarred(r)} onClick={() => toggleStarItem(r)}>
                          <ICON.star />
                        </button>
                      </div>
                      <p className="gloss">{r.g}</p>
                      <div className="meta">
                        <button className="tag" type="button" aria-pressed={lg.has(r.lg)} onClick={() => toggle('lg', r.lg)}>{r.lg}</button>
                        <button className="tag" type="button" aria-pressed={region.has(r.rg)} onClick={() => toggle('region', r.rg)}>{r.rg}</button>
                        <button className="tag" type="button" aria-pressed={domain.has(r.d)} onClick={() => toggle('domain', r.d)}>{r.d}</button>
                        <span className={`era era-${r.e}`}>{r.e}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )
            ) : null}
          </div>
        </div>
      </main>

      <footer>
        <div className="in">
          <details>
            <summary>About this list</summary>
            <p>Era is approximate. Ancient means before about 500 CE, Historic runs to about 1900, and Modern covers terms in current use. Meanings are simplified to the sense of managing, keeping or overseeing something.</p>
            <p>The list was compiled from general knowledge. Spellings, romanizations and glosses may be imperfect, so check them before you cite one.</p>
          </details>
        </div>
      </footer>

      {/* Filter Bottom Sheet */}
      <div className={`scrim ${sheetOpen ? 'open' : ''}`} id="scrim" onClick={() => setSheetOpen(false)} />
      <section className={`sheet ${sheetOpen ? 'open' : ''}`} id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" aria-hidden={!sheetOpen}>
        <div className="sheet-head">
          <h2 id="sheetTitle">Filters</h2>
          <button className="btn quiet" id="reset" type="button" onClick={resetAll}>Reset</button>
          <button className="ibtn" id="closeSheet" type="button" aria-label="Close filters" onClick={() => setSheetOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div className="sheet-body">
          <div className="fgroup"><h3>Domain</h3><div className="chips" id="fDomain">
            {options.domain.map(d => (
              <button key={d} className="chip" type="button" aria-pressed={domain.has(d)} onClick={() => toggle('domain', d)}>{d} <span className="n">{cd[d] || 0}</span></button>
            ))}
          </div></div>
          <div className="fgroup"><h3>Region</h3><div className="chips" id="fRegion">
            {options.region.map(rg => (
              <button key={rg} className="chip" type="button" aria-pressed={region.has(rg)} onClick={() => toggle('region', rg)}>{rg} <span className="n">{cr[rg] || 0}</span></button>
            ))}
          </div></div>
          <div className="fgroup"><h3>Era</h3><div className="chips" id="fEra">
            {options.era.map(e => (
              <button key={e} className="chip" type="button" aria-pressed={era.has(e)} onClick={() => toggle('era', e)}>{e} <span className="era-note">· {ERA_NOTE[e]}</span> <span className="n">{ce[e] || 0}</span></button>
            ))}
          </div></div>
          <div className="fgroup">
            <h3>Language</h3>
            <input className="lsearch" id="lsearch" type="search" placeholder="Find a language" autoComplete="off" aria-label="Find a language" value={langQ} onChange={(e) => setLangQ(e.target.value)} />
            <div className="chips" id="fLang">
              {langShown.map(lgopt => (
                <button key={lgopt} className="chip" type="button" aria-pressed={lg.has(lgopt)} onClick={() => toggle('lg', lgopt)}>{lgopt} <span className="n">{cl[lgopt] || 0}</span></button>
              ))}
              {langShown.length === 0 && <span className="era-note">No language matches.</span>}
            </div>
            {!langQ && <button className="linkbtn" id="lmore" type="button" onClick={() => setLangExpanded(e => !e)}>{langExpanded ? 'Show fewer languages' : `Show all ${options.lg.length} languages`}</button>}
          </div>
          <div className="fgroup"><h3>Starred</h3><div className="chips" id="fStar">
            <button className="chip" type="button" aria-pressed={starred} onClick={() => toggle('star', '1')}>Starred only <span className="n">{list.filter(r => isStarred(r)).length > 0 ? rows.filter(r => passes(r,'starred') && isStarred(r)).length : 0}</span></button>
          </div></div>
        </div>
        <div className="sheet-foot">
          <button className="btn" id="copyList" type="button" onClick={() => {
            const lines = ['Term\tRomanization\tLanguage\tRegion\tEra\tDomain\tMeaning'].concat(list.map(r => [r.t, r.r||'', r.l, r.rg, r.e, r.d, r.g].join('\t')))
            navigator.clipboard.writeText(lines.join('\n')).then(() => showToast(`Copied ${list.length} terms`))
          }}>Copy list</button>
          <button className="btn primary" id="apply" type="button" onClick={() => setSheetOpen(false)}>{list.length ? `Show ${list.length} terms` : 'No matches'}</button>
        </div>
      </section>

      {/* AI Agent Modal / Sheet */}
      <div className={`scrim ${agentOpen ? 'open' : ''}`} onClick={() => setAgentOpen(false)} />
      <section className={`sheet agent-sheet ${agentOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="agentTitle" aria-hidden={!agentOpen}>
        <div className="sheet-head">
          <h2 id="agentTitle">AI Term Generator</h2>
          <button className="ibtn" type="button" aria-label="Close AI Agent dialog" onClick={() => setAgentOpen(false)}>
            <ICON.x />
          </button>
        </div>

        <div className="agent-tabs">
          <button
            type="button"
            className={`agent-tab ${agentTab === 'easy' ? 'active' : ''}`}
            onClick={() => setAgentTab('easy')}
          >
            ⚡ Easy Mode
          </button>
          <button
            type="button"
            className={`agent-tab ${agentTab === 'input' ? 'active' : ''}`}
            onClick={() => setAgentTab('input')}
          >
            📋 Paste & Import
          </button>
          <button
            type="button"
            className={`agent-tab ${agentTab === 'prompt' ? 'active' : ''}`}
            onClick={() => setAgentTab('prompt')}
          >
            🛠️ Advanced Prompt
          </button>
          <button
            type="button"
            className={`agent-tab ${agentTab === 'rules' ? 'active' : ''}`}
            onClick={() => setAgentTab('rules')}
          >
            📖 Codes & Rules
          </button>
        </div>

        <div className="sheet-body">
          {/* TAB 1: EASY MODE */}
          {agentTab === 'easy' && (
            <div className="agent-box">
              <label htmlFor="easyModeInput" style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                What would you like to generate?
              </label>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-2)' }}>
                Type a natural phrase or topic (e.g. <i>give me 100 mythological creatures name around the world</i>):
              </p>

              <input
                id="easyModeInput"
                type="text"
                className="easy-input"
                placeholder="e.g. give me 100 mythological creatures name around the world"
                value={easyInput}
                onChange={(e) => setEasyInput(e.target.value)}
              />

              <div className="preset-wrap">
                <span style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center', marginRight: 2 }}>Quick Presets:</span>
                {PRESET_TOPICS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setEasyInput(p)
                      setCustomCount(null)
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)' }}>
                  Detected Topic: <b style={{ color: 'var(--ink)' }}>{easyParsed.topic || 'All themes'}</b>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Count:</span>
                  {[25, 50, 100, 150].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`count-badge-btn ${easyParsed.count === c ? 'active' : ''}`}
                      onClick={() => setCustomCount(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-header">
                  <div className="settings-title">
                    <span>💾 Storage & Duplicate Check</span>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={autoStoreSqlite}
                      onChange={(e) => setAutoStoreSqlite(e.target.checked)}
                    />
                    <span>Store directly in SQLite</span>
                  </label>
                </div>

                <div className="settings-grid">
                  <div className="settings-field">
                    <label htmlFor="easyDupMode">Duplicate Detection</label>
                    <select
                      id="easyDupMode"
                      className="settings-select"
                      value={duplicateMode}
                      onChange={(e) => setDuplicateMode(e.target.value as 'term' | 'term_language')}
                    >
                      <option value="term">By Exact Term Name</option>
                      <option value="term_language">By Term + Language</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label htmlFor="easyOnDup">On Duplicate</label>
                    <select
                      id="easyOnDup"
                      className="settings-select"
                      value={onDuplicate}
                      onChange={(e) => setOnDuplicate(e.target.value as 'skip' | 'update')}
                    >
                      <option value="skip">Skip (Keep existing)</option>
                      <option value="update">Update (Overwrite fields)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="easy-actions">
                <button
                  type="button"
                  className="btn primary"
                  style={{ flex: 1, minWidth: 200 }}
                  onClick={copyEasyPrompt}
                >
                  <ICON.copy /> Copy Easy AI Prompt
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{ minWidth: 180 }}
                  disabled={generating}
                  onClick={handleGenerateWithAI}
                >
                  <ICON.bolt /> {generating ? 'Generating with AI...' : (autoStoreSqlite ? 'Generate & Save to SQLite' : 'Generate with Gemini API')}
                </button>
              </div>

              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="linkbtn"
                  style={{ fontSize: 12, padding: 0 }}
                  onClick={() => setApiKeyOpen(!apiKeyOpen)}
                >
                  {apiKey ? '✓ Gemini API key configured' : '⚙️ Configure Gemini API key (optional)'}
                </button>
              </div>

              {apiKeyOpen && (
                <div className="api-key-panel">
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Gemini API Key (Optional for in-app generation)</div>
                  <p style={{ margin: '0 0 8px', color: 'var(--ink-3)', fontSize: 12 }}>
                    If provided, the app can generate entries directly without leaving this page. Otherwise, simply use the <b>Copy Easy AI Prompt</b> button and paste into ChatGPT or Claude.
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      style={{ flex: 1, height: 34, border: '1px solid var(--line)', borderRadius: 6, padding: '0 8px', background: 'var(--surface)' }}
                    />
                    <button type="button" className="btn" style={{ height: 34, padding: '0 12px' }} onClick={() => saveApiKey(apiKey)}>
                      Save Key
                    </button>
                  </div>
                </div>
              )}

              {/* Show live preview in Easy Mode if text is loaded or generated */}
              {parsedBatch && parsedBatch.all.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="pill valid">✓ {parsedBatch.valid.length} Valid to Add</span>
                      {onDuplicate === 'update' && parsedBatch.duplicates.filter((d) => d.status === 'duplicate_existing').length > 0 && (
                        <span className="pill valid" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                          🔄 {parsedBatch.duplicates.filter((d) => d.status === 'duplicate_existing').length} Will Update
                        </span>
                      )}
                      {parsedBatch.duplicates.length > 0 && (
                        <span className="pill dup">⚠️ {parsedBatch.duplicates.length} Duplicates</span>
                      )}
                      {parsedBatch.invalid.length > 0 && (
                        <span className="pill error">✕ {parsedBatch.invalid.length} Errors</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="linkbtn"
                      style={{ fontSize: 12 }}
                      onClick={() => setAgentTab('input')}
                    >
                      Edit raw output in Paste tab →
                    </button>
                  </div>

                  <div className="preview-wrap">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Term</th>
                          <th>Language</th>
                          <th>Region</th>
                          <th>Era</th>
                          <th>Domain</th>
                          <th>Meaning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedBatch.all.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              {item.status === 'valid' && <span className="pill valid">Valid</span>}
                              {item.status === 'duplicate_existing' && <span className="pill dup" title={item.error}>In DB</span>}
                              {item.status === 'duplicate_batch' && <span className="pill dup" title={item.error}>Repeat</span>}
                              {(item.status === 'invalid_format' || item.status === 'invalid_code') && (
                                <span className="pill error" title={item.error}>Error</span>
                              )}
                            </td>
                            <td>
                              <b>{item.term || '—'}</b>
                              {item.romanization && item.romanization !== item.term && (
                                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item.romanization}</div>
                              )}
                            </td>
                            <td>{item.language || '—'}</td>
                            <td>{item.region || item.region_code || '—'}</td>
                            <td>{item.era || item.era_code || '—'}</td>
                            <td>{item.domain || item.domain_code || '—'}</td>
                            <td style={{ fontSize: 12 }}>
                              {item.gloss || '—'}
                              {item.error && <div style={{ color: '#ef4444', fontSize: 11 }}>{item.error}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL PASTE & IMPORT */}
          {agentTab === 'input' && (
            <div className="agent-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label htmlFor="agentInput" style={{ fontWeight: 600, fontSize: 13.5 }}>
                  Paste generated lines (pipe-separated)
                </label>
                <button
                  type="button"
                  className="linkbtn"
                  style={{ fontSize: 12, padding: 0 }}
                  onClick={() => setAgentText(SAMPLE_AI_OUTPUT)}
                >
                  Paste sample output
                </button>
              </div>

              <textarea
                id="agentInput"
                className="agent-textarea"
                placeholder="term|romanization|language|region|era|domain|meaning&#10;e.g. Baumeister|Baumeister|German|EUR|M|STUDIO|master builder who oversees masonry"
                value={agentText}
                onChange={(e) => setAgentText(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />

              <div className="settings-card">
                <div className="settings-header">
                  <div className="settings-title">
                    <span>🔍 Duplicate Detection & Import Settings</span>
                  </div>
                </div>

                <div className="settings-grid">
                  <div className="settings-field">
                    <label htmlFor="inputDupMode">Duplicate Detection</label>
                    <select
                      id="inputDupMode"
                      className="settings-select"
                      value={duplicateMode}
                      onChange={(e) => setDuplicateMode(e.target.value as 'term' | 'term_language')}
                    >
                      <option value="term">By Exact Term Name</option>
                      <option value="term_language">By Term + Language</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label htmlFor="inputOnDup">If Duplicate Found In DB</label>
                    <select
                      id="inputOnDup"
                      className="settings-select"
                      value={onDuplicate}
                      onChange={(e) => setOnDuplicate(e.target.value as 'skip' | 'update')}
                    >
                      <option value="skip">Skip (Keep existing)</option>
                      <option value="update">Update (Overwrite fields)</option>
                    </select>
                  </div>
                </div>
              </div>

              {parsedBatch && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="pill valid">✓ {parsedBatch.valid.length} Valid to Add</span>
                    {onDuplicate === 'update' && parsedBatch.duplicates.filter((d) => d.status === 'duplicate_existing').length > 0 && (
                      <span className="pill valid" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        🔄 {parsedBatch.duplicates.filter((d) => d.status === 'duplicate_existing').length} Will Update
                      </span>
                    )}
                    {parsedBatch.duplicates.length > 0 && (
                      <span className="pill dup">⚠️ {parsedBatch.duplicates.length} Duplicates</span>
                    )}
                    {parsedBatch.invalid.length > 0 && (
                      <span className="pill error">✕ {parsedBatch.invalid.length} Errors</span>
                    )}
                  </div>

                  <div className="preview-wrap">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Term</th>
                          <th>Language</th>
                          <th>Region</th>
                          <th>Era</th>
                          <th>Domain</th>
                          <th>Meaning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedBatch.all.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              {item.status === 'valid' && <span className="pill valid">Valid</span>}
                              {item.status === 'duplicate_existing' && <span className="pill dup" title={item.error}>In DB</span>}
                              {item.status === 'duplicate_batch' && <span className="pill dup" title={item.error}>Repeat</span>}
                              {(item.status === 'invalid_format' || item.status === 'invalid_code') && (
                                <span className="pill error" title={item.error}>Error</span>
                              )}
                            </td>
                            <td>
                              <b>{item.term || '—'}</b>
                              {item.romanization && item.romanization !== item.term && (
                                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{item.romanization}</div>
                              )}
                            </td>
                            <td>{item.language || '—'}</td>
                            <td>{item.region || item.region_code || '—'}</td>
                            <td>{item.era || item.era_code || '—'}</td>
                            <td>{item.domain || item.domain_code || '—'}</td>
                            <td style={{ fontSize: 12 }}>
                              {item.gloss || '—'}
                              {item.error && <div style={{ color: '#ef4444', fontSize: 11 }}>{item.error}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADVANCED PROMPT */}
          {agentTab === 'prompt' && (
            <div className="agent-box">
              <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--ink-2)' }}>
                Use these pre-formatted prompts in your AI model (ChatGPT, Claude, Gemini, etc.). The user prompt includes all <b>{rows.length}</b> current terms to prevent duplicate output.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label htmlFor="promptCountInput" style={{ display: 'block', font: '500 12px var(--font-mono)', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
                    Count
                  </label>
                  <input
                    id="promptCountInput"
                    type="number"
                    min="10"
                    max="200"
                    value={promptCount}
                    onChange={(e) => setPromptCount(parseInt(e.target.value, 10) || 50)}
                    style={{ width: '100%', height: 38, border: '1px solid var(--line)', borderRadius: 6, padding: '0 8px', background: 'var(--surface-2)' }}
                  />
                </div>
                <div>
                  <label htmlFor="promptFocusInput" style={{ display: 'block', font: '500 12px var(--font-mono)', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
                    Focus (optional)
                  </label>
                  <input
                    id="promptFocusInput"
                    type="text"
                    placeholder="e.g. Southeast Asia & Oceania, modern curators"
                    value={promptFocus}
                    onChange={(e) => setPromptFocus(e.target.value)}
                    style={{ width: '100%', height: 38, border: '1px solid var(--line)', borderRadius: 6, padding: '0 8px', background: 'var(--surface-2)' }}
                  />
                </div>
              </div>

              <div className="prompt-card">
                <div className="prompt-header">
                  <h4>1. System Prompt (Lexicon Rules)</h4>
                  <button className="btn" type="button" style={{ height: 32, padding: '0 10px', fontSize: 12 }} onClick={copySystemPrompt}>
                    <ICON.copy /> Copy System Prompt
                  </button>
                </div>
                <div className="prompt-box">
                  {AGENT_SYSTEM_PROMPT.slice(0, 320)}...
                </div>
              </div>

              <div className="prompt-card">
                <div className="prompt-header">
                  <h4>2. User Prompt (with {rows.length} existing terms)</h4>
                  <button className="btn primary" type="button" style={{ height: 32, padding: '0 10px', fontSize: 12 }} onClick={copyUserPrompt}>
                    <ICON.copy /> Copy User Prompt
                  </button>
                </div>
                <div className="prompt-box">
                  Generate {promptCount} new entries following the rules in the system prompt.
                  {promptFocus ? `\nFocus: ${promptFocus}` : ''}
                  {'\n\nAlready have (do not repeat these term + language pairs):\n' + rows.slice(0, 5).map(r => `${r.t}|${r.l}`).join('\n') + `\n... (+ ${rows.length - 5} more)`}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>Quick Workflow:</h4>
                <ol className="instructions-list">
                  <li>Click <b>Copy System Prompt</b> and paste it as the system instructions in your AI tool.</li>
                  <li>Click <b>Copy User Prompt</b> and send it as the message.</li>
                  <li>Copy the AI response lines, click the <b>Paste & Import</b> tab here, paste them, and click <b>Import to SQLite</b>!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: CODES & RULES */}
          {agentTab === 'rules' && (
            <div className="agent-box" style={{ fontSize: 13, lineHeight: 1.55 }}>
              <h4 style={{ margin: '0 0 6px' }}>Region Codes (Field 4)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6, marginBottom: 14 }}>
                {Object.entries(REGION_CODES).map(([code, name]) => (
                  <div key={code} style={{ padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--line)' }}>
                    <code style={{ fontWeight: 600, color: 'var(--accent)' }}>{code}</code>: {name}
                  </div>
                ))}
              </div>

              <h4 style={{ margin: '0 0 6px' }}>Era Codes (Field 5)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6, marginBottom: 14 }}>
                {Object.entries(ERA_CODES).map(([code, name]) => (
                  <div key={code} style={{ padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--line)' }}>
                    <code style={{ fontWeight: 600, color: 'var(--accent)' }}>{code}</code>: {name}
                  </div>
                ))}
              </div>

              <h4 style={{ margin: '0 0 6px' }}>Domain Codes (Field 6)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
                {Object.entries(DOMAIN_CODES).map(([code, name]) => (
                  <div key={code} style={{ padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--line)' }}>
                    <code style={{ fontWeight: 600, color: 'var(--accent)' }}>{code}</code>: {name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sheet-foot">
          {(() => {
            const updatableCount = onDuplicate === 'update' && parsedBatch
              ? parsedBatch.duplicates.filter((d) => d.status === 'duplicate_existing').length
              : 0
            const totalActionable = (parsedBatch?.valid.length || 0) + updatableCount

            if (totalActionable > 0) {
              return (
                <>
                  <button className="btn" type="button" onClick={() => setAgentOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={importing}
                    onClick={handleImport}
                  >
                    {importing
                      ? 'Importing into SQLite...'
                      : updatableCount > 0
                        ? `Import & Update ${totalActionable} Term${totalActionable === 1 ? '' : 's'} in SQLite`
                        : `Import ${totalActionable} Valid Term${totalActionable === 1 ? '' : 's'} to SQLite`}
                  </button>
                </>
              )
            }

            return (
              <button className="btn primary" type="button" onClick={() => setAgentOpen(false)}>
                Close
              </button>
            )
          })()}
        </div>
      </section>

      {/* Floating notification toast */}
      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast}
      </div>
    </div>
  )
}
