import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const announcements = await db.announcement.findMany({
    include: { author: { select: { id: true, name: true } }, course: { select: { id: true, code: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ announcements })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json()
  const { title, body: messageBody, courseId, publishAt } = body
  if (!title || !messageBody) return NextResponse.json({ error: 'Title and body required' }, { status: 400 })
  const announcement = await db.announcement.create({
    data: {
      title,
      body: messageBody,
      courseId: courseId || null,
      authorId: user.id,
      publishAt: publishAt ? new Date(publishAt) : null,
    }
  })
  return NextResponse.json({ announcement })
}
