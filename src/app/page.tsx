'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import rawData from '@/data/overseer.json'

interface LexiconItem {
  i: number
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

const ICON = {
  star: (props: any) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
    </svg>
  ),
  x: (props: any) => (
    <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  cards: (props: any) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="7" rx="1.5" />
      <rect x="4" y="13" width="16" height="7" rx="1.5" />
    </svg>
  ),
  list: (props: any) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
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
  return String(s)
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

function transformData(): LexiconItem[] {
  const data = rawData as any[]
  return data.map((a: any[], i: number) => {
    const term = a[0] || ''
    const roman = a[1] || ''
    const keyNorm = norm(roman || term).replace(/[^a-z0-9 ]/g, '').trim() || norm(term)
    const hay = norm([term, roman, a[2], a[3], a[4], a[5], a[6], a[7]].join(' '))
    return {
      i,
      t: term,
      r: roman,
      l: a[2] || '',
      lg: a[3] || '',
      rg: a[4] || '',
      e: a[5] || '',
      d: a[6] || '',
      g: a[7] || '',
      key: keyNorm,
      hay,
      id: term + '|' + (a[2] || ''),
      tag: langTag(a[2] || '')
    }
  })
}

const KEY = 'overseer-lexicon-v1'

export default function Home() {
  const [rows, setRows] = useState<LexiconItem[]>([])
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

  useEffect(() => {
    setRows(transformData())
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
      if (Array.isArray(saved.stars)) setStars(new Set(saved.stars))
      if (saved.view === 'compact' || saved.view === 'cards') setView(saved.view)
    } catch (e) {}
  }, [])

  const qTokens = useMemo(() => norm(q).split(/\s+/).filter(Boolean), [q])

  const save = useCallback(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ stars: Array.from(stars), view }))
    } catch (e) {}
  }, [stars, view])

  useEffect(() => { save() }, [save])

  const reshuffle = useCallback(() => {
    const idx = rows.map((_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t
    }
    const rank = new Array(rows.length).fill(0)
    idx.forEach((v, pos) => { rank[v] = pos })
    setShuffleRank(rank)
  }, [rows])

  useEffect(() => {
    if (rows.length > 0 && shuffleRank === null) reshuffle()
  }, [rows, shuffleRank, reshuffle])

  const passes = useCallback((r: LexiconItem, skip?: string) => {
    for (let i = 0; i < qTokens.length; i++) {
      if (r.hay.indexOf(qTokens[i]) < 0) return false
    }
    if (domain.size && !domain.has(r.d) && skip !== 'domain') return false
    if (region.size && !region.has(r.rg) && skip !== 'region') return false
    if (era.size && !era.has(r.e) && skip !== 'era') return false
    if (lg.size && !lg.has(r.lg) && skip !== 'lg') return false
    if (starred && skip !== 'starred' && !stars.has(r.id)) return false
    return true
  }, [qTokens, domain, region, era, lg, starred, stars])

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
            <p id="count" aria-live="polite"><b>{list.length}</b> of {rows.length} terms</p>
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
            {group === 'none' ? (
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
                        <button className="star" type="button" aria-pressed={stars.has(r.id)} onClick={() => { const s = new Set(stars); if (s.has(r.id)) s.delete(r.id); else s.add(r.id); setStars(s); }}>
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
                        <button className="star" type="button" aria-pressed={stars.has(r.id)} onClick={() => { const s = new Set(stars); if (s.has(r.id)) s.delete(r.id); else s.add(r.id); setStars(s); }}>
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
            <button className="chip" type="button" aria-pressed={starred} onClick={() => toggle('star', '1')}>Starred only <span className="n">{list.filter(r => stars.has(r.id)).length > 0 ? rows.filter(r => passes(r,'starred') && stars.has(r.id)).length : 0}</span></button>
          </div></div>
        </div>
        <div className="sheet-foot">
          <button className="btn" id="copyList" type="button" onClick={() => {
            const lines = ['Term\tRomanization\tLanguage\tRegion\tEra\tDomain\tMeaning'].concat(list.map(r => [r.t, r.r||'', r.l, r.rg, r.e, r.d, r.g].join('\t')))
            navigator.clipboard.writeText(lines.join('\n')).then(() => alert(`Copied ${list.length} terms`))
          }}>Copy list</button>
          <button className="btn primary" id="apply" type="button" onClick={() => setSheetOpen(false)}>{list.length ? `Show ${list.length} terms` : 'No matches'}</button>
        </div>
      </section>
    </div>
  )
}
