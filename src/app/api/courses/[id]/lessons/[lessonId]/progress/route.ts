import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { lessonId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { completed, watchedSec } = body

  const progress = await db.lessonProgress.upsert({
    where: { lessonId_userId: { lessonId, userId: user.id } },
    update: {
      completed: typeof completed === 'boolean' ? completed : undefined,
      watchedSec: typeof watchedSec === 'number' ? watchedSec : undefined,
      lastAccessed: new Date(),
    },
    create: {
      lessonId,
      userId: user.id,
      completed: Boolean(completed),
      watchedSec: Number(watchedSec) || 0,
    },
  })
  return NextResponse.json({ progress })
}
