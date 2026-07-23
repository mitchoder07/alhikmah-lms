import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Finalize a course: compute final score & mark complete (admin/lecturer)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const finalScore = Number(body.finalScore) || 0

  const enrollment = await db.enrollment.update({
    where: { id },
    data: { completedAt: new Date(), finalScore, lecturerApproved: true },
  })
  return NextResponse.json({ enrollment })
}
