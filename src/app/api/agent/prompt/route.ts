import { NextRequest, NextResponse } from 'next/server'
import { getExistingTermPairs } from '@/lib/db'
import { AGENT_SYSTEM_PROMPT, generateUserPrompt, generateEasyPrompt, extractCountAndTopic } from '@/lib/agent-rules'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawInput = searchParams.get('input') || ''
    const rawTopic = searchParams.get('topic') || ''
    const countParam = searchParams.get('count')
    const focus = searchParams.get('focus') || ''

    let topic = rawTopic
    let count = countParam ? parseInt(countParam, 10) : 100

    if (rawInput) {
      const extracted = extractCountAndTopic(rawInput)
      topic = extracted.topic
      if (!countParam) {
        count = extracted.count
      }
    }

    const pairs = getExistingTermPairs()
    const pairStrings = pairs.map((p) => `${p.term}|${p.language}`)

    const userPrompt = generateUserPrompt(count, focus, pairStrings)
    const easyPrompt = generateEasyPrompt(topic || focus || 'mythological creatures name around the world', count, pairStrings)

    return NextResponse.json({
      easyPrompt,
      systemPrompt: AGENT_SYSTEM_PROMPT,
      userPrompt,
      existingCount: pairs.length,
      count,
      topic,
      focus,
    })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'digest' in error && (error as { digest: string }).digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error
    }
    console.error('Failed to generate agent prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
