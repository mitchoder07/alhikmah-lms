import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser } from '@/lib/auth'
import { loadAttempt, gradeObjective, parseGraded, applyLecturerReview, type AttemptKind } from '@/lib/grading'
import { canReviewAttempt } from '@/lib/assessment-access'

// GET: everything a lecturer needs to check the AI's marking question by question
// PATCH: save the lecturer's marks (release the result to the student)

async function loadAuthorized(req: NextRequest, id: string) {
  const user = await getStaffUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }

  const { searchParams } = new URL(req.url)
  const kind: AttemptKind = searchParams.get('kind') === 'exam' ? 'exam' : 'quiz'
  const loaded = await loadAttempt(kind, id)
  if (!loaded) return { error: NextResponse.json({ error: 'Attempt not found' }, { status: 404 }) }
  if (!(await canReviewAttempt(user, loaded))) {
    return { error: NextResponse.json({ error: 'You can only review attempts in your own courses' }, { status: 403 }) }
  }
  return { user, kind, loaded }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await loadAuthorized(req, id)
  if ('error' in auth) return auth.error
  const { kind, loaded } = auth

  // Older attempts (created before AI marking) have no stored detail, so rebuild it
  const items =
    parseGraded(loaded.attempt.graded) ??
    gradeObjective(loaded.questions, loaded.attempt.answers).items

  const totalMarks = items.reduce((sum, i) => sum + i.maxMarks, 0)

  return NextResponse.json({
    attempt: {
      id: loaded.attempt.id,
      kind,
      reviewStatus: loaded.attempt.reviewStatus,
      gradingMode: loaded.attempt.gradingMode,
      score: loaded.attempt.score,
      totalMarks: loaded.attempt.totalMarks || totalMarks,
      percent: loaded.attempt.totalMarks
        ? Math.round((loaded.attempt.score / loaded.attempt.totalMarks) * 100)
        : 0,
      passed: loaded.attempt.passed,
      aiScore: loaded.attempt.aiScore,
      aiFeedback: loaded.attempt.aiFeedback,
      aiMarkedAt: loaded.attempt.aiMarkedAt,
      reviewNote: loaded.attempt.reviewNote,
      reviewedAt: loaded.attempt.reviewedAt,
      submittedAt: loaded.attempt.completedAt ?? loaded.attempt.startedAt,
    },
    assessment: { ...loaded.assessment, lessonTitle: loaded.lessonTitle },
    course: loaded.course,
    student: loaded.student,
    items,
    hasEssay: items.some((i) => i.type === 'ESSAY'),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await loadAuthorized(req, id)
  if ('error' in auth) return auth.error
  const { user, kind, loaded } = auth

  const body = (await req.json().catch(() => ({}))) as { marks?: Record<string, number | string>; note?: string }
  const marks = body.marks && typeof body.marks === 'object' ? body.marks : {}

  // Every essay must carry a mark before the result is released
  const items = parseGraded(loaded.attempt.graded) ?? gradeObjective(loaded.questions, loaded.attempt.answers).items
  const missing = items
    .filter((i) => i.type === 'ESSAY')
    .filter((i) => {
      const provided = marks[i.questionId]
      return provided === undefined && i.marksAwarded === 0 && i.aiMarks === null
    })
  if (missing.length) {
    return NextResponse.json(
      { error: `Question ${missing.length > 1 ? 's' : ''} ${missing.map((_, n) => n + 1).join(', ')} still need a mark.` },
      { status: 400 }
    )
  }

  try {
    const result = await applyLecturerReview(kind, id, {
      marks,
      note: body.note,
      reviewerId: user.id,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[attempts] review failed:', e?.message)
    return NextResponse.json({ error: e?.message || 'Could not save the review' }, { status: 500 })
  }
}
