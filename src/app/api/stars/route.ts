import { NextRequest, NextResponse } from 'next/server'
import { getUserStarredTermIds, toggleUserStar, getUserStarredCount, syncUserStars } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ starredIds: [], authenticated: false })
    }

    const starredIds = getUserStarredTermIds(user.id)
    return NextResponse.json({
      starredIds,
      authenticated: true,
      starredCount: starredIds.length,
    })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'digest' in error && (error as { digest: string }).digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error
    }
    console.error('Failed to get stars:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in or register to bookmark terms.', authenticated: false },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Handle batch sync of local stars
    if (Array.isArray(body.syncIds)) {
      const synced = syncUserStars(user.id, body.syncIds)
      const totalStars = getUserStarredCount(user.id)
      return NextResponse.json({
        success: true,
        synced,
        starredCount: totalStars,
        authenticated: true,
      })
    }

    const termId = Number(body.termId)
    if (!termId || isNaN(termId)) {
      return NextResponse.json({ error: 'Invalid or missing termId' }, { status: 400 })
    }

    const starred = typeof body.starred === 'boolean' ? body.starred : undefined
    const isNowStarred = toggleUserStar(user.id, termId, starred)
    const totalStars = getUserStarredCount(user.id)

    return NextResponse.json({
      success: true,
      termId,
      starred: isNowStarred,
      starredCount: totalStars,
      authenticated: true,
    })
  } catch (error) {
    console.error('Failed to update star:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
