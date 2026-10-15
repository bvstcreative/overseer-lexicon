import { NextRequest, NextResponse } from 'next/server'
import { getStats } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const stats = getStats(user?.id)
    return NextResponse.json(stats)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'digest' in error && (error as { digest: string }).digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error
    }
    console.error('Failed to get stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
