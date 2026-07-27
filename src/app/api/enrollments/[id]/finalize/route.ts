import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Finalize (or update) a course score for an enrollment.
//
// This route handles BOTH cases:
//   1. First-time finalization — student has not been marked complete yet.
//      Sets completedAt, finalScore, and lecturerApproved=true.
//   2. Editing an already-finalized score — student is already marked complete.
//      Preserves the original completedAt, updates finalScore, ensures
//      lecturerApproved stays true.
//
// It does NOT require the enrollment to be non-completed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const finalScore = Number(body.finalScore)
  if (Number.isNaN(finalScore) || finalScore < 0 || finalScore > 100) {
    return NextResponse.json({ error: 'finalScore must be a number between 0 and 100' }, { status: 400 })
  }

  // Look up the current enrollment so we can preserve completedAt if already set
  const existing = await db.enrollment.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  const enrollment = await db.enrollment.update({
    where: { id },
    data: {
      // Keep the original completion date if already finalized; otherwise stamp now
      completedAt: existing.completedAt ?? new Date(),
      finalScore,
      lecturerApproved: true,
    },
  })
  return NextResponse.json({ enrollment })
}
