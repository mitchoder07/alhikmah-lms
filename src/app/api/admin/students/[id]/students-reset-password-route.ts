import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword } from '@/lib/auth'

// POST — admin resets a student's password.
//
// Body: { password: string }
// Returns: { ok: true } on success.
//
// Security:
//   - Only ADMIN role is allowed (lecturers cannot reset passwords).
//   - Password is hashed with the same sha256 used elsewhere in the app.
//   - The student's existing sessions are NOT invalidated automatically
//     (the 30-min session cookie will expire on its own); the admin should
//     inform the student of their new password.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as { password?: string }))
  const { password } = body
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  // Make sure the target user exists and is a student (don't let admin reset
  // another admin's password through this endpoint).
  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }
  if (target.role !== 'STUDENT') {
    return NextResponse.json({ error: 'This endpoint can only reset student passwords' }, { status: 400 })
  }

  await db.user.update({
    where: { id },
    data: { password: hashPassword(password) },
  })

  return NextResponse.json({ ok: true })
}
