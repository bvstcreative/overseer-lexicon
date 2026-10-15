import { NextRequest, NextResponse } from 'next/server'
import { createTermsBatch, NewTermInput } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { terms, duplicateMode, onDuplicate } = body

    if (!Array.isArray(terms) || terms.length === 0) {
      return NextResponse.json({ error: 'Array of terms is required' }, { status: 400 })
    }

    const validInputs: NewTermInput[] = []
    for (let i = 0; i < terms.length; i++) {
      const item = terms[i]
      if (!item.term || !item.language || !item.domain || !item.region || !item.era || !item.gloss) {
        return NextResponse.json({
          error: `Item at index ${i} is missing required fields (term, language, domain, region, era, gloss)`
        }, { status: 400 })
      }

      validInputs.push({
        term: item.term.trim(),
        romanization: (item.romanization || item.term).trim(),
        language: item.language.trim(),
        language_group: (item.language_group || item.language).trim(),
        region: item.region.trim(),
        era: item.era.trim(),
        domain: item.domain.trim(),
        gloss: item.gloss.trim(),
      })
    }

    const result = createTermsBatch(validInputs, {
      duplicateMode: duplicateMode === 'term_language' ? 'term_language' : 'term',
      onDuplicate: onDuplicate === 'update' ? 'update' : 'skip',
    })

    return NextResponse.json({
      success: true,
      insertedCount: result.inserted.length,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      terms: result.inserted,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to batch insert terms:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

