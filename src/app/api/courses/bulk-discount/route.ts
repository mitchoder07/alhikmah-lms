import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST: Compute bulk discount for a set of paid courses.
// Body: { courseIds: string[] }
// Returns: { total, discount, finalAmount, breakdown: [{ courseId, code, title, fee }] }
// Discount tiers:
//   1-2 courses = 0% discount
//   3-4 courses = 10% discount
//   5+ courses  = 15% discount
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { courseIds } = body as { courseIds: string[] }

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return NextResponse.json({ error: 'courseIds must be a non-empty array' }, { status: 400 })
  }

  // Deduplicate courseIds to avoid manipulation
  const uniqueIds = Array.from(new Set(courseIds))

  const courses = await db.course.findMany({
    where: { id: { in: uniqueIds }, isPaid: true },
    select: { id: true, code: true, title: true, courseFee: true },
  })

  // Preserve the original requested order; only include courses that exist & are paid
  const ordered = uniqueIds
    .map((cid) => courses.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  if (ordered.length === 0) {
    return NextResponse.json({ error: 'No paid courses found for the given IDs' }, { status: 404 })
  }

  const count = ordered.length
  let discountRate = 0
  if (count >= 5) discountRate = 0.15
  else if (count >= 3) discountRate = 0.1
  else discountRate = 0

  const total = ordered.reduce((sum, c) => sum + c.courseFee, 0)
  const discount = Math.round(total * discountRate * 100) / 100
  const finalAmount = Math.round((total - discount) * 100) / 100

  const breakdown = ordered.map((c) => ({
    courseId: c.id,
    code: c.code,
    title: c.title,
    fee: c.courseFee,
  }))

  return NextResponse.json({
    total,
    discount,
    finalAmount,
    discountRate,
    breakdown,
  })
}
