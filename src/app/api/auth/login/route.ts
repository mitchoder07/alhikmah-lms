import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, hashPassword, verifyPassword } from '@/lib/auth'

// Simple in-memory rate limiting (resets on server restart)
// Tracks: IP -> { count, lastAttempt }
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const now = Date.now()

  // Check rate limit
  const record = loginAttempts.get(ip)
  if (record && record.count >= MAX_ATTEMPTS) {
    const timeSinceLast = now - record.lastAttempt
    if (timeSinceLast < LOCKOUT_MS) {
      const minutesLeft = Math.ceil((LOCKOUT_MS - timeSinceLast) / 60000)
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.` },
        { status: 429 }
      )
    } else {
      // Reset after lockout period
      loginAttempts.delete(ip)
    }
  }

  const body = await req.json()
  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
  if (!user) {
    // Track failed attempt
    const r = loginAttempts.get(ip) || { count: 0, lastAttempt: now }
    r.count++
    r.lastAttempt = now
    loginAttempts.set(ip, r)
    const attemptsLeft = MAX_ATTEMPTS - r.count
    return NextResponse.json(
      { error: attemptsLeft > 0 ? `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left.` : 'Invalid credentials. Account locked for 15 minutes.' },
      { status: 401 }
    )
  }

  if (!verifyPassword(password, user.password)) {
    const r = loginAttempts.get(ip) || { count: 0, lastAttempt: now }
    r.count++
    r.lastAttempt = now
    loginAttempts.set(ip, r)
    const attemptsLeft = MAX_ATTEMPTS - r.count
    return NextResponse.json(
      { error: attemptsLeft > 0 ? `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left.` : 'Invalid credentials. Account locked for 15 minutes.' },
      { status: 401 }
    )
  }

  if (!user.isApproved) {
    return NextResponse.json({ error: 'Your account is awaiting approval by the lecturer.' }, { status: 403 })
  }

  // Success — clear failed attempts
  loginAttempts.delete(ip)

  await createSession(user.id)
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      matricNumber: user.matricNumber,
      department: user.department,
      avatarUrl: user.avatarUrl,
    }
  })
}
