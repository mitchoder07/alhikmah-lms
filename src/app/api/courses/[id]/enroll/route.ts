import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Only students can enroll' }, { status: 403 })

  const existing = await db.enrollment.findFirst({ where: { courseId: id, userId: user.id } })
  if (existing) return NextResponse.json({ enrollment: existing, already: true })

  const enrollment = await db.enrollment.create({ data: { courseId: id, userId: user.id, lecturerApproved: false } })
  return NextResponse.json({ enrollment })
}
