import { NextRequest, NextResponse } from 'next/server'
import { getAllTerms, createTerm, TermFilter, NewTermInput } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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

    const filter: TermFilter = {
      q,
      sort,
      starred,
      domain,
      region,
      era,
      lg,
    }

    const terms = getAllTerms(filter)

    return NextResponse.json({
      terms,
      total: terms.length,
    })
  } catch (error) {
    console.error('Failed to get terms:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const requiredFields = ['term', 'language', 'language_group', 'region', 'era', 'domain', 'gloss'] as const
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== 'string' || !body[field].trim()) {
        return NextResponse.json({ error: `Field '${field}' is required.` }, { status: 400 })
      }
    }

    const input: NewTermInput = {
      term: body.term,
      romanization: body.romanization ?? '',
      language: body.language,
      language_group: body.language_group,
      region: body.region,
      era: body.era,
      domain: body.domain,
      gloss: body.gloss,
    }

    const created = createTerm(input)
    return NextResponse.json({ success: true, term: created }, { status: 201 })
  } catch (error) {
    console.error('Failed to create term:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

