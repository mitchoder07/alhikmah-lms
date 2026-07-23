import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json()
  const { moduleId, title, description, content, videoUrl, duration, position, isPreview } = body
  if (!moduleId || !title) return NextResponse.json({ error: 'moduleId and title required' }, { status: 400 })

  const lesson = await db.lesson.create({
    data: {
      moduleId,
      title,
      description: description || '',
      content: content || '',
      videoUrl: videoUrl || null,
      duration: Number(duration) || 0,
      position: Number(position) || 0,
      isPreview: Boolean(isPreview),
    }
  })
  return NextResponse.json({ lesson })
}
