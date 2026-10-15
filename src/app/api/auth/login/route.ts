import { NextRequest, NextResponse } from 'next/server'
import { verifyCredentials, createSession, isRequestSecure, AUTH_COOKIE_NAME, SESSION_MAX_AGE_MS } from '@/lib/auth'
import { syncUserStars, getUserStarredCount } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { usernameOrEmail, password, initialStars } = body

    if (!usernameOrEmail || typeof usernameOrEmail !== 'string') {
      return NextResponse.json({ error: 'Username or email is required.' }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
    }

    const user = verifyCredentials(usernameOrEmail, password)
    if (!user) {
      return NextResponse.json({ error: 'Invalid username/email or password.' }, { status: 401 })
    }

    const token = createSession(user.id)

    // Merge any pending local stars
    if (Array.isArray(initialStars) && initialStars.length > 0) {
      syncUserStars(user.id, initialStars)
    }

    const starredCount = getUserStarredCount(user.id)

    const response = NextResponse.json({
      success: true,
      user,
      starredCount,
    })

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isRequestSecure(request),
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    })

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sign in failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

