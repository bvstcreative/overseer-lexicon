import { NextRequest, NextResponse } from 'next/server'
import { getStarredTermIds, toggleStar } from '@/lib/db'

export async function GET() {
  try {
    const starredIds = getStarredTermIds()
    return NextResponse.json({ starredIds })
  } catch (error) {
    console.error('Failed to get stars:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const termId = Number(body.termId)

    if (!termId || isNaN(termId)) {
      return NextResponse.json({ error: 'Invalid or missing termId' }, { status: 400 })
    }

    const starred = typeof body.starred === 'boolean' ? body.starred : undefined
    const isNowStarred = toggleStar(termId, starred)

    return NextResponse.json({
      success: true,
      termId,
      starred: isNowStarred,
    })
  } catch (error) {
    console.error('Failed to update star:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

