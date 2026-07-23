import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET: Return a single blog post by ID (public).
// Includes author name and course info.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await db.blogPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      course: { select: { id: true, code: true, title: true } },
    },
  })
  if (!post) return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
  return NextResponse.json({ post })
}

// DELETE: Delete a blog post (admin/lecturer only).
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
