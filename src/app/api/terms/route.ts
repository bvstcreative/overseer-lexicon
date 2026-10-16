import { NextRequest, NextResponse } from 'next/server'
import { getAllTerms, createTerm, TermFilter, NewTermInput } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const { searchParams } = new URL(request.url)

    const q = searchParams.get('q') || undefined
    const sort = searchParams.get('sort') || undefined
    const starredParam = searchParams.get('starred')
    const starred = starredParam === 'true' || starredParam === '1' ? true : undefined

    // Helper to extract multi-value params either as multiple params (?domain=A&domain=B) or comma-separated (?domain=A,B)
    const getMultiParam = (paramName: string): string[] | undefined => {
      const values = searchParams.getAll(paramName)
      if (values.length === 0) return undefined
      const flat = values.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean)
      return flat.length > 0 ? flat : undefined
    }

    const domain = getMultiParam('domain')
    const region = getMultiParam('region')
    const era = getMultiParam('era')
    const lg = getMultiParam('lg')
    const letter = getMultiParam('letter') || getMultiParam('alpha')

    const filter: TermFilter = {
      q,
      sort,
      starred,
      domain,
      region,
      era,
      lg,
      letter,
    }

    const terms = getAllTerms(filter, user?.id)

    return NextResponse.json({
      terms,
      total: terms.length,
      authenticated: Boolean(user),
    })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'digest' in error && (error as { digest: string }).digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error
    }
    console.error('Failed to get terms:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const glossVal = body.gloss ?? body.meaning ?? body.definition
    const requiredFields = ['term', 'language', 'region', 'era', 'domain'] as const
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== 'string' || !body[field].trim()) {
        return NextResponse.json({ error: `Field '${field}' is required.` }, { status: 400 })
      }
    }
    if (!glossVal || typeof glossVal !== 'string' || !glossVal.trim()) {
      return NextResponse.json({ error: `Field 'meaning' (or 'gloss') is required.` }, { status: 400 })
    }

    const input: NewTermInput = {
      term: body.term,
      romanization: body.romanization ?? body.term,
      language: body.language,
      language_group: body.language_group,
      region: body.region,
      era: body.era,
      domain: body.domain,
      gloss: glossVal,
    }

    const created = createTerm(input)
    return NextResponse.json({ success: true, term: created }, { status: 201 })
  } catch (error) {
    console.error('Failed to create term:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

