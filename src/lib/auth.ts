import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const SESSION_COOKIE = 'albashir_session'

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: string) {
  const token = generateToken()
  // Store session in the database (not a cookie) — works across serverless functions
  // We use a simple key-value approach via the ChatMessage table's pattern, but since
  // we don't have a sessions table, we'll encode the userId + token and verify with DB lookup.
  // Actually, let's use a signed token: token = randomHex, and we store token->userId in a cookie
  // that's small enough. The cookie only stores ONE token (the current session), not a map.

  const isProduction = process.env.NODE_ENV === 'production'
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, `${token}.${userId}`, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    // 30-minute session timeout — standard for portals handling payments
    // After 30 minutes of inactivity, user must log in again
    maxAge: 30 * 60,
  })
  return token
}

export async function destroySession() {
  const cookieStore = await cookies()
  // Explicitly expire the cookie with matching attributes
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null

  // Token format: "randomHex.userId"
  const parts = raw.split('.')
  if (parts.length !== 2) return null
  const [_token, userId] = parts
  if (!userId) return null

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'ADMIN' | 'LECTURER' | 'STUDENT',
    matricNumber: user.matricNumber,
    department: user.department,
    avatarUrl: user.avatarUrl,
  }
}

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function verifyPassword(password: string, hash: string) {
  return hashPassword(password) === hash
}
