import { NextRequest, NextResponse } from 'next/server'
import { getExistingTermPairs, createTermsBatch, TermRecord } from '@/lib/db'
import { generateEasyPrompt, parseAgentOutput, extractCountAndTopic } from '@/lib/agent-rules'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input, topic: rawTopic, count: rawCount, apiKey: userKey, storeInSqlite, duplicateMode = 'term', onDuplicate = 'skip' } = body

    let topic = (rawTopic || '').trim()
    let count = typeof rawCount === 'number' ? rawCount : 100

    if (input) {
      const extracted = extractCountAndTopic(input)
      topic = extracted.topic
      if (!rawCount) {
        count = extracted.count
      }
    }

    if (!topic) {
      topic = 'mythological creatures name around the world'
    }

    const apiKey = userKey || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'A Gemini API key is required for in-app generation. Enter your API key or copy the prompt for external chat.',
      }, { status: 400 })
    }

    const pairs = getExistingTermPairs()
    const pairStrings = pairs.map((p) => `${p.term}|${p.language}`)
    const prompt = generateEasyPrompt(topic, count, pairStrings)

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      const errMsg = data.error?.message || 'Gemini API request failed'
      return NextResponse.json({ error: errMsg }, { status: response.status })
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const existingPairsSet = new Set(pairStrings.map((p) => p.toLowerCase()))
    const existingTermsSet = new Set(pairs.map((p) => p.term.toLowerCase()))

    const parsed = parseAgentOutput(rawText, existingPairsSet, {
      duplicateMode: duplicateMode === 'term_language' ? 'term_language' : 'term',
      existingTerms: existingTermsSet,
    })

    let storedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    let storedTerms: TermRecord[] = []

    const itemsToStore = onDuplicate === 'update'
      ? [...parsed.valid, ...parsed.duplicates.filter((d) => d.status === 'duplicate_existing')]
      : parsed.valid

    if (storeInSqlite && itemsToStore.length > 0) {
      const batchResult = createTermsBatch(
        itemsToStore.map((v) => ({
          term: v.term,
          romanization: v.romanization,
          language: v.language,
          language_group: v.language_group,
          region: v.region,
          era: v.era,
          domain: v.domain,
          gloss: v.gloss,
        })),
        {
          duplicateMode: duplicateMode === 'term_language' ? 'term_language' : 'term',
          onDuplicate: onDuplicate === 'update' ? 'update' : 'skip',
        }
      )
      storedCount = batchResult.inserted.length
      updatedCount = batchResult.updatedCount
      skippedCount = batchResult.skippedCount
      storedTerms = batchResult.inserted
    }

    return NextResponse.json({
      success: true,
      topic,
      count,
      rawText,
      parsed,
      storedInSqlite: Boolean(storeInSqlite),
      storedCount,
      updatedCount,
      skippedCount,
      storedTerms,
    })
  } catch (error: unknown) {
    console.error('Failed to generate with AI:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

