import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// PATCH: Update a blog post.
// Body: any of { title, excerpt, content, imageUrl, courseId, isPublished, publishAt }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const existing = await db.blogPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })

  const body = await req.json()
  const { title, excerpt, content, imageUrl, courseId, isPublished, publishAt } = body as {
    title?: string
    excerpt?: string
    content?: string
    imageUrl?: string | null
    courseId?: string | null
    isPublished?: boolean
    publishAt?: string | null
  }

  // Validate courseId if provided
  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) return NextResponse.json({ error: 'Linked course not found' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = title
  if (excerpt !== undefined) data.excerpt = excerpt
  if (content !== undefined) data.content = content
  if (imageUrl !== undefined) data.imageUrl = imageUrl || null
  if (courseId !== undefined) data.courseId = courseId || null
  if (isPublished !== undefined) data.isPublished = Boolean(isPublished)
  if (publishAt !== undefined) data.publishAt = publishAt ? new Date(publishAt) : null

  const post = await db.blogPost.update({
    where: { id },
    data,
    include: {
      author: { select: { id: true, name: true } },
      course: { select: { id: true, code: true, title: true } },
    },
  })
  return NextResponse.json({ post })
}

// DELETE: Delete a blog post.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const existing = await db.blogPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })

  await db.blogPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
