import { NextRequest, NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

// GET /logout?to=/staff-login  or  /logout?to=/login
// This does a FULL server-side redirect so the cookie deletion is guaranteed
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const redirect = searchParams.get('to') || '/login'

  await destroySession()

  const res = NextResponse.redirect(new URL(redirect, req.url))
  // Also set the cookie deletion on the redirect response
  res.cookies.set('alhikmah_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
  return res
}
