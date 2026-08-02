import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword } from '@/lib/auth'

// POST — admin resets a lecturer's password
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only administrators can reset passwords' }, { status: 403 })
  }

  const body = await req.json()
  const { password } = body
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Can only reset lecturer passwords' }, { status: 400 })
  }

  await db.user.update({
    where: { id },
    data: { password: hashPassword(password) },
  })

  return NextResponse.json({ ok: true })
}
