import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET: Return ALL blog posts (including unpublished) for admin management.
export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const posts = await db.blogPost.findMany({
    include: {
      author: { select: { id: true, name: true } },
      course: { select: { id: true, code: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ posts })
}

// POST: Create a new blog post. Author is the current user.
// Body: { title, excerpt, content, imageUrl, courseId, isPublished, publishAt }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
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

  if (!title || !content) {
    return NextResponse.json({ error: 'title and content are required' }, { status: 400 })
  }

  // Validate courseId if provided
  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) return NextResponse.json({ error: 'Linked course not found' }, { status: 400 })
  }

  const post = await db.blogPost.create({
    data: {
      title,
      excerpt: excerpt || '',
      content,
      imageUrl: imageUrl || null,
      courseId: courseId || null,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      publishAt: publishAt ? new Date(publishAt) : null,
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true } },
      course: { select: { id: true, code: true, title: true } },
    },
  })
  return NextResponse.json({ post })
}
