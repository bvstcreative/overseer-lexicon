import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getUserStarredCount } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ user: null })
    }

    const starredCount = getUserStarredCount(user.id)
    return NextResponse.json({
      user,
      starredCount,
    })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'digest' in error && (error as { digest: string }).digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error
    }
    console.error('Failed to get current user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
