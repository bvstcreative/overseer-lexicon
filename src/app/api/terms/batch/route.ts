import { NextRequest, NextResponse } from 'next/server'
import { createTermsBatch, getExistingTermPairs, NewTermInput } from '@/lib/db'
import { parseLexiconInput } from '@/lib/agent-rules'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support direct JSON array payload (e.g., squirrel-terms.json), { terms: [...] }, { entries: [...] }, or { rawText: "..." }
    const isDirectArray = Array.isArray(body)
    const duplicateMode: 'term' | 'term_language' =
      !isDirectArray && body?.duplicateMode === 'term' ? 'term' : 'term_language'
    const onDuplicate: 'skip' | 'update' =
      !isDirectArray && body?.onDuplicate === 'update' ? 'update' : 'skip'

    let validInputs: NewTermInput[] = []

    if (!isDirectArray && typeof body?.rawText === 'string' && body.rawText.trim()) {
      const pairs = getExistingTermPairs()
      const existingPairSet = new Set(pairs.map((p) => `${p.term.toLowerCase()}|${p.language.toLowerCase()}`))
      const existingTermSet = new Set(pairs.map((p) => p.term.toLowerCase()))
      const parsed = parseLexiconInput(body.rawText, existingPairSet, {
        duplicateMode,
        existingTerms: existingTermSet,
      })
      const itemsToProcess =
        onDuplicate === 'update'
          ? [...parsed.valid, ...parsed.duplicates.filter((d) => d.status === 'duplicate_existing')]
          : parsed.valid
      validInputs = itemsToProcess.map((v) => ({
        term: v.term,
        romanization: v.romanization,
        language: v.language,
        language_group: v.language_group,
        region: v.region,
        era: v.era,
        domain: v.domain,
        gloss: v.gloss,
      }))
    } else {
      const terms = isDirectArray
        ? body
        : Array.isArray(body?.terms)
          ? body.terms
          : Array.isArray(body?.entries)
            ? body.entries
            : null

      if (!Array.isArray(terms) || terms.length === 0) {
        return NextResponse.json(
          { error: 'An array of terms (or { terms: [...] } / { rawText: "..." }) is required' },
          { status: 400 }
        )
      }

      for (let i = 0; i < terms.length; i++) {
        const item = terms[i]
        const glossVal = item?.gloss ?? item?.meaning ?? item?.definition
        if (!item?.term || !item?.language || !item?.domain || !item?.region || !item?.era || !glossVal) {
          return NextResponse.json(
            {
              error: `Item at index ${i} is missing required fields (term, language, domain, region, era, meaning/gloss)`,
            },
            { status: 400 }
          )
        }

        validInputs.push({
          term: String(item.term).trim(),
          romanization: String(item.romanization || item.term).trim(),
          language: String(item.language).trim(),
          language_group: item.language_group ? String(item.language_group).trim() : undefined,
          region: String(item.region).trim(),
          era: String(item.era).trim(),
          domain: String(item.domain).trim(),
          gloss: String(glossVal).trim(),
        })
      }
    }

    const result = createTermsBatch(validInputs, {
      duplicateMode,
      onDuplicate,
    })

    return NextResponse.json(
      {
        success: true,
        insertedCount: result.inserted.length,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        terms: result.inserted,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to batch insert terms:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

