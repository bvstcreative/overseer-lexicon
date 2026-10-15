import { NextRequest, NextResponse } from 'next/server'
import { createUser, createSession, isRequestSecure, AUTH_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth'
import { syncUserStars, getUserStarredCount } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, initialStars } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
    }

    const user = createUser(username, email || null, password)
    const token = createSession(user.id)

    // If user already had terms starred locally, sync them to their new account
    if (Array.isArray(initialStars) && initialStars.length > 0) {
      syncUserStars(user.id, initialStars)
    }

    const starredCount = getUserStarredCount(user.id)

    const response = NextResponse.json({
      success: true,
      user,
      starredCount,
    }, { status: 201 })

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isRequestSecure(request),
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    })

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed.'
    const isConflict = message.includes('already taken') || message.includes('already registered')
    return NextResponse.json({ error: message }, { status: isConflict ? 409 : 400 })
  }
}

