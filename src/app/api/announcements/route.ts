import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ announcements: [] })
  const now = new Date()
  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { publishAt: null },
        { publishAt: { lte: now } },
      ],
    },
    include: { author: { select: { name: true } }, course: { select: { code: true, title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ announcements })
}
