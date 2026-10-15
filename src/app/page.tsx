'use client'

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  parseAgentOutput,
  REGION_CODES,
  ERA_CODES,
  DOMAIN_CODES,
} from '@/lib/agent-rules'
import { speakLexiconTerm, stopSpeaking } from '@/lib/tts'

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
  import: (props: IconProps) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  up: (props: IconProps) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  ),
  dice: (props: IconProps) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  user: (props: IconProps) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  logout: (props: IconProps) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  speaker: (props: IconProps) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  speakerActive: (props: IconProps) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

interface AuthUser {
  id: number
  username: string
  email: string | null
}

const PAGE_SIZE = 48

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

  // Import modal state
  const [importOpen, setImportOpen] = useState(false)
  const [importTab, setImportTab] = useState<'paste' | 'rules'>('paste')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // "I'm Feeling Lucky" random term modal — history stack lets Next/Previous navigate
  const [luckyHistory, setLuckyHistory] = useState<LexiconItem[]>([])
  const [luckyIndex, setLuckyIndex] = useState(-1)
  const luckyItem = luckyIndex >= 0 ? luckyHistory[luckyIndex] ?? null : null

  // Duplicate options
  const [duplicateMode, setDuplicateMode] = useState<'term' | 'term_language'>('term')
  const [onDuplicate, setOnDuplicate] = useState<'skip' | 'update'>('skip')

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Text-to-speech native voice state and playback handler
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)

  const handleToggleSpeak = useCallback((item: { t: string; r?: string; l: string; dbId?: number }, key: string) => {
    if (speakingKey === key) {
      stopSpeaking()
      setSpeakingKey(null)
      return
    }

    setSpeakingKey(key)
    speakLexiconTerm({
      id: item.dbId,
      term: item.t,
      romanization: item.r,
      language: item.l,
      voice: 'Charon',
      onStart: () => setSpeakingKey(key),
      onEnd: () => setSpeakingKey((curr) => (curr === key ? null : curr)),
      onError: () => setSpeakingKey((curr) => (curr === key ? null : curr)),
    })
  }, [speakingKey])

  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  // User Authentication & Personal Bookmarks state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [signinIdent, setSigninIdent] = useState('')
  const [signinPass, setSigninPass] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPassConfirm, setRegPassConfirm] = useState('')
  const [pendingBookmark, setPendingBookmark] = useState<LexiconItem | null>(null)

  // Fetch terms, authentication, and stars from SQLite backend
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        let authUser: AuthUser | null = null
        try {
          const authRes = await fetch('/api/auth/me')
          const authData = await authRes.json()
          if (authData.user) {
            authUser = authData.user
            if (isMounted) setCurrentUser(authUser)
          }
        } catch {}

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
          if (authUser) {
            try {
              const starsRes = await fetch('/api/stars')
              const starsData = await starsRes.json()
              if (Array.isArray(starsData.starredIds)) {
                starsData.starredIds.forEach((id: number) => {
                  starSet.add(String(id))
                  const found = transformed.find(t => t.dbId === id)
                  if (found) starSet.add(found.id)
                })
              }
            } catch {}
          } else {
            // Unauthenticated: merge with localStorage if previous saved state exists
            try {
              const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
              if (Array.isArray(saved.stars)) {
                saved.stars.forEach((s: string) => starSet.add(s))
              }
            } catch {}
          }

          try {
            const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
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
    if (!currentUser) {
      setPendingBookmark(r)
      setAuthNotice(`Sign in or create an account to bookmark "${r.t}" to your personal collection.`)
      setAuthTab('register')
      setAuthError(null)
      setAuthModalOpen(true)
      return
    }

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
      const res = await fetch('/api/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId: r.dbId, starred: !currentlyStarred }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStars(stars)
        showToast(data.error || 'Failed to update bookmark')
      } else {
        showToast(currentlyStarred ? `Removed "${r.t}" from bookmarks` : `Saved "${r.t}" to your bookmarks`)
      }
    } catch (err) {
      console.error('Failed to sync star status to backend:', err)
      setStars(stars)
      showToast('Network error updating bookmark')
    }
  }, [currentUser, stars, isStarred, showToast])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    if (!regUsername.trim()) {
      setAuthError('Please enter a username.')
      return
    }
    if (regUsername.trim().length < 3) {
      setAuthError('Username must be at least 3 characters.')
      return
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(regUsername.trim())) {
      setAuthError('Username can only contain letters, numbers, underscores, and hyphens.')
      return
    }
    if (regPass.length < 6) {
      setAuthError('Password must be at least 6 characters.')
      return
    }
    if (regPass !== regPassConfirm) {
      setAuthError('Passwords do not match.')
      return
    }

    setAuthLoading(true)
    try {
      const initialStars: number[] = []
      if (pendingBookmark) {
        initialStars.push(pendingBookmark.dbId)
      }
      stars.forEach(s => {
        const num = Number(s)
        if (!isNaN(num) && num > 0 && !initialStars.includes(num)) {
          initialStars.push(num)
        }
      })

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim() || undefined,
          password: regPass,
          initialStars,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setAuthError(data.error || 'Registration failed.')
        return
      }

      setCurrentUser(data.user)
      setAuthModalOpen(false)
      setRegUsername('')
      setRegEmail('')
      setRegPass('')
      setRegPassConfirm('')

      // Reload stars
      const starsRes = await fetch('/api/stars')
      const starsData = await starsRes.json()
      if (Array.isArray(starsData.starredIds)) {
        const newStarSet = new Set<string>()
        starsData.starredIds.forEach((id: number) => {
          newStarSet.add(String(id))
          const found = rows.find(item => item.dbId === id)
          if (found) newStarSet.add(found.id)
        })
        setStars(newStarSet)
      }

      if (pendingBookmark) {
        showToast(`Welcome, ${data.user.username}! Saved "${pendingBookmark.t}" to your bookmarks.`)
        setPendingBookmark(null)
      } else {
        showToast(`Welcome, ${data.user.username}! Account created.`)
      }
    } catch {
      setAuthError('Network error during registration.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    if (!signinIdent.trim() || !signinPass) {
      setAuthError('Please enter your username/email and password.')
      return
    }

    setAuthLoading(true)
    try {
      const initialStars: number[] = []
      if (pendingBookmark) {
        initialStars.push(pendingBookmark.dbId)
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: signinIdent.trim(),
          password: signinPass,
          initialStars,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setAuthError(data.error || 'Invalid username or password.')
        return
      }

      setCurrentUser(data.user)
      setAuthModalOpen(false)
      setSigninIdent('')
      setSigninPass('')

      // Reload stars
      const starsRes = await fetch('/api/stars')
      const starsData = await starsRes.json()
      if (Array.isArray(starsData.starredIds)) {
        const newStarSet = new Set<string>()
        starsData.starredIds.forEach((id: number) => {
          newStarSet.add(String(id))
          const found = rows.find(item => item.dbId === id)
          if (found) newStarSet.add(found.id)
        })
        setStars(newStarSet)
      }

      if (pendingBookmark) {
        showToast(`Welcome back, ${data.user.username}! Saved "${pendingBookmark.t}" to your bookmarks.`)
        setPendingBookmark(null)
      } else {
        showToast(`Welcome back, ${data.user.username}!`)
      }
    } catch {
      setAuthError('Network error during sign in.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setCurrentUser(null)
      setStars(new Set())
      showToast('Signed out successfully.')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

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
    if (!importText.trim()) return null
    return parseAgentOutput(importText, existingPairSet, {
      duplicateMode,
      existingTerms: existingTermSet,
    })
  }, [importText, existingPairSet, existingTermSet, duplicateMode])

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
        setImportText('')
        setImportOpen(false)
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

  // Lazy loading state and visible slice
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset visible count whenever search, filter, or sort changes (adjust state during render)
  const filterKey = `${q}|${sort}|${starred}|${domain.size}|${region.size}|${era.size}|${lg.size}|${Array.from(domain).join(',')}|${Array.from(region).join(',')}|${Array.from(era).join(',')}|${Array.from(lg).join(',')}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)

  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setVisibleCount(PAGE_SIZE)
  }

  const visibleList = useMemo(() => {
    return list.slice(0, visibleCount)
  }, [list, visibleCount])

  const hasMore = visibleCount < list.length
  const remainingCount = Math.max(0, list.length - visibleCount)

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, list.length))
  }, [list.length])

  // Automatically load next batch when sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, list.length))
        }
      },
      { rootMargin: '300px' }
    )

    observer.observe(sentinel)
    return () => {
      observer.disconnect()
    }
  }, [hasMore, list.length])

  // Track window scroll for Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true)
      } else {
        setShowBackToTop(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // "I'm Feeling Lucky" random picker
  const triggerLucky = useCallback(() => {
    const pool = list.length > 0 ? list : rows
    if (pool.length === 0) return
    const randomIndex = Math.floor(Math.random() * pool.length)
    setLuckyHistory([pool[randomIndex]])
    setLuckyIndex(0)
  }, [list, rows])

  const closeLucky = useCallback(() => {
    stopSpeaking()
    setSpeakingKey((curr) => (curr === 'lucky' ? null : curr))
    setLuckyIndex(-1)
  }, [])

  const hasPreviousLucky = luckyIndex > 0

  const rollNextLucky = useCallback(() => {
    stopSpeaking()
    setSpeakingKey((curr) => (curr === 'lucky' ? null : curr))
    const pool = list.length > 1 ? list : rows
    if (pool.length === 0) return
    let randomIndex = Math.floor(Math.random() * pool.length)
    if (pool.length > 1 && luckyItem && pool[randomIndex].id === luckyItem.id) {
      randomIndex = (randomIndex + 1) % pool.length
    }
    const nextItem = pool[randomIndex]
    setLuckyHistory((prev) => [...prev.slice(0, luckyIndex + 1), nextItem])
    setLuckyIndex((i) => i + 1)
  }, [list, rows, luckyItem, luckyIndex])

  const rollPreviousLucky = useCallback(() => {
    if (!hasPreviousLucky) return
    stopSpeaking()
    setSpeakingKey((curr) => (curr === 'lucky' ? null : curr))
    setLuckyIndex((i) => Math.max(0, i - 1))
  }, [hasPreviousLucky])

  // Keyboard controls for full-screen Lucky card (Esc to close, ←/→ or Space/R to navigate, P/L to pronounce)
  useEffect(() => {
    if (!luckyItem) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLucky()
      } else if (e.key === ' ' || e.key === 'r' || e.key === 'R' || e.key === 'ArrowRight') {
        e.preventDefault()
        rollNextLucky()
      } else if (e.key === 'ArrowLeft' && hasPreviousLucky) {
        e.preventDefault()
        rollPreviousLucky()
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        handleToggleSpeak(luckyItem, 'lucky')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [luckyItem, rollNextLucky, rollPreviousLucky, hasPreviousLucky, closeLucky, handleToggleSpeak])

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
      if (!currentUser && !starred) {
        setAuthNotice('Please sign in or create an account to view and save bookmarked terms.')
        setAuthTab('signin')
        setAuthError(null)
        setAuthModalOpen(true)
        return
      }
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
          <button className="btn" id="openImport" type="button" aria-haspopup="dialog" onClick={() => setImportOpen(true)}>
            <ICON.import />
            <span>Import</span>
          </button>
          {currentUser ? (
            <div className="user-nav">
              <button
                type="button"
                className={`btn user-btn ${starred ? 'active' : ''}`}
                onClick={() => setStarred(s => !s)}
                title={starred ? 'Show all terms' : 'Show only your bookmarks'}
                aria-pressed={starred}
              >
                <ICON.star />
                <span className="user-name">{currentUser.username}</span>
                <span className="badge">{stars.size}</span>
              </button>
              <button
                type="button"
                className="btn quiet logout-btn"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                <ICON.logout />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn"
              id="openAuth"
              onClick={() => {
                setAuthTab('signin')
                setAuthNotice(null)
                setAuthError(null)
                setAuthModalOpen(true)
              }}
            >
              <ICON.user />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      <main>
        <div className="in">
          <div className="tools" id="tools">
            <label className="select"><span>Sort</span>
              <select
                id="sort"
                aria-label="Sort by"
                value={sort}
                onChange={(e) => {
                  if (e.target.value === 'rand') reshuffle()
                  setSort(e.target.value)
                }}
              >
                <option value="az">A to Z</option>
                <option value="lang">Language</option>
                <option value="region">Region</option>
                <option value="era">Oldest first</option>
                <option value="domain">Domain</option>
                <option value="rand">Shuffled</option>
              </select>
            </label>
            <button
              className="ibtn"
              id="shuffle"
              type="button"
              aria-label="I'm Feeling Lucky (Random word)"
              title="I'm Feeling Lucky (Random word)"
              onClick={triggerLucky}
            >
              <ICON.dice />
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
                <>
                  <b>{list.length}</b> of {rows.length} terms
                  {hasMore && (
                    <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
                      ({visibleList.length} shown)
                    </span>
                  )}
                </>
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
                starred ? (
                  <div className="empty">
                    <p><b>No bookmarks saved yet.</b></p>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 420 }}>
                      Click the star icon on any term to save it to your personal collection.
                    </p>
                    <button className="btn primary" type="button" onClick={() => setStarred(false)}>
                      Browse all terms
                    </button>
                  </div>
                ) : (
                  <div className="empty"><p>No terms match. Remove a filter or try a shorter search.</p><button className="btn primary" type="button" onClick={resetAll}>Reset everything</button></div>
                )
              ) : (
                <>
                  {view === 'compact' ? (
                    <div className="rows">
                      {visibleList.map(r => (
                        <article key={r.id + r.i} className="row">
                          <div className="main">
                            <div>
                              <bdi className="term">{r.t}</bdi>
                              {r.r && r.r !== r.t && <span className={`rom ${speakingKey === r.id ? 'shine' : ''}`}>{r.r}</span>}
                            </div>
                            <p className="gloss">{r.g}</p>
                            <div className="sub">{r.l} · {r.rg} · {r.d}</div>
                          </div>
                          <div className="side">
                            <div className="row-actions">
                              <button
                                className={`speak-btn ${speakingKey === r.id ? 'speaking' : ''}`}
                                type="button"
                                title={`Pronounce "${r.t}" in ${r.l}`}
                                aria-label={`Pronounce "${r.t}" in ${r.l}`}
                                onClick={() => handleToggleSpeak(r, r.id)}
                              >
                                {speakingKey === r.id ? <ICON.speakerActive /> : <ICON.speaker />}
                              </button>
                              <button className="star" type="button" aria-pressed={isStarred(r)} onClick={() => toggleStarItem(r)}>
                                <ICON.star />
                              </button>
                            </div>
                            <span className={`era era-${r.e}`}>{r.e}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="grid">
                      {visibleList.map(r => (
                        <article key={r.id + r.i} className="card">
                          <div className="top">
                            <div>
                              <bdi className="term">{r.t}</bdi>
                              {r.r && r.r !== r.t && <span className={`rom ${speakingKey === r.id ? 'shine' : ''}`}>{r.r}</span>}
                            </div>
                            <div className="card-actions">
                              <button
                                className={`speak-btn ${speakingKey === r.id ? 'speaking' : ''}`}
                                type="button"
                                title={`Pronounce "${r.t}" in ${r.l}`}
                                aria-label={`Pronounce "${r.t}" in ${r.l}`}
                                onClick={() => handleToggleSpeak(r, r.id)}
                              >
                                {speakingKey === r.id ? <ICON.speakerActive /> : <ICON.speaker />}
                              </button>
                              <button className="star" type="button" aria-pressed={isStarred(r)} onClick={() => toggleStarItem(r)}>
                                <ICON.star />
                              </button>
                            </div>
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
                  )}

                  {/* Intersection sentinel */}
                  {hasMore && <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />}

                  {/* Lazy load footer status & manual button */}
                  <div className="lazy-foot">
                    <div className="lazy-meta">
                      Showing <b>{visibleList.length}</b> of <b>{list.length}</b> terms
                      {list.length < rows.length && <span> (filtered from {rows.length})</span>}
                    </div>
                    {hasMore ? (
                      <button
                        type="button"
                        className="btn lazy-btn"
                        onClick={loadMore}
                      >
                        Load more ({remainingCount} remaining)
                      </button>
                    ) : list.length > PAGE_SIZE ? (
                      <div className="lazy-end">
                        <span>✓ All {list.length} terms loaded</span>
                      </div>
                    ) : null}
                  </div>
                </>
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
            {currentUser ? (
              <button className="chip" type="button" aria-pressed={starred} onClick={() => toggle('star', '1')}>
                My Bookmarks only <span className="n">{stars.size}</span>
              </button>
            ) : (
              <button
                className="chip"
                type="button"
                onClick={() => {
                  setAuthNotice('Please sign in or create an account to view and save bookmarked terms.')
                  setAuthTab('signin')
                  setAuthError(null)
                  setAuthModalOpen(true)
                  setSheetOpen(false)
                }}
              >
                Sign In to View Bookmarks
              </button>
            )}
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

      {/* Import Lexicon Terms Modal / Sheet */}
      <div className={`scrim ${importOpen ? 'open' : ''}`} onClick={() => setImportOpen(false)} />
      <section className={`sheet agent-sheet ${importOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="importTitle" aria-hidden={!importOpen}>
        <div className="sheet-head">
          <h2 id="importTitle">Import Lexicon Terms</h2>
          <button className="ibtn" type="button" aria-label="Close Import dialog" onClick={() => setImportOpen(false)}>
            <ICON.x />
          </button>
        </div>

        <div className="agent-tabs">
          <button
            type="button"
            className={`agent-tab ${importTab === 'paste' ? 'active' : ''}`}
            onClick={() => setImportTab('paste')}
          >
            📋 Paste & Import
          </button>
          <button
            type="button"
            className={`agent-tab ${importTab === 'rules' ? 'active' : ''}`}
            onClick={() => setImportTab('rules')}
          >
            📖 Codes & Rules
          </button>
        </div>

        <div className="sheet-body">
          {/* TAB 1: MANUAL PASTE & IMPORT */}
          {importTab === 'paste' && (
            <div className="agent-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label htmlFor="importInput" style={{ fontWeight: 600, fontSize: 13.5 }}>
                  Paste generated lines (pipe-separated)
                </label>
                <button
                  type="button"
                  className="linkbtn"
                  style={{ fontSize: 12, padding: 0 }}
                  onClick={() => setImportText(SAMPLE_AI_OUTPUT)}
                >
                  Paste sample output
                </button>
              </div>

              <textarea
                id="importInput"
                className="agent-textarea"
                placeholder="term|romanization|language|region|era|domain|meaning&#10;e.g. Baumeister|Baumeister|German|EUR|M|STUDIO|master builder who oversees masonry"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
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

          {/* TAB 2: CODES & RULES */}
          {importTab === 'rules' && (
            <div className="agent-box" style={{ fontSize: 13, lineHeight: 1.55 }}>
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--line)', fontSize: 12 }}>
                💡 <b>Codebase Generation:</b> Term generation rules are embedded in <code style={{ color: 'var(--accent)' }}>RULES.md</code>. Run <code style={{ color: 'var(--accent)' }}>pnpm generate --help</code> or ask the AI assistant in chat to generate terms.
              </div>

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
                  <button className="btn" type="button" onClick={() => setImportOpen(false)}>
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
              <button className="btn primary" type="button" onClick={() => setImportOpen(false)}>
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

      {/* Floating Back to Top Button */}
      <button
        type="button"
        className={`back-to-top ${showBackToTop ? 'show' : ''}`}
        aria-label="Back to top"
        title="Back to top"
        onClick={scrollToTop}
      >
        <ICON.up />
      </button>

      {/* Full-screen "I'm Feeling Lucky" Card Overlay */}
      {luckyItem && (
        <div
          className={`lucky-overlay ${luckyItem ? 'open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="luckyTermTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLucky()
          }}
        >
          <div className="lucky-card">
            <div className="lucky-top">
              <div className="lucky-badge">
                <ICON.dice />
                <span>I&apos;m Feeling Lucky</span>
              </div>
              <div className="lucky-top-actions">
                <button
                  className={`lucky-speak-btn ${speakingKey === 'lucky' ? 'speaking' : ''}`}
                  type="button"
                  title={`Pronounce in native tongue (${luckyItem.l}) [Press P or L]`}
                  aria-label={`Pronounce in ${luckyItem.l}`}
                  onClick={() => handleToggleSpeak(luckyItem, 'lucky')}
                >
                  {speakingKey === 'lucky' ? <ICON.speakerActive /> : <ICON.speaker />}
                  <span>{speakingKey === 'lucky' ? 'Speaking...' : 'Pronounce'}</span>
                </button>
                <button
                  className="ibtn"
                  type="button"
                  aria-label="Close card (Esc)"
                  title="Close (Esc)"
                  onClick={closeLucky}
                >
                  <ICON.x />
                </button>
              </div>
            </div>

            <div className="lucky-body">
              <div>
                <div className="lucky-term-header">
                  <bdi id="luckyTermTitle" className="lucky-term" lang={luckyItem.tag || undefined}>
                    {luckyItem.t}
                  </bdi>
                  <button
                    className={`lucky-inline-speak ${speakingKey === 'lucky' ? 'speaking' : ''}`}
                    type="button"
                    title={`Listen to pronunciation in ${luckyItem.l}`}
                    aria-label={`Listen to pronunciation in ${luckyItem.l}`}
                    onClick={() => handleToggleSpeak(luckyItem, 'lucky')}
                  >
                    {speakingKey === 'lucky' ? <ICON.speakerActive /> : <ICON.speaker />}
                  </button>
                </div>
                {luckyItem.r && luckyItem.r !== luckyItem.t && (
                  <div className={`lucky-rom ${speakingKey === 'lucky' ? 'shine' : ''}`}>{luckyItem.r}</div>
                )}
              </div>

              <p className="lucky-gloss">&ldquo;{luckyItem.g}&rdquo;</p>

              <div className="lucky-meta">
                <span className="tag" title="Language">
                  <b>{luckyItem.l}</b>
                  {luckyItem.lg && luckyItem.lg !== luckyItem.l ? ` · ${luckyItem.lg}` : ''}
                </span>
                <span className="tag" title="Region">
                  {luckyItem.rg}
                </span>
                <span className="tag" title="Domain">
                  {luckyItem.d}
                </span>
                <span className={`era era-${luckyItem.e}`} title={ERA_NOTE[luckyItem.e]}>
                  {luckyItem.e} {ERA_NOTE[luckyItem.e] ? `(${ERA_NOTE[luckyItem.e]})` : ''}
                </span>
                <button
                  className="star"
                  type="button"
                  aria-pressed={isStarred(luckyItem)}
                  aria-label={isStarred(luckyItem) ? 'Unstar this term' : 'Star this term'}
                  title={isStarred(luckyItem) ? 'Starred' : 'Add to starred'}
                  onClick={() => toggleStarItem(luckyItem)}
                >
                  <ICON.star />
                </button>
              </div>
            </div>

            <div className="lucky-foot">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const text = `${luckyItem.t}${luckyItem.r && luckyItem.r !== luckyItem.t ? ` (${luckyItem.r})` : ''} — ${luckyItem.g} [${luckyItem.l}, ${luckyItem.d}]`
                    navigator.clipboard.writeText(text).then(() => showToast(`Copied "${luckyItem.t}" to clipboard!`))
                  }}
                >
                  Copy Word
                </button>
                <button
                  type="button"
                  className="btn quiet"
                  onClick={closeLucky}
                >
                  Close
                </button>
              </div>

              <div className="lucky-nav">
                <button
                  type="button"
                  className="lucky-nav-btn"
                  onClick={rollPreviousLucky}
                  disabled={!hasPreviousLucky}
                  title={hasPreviousLucky ? 'Previous term (←)' : 'No previous term'}
                  aria-label="Previous term"
                >
                  <ICON.up style={{ transform: 'rotate(-90deg)' }} />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  className="lucky-primary-btn"
                  onClick={rollNextLucky}
                  title="Next random term (Space, → or P to Listen)"
                >
                  <ICON.dice />
                  <span>Next Word</span>
                  <span style={{ opacity: 0.75, fontSize: 11, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
                    [Space]
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal (Sign In / Register) */}
      <div
        className={`scrim ${authModalOpen ? 'open' : ''}`}
        onClick={() => {
          setAuthModalOpen(false)
          setPendingBookmark(null)
        }}
      />
      <section
        className={`sheet auth-sheet ${authModalOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="authTitle"
        aria-hidden={!authModalOpen}
      >
        <div className="sheet-head">
          <h2 id="authTitle">{authTab === 'signin' ? 'Sign In' : 'Create Account'}</h2>
          <button
            className="ibtn"
            type="button"
            aria-label="Close dialog"
            onClick={() => {
              setAuthModalOpen(false)
              setPendingBookmark(null)
            }}
          >
            <ICON.x />
          </button>
        </div>

        <div className="agent-tabs">
          <button
            type="button"
            className={`agent-tab ${authTab === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setAuthTab('signin')
              setAuthError(null)
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`agent-tab ${authTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setAuthTab('register')
              setAuthError(null)
            }}
          >
            Register
          </button>
        </div>

        <div className="sheet-body">
          {authNotice && <div className="auth-notice">{authNotice}</div>}
          {authError && <div className="auth-error">{authError}</div>}

          {authTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="auth-form">
              <div className="auth-field">
                <label htmlFor="signinIdent">Username or Email</label>
                <input
                  id="signinIdent"
                  className="auth-input"
                  type="text"
                  autoComplete="username"
                  required
                  value={signinIdent}
                  onChange={(e) => setSigninIdent(e.target.value)}
                  placeholder="e.g. curator or user@example.com"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="signinPass">Password</label>
                <input
                  id="signinPass"
                  className="auth-input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={signinPass}
                  onChange={(e) => setSigninPass(e.target.value)}
                />
              </div>
              <div className="auth-actions">
                <button type="submit" className="btn primary" disabled={authLoading}>
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>
                <div className="auth-switch">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('register')
                      setAuthError(null)
                    }}
                  >
                    Register here
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-field">
                <label htmlFor="regUsername">Username</label>
                <input
                  id="regUsername"
                  className="auth-input"
                  type="text"
                  autoComplete="username"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. master_steward"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="regEmail">
                  Email <span className="sublabel">(optional)</span>
                </label>
                <input
                  id="regEmail"
                  className="auth-input"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="regPass">
                  Password <span className="sublabel">(min. 6 characters)</span>
                </label>
                <input
                  id="regPass"
                  className="auth-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="regPassConfirm">Confirm Password</label>
                <input
                  id="regPassConfirm"
                  className="auth-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={regPassConfirm}
                  onChange={(e) => setRegPassConfirm(e.target.value)}
                />
              </div>
              <div className="auth-actions">
                <button type="submit" className="btn primary" disabled={authLoading}>
                  {authLoading ? 'Creating account...' : 'Create Account & Sign In'}
                </button>
                <div className="auth-switch">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('signin')
                      setAuthError(null)
                    }}
                  >
                    Sign in here
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
