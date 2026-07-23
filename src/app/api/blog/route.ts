import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Return all published blog posts (public, no auth).
// Only returns posts that are published AND (no publishAt OR publishAt <= now).
// Includes author name and optional course info. Ordered by createdAt desc.
export async function GET() {
  const now = new Date()
  const posts = await db.blogPost.findMany({
    where: {
      isPublished: true,
      OR: [
        { publishAt: null },
        { publishAt: { lte: now } },
      ],
    },
    include: {
      author: { select: { id: true, name: true } },
      course: { select: { id: true, code: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ posts })
}
