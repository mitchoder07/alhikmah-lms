import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser } from '@/lib/auth'
import { loadAttempt, markAttemptWithAi } from '@/lib/grading'
import { canReviewAttempt } from '@/lib/assessment-access'

export const runtime = 'nodejs'
export const maxDuration = 60

// Re-runs AI marking on an existing attempt. Used by the "Re-mark with AI"
// button in the gradebook (e.g. after the lecturer uploads a better marking
// guide or changes the AI settings).

export async function POST(req: NextRequest) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as { kind?: 'quiz' | 'exam'; attemptId?: string }
  const kind = body.kind === 'exam' ? 'exam' : 'quiz'
  if (!body.attemptId) return NextResponse.json({ error: 'attemptId is required' }, { status: 400 })

  const loaded = await loadAttempt(kind, body.attemptId)
  if (!loaded) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (!(await canReviewAttempt(user, loaded))) {
    return NextResponse.json({ error: 'You can only mark attempts in your own courses' }, { status: 403 })
  }

  const result = await markAttemptWithAi(kind, body.attemptId)

  if (!result.aiMarked) {
    return NextResponse.json(
      { error: result.error || 'The AI marker did not return any marks.' },
      { status: 502 }
    )
  }

  const updated = await loadAttempt(kind, body.attemptId)
  return NextResponse.json({
    ok: true,
    reviewStatus: result.reviewStatus,
    score: updated?.attempt.score,
    totalMarks: updated?.attempt.totalMarks,
    aiFeedback: updated?.attempt.aiFeedback,
  })
}
